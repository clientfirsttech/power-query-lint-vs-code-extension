/**
 * CLI integration tests
 *
 * These tests exercise the CLI argument parsing and command behaviour by
 * spawning `node dist/cli.js` in a child process against a temporary
 * PBIP model.
 *
 * Run with: npm test
 */

import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { spawnSync } from 'child_process';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const CLI = path.join(__dirname, '..', '..', 'dist', 'cli.js');

interface CliResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

function runCli(args: string[], cwd?: string): CliResult {
  const result = spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    cwd: cwd ?? process.cwd(),
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    code: result.status,
  };
}

/** Create a temporary PBIP model with test .pq files */
function makeTempModel(tests: { name: string; source: string }[]): string {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-cli-test-'));
  const testsDir = path.join(tmpRoot, 'model.SemanticModel', 'tests');
  fs.mkdirSync(testsDir, { recursive: true });

  for (const t of tests) {
    const fileName = `${t.name.replace(/\s+/g, '_')}.pq`;
    fs.writeFileSync(path.join(testsDir, fileName), t.source, 'utf8');
  }

  return tmpRoot;
}

function makePqSource(testName: string): string {
  return (
    `// TestName: ${testName}\n` +
    `// TestDescription: Auto-generated test\n` +
    `let\n    Result = PQL.Assert("${testName}", true)\nin\n    Result\n`
  );
}

// ---------------------------------------------------------------------------
// Setup: ensure the CLI is compiled before the tests run
// ---------------------------------------------------------------------------

before(() => {
  // The CLI must be compiled; `npm run pretest` (tsc) is run before tests.
  if (!fs.existsSync(CLI)) {
    throw new Error(
      `CLI not found at ${CLI}. Run "npm run compile" before running tests.`
    );
  }
});

// ---------------------------------------------------------------------------
// --help / --version
// ---------------------------------------------------------------------------

describe('CLI meta flags', () => {
  it('prints usage when --help is passed', () => {
    const { stdout, code } = runCli(['--help']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('pql-test'), `Expected "pql-test" in help, got:\n${stdout}`);
    assert.ok(stdout.includes('retrieve-tests'));
    assert.ok(stdout.includes('run-tests'));
  });

  it('prints usage when no command is passed', () => {
    const { stdout, code } = runCli([]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('pql-test'));
  });

  it('prints version when --version is passed', () => {
    const { stdout, code } = runCli(['--version']);
    assert.equal(code, 0);
    // Should look like a semver string
    assert.match(stdout.trim(), /^\d+\.\d+\.\d+/);
  });
});

// ---------------------------------------------------------------------------
// check-prereqs
// ---------------------------------------------------------------------------

describe('check-prereqs command', () => {
  it('exits with code 0 (all prereqs satisfied in CI)', () => {
    const { code, stdout } = runCli(['check-prereqs']);
    // We are running in Node >=18 so prereqs should pass
    assert.equal(code, 0);
    assert.ok(stdout.includes('Node.js'));
  });
});

// ---------------------------------------------------------------------------
// retrieve-tests
// ---------------------------------------------------------------------------

describe('retrieve-tests command', () => {
  it('errors when modelPath is missing', () => {
    const { code, stderr } = runCli(['retrieve-tests']);
    assert.equal(code, 1);
    assert.ok(stderr.includes('modelPath') || stderr.includes('<modelPath>'));
  });

  it('errors when model path does not exist', () => {
    const { code, stderr } = runCli(['retrieve-tests', '/nonexistent/path']);
    assert.equal(code, 1);
    assert.ok(stderr.toLowerCase().includes('not found'));
  });

  it('reports "No tests found" for an empty model', () => {
    const tmpDir = makeTempModel([]);
    const { stdout, code } = runCli(['retrieve-tests', tmpDir]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('No tests found'));
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('lists tests from a model', () => {
    const tmpDir = makeTempModel([
      { name: 'Alpha Test', source: makePqSource('Alpha Test') },
      { name: 'Beta Test', source: makePqSource('Beta Test') },
    ]);
    const { stdout, code } = runCli(['retrieve-tests', tmpDir]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('Alpha Test'));
    assert.ok(stdout.includes('Beta Test'));
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('shows file path with --verbose flag', () => {
    const tmpDir = makeTempModel([
      { name: 'Verbose Test', source: makePqSource('Verbose Test') },
    ]);
    const { stdout, code } = runCli(['retrieve-tests', tmpDir, '--verbose']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('File:') || stdout.includes('.pq'));
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('retrieves a specific test via --test flag', () => {
    const tmpDir = makeTempModel([
      { name: 'Alpha Test', source: makePqSource('Alpha Test') },
      { name: 'Beta Test', source: makePqSource('Beta Test') },
    ]);
    const { stdout, code } = runCli([
      'retrieve-tests',
      tmpDir,
      '--test',
      'Alpha Test',
    ]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('Alpha Test'), 'Should show Alpha Test');
    assert.ok(!stdout.includes('Beta Test'), 'Should not show Beta Test');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('works with the real samplemodel', () => {
    const sampleModel = path.join(
      __dirname,
      '..',
      '..',
      'examples',
      'samplemodel'
    );
    const { stdout, code } = runCli(['retrieve-tests', sampleModel]);
    assert.equal(code, 0);
    // The samplemodel ships with known test names — verify at least one appears
    assert.ok(
      stdout.includes('Sales Total Should Be Positive') ||
        stdout.includes('Date Dimension Row Count Is Valid') ||
        stdout.includes('Product Category Count Matches Expected'),
      `Expected known samplemodel test names in output:\n${stdout}`
    );
  });
});

// ---------------------------------------------------------------------------
// retrieve-test (single test by name)
// ---------------------------------------------------------------------------

describe('retrieve-test command', () => {
  it('errors when both modelPath and name are missing', () => {
    const { code } = runCli(['retrieve-test']);
    assert.equal(code, 1);
  });

  it('errors when name is missing', () => {
    const tmpDir = makeTempModel([]);
    const { code } = runCli(['retrieve-test', tmpDir]);
    assert.equal(code, 1);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns code 1 when named test is not found', () => {
    const tmpDir = makeTempModel([
      { name: 'Real Test', source: makePqSource('Real Test') },
    ]);
    const { code, stdout } = runCli(['retrieve-test', tmpDir, 'Missing Test']);
    assert.equal(code, 1);
    assert.ok(stdout.includes('No test found'));
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('retrieves the correct test by name', () => {
    const tmpDir = makeTempModel([
      { name: 'Alpha Test', source: makePqSource('Alpha Test') },
      { name: 'Beta Test', source: makePqSource('Beta Test') },
    ]);
    const { stdout, code } = runCli(['retrieve-test', tmpDir, 'Beta Test']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('Beta Test'));
    assert.ok(!stdout.includes('Alpha Test'));
    fs.rmSync(tmpDir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// run-tests
// ---------------------------------------------------------------------------

describe('run-tests command', () => {
  it('errors when modelPath is missing', () => {
    const { code } = runCli(['run-tests']);
    assert.equal(code, 1);
  });

  it('errors when model path does not exist', () => {
    const { code, stderr } = runCli(['run-tests', '/nonexistent/path']);
    assert.equal(code, 1);
    assert.ok(stderr.toLowerCase().includes('not found'));
  });

  it('exits 0 and shows summary for an empty model', () => {
    const tmpDir = makeTempModel([]);
    const { stdout, code } = runCli(['run-tests', tmpDir]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('0 total'));
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('runs all tests and shows results', () => {
    const tmpDir = makeTempModel([
      { name: 'Test One', source: makePqSource('Test One') },
      { name: 'Test Two', source: makePqSource('Test Two') },
    ]);
    const { stdout, code } = runCli(['run-tests', tmpDir]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('2 total') || stdout.includes('2 passed'));
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('runs only the named test with --test flag', () => {
    const tmpDir = makeTempModel([
      { name: 'Test One', source: makePqSource('Test One') },
      { name: 'Test Two', source: makePqSource('Test Two') },
    ]);
    const { stdout, code } = runCli(['run-tests', tmpDir, '--test', 'Test One']);
    assert.equal(code, 0);
    assert.ok(stdout.includes('1 total') || stdout.includes('Test One'));
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('errors when --test specifies a nonexistent test', () => {
    const tmpDir = makeTempModel([
      { name: 'Test One', source: makePqSource('Test One') },
    ]);
    const { code, stderr } = runCli([
      'run-tests',
      tmpDir,
      '--test',
      'Nonexistent Test',
    ]);
    assert.equal(code, 1);
    assert.ok(stderr.includes('Nonexistent Test'));
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('runs samplemodel tests successfully', () => {
    const sampleModel = path.join(
      __dirname,
      '..',
      '..',
      'examples',
      'samplemodel'
    );
    const { stdout, code } = runCli(['run-tests', sampleModel]);
    assert.equal(code, 0);
    assert.ok(stdout.includes('passed'), `Expected "passed" in output:\n${stdout}`);
  });
});
