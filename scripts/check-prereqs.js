#!/usr/bin/env node
/**
 * check-prereqs.js
 *
 * Verifies that all prerequisites needed to use pql-test are installed.
 * Run automatically via `postinstall` or manually with `npm run check-prereqs`.
 */

'use strict';

const { execSync } = require('child_process');

let allOk = true;

function check(name, fn) {
  try {
    const detail = fn();
    console.log(`  ✅ ${name} — ${detail}`);
  } catch (err) {
    console.log(`  ❌ ${name} — ${err.message}`);
    allOk = false;
  }
}

console.log('\nChecking prerequisites for pql-test...\n');

// Node.js >= 18
check('Node.js >= 18', () => {
  const [major] = process.versions.node.split('.').map(Number);
  if (major < 18) {
    throw new Error(
      `Node.js 18 or higher is required (current: ${process.versions.node})`
    );
  }
  return `Node.js ${process.versions.node}`;
});

// npm
check('npm installed', () => {
  const version = execSync('npm --version', { encoding: 'utf8' }).trim();
  return `npm ${version}`;
});

if (allOk) {
  console.log('\n✅ All prerequisites met. pql-test is ready to use.\n');
  console.log(
    'Run `pql-test --help` for usage or see the README for documentation.\n'
  );
  process.exit(0);
} else {
  console.log('\n❌ Some prerequisites are missing. Please install them and try again.\n');
  // Exit with 0 (not 1) so npm install itself succeeds even if prereqs are
  // partially missing — consumers should run `pql-test check-prereqs` explicitly.
  process.exit(0);
}
