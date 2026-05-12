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
  prompt-function.js     # Dynamic system prompt loader (supports multi-turn)
  test-cases.csv         # Single-turn test matrix (CSV)
  scenarios/             # Multi-turn dialogue tests (YAML)
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
  # Grader model for llm-rubric assertions (uses same GitHub Models endpoint)
  options:
    provider:
      id: openai:chat:gpt-4o-mini
      config:
        apiBaseUrl: https://models.inference.ai.azure.com
        apiKey: '{{env.GITHUB_TOKEN}}'

tests: file://test-cases.csv

# Multi-turn dialogue tests (optional)
scenarios:
  - file://scenarios/your-dialogue.yaml
```

### 3. Create the prompt function

The prompt function maps agent/skill identifiers to their system prompt files and supports multi-turn conversation history:

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
  const messages = [{ role: 'system', content: systemPrompt }];

  // Multi-turn: inject prior conversation history from scenarios
  if (Array.isArray(vars._conversation)) {
    for (const turn of vars._conversation) {
      if (typeof turn.input === 'string') messages.push({ role: 'user', content: turn.input });
      if (typeof turn.output === 'string') messages.push({ role: 'assistant', content: turn.output });
    }
  }

  messages.push({ role: 'user', content: vars.prompt });
  return messages;
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

### Single-Turn Tests (CSV)

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

### Multi-Turn Dialogue Tests (Scenarios)

Dialogue tests live in `scenarios/*.yaml` and use promptfoo's native `scenarios` feature. Each scenario defines a 2-4 turn conversation where tests share a `conversationId` and the `_conversation` variable accumulates the full message history.

#### How it works

1. **Scenarios are sequential** — tests within a scenario run in order; each turn sees all prior assistant responses via `_conversation`
2. **The prompt function** (`prompt-function.js`) injects conversation history between the system prompt and the new user message, building the full chat context
3. **Different scenarios run in parallel** — only turns _within_ a scenario are sequential

#### Directory layout

```
scenarios/
  linter-fix-workflow.yaml    # power-query-linter: analyze → fix → explain
  tester-create-test.yaml     # power-query-tester: environment → create → register
  skill-deep-dive.yaml        # pql-assert: list functions → detail → example
  dax-query-building.yaml     # dax-query-guidelines: DEFINE → SUMMARIZECOLUMNS → complete query
```

#### Scenario file format

```yaml
- config:
    - vars:
        agent: <agent-or-skill-id>    # Same values as CSV "agent" column
  tests:
    - description: "Turn 1: Initial question"
      vars:
        prompt: "First user message"
      assert:
        - type: icontains           # Deterministic assertions (cheap, reliable)
          value: expected-keyword

    - description: "Turn 2: Follow-up"
      vars:
        prompt: "Second user message referencing Turn 1"
      assert:
        - type: llm-rubric          # Model-graded assertion for conversation coherence
          value: "Response references specific details from Turn 1"
```

#### Assertions strategy

| Turn | Assertion types | Purpose |
|------|----------------|---------|
| Turn 1 | `icontains`, `contains-all`, `javascript` | Verify domain keywords and response length |
| Turn 2-3 | `icontains` + `llm-rubric` | Verify keywords AND conversation coherence |
| All turns | `cost`, `latency` (from `defaultTest`) | Guard against cost/latency regressions |

#### Grading model

The `llm-rubric` assertions use `gpt-4o-mini` via GitHub Models (configured in `defaultTest.options.provider`). This keeps grading costs low while maintaining scoring quality.

#### Adding a new scenario

1. Create `scenarios/<name>.yaml` following the format above
2. Add the file reference to `promptfooconfig.yaml` under `scenarios:`
   ```yaml
   scenarios:
     - file://scenarios/<name>.yaml
   ```
3. Run `npm run promptfoo:validate` to check syntax
4. Run `GITHUB_TOKEN=$(gh auth token) npm run promptfoo:eval` to execute

Current scenario coverage: 4 scenarios, 12 dialogue turns total.
