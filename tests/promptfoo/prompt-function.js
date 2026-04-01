/**
 * Prompt function for promptfoo evaluations.
 *
 * Dynamically loads the system prompt from the agent or skill markdown file
 * indicated by the `agent` test variable, and pairs it with the user prompt.
 *
 * Returns a chat-messages array consumed by the OpenAI-compatible provider.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');

/** Maps agent/skill identifiers to their system-prompt file paths (relative to repo root). */
const AGENT_MAP = {
  'power-query-linter': 'resources/agents/power-query-linter.md',
  'power-query-tester': 'resources/agents/power-query-tester.md',
  'pql-assert': 'skills/pql-assert/SKILL.md',
  'dax-query-guidelines': 'skills/dax-query-guidelines/SKILL.md',
};

module.exports = async function ({ vars }) {
  const agent = vars.agent;
  const relPath = AGENT_MAP[agent];

  if (!relPath) {
    throw new Error(
      `Unknown agent/skill "${agent}". Valid values: ${Object.keys(AGENT_MAP).join(', ')}`,
    );
  }

  const systemPrompt = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');

  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: vars.prompt },
  ];
};
