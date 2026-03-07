#!/usr/bin/env node

/**
 * pql-test CLI
 *
 * Command-line interface for discovering and executing DAX tests stored inside
 * a PBIP (Power BI Project) semantic model's DAXQueries/ folder.
 *
 * Tests are *.Tests.dax files executed via Invoke-ASCmd (Analysis Services
 * PowerShell module), mirroring the Invoke-DQVTesting pattern.
 *
 * Connection resolution:
 *   - When --tenant-id, --workspace-id, and --dataset-id are all provided the
 *     CLI connects to the remote Power BI Premium / Fabric XMLA endpoint.
 *   - Otherwise the CLI auto-detects a locally-open Power BI Desktop instance
 *     using the local Analysis Services port file, provided a .pbip file exists
 *     in <modelPath>.
 *
 * Usage:
 *   pql-test retrieve-tests <modelPath>
 *   pql-test run-tests      <modelPath> [--test <name>] [--verbose]
 *                                        [--tenant-id <id>]
 *                                        [--workspace-id <id>]
 *                                        [--dataset-id <id>]
 *   pql-test check-prereqs
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import {
  retrieveTests,
  retrieveTestByName,
  runTestsFromModel,
  resolveXmlaConnection,
  PqlTest,
  TestSuite,
  XmlaConnectionOptions,
} from './pql-test-runner';

// ---------------------------------------------------------------------------
// Prerequisites check
// ---------------------------------------------------------------------------

interface PrereqResult {
  name: string;
  ok: boolean;
  detail: string;
}

/**
 * Verify that all prerequisites required to run pql-test are met.
 * Returns an array of prerequisite check results.
 */
export function checkPrereqs(): PrereqResult[] {
  const results: PrereqResult[] = [];

  // Node.js version check (>= 18)
  const nodeVersion = process.versions.node;
  const [major] = nodeVersion.split('.').map(Number);
  results.push({
    name: 'Node.js >= 18',
    ok: major >= 18,
    detail: `Current version: ${nodeVersion}`,
  });

  // npm check — ensure npm is accessible
  try {
    const npmVersion = execSync('npm --version', { encoding: 'utf8' }).trim();
    results.push({
      name: 'npm installed',
      ok: true,
      detail: `npm ${npmVersion}`,
    });
  } catch {
    results.push({
      name: 'npm installed',
      ok: false,
      detail: 'npm not found on PATH',
    });
  }

  // PowerShell (pwsh) check — required for Invoke-ASCmd
  try {
    const pwshVersion = execSync('pwsh --version', { encoding: 'utf8' }).trim();
    results.push({
      name: 'PowerShell (pwsh) installed',
      ok: true,
      detail: pwshVersion,
    });
  } catch {
    results.push({
      name: 'PowerShell (pwsh) installed',
      ok: false,
      detail:
        'pwsh not found on PATH — required for XMLA test execution via Invoke-ASCmd. ' +
        'Install from https://github.com/PowerShell/PowerShell',
    });
  }

  // SqlServer PowerShell module check (provides Invoke-ASCmd)
  try {
    const checkCmd =
      'pwsh -NoProfile -NonInteractive -Command "if (Get-Module -ListAvailable -Name SqlServer) { Write-Output ok } else { Write-Output missing }"';
    const moduleStatus = execSync(checkCmd, { encoding: 'utf8' }).trim();
    const hasModule = moduleStatus.includes('ok');
    results.push({
      name: 'SqlServer PowerShell module (Invoke-ASCmd)',
      ok: hasModule,
      detail: hasModule
        ? 'SqlServer module available'
        : 'Module not found — install with: Install-Module SqlServer -Scope CurrentUser',
    });
  } catch {
    results.push({
      name: 'SqlServer PowerShell module (Invoke-ASCmd)',
      ok: false,
      detail: 'Could not check module availability (pwsh unavailable)',
    });
  }

  return results;
}

// ---------------------------------------------------------------------------
// Output helpers
// ---------------------------------------------------------------------------

function printPrereqs(prereqs: PrereqResult[]): void {
  console.log('\nPrerequisites check:');
  for (const p of prereqs) {
    const status = p.ok ? '✅' : '❌';
    console.log(`  ${status} ${p.name} — ${p.detail}`);
  }
  const allOk = prereqs.every((p) => p.ok);
  console.log(allOk ? '\nAll prerequisites met.\n' : '\nSome prerequisites are missing.\n');
}

function printTests(tests: PqlTest[], verbose: boolean): void {
  if (tests.length === 0) {
    console.log('No tests found.');
    return;
  }

  console.log(`\nFound ${tests.length} DAX test suite(s):\n`);
  for (const t of tests) {
    console.log(`  • ${t.name}`);
    if (t.description) {
      console.log(`    ${t.description}`);
    }
    if (verbose) {
      console.log(`    File: ${t.filePath}`);
    }
  }
  console.log('');
}

function printResults(suite: TestSuite, verbose: boolean): void {
  const { results, passed, failed, total, modelPath } = suite;

  console.log(`\nTest run for: ${modelPath}`);
  console.log(`Results: ${passed} passed, ${failed} failed, ${total} total\n`);

  for (const r of results) {
    const icon = r.passed ? '✅' : '❌';
    console.log(`  ${icon} ${r.testName}`);
    if (verbose || !r.passed) {
      console.log(`    ${r.message}`);
      if (r.error) {
        console.log(`    Error: ${r.error}`);
      }
      if (r.duration !== undefined) {
        console.log(`    Duration: ${r.duration}ms`);
      }
    }
  }

  if (total === 0) {
    console.log('  No tests were executed.');
  }

  console.log('');
}

// ---------------------------------------------------------------------------
// Command implementations
// ---------------------------------------------------------------------------

function cmdCheckPrereqs(): void {
  const prereqs = checkPrereqs();
  printPrereqs(prereqs);
  const allOk = prereqs.every((p) => p.ok);
  process.exitCode = allOk ? 0 : 1;
}

function cmdRetrieveTests(
  modelPath: string,
  verbose: boolean,
  connOpts: XmlaConnectionOptions
): void {
  const absolutePath = path.resolve(modelPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: Model path not found: ${absolutePath}`);
    process.exitCode = 1;
    return;
  }

  const tests = retrieveTests(absolutePath);
  printTests(tests, verbose);

  // Show connection info when verbose
  if (verbose && tests.length > 0) {
    const conn = resolveXmlaConnection(absolutePath, connOpts);
    if (conn) {
      console.log(`Connection: ${conn.server} / ${conn.catalog}`);
    } else {
      console.log(
        'Connection: none detected — open the model in Power BI Desktop or supply --tenant-id, --workspace-id, --dataset-id to run tests.'
      );
    }
  }
}

function cmdRetrieveTestByName(
  modelPath: string,
  testName: string,
  verbose: boolean
): void {
  const absolutePath = path.resolve(modelPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: Model path not found: ${absolutePath}`);
    process.exitCode = 1;
    return;
  }

  const test = retrieveTestByName(absolutePath, testName);
  if (!test) {
    console.log(`No test found with name: "${testName}"`);
    process.exitCode = 1;
    return;
  }

  printTests([test], verbose);
  if (verbose) {
    console.log('Source:');
    console.log(test.source);
  }
}

function cmdRunTests(
  modelPath: string,
  testName: string | undefined,
  verbose: boolean,
  connOpts: XmlaConnectionOptions
): void {
  const absolutePath = path.resolve(modelPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: Model path not found: ${absolutePath}`);
    process.exitCode = 1;
    return;
  }

  if (testName) {
    // Check that the named test exists before running
    const found = retrieveTestByName(absolutePath, testName);
    if (!found) {
      console.error(`Error: No test found with name: "${testName}"`);
      process.exitCode = 1;
      return;
    }
  }

  // Show which XMLA connection will be used
  const conn = resolveXmlaConnection(absolutePath, connOpts);
  if (conn) {
    console.log(`\nXMLA connection: ${conn.server} / catalog: ${conn.catalog}`);
  } else {
    console.warn(
      '\nWarning: No XMLA connection detected. Tests will be reported as skipped.\n' +
        'Options:\n' +
        '  • Open the model in Power BI Desktop (auto-detected)\n' +
        '  • Supply --tenant-id <id> --workspace-id <id> --dataset-id <id>\n'
    );
  }

  const suite = runTestsFromModel(absolutePath, testName, connOpts);
  printResults(suite, verbose);

  // Exit with non-zero code if any tests failed
  process.exitCode = suite.failed > 0 ? 1 : 0;
}

// ---------------------------------------------------------------------------
// Argument parsing
// ---------------------------------------------------------------------------

function printUsage(): void {
  const pkg = JSON.parse(
    fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
  ) as { version: string };

  console.log(`pql-test v${pkg.version}

Usage:
  pql-test <command> [options]

Commands:
  retrieve-tests <modelPath>          List all DAX test suites discovered in a PBIP model
  retrieve-test  <modelPath> <name>   Show a specific test suite by name
  run-tests      <modelPath>          Run all DAX test suites in a PBIP model
  check-prereqs                       Verify prerequisites are installed

Connection options (for run-tests):
  --tenant-id    <id>   Azure AD tenant ID (required for remote XMLA)
  --workspace-id <id>   Power BI workspace GUID (required for remote XMLA)
  --dataset-id   <id>   Dataset / semantic model GUID (required for remote XMLA)

  When none of the above are supplied the CLI auto-detects a locally-open
  Power BI Desktop instance from the .pbip file in <modelPath>.

Other options:
  --test <name>    Run or retrieve only the named test suite
  --verbose, -v    Show additional output (file paths, durations, source, connection)
  --help,    -h    Show this help message
  --version, -V    Show version

Examples:
  # Discover DAX test suites
  pql-test retrieve-tests ./examples/SampleModel

  # Run against a locally-open Power BI Desktop model (auto-detected)
  pql-test run-tests ./examples/SampleModel

  # Run against a remote Power BI Premium / Fabric workspace
  pql-test run-tests ./examples/SampleModel \\
    --tenant-id  00000000-0000-0000-0000-000000000000 \\
    --workspace-id 11111111-1111-1111-1111-111111111111 \\
    --dataset-id   22222222-2222-2222-2222-222222222222

  # Run a single test suite by name
  pql-test run-tests ./examples/SampleModel --test "Calculations.DEV.Tests"

  pql-test check-prereqs
`);
}

function parseArgs(argv: string[]): {
  command: string | undefined;
  positional: string[];
  testName: string | undefined;
  verbose: boolean;
  help: boolean;
  version: boolean;
  connOpts: XmlaConnectionOptions;
} {
  const positional: string[] = [];
  let command: string | undefined;
  let testName: string | undefined;
  let verbose = false;
  let help = false;
  let version = false;
  const connOpts: XmlaConnectionOptions = {};

  const args = argv.slice(2); // strip node + script path
  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--version' || arg === '-V') {
      version = true;
    } else if (arg === '--verbose' || arg === '-v') {
      verbose = true;
    } else if ((arg === '--test' || arg === '-t') && i + 1 < args.length) {
      testName = args[++i];
    } else if (arg === '--tenant-id' && i + 1 < args.length) {
      connOpts.tenantId = args[++i];
    } else if (arg === '--workspace-id' && i + 1 < args.length) {
      connOpts.workspaceId = args[++i];
    } else if (arg === '--dataset-id' && i + 1 < args.length) {
      connOpts.datasetId = args[++i];
    } else if (!arg.startsWith('-')) {
      if (!command) {
        command = arg;
      } else {
        positional.push(arg);
      }
    }
    i++;
  }

  return { command, positional, testName, verbose, help, version, connOpts };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  const { command, positional, testName, verbose, help, version, connOpts } = parseArgs(
    process.argv
  );

  if (version) {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')
    ) as { version: string };
    console.log(pkg.version);
    return;
  }

  if (help || !command) {
    printUsage();
    return;
  }

  switch (command) {
    case 'check-prereqs':
      cmdCheckPrereqs();
      break;

    case 'retrieve-tests': {
      const [modelPath] = positional;
      if (!modelPath) {
        console.error('Error: <modelPath> is required.\n');
        printUsage();
        process.exitCode = 1;
        return;
      }
      if (testName) {
        // --test flag was supplied: behave like retrieve-test
        cmdRetrieveTestByName(modelPath, testName, verbose);
      } else {
        cmdRetrieveTests(modelPath, verbose, connOpts);
      }
      break;
    }

    case 'retrieve-test': {
      const [modelPath, nameArg] = positional;
      const resolvedName = nameArg ?? testName;
      if (!modelPath || !resolvedName) {
        console.error('Error: <modelPath> and <name> are required.\n');
        printUsage();
        process.exitCode = 1;
        return;
      }
      cmdRetrieveTestByName(modelPath, resolvedName, verbose);
      break;
    }

    case 'run-tests': {
      const [modelPath] = positional;
      if (!modelPath) {
        console.error('Error: <modelPath> is required.\n');
        printUsage();
        process.exitCode = 1;
        return;
      }
      cmdRunTests(modelPath, testName, verbose, connOpts);
      break;
    }

    default:
      console.error(`Error: Unknown command "${command}"\n`);
      printUsage();
      process.exitCode = 1;
  }
}

main();
