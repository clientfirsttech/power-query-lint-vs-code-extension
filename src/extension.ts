import * as vscode from 'vscode';

/**
 * Activates the Power Query Lint extension
 * This function is called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Power Query Lint extension is now active');

  // Register lint document command
  const lintDocumentCommand = vscode.commands.registerCommand(
    'powerquery-lint.lint',
    async () => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showInformationMessage('No active editor found');
        return;
      }

      if (editor.document.languageId !== 'powerquery') {
        vscode.window.showWarningMessage('Current file is not a Power Query file');
        return;
      }

      vscode.window.showInformationMessage('Linting Power Query document...');
      // TODO: Implement actual linting logic
    }
  );

  // Register lint workspace command
  const lintWorkspaceCommand = vscode.commands.registerCommand(
    'powerquery-lint.lintWorkspace',
    async () => {
      vscode.window.showInformationMessage('Linting Power Query workspace...');
      // TODO: Implement workspace linting logic
    }
  );

  // Register commands
  context.subscriptions.push(lintDocumentCommand);
  context.subscriptions.push(lintWorkspaceCommand);

  // Ensure required settings are configured
  configureMcpSettings();
}

/**
 * Ensures MCP inputs and chat tools settings are configured
 */
async function configureMcpSettings() {
  const config = vscode.workspace.getConfiguration();

  // Ensure mcp.inputs includes the subscription key prompt
  const mcpInputs = config.get<any[]>('mcp.inputs', []);
  const hasSubscriptionKey = mcpInputs.some(
    (input: any) => input.id === 'OCP_APIM_SUBSCRIPTION_KEY'
  );

  if (!hasSubscriptionKey) {
    const updatedInputs = [
      ...mcpInputs,
      {
        type: 'promptString',
        id: 'OCP_APIM_SUBSCRIPTION_KEY',
        description: 'Enter Subscription Key to Power Query Lint',
        password: true,
      },
    ];
    await config.update('mcp.inputs', updatedInputs, vscode.ConfigurationTarget.Global);
  }

  // Ensure the pqlint-mcp server is registered
  const mcpServers = config.get<Record<string, any>>('mcp.servers', {});
  if (!mcpServers['pqlint-mcp']) {
    const updatedServers = {
      ...mcpServers,
      'pqlint-mcp': {
        url: 'https://pqlint.com/api/mcp',
        type: 'http',
        headers: {
          'Ocp-Apim-Subscription-Key': '${input:OCP_APIM_SUBSCRIPTION_KEY}',
        },
      },
    };
    await config.update('mcp.servers', updatedServers, vscode.ConfigurationTarget.Global);
  }
}

/**
 * Deactivates the extension
 * This function is called when the extension is deactivated
 */
export function deactivate() {
  console.log('Power Query Lint extension has been deactivated');
}
