/**
 * Custom promptfoo provider that calls the GitHub Models API using a GitHub
 * token obtained via the `gh` CLI (`gh auth token`) or the GITHUB_TOKEN
 * environment variable.
 *
 * Use this provider as an alternative to the built-in OpenAI provider when you
 * want explicit control over authentication through the GitHub CLI toolchain.
 *
 * Configuration (in promptfooconfig.yaml):
 *   providers:
 *     - id: file://providers/gh-cli-provider.js
 *       config:
 *         model: gpt-4o          # GitHub Models model name
 *         temperature: 0.2
 *         max_tokens: 2048
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../../..');

const GITHUB_MODELS_ENDPOINT = 'https://models.inference.ai.azure.com/chat/completions';

/** Maps agent/skill identifiers to their system-prompt file paths (relative to repo root). */
const AGENT_MAP = {
  'power-query-linter': 'resources/agents/power-query-linter.md',
  'power-query-tester': 'resources/agents/power-query-tester.md',
  'pql-assert': 'skills/pql-assert/SKILL.md',
  'dax-query-guidelines': 'skills/dax-query-guidelines/SKILL.md',
};

/**
 * Resolves a GitHub token for API authentication.
 *
 * Precedence:
 *   1. GITHUB_TOKEN environment variable (CI / pre-set)
 *   2. `gh auth token` command (local development)
 */
function getGhToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  try {
    return execSync('gh auth token', { encoding: 'utf-8', timeout: 10_000 }).trim();
  } catch {
    throw new Error(
      'GitHub token not available. Set GITHUB_TOKEN or authenticate with: gh auth login',
    );
  }
}

module.exports = {
  id: () => 'gh-cli-provider',
  label: 'GitHub Models via gh CLI',

  /**
   * @param {string} prompt - The rendered user prompt from promptfoo.
   * @param {object} context - Promptfoo context including vars and provider config.
   */
  async callApi(prompt, context) {
    const agent = context.vars?.agent;
    if (!agent) {
      return { error: 'No "agent" variable specified in the test case.' };
    }

    const relPath = AGENT_MAP[agent];
    if (!relPath) {
      return {
        error: `Unknown agent/skill "${agent}". Valid values: ${Object.keys(AGENT_MAP).join(', ')}`,
      };
    }

    const systemPrompt = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
    const token = getGhToken();

    const model = context.provider?.config?.model || 'gpt-4o';
    const temperature = context.provider?.config?.temperature ?? 0.2;
    const maxTokens = context.provider?.config?.max_tokens ?? 2048;

    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
      temperature,
      max_tokens: maxTokens,
    };

    try {
      const response = await fetch(GITHUB_MODELS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const text = await response.text();
        return { error: `GitHub Models API error ${response.status}: ${text}` };
      }

      const data = await response.json();

      return {
        output: data.choices?.[0]?.message?.content || '',
        tokenUsage: {
          prompt: data.usage?.prompt_tokens,
          completion: data.usage?.completion_tokens,
          total: data.usage?.total_tokens,
        },
      };
    } catch (err) {
      return { error: `Request failed: ${err.message}` };
    }
  },
};
