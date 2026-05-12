/**
 * Prompt function for promptfoo evaluations.
 *
 * Dynamically loads the system prompt from the agent or skill markdown file
 * indicated by the `agent` test variable, and pairs it with the user prompt.
 *
 * For multi-turn scenario tests, the `_conversation` variable (automatically
 * populated by promptfoo when tests share a conversationId) contains prior
 * turns. These are injected between the system prompt and the new user message
 * so the model sees the full dialogue history.
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

  const messages = [{ role: 'system', content: systemPrompt }];

  // Append prior conversation turns for multi-turn scenario tests.
  // promptfoo sets `_conversation` automatically when tests share a conversationId.
  if (Array.isArray(vars._conversation)) {
    for (const turn of vars._conversation) {
      // Each turn has { input, output } from the previous test step.
      // `input` is the rendered prompt (string or message array) sent to the provider.
      // `output` is the assistant response text.
      if (typeof turn.input === 'string') {
        messages.push({ role: 'user', content: turn.input });
      }
      if (typeof turn.output === 'string') {
        messages.push({ role: 'assistant', content: turn.output });
      }
    }
  }

  messages.push({ role: 'user', content: vars.prompt });

  return messages;
};
