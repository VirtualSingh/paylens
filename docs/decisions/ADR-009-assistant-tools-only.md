# ADR-009 — Build the "Ask about pay" assistant as a Mastra agent restricted to read-only, role-aware tools, with evals in CI

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
The brief asks the system to "answer questions about how the org pays people"; the JD asks
for agentic workflows with Mastra/Claude/OpenAI and Responsible AI (evaluation, reliability,
safety, privacy). Salary data must not leak to the model or to the wrong role. Tests must stay
deterministic and free.

## Options considered
1. Text-to-SQL agent — flexible; hard to secure (data exfiltration, injection), hard to evaluate.
2. RAG over exported reports — stale, approximate numbers.
3. **Tools-only agent**: a fixed set of typed, read-only tools over the analytics service,
   role enforced inside the tools, aggregates/anonymised codes only — narrow but trustworthy and testable.
4. No assistant — misses the JD's core theme.

## Decision
Option 3 with Mastra (`Agent`, `createTool`, model router, scorers). Provider-neutral via
`AI_MODEL`; default demo provider decided in D-3. Deterministic eval suite with a mock model
runs in CI; a live scored eval runs offline and its report is committed. Rate and cost caps,
output filter, and `ai_queries` logging are part of the acceptance criteria. Built last;
degradable to a stub.

## Consequences
- Positive: no PII to the model, no write path, evaluable behaviour, cheap tests, clear
  interview narrative ("the only thing a prompt can change is which read-only tool runs").
- Negative: cannot answer arbitrary questions; adding a question type means adding a tool
  (a feature, not a bug). Live quality depends on the provider chosen.
- Follow-ups: F-30 MCP server exposing the same tools; adjusted pay-gap tool in v2.

## Links
docs/vault/design/ai-assistant.md · F-27, F-28, F-29, F-30
