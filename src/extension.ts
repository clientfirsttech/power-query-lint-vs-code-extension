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

  // Check if MCP server is enabled
  const config = vscode.workspace.getConfiguration('powerQueryLint');
  const mcpEnabled = config.get<boolean>('mcpServer.enabled', true);
  
  if (mcpEnabled) {
    console.log('MCP server integration is enabled');
    // MCP server will be started based on mcp.json configuration
  }
}

/**
 * Deactivates the extension
 * This function is called when the extension is deactivated
 */
export function deactivate() {
  console.log('Power Query Lint extension has been deactivated');
}
