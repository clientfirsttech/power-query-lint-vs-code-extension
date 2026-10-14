// Generates the Copilot (resources/agents) and Claude Code (agents/) variants of each PQL agent
// from one shared body in agent-src/. Usage: node scripts/build-agents.js [--check]
//
// Body placeholders:
//   {{skill:<path under skills/>}}      Copilot: skills/<path>   Claude: ${CLAUDE_PLUGIN_ROOT}/skills/<path>
//   {{tool:<logical name>}}             per-target tool name from agent-src/agents.json "tokens"
//   {{#copilot}}...{{/copilot}}         kept only in the Copilot variant (same for claude)
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const check = process.argv.includes('--check');
const version = require(path.join(root, 'package.json')).version;
const config = JSON.parse(fs.readFileSync(path.join(root, 'agent-src', 'agents.json'), 'utf8'));
const normalize = (text) => text.replace(/\r\n/g, '\n');

function scalar(value) {
  return /: |\s#|^[[{&*!|>'"%@`-]/.test(value) ? JSON.stringify(value) : value;
}

function list(target, tools) {
  return target === 'copilot' ? `[${tools.map((t) => `'${t}'`).join(', ')}]` : tools.join(', ');
}

function renderBody(body, target) {
  const other = target === 'copilot' ? 'claude' : 'copilot';
  return body
    .replace(new RegExp(`\\{\\{#${other}\\}\\}[\\s\\S]*?\\{\\{/${other}\\}\\}\\n?`, 'g'), '')
    .replace(new RegExp(`\\{\\{/?#?${target}\\}\\}\\n?`, 'g'), '')
    .replace(/\{\{skill:([^}]+)\}\}/g, (_, p) => (target === 'claude' ? `\${CLAUDE_PLUGIN_ROOT}/skills/${p}` : `skills/${p}`))
    .replace(/\{\{tool:([^}]+)\}\}/g, (_, name) => {
      const mapped = config.tokens[target][name];
      if (!mapped) throw new Error(`Unknown tool token "${name}" for ${target}`);
      return mapped;
    });
}

function render(agent, target) {
  const t = agent[target];
  const lines = ['---', `name: ${scalar(t.name)}`, `version: ${version}`, `description: ${scalar(agent.description)}`, `tools: ${list(target, t.tools)}`];
  if (t.skills) lines.push(`skills: ${list(target, t.skills)}`);
  lines.push('---');
  const body = normalize(fs.readFileSync(path.join(root, agent.body), 'utf8'));
  return `${lines.join('\n')}\n${renderBody(body, target)}`;
}

let drift = 0;
for (const agent of config.agents) {
  for (const target of ['copilot', 'claude']) {
    const file = path.join(root, agent[target].file);
    const output = render(agent, target);
    const current = fs.existsSync(file) ? normalize(fs.readFileSync(file, 'utf8')) : null;
    if (current === output) continue;
    if (check) {
      drift++;
      console.error(`out of date: ${agent[target].file}`);
    } else {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, output);
      console.log(`wrote ${agent[target].file}`);
    }
  }
}
if (check && drift > 0) {
  console.error('Run `npm run build:agents` to regenerate.');
  process.exit(1);
}
