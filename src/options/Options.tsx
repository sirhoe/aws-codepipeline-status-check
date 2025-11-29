import { useEffect, useState } from 'react';
import { createCodePipelineClient } from '../awsClient';
import { getSettings, saveSettings } from '../storage';
import { Settings } from '../types';
import { ListPipelinesCommand } from "@aws-sdk/client-codepipeline";

export const Options = () => {
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [pipelineFilter, setPipelineFilter] = useState('');
  const [refreshValue, setRefreshValue] = useState(60);
  const [refreshUnit, setRefreshUnit] = useState<'seconds' | 'minutes'>('seconds');
  const [showSecret, setShowSecret] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const settings = await getSettings();
    if (settings.accessKeyId) setAccessKeyId(settings.accessKeyId);
    if (settings.secretAccessKey) setSecretAccessKey(settings.secretAccessKey);
    if (settings.region) setRegion(settings.region);
    if (settings.pipelineFilter) setPipelineFilter(settings.pipelineFilter);
    
    if (settings.refreshIntervalMs) {
      if (settings.refreshIntervalMs >= 60000 && settings.refreshIntervalMs % 60000 === 0) {
        setRefreshValue(settings.refreshIntervalMs / 60000);
        setRefreshUnit('minutes');
      } else {
        setRefreshValue(settings.refreshIntervalMs / 1000);
        setRefreshUnit('seconds');
      }
    }
  };

  const handleSave = async () => {
    if (!accessKeyId || !secretAccessKey || !region) {
      setStatusMsg({ text: 'Access Key, Secret Key, and Region are required.', type: 'error' });
      return;
    }

    const ms = refreshUnit === 'minutes' ? refreshValue * 60000 : refreshValue * 1000;
    
    const settings: Settings = {
      accessKeyId,
      secretAccessKey,
      region,
      pipelineFilter,
      refreshIntervalMs: ms
    };

    try {
      await saveSettings(settings);
      setStatusMsg({ text: 'Settings saved successfully.', type: 'success' });
      setTimeout(() => setStatusMsg(null), 3000);
    } catch (err) {
      setStatusMsg({ text: 'Failed to save settings.', type: 'error' });
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
      const client = createCodePipelineClient({ accessKeyId, secretAccessKey, region });
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

  return (
    <div className="container">
      <h1>AWS CodePipeline Status Settings</h1>
      
      <div className="security-notice">
        <strong>Security Notice:</strong> AWS access keys are stored locally in this browser profile using Chrome's local storage and are used only to call AWS APIs from this extension. Use a dedicated, least-privilege IAM user for read-only CodePipeline access.
      </div>

      <div className="form-group">
        <label>AWS Access Key ID</label>
        <input 
          type="text" 
          value={accessKeyId} 
          onChange={(e) => setAccessKeyId(e.target.value)} 
          placeholder="AKIA..."
        />
      </div>

      <div className="form-group">
        <label>AWS Secret Access Key</label>
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
      </div>

      <div className="form-group">
        <label>AWS Region</label>
        <input 
          type="text" 
          value={region} 
          onChange={(e) => setRegion(e.target.value)} 
          placeholder="us-east-1"
        />
      </div>

      <div className="form-group">
        <label>Pipeline Name Filter (Optional)</label>
        <input 
          type="text" 
          value={pipelineFilter} 
          onChange={(e) => setPipelineFilter(e.target.value)} 
          placeholder="substring match (case-insensitive)"
        />
        <small>Leave empty to show all pipelines.</small>
      </div>

      <div className="form-group">
        <label>Refresh Interval</label>
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
      </div>

      <div className="actions">
        <button className="btn-primary" onClick={handleSave}>Save Settings</button>
        <button className="btn-secondary" onClick={handleTestConnection} disabled={isTesting}>
          {isTesting ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {statusMsg && (
        <div className={`message ${statusMsg.type}`}>
          {statusMsg.text}
        </div>
      )}
    </div>
  );
};

