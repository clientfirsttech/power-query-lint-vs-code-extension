// Fails if a shipped example test-function name has a segment that is a reserved DAX word
// (for example `Calculations.DEV.Tests`, which cannot parse). Usage: node scripts/check-test-names.js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const reservedFile = path.join(root, 'skills', 'pql-assert', 'references', 'reserved-dax-words.md');

const reserved = new Set(
  fs
    .readFileSync(reservedFile, 'utf8')
    .split(/\r?\n/)
    .map((line) => /^\|\s*([A-Za-z_][\w]*)\s*\|\s*$/.exec(line))
    .filter(Boolean)
    .map((match) => match[1].toLowerCase())
);
if (reserved.size < 50) {
  console.error(`Only found ${reserved.size} reserved words in ${path.relative(root, reservedFile)}; the table format may have changed.`);
  process.exit(1);
}

// Shipped content that shows example test names. Lines that deliberately show a wrong example are skipped.
const targets = ['skills', 'agent-src', 'README.md'];
const skipLine = /WRONG|❌|reserved|violation|Instead of/i;
const namePattern = /\b([A-Za-z_][\w]*(?:\.[A-Za-z_][\w]*)*)\.(?:DEV|TEST|PROD|ANY|STG|PRD|UAT|STAGING)\.Tests?\b/g;

function* walk(target) {
  const full = path.join(root, target);
  if (!fs.existsSync(full)) return;
  if (fs.statSync(full).isFile()) {
    yield full;
    return;
  }
  for (const entry of fs.readdirSync(full, { withFileTypes: true })) {
    const child = path.join(target, entry.name);
    if (entry.isDirectory()) yield* walk(child);
    else if (/\.(md|dax)$/.test(entry.name) && entry.name !== 'reserved-dax-words.md') yield path.join(root, child);
  }
}

let failures = 0;
for (const target of targets) {
  for (const file of walk(target)) {
    fs.readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .forEach((line, index) => {
        if (skipLine.test(line)) return;
        for (const match of line.matchAll(namePattern)) {
          const name = match[0];
          const bad = name.split('.').filter((segment) => reserved.has(segment.toLowerCase()));
          if (bad.length > 0) {
            failures++;
            console.error(`${path.relative(root, file)}:${index + 1}: "${name}" uses reserved word(s): ${bad.join(', ')}`);
          }
        }
      });
  }
}

if (failures > 0) process.exit(1);
console.log(`Checked example test names against ${reserved.size} reserved words: none use one.`);
