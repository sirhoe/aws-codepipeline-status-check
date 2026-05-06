import {
  ListPipelinesCommand,
  ListPipelineExecutionsCommand,
  GetPipelineStateCommand,
  PutApprovalResultCommand,
  PipelineSummary,
  PipelineExecutionSummary as AWSPipelineExecutionSummary
} from "@aws-sdk/client-codepipeline";
import { createCodePipelineClient } from "../awsClient";
import { getSettings, savePipelineStatus } from "../storage";
import { PipelineStatus, PipelineStatusState, PipelineExecutionSummary, PendingApproval, RefreshMessage, ApproveMessage } from "../types";
import { ALARM_NAME } from "../constants";
import { installXmlPolyfill } from "../utils/xml-polyfill";

// Install XML Polyfill for AWS SDK in Service Worker
installXmlPolyfill();

const BATCH_SIZE = 5;
const BATCH_DELAY_MS = 300;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getPendingApproval(client: Awaited<ReturnType<typeof createCodePipelineClient>>, pipelineName: string): Promise<PendingApproval | undefined> {
  try {
    const stateCommand = new GetPipelineStateCommand({ name: pipelineName });
    const stateResponse = await client.send(stateCommand);

    for (const stage of stateResponse.stageStates || []) {
      for (const action of stage.actionStates || []) {
        // Check if this is a manual approval action waiting for approval
        if (action.latestExecution?.status === 'InProgress' && action.latestExecution?.token) {
          return {
            pipelineName,
            stageName: stage.stageName || '',
            actionName: action.actionName || '',
            token: action.latestExecution.token
          };
        }
      }
    }
  } catch (err) {
    console.error(`Error fetching pipeline state for ${pipelineName}:`, err);
  }
  return undefined;
}

async function fetchPipelineStatus() {
  try {
    const settings = await getSettings();
    
    if (!settings.accessKeyId || !settings.secretAccessKey || !settings.region) {
      console.log("Missing credentials, skipping poll.");
      return;
    }

    // Safe to cast because we checked for existence
    const client = await createCodePipelineClient(settings as any);

    // List all Pipelines (AWS paginates at 100 items, so we loop)
    const pipelines: PipelineSummary[] = [];
    let nextToken: string | undefined;
    do {
      const listCommand = new ListPipelinesCommand({
        maxResults: 100,
        nextToken
      });
      const listResponse = await client.send(listCommand);
      pipelines.push(...(listResponse.pipelines || []));
      nextToken = listResponse.nextToken;
    } while (nextToken);

    const totalPipelines = pipelines.length;

    // Filter
    let filteredPipelines = pipelines;
    const normalizedFilters = (settings.pipelineFilters ?? [])
      .map(f => f.trim().toLowerCase())
      .filter(Boolean);
    if (normalizedFilters.length > 0) {
      filteredPipelines = pipelines.filter(p => {
        const n = p.name?.toLowerCase() ?? '';
        return normalizedFilters.some(f => n.includes(f));
      });
    }
    const matchedPipelines = filteredPipelines.length;

    const pipelineStatuses: PipelineStatus[] = [];

    async function fetchOnePipeline(name: string): Promise<PipelineStatus> {
      try {
        const executionsCommand = new ListPipelineExecutionsCommand({
          pipelineName: name,
          maxResults: 5
        });

        const executionsResponse = await client.send(executionsCommand);

        const mappedExecutions: PipelineExecutionSummary[] = (executionsResponse.pipelineExecutionSummaries || []).map((exec: AWSPipelineExecutionSummary) => ({
          pipelineExecutionId: exec.pipelineExecutionId || '',
          status: exec.status || 'Unknown',
          startTime: exec.startTime ? exec.startTime.toISOString() : undefined,
          lastUpdateTime: exec.lastUpdateTime ? exec.lastUpdateTime.toISOString() : undefined
        }));

        if (mappedExecutions.length > 0 && mappedExecutions[0].status === 'InProgress') {
          const pendingApproval = await getPendingApproval(client, name);
          if (pendingApproval) {
            mappedExecutions[0].pendingApproval = pendingApproval;
          }
        }

        return { pipelineName: name, executions: mappedExecutions };
      } catch (err) {
        console.error(`Error fetching executions for pipeline ${name}:`, err);
        return { pipelineName: name, executions: [] };
      }
    }

    const named = filteredPipelines.filter(p => p.name) as (PipelineSummary & { name: string })[];
    for (let i = 0; i < named.length; i += BATCH_SIZE) {
      const batch = named.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(batch.map(p => fetchOnePipeline(p.name)));
      pipelineStatuses.push(...results);
      if (i + BATCH_SIZE < named.length) {
        await sleep(BATCH_DELAY_MS);
      }
    }

    const state: PipelineStatusState = {
      lastUpdated: new Date().toISOString(),
      pipelines: pipelineStatuses,
      totalPipelines,
      matchedPipelines,
      error: undefined
    };

    await savePipelineStatus(state);

  } catch (error: any) {
    console.error("Error in fetchPipelineStatus:", error);
    const errorState: PipelineStatusState = {
      lastUpdated: new Date().toISOString(),
      pipelines: [],
      totalPipelines: 0,
      matchedPipelines: 0,
      error: error.message || "Unknown error occurred"
    };
    await savePipelineStatus(errorState);
  }
}

async function approveAction(approval: PendingApproval): Promise<void> {
  const settings = await getSettings();

  if (!settings.accessKeyId || !settings.secretAccessKey || !settings.region) {
    throw new Error("Missing AWS credentials");
  }

  const client = await createCodePipelineClient(settings as any);

  const command = new PutApprovalResultCommand({
    pipelineName: approval.pipelineName,
    stageName: approval.stageName,
    actionName: approval.actionName,
    token: approval.token,
    result: {
      summary: 'Approved via Chrome Extension',
      status: 'Approved'
    }
  });

  await client.send(command);
}

async function updateAlarm() {
  const settings = await getSettings();
  // Default to 60 seconds if not set
  const intervalMs = settings.refreshIntervalMs || 60000;
  const intervalMinutes = Math.max(intervalMs / 60000, 0.5); // Minimum 30 seconds approx

  // Clear existing
  await chrome.alarms.clear(ALARM_NAME);

  // Create new
  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: intervalMinutes
  });
}

// Setup listeners
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    fetchPipelineStatus();
  }
});

chrome.runtime.onMessage.addListener((message: RefreshMessage | ApproveMessage, _sender, sendResponse) => {
  if (message.type === 'refreshNow') {
    fetchPipelineStatus().then(() => {
      sendResponse({ success: true });
    });
    return true; // Async response
  }

  if (message.type === 'approve') {
    approveAction(message.approval)
      .then(() => {
        // Refresh after approval to update the UI
        return fetchPipelineStatus();
      })
      .then(() => {
        sendResponse({ success: true });
      })
      .catch((error) => {
        console.error('Error approving action:', error);
        sendResponse({ success: false, error: error.message || 'Unknown error' });
      });
    return true; // Async response
  }
});

chrome.runtime.onInstalled.addListener(() => {
    updateAlarm();
    fetchPipelineStatus();
});

// Re-setup alarm if settings change
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    updateAlarm();
  }
});

// Also initialize on startup
updateAlarm();
