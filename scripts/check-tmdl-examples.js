// Lints TMDL function examples in shipped docs, because a property (annotation, lineageTag) indented the same as
// the function expression is folded into the body and the function loads in a SemanticError state.
// Rules for `function <name> =` examples: indent with tabs, expression lines at level >= 2, property lines
// (`annotation`, `description`) at exactly level 1, and no `lineageTag` on new functions (semantic-model-authoring guidelines).
// Usage: node scripts/check-tmdl-examples.js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const targets = ['skills', 'agent-src', 'README.md'];
// third-party skill content and the library file itself are not ours to lint
const skip = (file) => /skills[\/](semantic-model-authoring|common)[\/]/.test(file) || /functions\.tmdl$/.test(file);

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
    else if (entry.name.endsWith('.md')) yield path.join(root, child);
  }
}

const level = (line) => {
  const indent = /^[ \t]*/.exec(line)[0];
  return (indent.match(/\t/g) || []).length + Math.floor((indent.replace(/\t/g, '').length) / 4);
};
const isProperty = (line) => /^\s*(annotation\s|lineageTag:|description:)/.test(line);

let failures = 0;
const fail = (file, lineNo, message) => {
  failures++;
  console.error(`${path.relative(root, file)}:${lineNo}: ${message}`);
};

for (const target of targets) {
  for (const file of walk(target)) {
    if (skip(file)) continue;
    const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
    let inFence = false;
    lines.forEach((line, i) => {
      if (/^\s*```/.test(line)) inFence = !inFence;
      if (!inFence || !/^function\s+\S+\s*=\s*$/.test(line)) return;
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (/^\s*```/.test(next) || (next.trim() !== '' && level(next) === 0)) break;
        if (next.trim() === '') continue;
        if (/^ +\S/.test(next) && !/^\t/.test(next)) fail(file, j + 1, 'TMDL examples must indent with tabs, not spaces');
        if (/lineageTag:/.test(next)) fail(file, j + 1, 'do not add lineageTag to new functions');
        if (isProperty(next) && level(next) !== 1) fail(file, j + 1, 'properties must be exactly one tab in');
        if (!isProperty(next) && level(next) < 2) fail(file, j + 1, 'function expression must be at least two tabs in (deeper than the properties)');
      }
    });
  }
}

if (failures > 0) process.exit(1);
console.log('TMDL function examples are indented correctly.');
