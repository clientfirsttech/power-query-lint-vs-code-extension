#!/usr/bin/env node

/**
 * pql-test CLI
 *
 * Command-line interface for discovering and executing Power Query tests
 * stored inside a PBIP (Power BI Project) model.
 *
 * Usage:
 *   pql-test retrieve-tests <modelPath>
 *   pql-test run-tests <modelPath> [--test <name>] [--verbose]
 *   pql-test check-prereqs
 */

import * as path from 'path';
import * as fs from 'fs';
import { execSync } from 'child_process';
import {
  retrieveTests,
  retrieveTestByName,
  runTestsFromModel,
  PqlTest,
  TestSuite,
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

  console.log(`\nFound ${tests.length} test(s):\n`);
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

function cmdRetrieveTests(modelPath: string, verbose: boolean): void {
  const absolutePath = path.resolve(modelPath);

  if (!fs.existsSync(absolutePath)) {
    console.error(`Error: Model path not found: ${absolutePath}`);
    process.exitCode = 1;
    return;
  }

  const tests = retrieveTests(absolutePath);
  printTests(tests, verbose);
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
  verbose: boolean
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

  const suite = runTestsFromModel(absolutePath, testName);
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
  retrieve-tests <modelPath>          List all tests discovered in a PBIP model
  retrieve-test  <modelPath> <name>   Show a specific test by name
  run-tests      <modelPath>          Run all tests in a PBIP model
  check-prereqs                       Verify prerequisites are installed

Options:
  --test <name>    Run or retrieve only the named test (alias for retrieve-test / run-tests filter)
  --verbose, -v    Show additional output (file paths, durations, source)
  --help,    -h    Show this help message
  --version, -V    Show version

Examples:
  pql-test retrieve-tests ./examples/samplemodel
  pql-test retrieve-test  ./examples/samplemodel "Sales Total Should Be Positive"
  pql-test run-tests      ./examples/samplemodel
  pql-test run-tests      ./examples/samplemodel --test "Sales Total Should Be Positive"
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
} {
  const positional: string[] = [];
  let command: string | undefined;
  let testName: string | undefined;
  let verbose = false;
  let help = false;
  let version = false;

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
    } else if (!arg.startsWith('-')) {
      if (!command) {
        command = arg;
      } else {
        positional.push(arg);
      }
    }
    i++;
  }

  return { command, positional, testName, verbose, help, version };
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function main(): void {
  const { command, positional, testName, verbose, help, version } = parseArgs(
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
        cmdRetrieveTests(modelPath, verbose);
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
      cmdRunTests(modelPath, testName, verbose);
      break;
    }

    default:
      console.error(`Error: Unknown command "${command}"\n`);
      printUsage();
      process.exitCode = 1;
  }
}

main();
