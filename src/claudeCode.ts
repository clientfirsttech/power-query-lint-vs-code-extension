import * as path from 'path';
import * as vscode from 'vscode';
import { disablePlugin, enablePlugin, findCli, getStatus, manualCommands, samePath } from './claudeCli';

const stateKey = 'claudeCode.state';
type ConsentState = 'enabled' | 'declined';

/**
 * Opt-in support for Claude Code. The extension never changes Claude Code's settings unless the user
 * chooses to enable it (prompt, command, or a previously given consent being refreshed after an update).
 */
export function registerClaudeCodeSupport(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('Power Query Lint: Claude Code');
  const version = String(context.extension.packageJSON.version);

  const locateCli = (): Promise<string | undefined> => {
    const candidates: string[] = [];
    const claudeCode = vscode.extensions.getExtension('anthropic.claude-code');
    if (claudeCode) {
      const binary = process.platform === 'win32' ? 'claude.exe' : 'claude';
      candidates.push(path.join(claudeCode.extensionPath, 'resources', 'native-binary', binary));
    }
    candidates.push('claude');
    return findCli(candidates);
  };

  const showManualFallback = async (reason: string): Promise<void> => {
    const commands = manualCommands(context.extensionPath);
    output.appendLine(`${reason}\nRun these commands in a terminal where "claude" works:\n${commands}`);
    const choice = await vscode.window.showWarningMessage(
      `${reason} You can enable Power Query Lint for Claude Code by running two commands yourself.`,
      'Copy commands',
      'Show details'
    );
    if (choice === 'Copy commands') {
      await vscode.env.clipboard.writeText(commands);
    } else if (choice === 'Show details') {
      output.show(true);
    }
  };

  const enable = async (interactive: boolean): Promise<void> => {
    const cli = await locateCli();
    if (!cli) {
      if (interactive) {
        await showManualFallback('Claude Code was not found.');
      }
      return;
    }
    const result = await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'Enabling Power Query Lint for Claude Code...' },
      () => enablePlugin(cli, context.extensionPath, version)
    );
    output.appendLine(result.log.filter(Boolean).join('\n'));
    if (!result.ok) {
      if (interactive) {
        await showManualFallback('Enabling Power Query Lint for Claude Code failed.');
      }
      return;
    }
    await context.globalState.update(stateKey, 'enabled' satisfies ConsentState);
    if (interactive) {
      vscode.window.showInformationMessage(
        'Power Query Lint is enabled for Claude Code. Start a new Claude Code session to use it. Linting also needs the OCP_APIM_SUBSCRIPTION_KEY environment variable.'
      );
    }
  };

  const disable = async (): Promise<void> => {
    const cli = await locateCli();
    if (!cli) {
      vscode.window.showWarningMessage('Claude Code was not found, so nothing was changed.');
      return;
    }
    const result = await disablePlugin(cli);
    output.appendLine(result.log.filter(Boolean).join('\n'));
    await context.globalState.update(stateKey, 'declined' satisfies ConsentState);
    if (result.ok) {
      vscode.window.showInformationMessage('Power Query Lint was removed from Claude Code.');
    } else {
      vscode.window.showWarningMessage('Removing Power Query Lint from Claude Code did not fully succeed. See the output channel.');
      output.show(true);
    }
  };

  const promptOnce = async (): Promise<void> => {
    const choice = await vscode.window.showInformationMessage(
      'Power Query Lint can also provide its agents and skills to Claude Code. Enable it for Claude Code?',
      'Enable',
      'Not now',
      "Don't ask again"
    );
    if (choice === 'Enable') {
      await enable(true);
    } else if (choice === "Don't ask again") {
      await context.globalState.update(stateKey, 'declined' satisfies ConsentState);
    }
  };

  const startup = async (): Promise<void> => {
    const state = context.globalState.get<ConsentState>(stateKey);
    if (state === 'declined') {
      return;
    }
    const cli = await locateCli();
    if (!cli) {
      return;
    }
    const status = await getStatus(cli);
    if (state === 'enabled') {
      // consent was already given: keep the registration pointed at this extension version
      if (!status.installed || !samePath(status.marketplacePath, context.extensionPath) || status.installedVersion !== version) {
        await enable(false);
      }
      return;
    }
    if (status.installed) {
      return; // already set up some other way; do not nag
    }
    if (vscode.workspace.getConfiguration('powerQueryLint').get<boolean>('claudeCode.promptOnStartup', true)) {
      await promptOnce();
    }
  };

  context.subscriptions.push(
    output,
    vscode.commands.registerCommand('powerquery-lint.enableClaudeCode', () => enable(true)),
    vscode.commands.registerCommand('powerquery-lint.disableClaudeCode', disable)
  );

  startup().catch((error) => output.appendLine(`Claude Code check failed: ${String(error)}`));
}
