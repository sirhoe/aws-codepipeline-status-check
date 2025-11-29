import { CodePipelineClient } from "@aws-sdk/client-codepipeline";
import { Settings } from "./types";

export function createCodePipelineClient(settings: Pick<Settings, 'accessKeyId' | 'secretAccessKey' | 'region'>): CodePipelineClient {
    if (!settings.accessKeyId || !settings.secretAccessKey || !settings.region) {
        throw new Error("Missing AWS credentials or region");
    }

    // NOTE: Credentials are passed directly to the client and are not stored or logged.
    return new CodePipelineClient({
        region: settings.region,
        credentials: {
            accessKeyId: settings.accessKeyId,
            secretAccessKey: settings.secretAccessKey,
        },
    });
}

