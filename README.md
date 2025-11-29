# AWS CodePipeline Status - Chrome Extension

A secure, client-side Chrome extension to monitor your AWS CodePipeline statuses directly from your browser toolbar.

## Overview

This extension allows you to track the status of your AWS CodePipelines without opening the AWS Console. It runs entirely within your browser, storing credentials locally and communicating directly with AWS APIs. No backend service or third-party server is involved.

## Features

- **Real-time Dashboard**: View status of multiple pipelines in a popup.
- **Detailed History**: Expand pipelines to see recent execution history.
- **Secure**: Credentials stored in `chrome.storage.local` and never leave your browser (except to AWS).
- **Filtering**: Filter pipelines by name.
- **Auto-Refresh**: Configurable polling interval.
- **Manual Refresh**: Instant refresh button.

## Security

- **Local Storage**: AWS Access Keys are stored in Chrome's Local Storage (unencrypted by Chrome, but sandboxed to the extension).
- **Direct Communication**: The extension calls AWS CodePipeline APIs directly using the AWS SDK for JavaScript v3.
- **No Analytics**: No usage data is collected or sent anywhere.

**Recommendation**: Always use a dedicated IAM User with minimum required permissions (Read-Only).

## Prerequisites

- Google Chrome, Microsoft Edge, or any Chromium-based browser.
- An AWS Account.
- An IAM User with programmatic access keys.

## IAM Setup

Create a dedicated IAM user with the following policy to ensure least-privilege access.

1. Go to AWS IAM Console -> Users -> Create user.
2. Name it `CodePipelineMonitor` (or similar).
3. Attach policies directly -> Create policy -> JSON.
4. Paste the following policy:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "codepipeline:ListPipelines",
                "codepipeline:ListPipelineExecutions",
                "codepipeline:GetPipeline",
                "codepipeline:GetPipelineState",
                "codepipeline:GetPipelineExecution"
            ],
            "Resource": "*"
        }
    ]
}
```

5. Finish creating the user.
6. Create Access Keys (Security credentials -> Create access key -> Third-party service).
7. Copy the **Access Key ID** and **Secret Access Key**.

## Installation

### From Source

1. Clone this repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load into Chrome:
   - Open `chrome://extensions/`
   - Enable "Developer mode" (top right toggle).
   - Click "Load unpacked".
   - Select the `dist` folder created by the build step.

## Configuration

1. Click the extension icon in the toolbar.
2. Click "Settings" (or it will prompt you if not configured).
3. Enter your:
   - **Access Key ID**
   - **Secret Access Key**
   - **Region** (e.g., `us-east-1`)
   - **Pipeline Filter** (optional, e.g., `prod` to match "MyApp-Prod")
   - **Refresh Interval** (default 60 seconds)
4. Click "Test Connection" to verify.
5. Click "Save Settings".

## Usage

- **View Status**: Click the icon to see the latest status.
- **Refresh**: Click the refresh icon (↻) in the popup header for an immediate update.
- **History**: Click on a pipeline row to expand/collapse execution history.

## Development

To develop on this extension:

1. Run watch mode:
   ```bash
   npm run dev
   ```
2. Load the `dist` folder in Chrome.
3. Changes will trigger a rebuild, but you may need to close/reopen the popup or reload the extension in `chrome://extensions` for background script changes.

## Troubleshooting

- **Connection Failed**: Check your Region and Internet connection. Ensure the IAM user has the correct permissions.
- **No Pipelines Found**: Check your Filter setting. It is a case-insensitive substring match.
- **Errors**: Open the extension options page and test connection. Open Chrome DevTools (Right click popup -> Inspect) to see console logs.

## License

MIT

