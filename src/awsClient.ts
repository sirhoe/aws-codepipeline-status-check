import { CodePipelineClient } from "@aws-sdk/client-codepipeline";
import { STSClient, AssumeRoleCommand } from "@aws-sdk/client-sts";
import { Settings } from "./types";

export async function createCodePipelineClient(settings: Pick<Settings, 'accessKeyId' | 'secretAccessKey' | 'region' | 'roleArn'>): Promise<CodePipelineClient> {
    if (!settings.accessKeyId || !settings.secretAccessKey || !settings.region) {
        throw new Error("Missing AWS credentials or region");
    }

    const baseCredentials = {
        accessKeyId: settings.accessKeyId,
        secretAccessKey: settings.secretAccessKey,
    };

    if (settings.roleArn) {
        try {
            const stsClient = new STSClient({
                region: settings.region,
                credentials: baseCredentials
            });

            const command = new AssumeRoleCommand({
                RoleArn: settings.roleArn,
                RoleSessionName: "ChromeExtensionSession"
            });

            const response = await stsClient.send(command);

            if (!response.Credentials || !response.Credentials.AccessKeyId || !response.Credentials.SecretAccessKey || !response.Credentials.SessionToken) {
                throw new Error("Failed to assume role: Invalid credentials returned");
            }

            return new CodePipelineClient({
                region: settings.region,
                credentials: {
                    accessKeyId: response.Credentials.AccessKeyId,
                    secretAccessKey: response.Credentials.SecretAccessKey,
                    sessionToken: response.Credentials.SessionToken
                }
            });
        } catch (error: any) {
            console.error("Error assuming role:", error);
            throw new Error(`Failed to assume role: ${error.message}`);
        }
    }

    // NOTE: Credentials are passed directly to the client and are not stored or logged.
    return new CodePipelineClient({
        region: settings.region,
        credentials: baseCredentials,
    });
}
