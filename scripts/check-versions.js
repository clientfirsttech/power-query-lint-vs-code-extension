// Fails if any shipped skill, agent, or plugin manifest version differs from package.json.
// Usage: node scripts/check-versions.js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const expected = JSON.parse(read('package.json')).version;

const frontmatterVersion = (file) => {
  const match = /^version:[ \t]*(\S+)/m.exec(read(file));
  return match ? match[1] : undefined;
};

const found = {
  '.claude-plugin/plugin.json': JSON.parse(read('.claude-plugin/plugin.json')).version,
  'package-lock.json': JSON.parse(read('package-lock.json')).version,
};
for (const file of [
  'skills/pql-assert/SKILL.md',
  'skills/pql-test/SKILL.md',
  'resources/agents/power-query-linter.md',
  'resources/agents/power-query-tester.sudo.md',
  'agents/pql-linter.md',
  'agents/pql-tester.md',
]) {
  found[file] = frontmatterVersion(file);
}

const mismatched = Object.entries(found).filter(([, version]) => version !== expected);
for (const [file, version] of mismatched) {
  console.error(`${file}: ${version ?? 'no version'} (expected ${expected})`);
}
if (mismatched.length > 0) {
  process.exit(1);
}
console.log(`All ${Object.keys(found).length} versions match package.json (${expected}).`);
