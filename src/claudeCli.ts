import { execFile } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/** Marketplace that points at this extension's folder. Local only; nothing is published. */
export const marketplaceName = 'power-query-lint-extension';
export const pluginId = `power-query-lint@${marketplaceName}`;

export interface CliResult {
  code: number;
  stdout: string;
  stderr: string;
}

export interface PluginStatus {
  /** Folder the marketplace currently reads from, if registered. */
  marketplacePath?: string;
  installed: boolean;
  installedVersion?: string;
}

/** Returns the first candidate that runs `--version` successfully. */
export async function findCli(candidates: string[]): Promise<string | undefined> {
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && !fs.existsSync(candidate)) {
      continue;
    }
    try {
      const result = await runCli(candidate, ['--version'], 15000);
      if (result.code === 0) {
        return candidate;
      }
    } catch {
      // try the next candidate
    }
  }
  return undefined;
}

export function runCli(cli: string, args: string[], timeoutMs = 120000): Promise<CliResult> {
  return new Promise((resolve, reject) => {
    execFile(cli, args, { timeout: timeoutMs, windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
      if (error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        reject(error);
        return;
      }
      const code = error ? (typeof (error as { code?: unknown }).code === 'number' ? (error as { code: number }).code : 1) : 0;
      resolve({ code, stdout: String(stdout), stderr: String(stderr) });
    });
  });
}

function comparablePath(value: string): string {
  let resolved = path.resolve(value);
  try {
    resolved = fs.realpathSync.native(resolved);
  } catch {
    // keep the resolved path when it cannot be read
  }
  return process.platform === 'win32' ? resolved.toLowerCase() : resolved;
}

export function samePath(a: string | undefined, b: string): boolean {
  return a !== undefined && comparablePath(a) === comparablePath(b);
}

async function listJson<T>(cli: string, args: string[]): Promise<T[]> {
  const result = await runCli(cli, args, 60000);
  if (result.code !== 0) {
    return [];
  }
  try {
    const parsed = JSON.parse(result.stdout);
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

export async function getStatus(cli: string): Promise<PluginStatus> {
  const marketplaces = await listJson<{ name: string; path?: string }>(cli, ['plugin', 'marketplace', 'list', '--json']);
  const plugins = await listJson<{ id: string; version?: string }>(cli, ['plugin', 'list', '--json']);
  const marketplace = marketplaces.find((m) => m.name === marketplaceName);
  const plugin = plugins.find((p) => p.id === pluginId);
  return { marketplacePath: marketplace?.path, installed: plugin !== undefined, installedVersion: plugin?.version };
}

export interface EnableResult {
  ok: boolean;
  log: string[];
}

/** Registers extensionPath as a local marketplace and installs or updates the plugin at user scope. */
export async function enablePlugin(cli: string, extensionPath: string, extensionVersion: string): Promise<EnableResult> {
  const log: string[] = [];
  const step = async (args: string[]): Promise<boolean> => {
    const result = await runCli(cli, args);
    log.push(`> claude ${args.join(' ')}`, result.stdout.trim(), result.stderr.trim());
    return result.code === 0;
  };

  const status = await getStatus(cli);
  if (!samePath(status.marketplacePath, extensionPath)) {
    if (!(await step(['plugin', 'marketplace', 'add', extensionPath, '--scope', 'user']))) {
      return { ok: false, log };
    }
  }
  if (!status.installed) {
    return { ok: await step(['plugin', 'install', pluginId, '--scope', 'user']), log };
  }
  if (status.installedVersion !== extensionVersion || !samePath(status.marketplacePath, extensionPath)) {
    return { ok: await step(['plugin', 'update', pluginId, '--scope', 'user']), log };
  }
  return { ok: true, log };
}

export async function disablePlugin(cli: string): Promise<EnableResult> {
  const log: string[] = [];
  const status = await getStatus(cli);
  let ok = true;
  if (status.installed) {
    const result = await runCli(cli, ['plugin', 'uninstall', pluginId, '--scope', 'user']);
    log.push(`> claude plugin uninstall ${pluginId} --scope user`, result.stdout.trim(), result.stderr.trim());
    ok = result.code === 0;
  }
  if (status.marketplacePath !== undefined) {
    const result = await runCli(cli, ['plugin', 'marketplace', 'remove', marketplaceName]);
    log.push(`> claude plugin marketplace remove ${marketplaceName}`, result.stdout.trim(), result.stderr.trim());
    ok = ok && result.code === 0;
  }
  return { ok, log };
}

/** Commands a user can run by hand when the CLI cannot be found or a step fails. */
export function manualCommands(extensionPath: string): string {
  return [`claude plugin marketplace add "${extensionPath}" --scope user`, `claude plugin install ${pluginId} --scope user`].join('\n');
}
