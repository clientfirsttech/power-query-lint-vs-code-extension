# Promptfoo Evaluation Suite

Automated evaluation of GitHub Copilot chat agents and skills using [promptfoo](https://promptfoo.dev) and the **GitHub Models API**.

## Provider Setup (GitHub Models + OpenAI-Compatible)

The evaluation uses the **built-in OpenAI-compatible provider** in promptfoo, pointed at the GitHub Models inference endpoint. This is the recommended approach because it requires zero custom code — only YAML configuration.

### Configuration

```yaml
providers:
  - id: openai:chat:gpt-4o
    label: github-models-gpt4o
    config:
      apiBaseUrl: https://models.inference.ai.azure.com
      apiKey: '{{env.GITHUB_TOKEN}}'
      temperature: 0.2
      max_tokens: 2048
```

### Key Settings

| Setting | Value | Purpose |
|---------|-------|---------|
| `id` | `openai:chat:gpt-4o` | Tells promptfoo to use its built-in OpenAI provider with the `gpt-4o` model |
| `apiBaseUrl` | `https://models.inference.ai.azure.com` | GitHub Models endpoint (OpenAI-compatible API) |
| `apiKey` | `'{{env.GITHUB_TOKEN}}'` | Nunjucks template that reads `GITHUB_TOKEN` from environment at runtime |
| `temperature` | `0.2` | Low temperature for deterministic/reproducible outputs |
| `max_tokens` | `2048` | Response length limit |

### Authentication

The provider authenticates using a GitHub personal access token (PAT) or the built-in `GITHUB_TOKEN` in GitHub Actions:

- **Local development**: `GITHUB_TOKEN=$(gh auth token) npm run promptfoo:eval`
- **GitHub Actions CI**: Automatic via `${{ secrets.GITHUB_TOKEN }}`

Your GitHub token must have access to [GitHub Models](https://github.com/marketplace/models). Free-tier tokens work for supported models.

### Alternative: Custom `gh` CLI Provider

A custom JavaScript provider (`providers/gh-cli-provider.js`) is included as a fallback. It authenticates via `gh auth token` directly and gives full control over the HTTP request. To use it, swap the provider in `promptfooconfig.yaml`:

```yaml
providers:
  - id: file://providers/gh-cli-provider.js
    config:
      model: gpt-4o
      temperature: 0.2
      max_tokens: 2048
```

## Replicating for Other Projects

To set up promptfoo with GitHub Models in a new project:

### 1. Create the directory structure

```
tests/promptfoo/
  promptfooconfig.yaml   # Main config
  prompt-function.js     # Dynamic system prompt loader
  test-cases.csv         # Test matrix (CSV)
  providers/
    gh-cli-provider.js   # (Optional) Custom provider
```

### 2. Copy the `promptfooconfig.yaml`

Use this template — adjust the `description`, prompt function, and test file:

```yaml
# yaml-language-server: $schema=https://promptfoo.dev/config-schema.json
description: 'Your Project – Agent & Skill Evaluation Suite'

prompts:
  - file://prompt-function.js        # Or inline prompts/chat JSON

providers:
  - id: openai:chat:gpt-4o
    label: github-models-gpt4o
    config:
      apiBaseUrl: https://models.inference.ai.azure.com
      apiKey: '{{env.GITHUB_TOKEN}}'
      temperature: 0.2
      max_tokens: 2048

defaultTest:
  assert:
    - type: cost
      threshold: 0.10
    - type: latency
      threshold: 60000

tests: file://test-cases.csv
```

### 3. Create the prompt function

The prompt function maps agent/skill identifiers to their system prompt files:

```javascript
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');

const AGENT_MAP = {
  'your-agent': 'path/to/agent-system-prompt.md',
  'your-skill': 'path/to/skill/SKILL.md',
};

module.exports = async function ({ vars }) {
  const agent = vars.agent;
  const relPath = AGENT_MAP[agent];
  if (!relPath) {
    throw new Error(`Unknown agent/skill "${agent}". Valid: ${Object.keys(AGENT_MAP).join(', ')}`);
  }
  const systemPrompt = fs.readFileSync(path.join(ROOT, relPath), 'utf-8');
  return [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: vars.prompt },
  ];
};
```

### 4. Write test cases (CSV)

```csv
__description,agent,prompt,__expected
"Agent knows X","your-agent","What is X?","icontains:keyword"
```

### 5. Add npm scripts

```json
{
  "scripts": {
    "promptfoo:validate": "cd tests/promptfoo && npx promptfoo@latest validate",
    "promptfoo:eval": "cd tests/promptfoo && npx promptfoo@latest eval --no-cache",
    "promptfoo:eval:ci": "cd tests/promptfoo && npx promptfoo@latest eval --no-cache -o results.json",
    "promptfoo:view": "cd tests/promptfoo && npx promptfoo@latest view"
  }
}
```

### 6. Add CI workflow

See `.github/workflows/promptfoo-eval.yml` in this repo for a complete example that:
- Runs on `workflow_dispatch` and weekly schedule
- Validates config before running
- Uses `GITHUB_TOKEN` for authentication
- Writes a summary table to `$GITHUB_STEP_SUMMARY`
- Uploads `results.json` as an artifact

## Running Locally

```bash
# Validate configuration
npm run promptfoo:validate

# Run evaluation (requires GitHub token)
GITHUB_TOKEN=$(gh auth token) npm run promptfoo:eval

# View results in browser UI
npm run promptfoo:view
```

## Test Cases

Tests are in `test-cases.csv` with columns:

| Column | Purpose |
|--------|---------|
| `__description` | Human-readable test name |
| `agent` | Maps to system prompt via `AGENT_MAP` in `prompt-function.js` |
| `prompt` | The user message sent to the model |
| `__expected` | Assertion (e.g., `icontains:keyword`) |

Current coverage: 15 test cases across 4 agents/skills:
- `power-query-linter` (5 tests)
- `power-query-tester` (5 tests)
- `pql-assert` (2 tests)
- `dax-query-guidelines` (3 tests)
