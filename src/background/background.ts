import {
  ListPipelinesCommand,
  ListPipelineExecutionsCommand,
  PipelineSummary,
  PipelineExecutionSummary as AWSPipelineExecutionSummary
} from "@aws-sdk/client-codepipeline";
import { DOMParser as XmldomDOMParser } from "@xmldom/xmldom";
import { createCodePipelineClient } from "../awsClient";
import { getSettings, savePipelineStatus } from "../storage";
import { PipelineStatus, PipelineStatusState, PipelineExecutionSummary } from "../types";

// Ensure DOM APIs exist for AWS SDK XML parsing inside the service worker.
const globalAny = globalThis as any;
if (typeof globalAny.DOMParser === "undefined") {
  globalAny.DOMParser = XmldomDOMParser;
}
if (typeof globalAny.Node === "undefined") {
  globalAny.Node = {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  };
}

const ALARM_NAME = 'poll_codepipeline';

async function fetchPipelineStatus() {
  try {
    const settings = await getSettings();
    
    if (!settings.accessKeyId || !settings.secretAccessKey || !settings.region) {
      console.log("Missing credentials, skipping poll.");
      return;
    }

    // Safe to cast because we checked for existence, though Typescript might complain if we don't be explicit
    // We handle roleArn being optional
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
    const normalizedFilter = settings.pipelineFilter?.trim().toLowerCase();
    if (normalizedFilter) {
      filteredPipelines = pipelines.filter(p => p.name?.toLowerCase().includes(normalizedFilter));
    }
    const matchedPipelines = filteredPipelines.length;

    const pipelineStatuses: PipelineStatus[] = [];

    for (const pipeline of filteredPipelines) {
      if (!pipeline.name) continue;

      try {
        const executionsCommand = new ListPipelineExecutionsCommand({
          pipelineName: pipeline.name,
          maxResults: 5
        });
        
        const executionsResponse = await client.send(executionsCommand);
        
        const mappedExecutions: PipelineExecutionSummary[] = (executionsResponse.pipelineExecutionSummaries || []).map((exec: AWSPipelineExecutionSummary) => ({
          pipelineExecutionId: exec.pipelineExecutionId || '',
          status: exec.status || 'Unknown',
          startTime: exec.startTime ? exec.startTime.toISOString() : undefined,
          lastUpdateTime: exec.lastUpdateTime ? exec.lastUpdateTime.toISOString() : undefined
        }));

        pipelineStatuses.push({
          pipelineName: pipeline.name,
          executions: mappedExecutions
        });

      } catch (err) {
        console.error(`Error fetching executions for pipeline ${pipeline.name}:`, err);
        // We continue to other pipelines even if one fails
        pipelineStatuses.push({
            pipelineName: pipeline.name,
            executions: [] // Or maybe indicate error in this specific pipeline status? Plan doesn't specify per-pipeline error.
        });
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

async function updateAlarm() {
  const settings = await getSettings();
  // Default to 60 seconds if not set
  const intervalMs = settings.refreshIntervalMs || 60000;
  const intervalMinutes = Math.max(intervalMs / 60000, 0.5); // Minimum 30 seconds approx, chrome alarms min is 1 min usually but let's try.
  
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

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'refreshNow') {
    fetchPipelineStatus().then(() => {
      sendResponse({ success: true });
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
    // Optionally trigger a fetch if settings changed significantly, but user might be typing.
    // Let's just update alarm and let the next tick handle it, or user can manual refresh.
  }
});

// Also initialize on startup
updateAlarm();

