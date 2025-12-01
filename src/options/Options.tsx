import { useEffect, useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { createCodePipelineClient } from '../awsClient';
import { FormGroup } from '../components/FormGroup';
import { Settings } from '../types';
import { ListPipelinesCommand } from "@aws-sdk/client-codepipeline";

export const Options = () => {
  const { settings, saveSettings } = useSettings();
  
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [roleArn, setRoleArn] = useState('');
  const [pipelineFilter, setPipelineFilter] = useState('');
  const [refreshValue, setRefreshValue] = useState(60);
  const [refreshUnit, setRefreshUnit] = useState<'seconds' | 'minutes'>('seconds');
  
  const [showSecret, setShowSecret] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.accessKeyId) setAccessKeyId(settings.accessKeyId);
      if (settings.secretAccessKey) setSecretAccessKey(settings.secretAccessKey);
      if (settings.region) setRegion(settings.region);
      if (settings.roleArn) setRoleArn(settings.roleArn);
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
    }
  }, [settings]);

  const handleSave = async () => {
    if (!accessKeyId || !secretAccessKey || !region) {
      setStatusMsg({ text: 'Access Key, Secret Key, and Region are required.', type: 'error' });
      return;
    }

    const ms = refreshUnit === 'minutes' ? refreshValue * 60000 : refreshValue * 1000;
    
    const newSettings: Settings = {
      accessKeyId,
      secretAccessKey,
      region,
      roleArn,
      pipelineFilter,
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

  return (
    <div className="container">
      <h1>AWS CodePipeline Status Settings</h1>
      
      <div className="security-notice">
        <strong>Security Notice:</strong> AWS access keys are stored locally in this browser profile using Chrome's local storage and are used only to call AWS APIs from this extension. Use a dedicated, least-privilege IAM user for read-only CodePipeline access.
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
        label="Pipeline Name Filter (Optional)"
        helpText="Leave empty to show all pipelines."
      >
        <input 
          type="text" 
          value={pipelineFilter} 
          onChange={(e) => setPipelineFilter(e.target.value)} 
          placeholder="substring match (case-insensitive)"
        />
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
      </div>

      {statusMsg && (
        <div className={`message ${statusMsg.type}`}>
          {statusMsg.text}
        </div>
      )}
    </div>
  );
};
