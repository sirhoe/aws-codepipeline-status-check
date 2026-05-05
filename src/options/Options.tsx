import React, { useEffect, useRef, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { createCodePipelineClient, createIAMClient } from '../awsClient';
import { FormGroup } from '../components/FormGroup';
import { Settings } from '../types';
import { ListPipelinesCommand } from "@aws-sdk/client-codepipeline";
import { CreateAccessKeyCommand, DeleteAccessKeyCommand } from "@aws-sdk/client-iam";

export const Options = () => {
  const { settings, saveSettings } = useSettings();
  
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [roleArn, setRoleArn] = useState('');
  const [pipelineFilters, setPipelineFilters] = useState<string[]>([]);
  const [filterDraft, setFilterDraft] = useState('');
  const chipInputRef = useRef<HTMLInputElement>(null);
  const [refreshValue, setRefreshValue] = useState(60);
  const [refreshUnit, setRefreshUnit] = useState<'seconds' | 'minutes'>('seconds');
  
  const [showSecret, setShowSecret] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [rotateLog, setRotateLog] = useState<string[]>([]);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.accessKeyId) setAccessKeyId(settings.accessKeyId);
      if (settings.secretAccessKey) setSecretAccessKey(settings.secretAccessKey);
      if (settings.region) setRegion(settings.region);
      if (settings.roleArn) setRoleArn(settings.roleArn);
      if (settings.pipelineFilters) setPipelineFilters(settings.pipelineFilters);
      
      if (settings.refreshIntervalMs) {
        if (settings.refreshIntervalMs >= 60000 && settings.refreshIntervalMs % 60000 === 0) {
          setRefreshValue(settings.refreshIntervalMs / 60000);
          setRefreshUnit('minutes');
        } else {
          setRefreshValue(settings.refreshIntervalMs / 1000);
          setRefreshUnit('seconds');
        }
      }
    }
  }, [settings]);

  const handleSave = async () => {
    if (!accessKeyId || !secretAccessKey || !region) {
      setStatusMsg({ text: 'Access Key, Secret Key, and Region are required.', type: 'error' });
      return;
    }

    const ms = refreshUnit === 'minutes' ? refreshValue * 60000 : refreshValue * 1000;

    const draftTrimmed = filterDraft.trim();
    const finalFilters = draftTrimmed && !pipelineFilters.some(x => x.toLowerCase() === draftTrimmed.toLowerCase())
      ? [...pipelineFilters, draftTrimmed]
      : pipelineFilters;
    if (draftTrimmed) setFilterDraft('');

    const newSettings: Settings = {
      accessKeyId,
      secretAccessKey,
      region,
      roleArn,
      pipelineFilters: finalFilters,
      refreshIntervalMs: ms
    };

    try {
      await saveSettings(newSettings);
      setStatusMsg({ text: 'Settings saved successfully.', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ text: 'Failed to save settings.', type: 'error' });
    }
  };

  const handleRotateKey = async () => {
    if (!accessKeyId || !secretAccessKey || !region) {
      setStatusMsg({ text: 'Please fill in credentials before rotating.', type: 'error' });
      return;
    }

    setShowRotateConfirm(true);
  };

  const confirmRotateKey = async () => {
    setShowRotateConfirm(false);

    const lines: string[] = [];
    const log = (msg: string) => {
      const ts = new Date().toLocaleTimeString();
      lines.push(`[${ts}] ${msg}`);
      setRotateLog([...lines]);
    };

    setIsRotating(true);
    setStatusMsg(null);
    setRotateLog([]);
    const oldAccessKeyId = accessKeyId;

    try {
      log('Creating new IAM access key...');
      const iamClient = createIAMClient({ accessKeyId, secretAccessKey, region });
      const createResult = await iamClient.send(new CreateAccessKeyCommand({}));

      const newKey = createResult.AccessKey;
      if (!newKey?.AccessKeyId || !newKey?.SecretAccessKey) {
        throw new Error('AWS did not return valid new credentials.');
      }
      log(`New key created: ${newKey.AccessKeyId}`);

      log('Testing new key against CodePipeline...');
      try {
        const testClient = await createCodePipelineClient({
          accessKeyId: newKey.AccessKeyId,
          secretAccessKey: newKey.SecretAccessKey,
          region,
          roleArn,
        });
        await testClient.send(new ListPipelinesCommand({ maxResults: 1 }));
        log('New key validated successfully.');
      } catch (testError: any) {
        log(`ERROR: New key validation failed — ${testError.message}`);
        log(`Cleaning up new key ${newKey.AccessKeyId}...`);
        await iamClient.send(new DeleteAccessKeyCommand({ AccessKeyId: newKey.AccessKeyId })).catch((e: any) => {
          log(`WARNING: Could not delete new key during cleanup — ${e.message}`);
        });
        log('Cleanup done. Old key preserved.');
        throw new Error(`New key validation failed: ${testError.message}`);
      }

      log('Saving new credentials to storage...');
      const ms = refreshUnit === 'minutes' ? refreshValue * 60000 : refreshValue * 1000;
      await saveSettings({ accessKeyId: newKey.AccessKeyId, secretAccessKey: newKey.SecretAccessKey, region, roleArn, pipelineFilters, refreshIntervalMs: ms });
      setAccessKeyId(newKey.AccessKeyId);
      setSecretAccessKey(newKey.SecretAccessKey);
      log('Credentials saved.');

      log(`Deleting old key ${oldAccessKeyId}...`);
      await iamClient.send(new DeleteAccessKeyCommand({ AccessKeyId: oldAccessKeyId })).catch((e: any) => {
        log(`WARNING: Could not delete old key — ${e.message}`);
      });
      log('Old key deleted. Rotation complete.');

      setStatusMsg({ text: 'Key rotated successfully. New credentials saved.', type: 'success' });
      setTimeout(() => setStatusMsg(null), 5000);
    } catch (error: any) {
      console.error('Key rotation failed', error);
      setStatusMsg({ text: `Key rotation failed: ${error.message}`, type: 'error' });
    } finally {
      setIsRotating(false);
    }
  };

  const handleTestConnection = async () => {
    if (!accessKeyId || !secretAccessKey || !region) {
      setStatusMsg({ text: 'Please fill in credentials to test.', type: 'error' });
      return;
    }

    setIsTesting(true);
    setStatusMsg(null);

    try {
      const client = await createCodePipelineClient({ accessKeyId, secretAccessKey, region, roleArn });
      const command = new ListPipelinesCommand({ maxResults: 1 });
      await client.send(command);
      setStatusMsg({ text: 'Connection OK!', type: 'success' });
    } catch (error: any) {
      console.error("Test connection failed", error);
      setStatusMsg({ text: `Connection Failed: ${error.message}`, type: 'error' });
    } finally {
      setIsTesting(false);
    }
  };

  const addFilter = (raw: string) => {
    const v = raw.trim();
    if (!v) return;
    setPipelineFilters(arr =>
      arr.some(x => x.toLowerCase() === v.toLowerCase()) ? arr : [...arr, v]
    );
  };

  const commitDraft = () => {
    if (filterDraft.trim()) addFilter(filterDraft);
    setFilterDraft('');
  };

  const onDraftChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    if (v.includes(',')) {
      const parts = v.split(',');
      const tail = parts.pop() ?? '';
      parts.forEach(addFilter);
      setFilterDraft(tail);
    } else {
      setFilterDraft(v);
    }
  };

  const onDraftKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      if (filterDraft.trim()) { e.preventDefault(); commitDraft(); }
    } else if (e.key === 'Backspace' && filterDraft === '' && pipelineFilters.length > 0) {
      e.preventDefault();
      setPipelineFilters(arr => arr.slice(0, -1));
    }
  };

  return (
    <div className="container">
      <h1>AWS CodePipeline Status Settings</h1>
      
      <div className="security-notice">
        <strong>Security Notice:</strong> Your AWS Secret Access Key is encrypted before being stored locally in this browser profile. Credentials are used only to call AWS APIs from this extension. Use a dedicated, least-privilege IAM user for read-only CodePipeline access.
      </div>

      <FormGroup label="AWS Access Key ID">
        <input 
          type="text" 
          value={accessKeyId} 
          onChange={(e) => setAccessKeyId(e.target.value)} 
          placeholder="AKIA..."
        />
      </FormGroup>

      <FormGroup label="AWS Secret Access Key">
        <div className="password-input">
          <input 
            type={showSecret ? "text" : "password"} 
            value={secretAccessKey} 
            onChange={(e) => setSecretAccessKey(e.target.value)} 
            placeholder="Secret Key..."
          />
          <button type="button" onClick={() => setShowSecret(!showSecret)}>
            {showSecret ? "Hide" : "Show"}
          </button>
        </div>
      </FormGroup>

      <FormGroup label="AWS Region">
        <input 
          type="text" 
          value={region} 
          onChange={(e) => setRegion(e.target.value)} 
          placeholder="us-east-1"
        />
      </FormGroup>

      <FormGroup 
        label="Role ARN to Assume (Optional)" 
        helpText="Specify an IAM Role ARN if your user needs to assume a role to access CodePipeline."
      >
        <input 
          type="text" 
          value={roleArn} 
          onChange={(e) => setRoleArn(e.target.value)} 
          placeholder="arn:aws:iam::ACCOUNT_ID:role/ROLE_NAME"
        />
      </FormGroup>

      <FormGroup
        label="Pipeline Name Filters (Optional)"
        helpText="Press Enter or comma to add. Empty list shows all pipelines. Substring match, case-insensitive."
      >
        <div className="chip-field" onClick={() => chipInputRef.current?.focus()}>
          {pipelineFilters.map((f, i) => (
            <span className="chip" key={`${f}-${i}`}>
              {f}
              <button
                type="button"
                className="chip-remove"
                aria-label={`Remove ${f}`}
                onClick={() => setPipelineFilters(arr => arr.filter((_, j) => j !== i))}
              >×</button>
            </span>
          ))}
          <input
            ref={chipInputRef}
            className="chip-input"
            type="text"
            value={filterDraft}
            onChange={onDraftChange}
            onKeyDown={onDraftKeyDown}
            onBlur={commitDraft}
            placeholder={pipelineFilters.length ? '' : 'e.g. backend-prod'}
          />
        </div>
      </FormGroup>

      <FormGroup label="Refresh Interval">
        <div className="refresh-input">
          <input 
            type="number" 
            min="1"
            value={refreshValue} 
            onChange={(e) => setRefreshValue(Number(e.target.value))} 
          />
          <select value={refreshUnit} onChange={(e) => setRefreshUnit(e.target.value as any)}>
            <option value="seconds">Seconds</option>
            <option value="minutes">Minutes</option>
          </select>
        </div>
      </FormGroup>

      <div className="actions">
        <button className="btn-primary" onClick={handleSave}>Save Settings</button>
        <button className="btn-secondary" onClick={handleTestConnection} disabled={isTesting}>
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
        <button className="btn-secondary" onClick={handleRotateKey} disabled={isRotating || showRotateConfirm}>
          {isRotating ? 'Rotating...' : 'Rotate Key'}
        </button>
      </div>

      {showRotateConfirm && (
        <div className="rotate-confirm">
          <span>This will create a new AWS access key, test it, then delete the current key. Continue?</span>
          <div className="rotate-confirm-actions">
            <button className="btn-primary" onClick={confirmRotateKey}>Confirm</button>
            <button className="btn-secondary" onClick={() => setShowRotateConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {statusMsg && (
        <div className={`message ${statusMsg.type}`}>
          <span>{statusMsg.text}</span>
          {statusMsg.type === 'error' && (
            <button type="button" className="message-copy-btn" onClick={() => navigator.clipboard.writeText(statusMsg.text)}>Copy</button>
          )}
        </div>
      )}

      {rotateLog.length > 0 && (
        <div className="rotate-log">
          <div className="rotate-log-header">
            Key Rotation Log
            <div className="rotate-log-actions">
              <button type="button" className="rotate-log-btn" onClick={() => navigator.clipboard.writeText(rotateLog.join('\n'))}>Copy</button>
              <button type="button" className="rotate-log-btn" onClick={() => setRotateLog([])}>Clear</button>
            </div>
          </div>
          <pre className="rotate-log-body">{rotateLog.join('\n')}</pre>
        </div>
      )}
    </div>
  );
};
