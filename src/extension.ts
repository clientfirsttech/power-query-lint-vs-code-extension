import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * Gets the path to the agent destination directory
 */
function getAgentDirectory(): string {
  const homeDir = os.homedir();
  return path.join(homeDir, '.github', 'agents');
}

/**
 * Gets the path to the agent file in the user's .github/agents directory
 */
function getAgentFilePath(): string {
  return path.join(getAgentDirectory(), 'pq-lint-checker.md');
}

/**
 * Gets the path to the agent source file in the extension
 */
function getAgentSourcePath(context: vscode.ExtensionContext): string {
  return path.join(context.extensionPath, 'agent.md');
}

/**
 * Ensures the agent directory exists
 */
function ensureAgentDirectory(): void {
  const agentDir = getAgentDirectory();
  if (!fs.existsSync(agentDir)) {
    fs.mkdirSync(agentDir, { recursive: true });
    console.log(`Created agent directory: ${agentDir}`);
  }
}

/**
 * Checks if the agent file needs to be updated
 * Returns true if the agent file doesn't exist or has different content
 */
function shouldUpdateAgent(context: vscode.ExtensionContext): boolean {
  const sourcePath = getAgentSourcePath(context);
  const destPath = getAgentFilePath();

  // If agent file doesn't exist, it needs to be installed
  if (!fs.existsSync(destPath)) {
    return true;
  }

  // If source file doesn't exist, don't update
  if (!fs.existsSync(sourcePath)) {
    console.warn('Agent source file not found in extension');
    return false;
  }

  try {
    const sourceContent = fs.readFileSync(sourcePath, 'utf8');
    const destContent = fs.readFileSync(destPath, 'utf8');
    
    // Compare content to see if update is needed
    return sourceContent !== destContent;
  } catch (error) {
    console.error('Error comparing agent files:', error);
    return true; // Update on error to be safe
  }
}

/**
 * Installs or updates the agent file
 * This is idempotent - it only updates if content has changed
 */
async function installOrUpdateAgent(context: vscode.ExtensionContext): Promise<void> {
  try {
    const sourcePath = getAgentSourcePath(context);
    const destPath = getAgentFilePath();

    // Check if source file exists
    if (!fs.existsSync(sourcePath)) {
      console.warn('Agent source file not found, skipping installation');
      return;
    }

    // Ensure the agent directory exists
    ensureAgentDirectory();

    // Check if update is needed
    if (!shouldUpdateAgent(context)) {
      console.log('Agent file is up to date, skipping installation');
      return;
    }

    // Read source content
    const sourceContent = fs.readFileSync(sourcePath, 'utf8');

    // Write to destination
    fs.writeFileSync(destPath, sourceContent, 'utf8');

    console.log(`Agent installed/updated successfully: ${destPath}`);
    
    // Show notification to user
    vscode.window.showInformationMessage(
      'Power Query Lint: pq-lint-checker agent installed successfully'
    );
  } catch (error) {
    console.error('Error installing/updating agent:', error);
    vscode.window.showErrorMessage(
      `Failed to install pq-lint-checker agent: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}


/**
 * Activates the Power Query Lint extension
 * This function is called when the extension is activated
 */
export function activate(context: vscode.ExtensionContext) {
  console.log('Power Query Lint extension is now active');

  // Install or update the pq-lint-checker agent
  installOrUpdateAgent(context);

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
