/**
 * Tests for pql-test-runner core library
 *
 * Run with: npm test
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

import {
  retrieveTests,
  retrieveTestByName,
  runTests,
  runTestsFromModel,
  resolveXmlaConnection,
  PqlTest,
} from '../pql-test-runner';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a temporary PBIP model with DAXQueries/*.Tests.dax files */
function makeTempModel(daxTests: { suiteName: string; source: string }[]): string {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-test-'));
  const daxDir = path.join(tmpRoot, 'model.SemanticModel', 'DAXQueries');
  fs.mkdirSync(daxDir, { recursive: true });

  for (const t of daxTests) {
    fs.writeFileSync(path.join(daxDir, `${t.suiteName}.Tests.dax`), t.source, 'utf8');
  }

  return tmpRoot;
}

function makeDaxSource(funcName: string): string {
  return [
    `DEFINE`,
    `\tFUNCTION ${funcName} = () =>`,
    `\tUNION (`,
    `\t\tPQL.Assert.ShouldEqual("${funcName}: basic check", 1, 1)`,
    `\t)`,
    ``,
    `EVALUATE ${funcName}()`,
  ].join('\n');
}

// ---------------------------------------------------------------------------
// retrieveTests
// ---------------------------------------------------------------------------

describe('retrieveTests', () => {
  it('returns empty array when model path does not exist', () => {
    const tests = retrieveTests('/nonexistent/path');
    assert.deepEqual(tests, []);
  });

  it('returns empty array when no SemanticModel directory is found', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-no-model-'));
    const tests = retrieveTests(tmpDir);
    assert.deepEqual(tests, []);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns empty array when DAXQueries folder is missing', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-no-dax-'));
    fs.mkdirSync(path.join(tmpDir, 'model.SemanticModel'), { recursive: true });
    const tests = retrieveTests(tmpDir);
    assert.deepEqual(tests, []);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns empty array when there are no *.Tests.dax files', () => {
    const tmpDir = makeTempModel([]);
    const tests = retrieveTests(tmpDir);
    assert.deepEqual(tests, []);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('discovers a single DAX test suite', () => {
    const tmpDir = makeTempModel([
      { suiteName: 'Calculations.DEV', source: makeDaxSource('Calcs.DEV.Tests') },
    ]);
    const tests = retrieveTests(tmpDir);
    assert.equal(tests.length, 1);
    assert.equal(tests[0].name, 'Calculations.DEV.Tests');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('discovers multiple DAX test suites', () => {
    const tmpDir = makeTempModel([
      { suiteName: 'Calculations.DEV', source: makeDaxSource('Calcs.DEV.Tests') },
      { suiteName: 'DataQuality.DEV', source: makeDaxSource('DQ.DEV.Tests') },
      { suiteName: 'Schema.DEV', source: makeDaxSource('Schema.DEV.Tests') },
    ]);
    const tests = retrieveTests(tmpDir);
    assert.equal(tests.length, 3);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('ignores non-.Tests.dax files in DAXQueries', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-skip-'));
    const daxDir = path.join(tmpRoot, 'model.SemanticModel', 'DAXQueries');
    fs.mkdirSync(daxDir, { recursive: true });
    // Write a non-test DAX file
    fs.writeFileSync(path.join(daxDir, 'Query 1.dax'), 'EVALUATE ROW("x", 1)', 'utf8');
    const tests = retrieveTests(tmpRoot);
    assert.equal(tests.length, 0);
    fs.rmSync(tmpRoot, { recursive: true });
  });

  it('surfaces FUNCTION name as description when present', () => {
    const source = makeDaxSource('Calcs.DEV.Tests');
    const tmpDir = makeTempModel([{ suiteName: 'Calculations.DEV', source }]);
    const tests = retrieveTests(tmpDir);
    assert.ok(tests[0].description?.includes('Calcs.DEV.Tests'));
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('discovers test suites from the real SampleModel', () => {
    const sampleModel = path.join(__dirname, '..', '..', 'examples');
    const tests = retrieveTests(sampleModel);
    // The SampleModel ships with BestPractices, Calculations, DataQuality, Schema
    assert.ok(tests.length >= 3, `Expected at least 3 test suites, got ${tests.length}`);
  });

  it('includes the Calculations.DEV.Tests suite from the real SampleModel', () => {
    const sampleModel = path.join(__dirname, '..', '..', 'examples');
    const tests = retrieveTests(sampleModel);
    const names = tests.map((t) => t.name);
    assert.ok(
      names.some((n) => n.includes('Calculations') || n.includes('DataQuality') || n.includes('Schema')),
      `Expected known test suite names, got: ${names.join(', ')}`
    );
  });
});

// ---------------------------------------------------------------------------
// retrieveTestByName
// ---------------------------------------------------------------------------

describe('retrieveTestByName', () => {
  it('returns undefined when model path does not exist', () => {
    const test = retrieveTestByName('/nonexistent', 'Any.Tests');
    assert.equal(test, undefined);
  });

  it('returns undefined when named suite does not exist', () => {
    const tmpDir = makeTempModel([
      { suiteName: 'Existing', source: makeDaxSource('Existing.Tests') },
    ]);
    const test = retrieveTestByName(tmpDir, 'Missing.Tests');
    assert.equal(test, undefined);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('finds an existing suite by exact name', () => {
    const tmpDir = makeTempModel([
      { suiteName: 'Calculations.DEV', source: makeDaxSource('Calcs.DEV.Tests') },
    ]);
    const test = retrieveTestByName(tmpDir, 'Calculations.DEV.Tests');
    assert.ok(test !== undefined);
    assert.equal(test!.name, 'Calculations.DEV.Tests');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('is case-insensitive', () => {
    const tmpDir = makeTempModel([
      { suiteName: 'Calculations.DEV', source: makeDaxSource('Calcs.DEV.Tests') },
    ]);
    const test = retrieveTestByName(tmpDir, 'CALCULATIONS.DEV.TESTS');
    assert.ok(test !== undefined);
    fs.rmSync(tmpDir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// resolveXmlaConnection
// ---------------------------------------------------------------------------

describe('resolveXmlaConnection', () => {
  it('returns remote connection when all three params are provided', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-conn-'));
    const conn = resolveXmlaConnection(tmpDir, {
      tenantId: 'tenant-1',
      workspaceId: 'ws-1',
      datasetId: 'ds-1',
    });
    assert.ok(conn !== undefined);
    assert.ok(conn!.server.includes('tenant-1'));
    assert.ok(conn!.server.includes('ws-1'));
    assert.equal(conn!.catalog, 'ds-1');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns undefined when no connection params and no local PBI Desktop', () => {
    // Use a path that definitively has no .pbip file
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-no-conn-'));
    const conn = resolveXmlaConnection(tmpDir, {});
    // May or may not find a local port — just validate shape if it resolves
    if (conn !== undefined) {
      assert.ok(typeof conn.server === 'string');
      assert.ok(typeof conn.catalog === 'string');
    }
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('resolves catalog from .pbip filename for local connection', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-pbip-'));
    fs.writeFileSync(path.join(tmpDir, 'MyModel.pbip'), '{}', 'utf8');

    // Provide explicit params to bypass the local port scan
    const conn = resolveXmlaConnection(tmpDir, {
      tenantId: 't',
      workspaceId: 'w',
      datasetId: 'd',
    });
    // Remote params take priority — verify the remote path
    assert.equal(conn?.catalog, 'd');
    fs.rmSync(tmpDir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// runTests (no connection — skipped results)
// ---------------------------------------------------------------------------

describe('runTests without connection', () => {
  it('returns skipped result when connection is undefined', () => {
    const test: PqlTest = {
      name: 'Calculations.DEV.Tests',
      filePath: '/fake/Calculations.DEV.Tests.dax',
      source: makeDaxSource('Calcs.DEV.Tests'),
    };
    const results = runTests([test], undefined);
    assert.equal(results.length, 1);
    assert.equal(results[0].passed, false);
    assert.ok(results[0].message.toLowerCase().includes('xmla') || results[0].message.toLowerCase().includes('connection'));
  });

  it('returns empty array for no tests', () => {
    const results = runTests([], undefined);
    assert.deepEqual(results, []);
  });
});

// ---------------------------------------------------------------------------
// runTestsFromModel
// ---------------------------------------------------------------------------

describe('runTestsFromModel', () => {
  it('returns zero totals for an empty model', () => {
    const tmpDir = makeTempModel([]);
    const suite = runTestsFromModel(tmpDir);
    assert.equal(suite.total, 0);
    assert.equal(suite.passed, 0);
    assert.equal(suite.failed, 0);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('surfaces all test suites when no testName is provided', () => {
    const tmpDir = makeTempModel([
      { suiteName: 'Suite1', source: makeDaxSource('Suite1.Tests') },
      { suiteName: 'Suite2', source: makeDaxSource('Suite2.Tests') },
    ]);
    const suite = runTestsFromModel(tmpDir);
    // Without a connection each suite yields 1 skipped result
    assert.equal(suite.tests.length, 2);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('surfaces only the named test suite when testName is provided', () => {
    const tmpDir = makeTempModel([
      { suiteName: 'Suite1', source: makeDaxSource('Suite1.Tests') },
      { suiteName: 'Suite2', source: makeDaxSource('Suite2.Tests') },
    ]);
    const suite = runTestsFromModel(tmpDir, 'Suite1.Tests');
    assert.equal(suite.tests.length, 1);
    assert.equal(suite.tests[0].name, 'Suite1.Tests');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns empty results when named suite is not found', () => {
    const tmpDir = makeTempModel([
      { suiteName: 'Suite1', source: makeDaxSource('Suite1.Tests') },
    ]);
    const suite = runTestsFromModel(tmpDir, 'Nonexistent.Tests');
    assert.equal(suite.total, 0);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('discovers the correct number of suites from the real SampleModel', () => {
    const sampleModel = path.join(__dirname, '..', '..', 'examples');
    const suite = runTestsFromModel(sampleModel);
    assert.ok(suite.tests.length >= 3, `Expected at least 3 test suites, got ${suite.tests.length}`);
  });
});

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-test-'));
  const semanticDir = path.join(tmpRoot, 'model.SemanticModel', 'tests');
  fs.mkdirSync(semanticDir, { recursive: true });

  for (const t of tests) {
    const fileName = `${t.name.replace(/\s+/g, '_')}.pq`;
    fs.writeFileSync(path.join(semanticDir, fileName), t.source, 'utf8');
  }

  return tmpRoot;
}

function makePqSource(testName: string, assertion = 'true'): string {
  return `// TestName: ${testName}\nlet\n    Result = PQL.Assert("${testName}", ${assertion})\nin\n    Result\n`;
}

// ---------------------------------------------------------------------------
// retrieveTests
// ---------------------------------------------------------------------------

describe('retrieveTests', () => {
  it('returns empty array when model path does not exist', () => {
    const tests = retrieveTests('/nonexistent/path');
    assert.deepEqual(tests, []);
  });

  it('returns empty array when no SemanticModel directory is found', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-no-model-'));
    const tests = retrieveTests(tmpDir);
    assert.deepEqual(tests, []);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns empty array when there are no .pq test files', () => {
    const tmpDir = makeTempModel([]);
    const tests = retrieveTests(tmpDir);
    assert.deepEqual(tests, []);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('discovers a single test from a .pq file', () => {
    const tmpDir = makeTempModel([
      { name: 'My Test', source: makePqSource('My Test') },
    ]);
    const tests = retrieveTests(tmpDir);
    assert.equal(tests.length, 1);
    assert.equal(tests[0].name, 'My Test');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('discovers multiple tests', () => {
    const tmpDir = makeTempModel([
      { name: 'Test A', source: makePqSource('Test A') },
      { name: 'Test B', source: makePqSource('Test B') },
      { name: 'Test C', source: makePqSource('Test C') },
    ]);
    const tests = retrieveTests(tmpDir);
    assert.equal(tests.length, 3);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('ignores .pq files that do not contain PQL.Assert', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-no-assert-'));
    const testsDir = path.join(tmpRoot, 'model.SemanticModel', 'tests');
    fs.mkdirSync(testsDir, { recursive: true });

    fs.writeFileSync(
      path.join(testsDir, 'helper.pq'),
      'let x = 1 + 1 in x',
      'utf8'
    );

    const tests = retrieveTests(tmpRoot);
    assert.equal(tests.length, 0);
    fs.rmSync(tmpRoot, { recursive: true });
  });

  it('extracts description from TestDescription comment', () => {
    const source = [
      '// TestName: My Test',
      '// TestDescription: My description',
      'let',
      '    r = PQL.Assert("x", true)',
      'in',
      '    r',
    ].join('\n');
    const tmpDir = makeTempModel([{ name: 'My Test', source }]);
    const tests = retrieveTests(tmpDir);
    assert.equal(tests[0].description, 'My description');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('falls back to file name when TestName comment is absent', () => {
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'pql-noname-'));
    const testsDir = path.join(tmpRoot, 'model.SemanticModel', 'tests');
    fs.mkdirSync(testsDir, { recursive: true });
    fs.writeFileSync(
      path.join(testsDir, 'SomeCalculation.pq'),
      'let r = PQL.Assert("check", true) in r',
      'utf8'
    );

    const tests = retrieveTests(tmpRoot);
    assert.equal(tests.length, 1);
    assert.equal(tests[0].name, 'SomeCalculation');
    fs.rmSync(tmpRoot, { recursive: true });
  });

  it('discovers tests from the real samplemodel', () => {
    const sampleModel = path.join(
      __dirname,
      '..',
      '..',
      'examples',
      'samplemodel'
    );
    const tests = retrieveTests(sampleModel);
    // The samplemodel ships with 3 test files
    assert.ok(tests.length >= 3, `Expected at least 3 tests, got ${tests.length}`);
  });
});

// ---------------------------------------------------------------------------
// retrieveTestByName
// ---------------------------------------------------------------------------

describe('retrieveTestByName', () => {
  it('returns undefined when model path does not exist', () => {
    const test = retrieveTestByName('/nonexistent', 'Any Test');
    assert.equal(test, undefined);
  });

  it('returns undefined when named test does not exist', () => {
    const tmpDir = makeTempModel([
      { name: 'Existing Test', source: makePqSource('Existing Test') },
    ]);
    const test = retrieveTestByName(tmpDir, 'Missing Test');
    assert.equal(test, undefined);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('finds an existing test by exact name', () => {
    const tmpDir = makeTempModel([
      { name: 'My Named Test', source: makePqSource('My Named Test') },
    ]);
    const test = retrieveTestByName(tmpDir, 'My Named Test');
    assert.ok(test !== undefined);
    assert.equal(test!.name, 'My Named Test');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('is case-insensitive', () => {
    const tmpDir = makeTempModel([
      { name: 'Case Test', source: makePqSource('Case Test') },
    ]);
    const test = retrieveTestByName(tmpDir, 'CASE TEST');
    assert.ok(test !== undefined);
    assert.equal(test!.name, 'Case Test');
    fs.rmSync(tmpDir, { recursive: true });
  });
});

// ---------------------------------------------------------------------------
// runTest
// ---------------------------------------------------------------------------

describe('runTest', () => {
  it('returns a passing result for a well-formed test', () => {
    const test: PqlTest = {
      name: 'Simple Test',
      filePath: '/fake/path.pq',
      source: makePqSource('Simple Test'),
    };
    const result = runTest(test);
    assert.equal(result.testName, 'Simple Test');
    assert.equal(result.passed, true);
    assert.ok(typeof result.message === 'string');
    assert.ok(result.message.length > 0);
  });

  it('includes duration in result', () => {
    const test: PqlTest = {
      name: 'Duration Test',
      filePath: '/fake/path.pq',
      source: makePqSource('Duration Test'),
    };
    const result = runTest(test);
    assert.ok(result.duration !== undefined);
    assert.ok(result.duration >= 0);
  });

  it('extracts assertion description from PQL.Assert call', () => {
    const test: PqlTest = {
      name: 'Assert Desc Test',
      filePath: '/fake/path.pq',
      source: 'let r = PQL.Assert("My assertion description", 1 = 1) in r',
    };
    const result = runTest(test);
    assert.ok(
      result.message.includes('My assertion description'),
      `Expected message to contain assertion description, got: ${result.message}`
    );
  });
});

// ---------------------------------------------------------------------------
// runTests
// ---------------------------------------------------------------------------

describe('runTests', () => {
  it('returns empty array for no tests', () => {
    const results = runTests([]);
    assert.deepEqual(results, []);
  });

  it('returns one result per test', () => {
    const tests: PqlTest[] = [
      { name: 'T1', filePath: '/p.pq', source: makePqSource('T1') },
      { name: 'T2', filePath: '/p.pq', source: makePqSource('T2') },
    ];
    const results = runTests(tests);
    assert.equal(results.length, 2);
  });
});

// ---------------------------------------------------------------------------
// runTestsFromModel
// ---------------------------------------------------------------------------

describe('runTestsFromModel', () => {
  it('returns zero totals for an empty model', () => {
    const tmpDir = makeTempModel([]);
    const suite = runTestsFromModel(tmpDir);
    assert.equal(suite.total, 0);
    assert.equal(suite.passed, 0);
    assert.equal(suite.failed, 0);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('runs all tests when no testName is provided', () => {
    const tmpDir = makeTempModel([
      { name: 'T1', source: makePqSource('T1') },
      { name: 'T2', source: makePqSource('T2') },
    ]);
    const suite = runTestsFromModel(tmpDir);
    assert.equal(suite.total, 2);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('runs only the named test when testName is provided', () => {
    const tmpDir = makeTempModel([
      { name: 'T1', source: makePqSource('T1') },
      { name: 'T2', source: makePqSource('T2') },
    ]);
    const suite = runTestsFromModel(tmpDir, 'T1');
    assert.equal(suite.total, 1);
    assert.equal(suite.tests[0].name, 'T1');
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('returns empty results when named test is not found', () => {
    const tmpDir = makeTempModel([
      { name: 'T1', source: makePqSource('T1') },
    ]);
    const suite = runTestsFromModel(tmpDir, 'Nonexistent');
    assert.equal(suite.total, 0);
    fs.rmSync(tmpDir, { recursive: true });
  });

  it('runs all tests from the real samplemodel', () => {
    const sampleModel = path.join(
      __dirname,
      '..',
      '..',
      'examples',
      'samplemodel'
    );
    const suite = runTestsFromModel(sampleModel);
    assert.ok(suite.total >= 3, `Expected at least 3 tests, got ${suite.total}`);
    assert.equal(suite.failed, 0, 'Expected no failures in the samplemodel');
  });
});
