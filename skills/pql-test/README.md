# pql-test Skill

Teaches the PQL Tester agent how to use the `pql-test` CLI to discover and run PQL.Assert DAX tests against Power BI PBIP semantic models.

## Why

Without this skill, the agent falls back to single-test MCP execution for every request. With it, the agent can run the full test suite by environment, check authentication, and surface structured JSON results — matching the same workflow used in CI/CD pipelines.

## Commands

Run tests for an environment:

```
run all tests for DEV environment
run tests against "MyWorkspace.Workspace/Sales.SemanticModel" --env PRD
```

Discover tests without executing:

```
retrieve tests
find tests in the workspace
```

Check authentication before a remote run:

```
run tests in the pql-assert-demo workspace
```

The agent will automatically run `pql-test auth status` and `pql-test auth login` when "workspace" appears in the request.
