# Claude Code Guidelines — exa-sales-intel

## Project Purpose

Standalone agent pipeline for M7 Health sales intelligence. Uses Exa web search + Claude LLM to discover health systems on competitor scheduling platforms and deliver daily signal dossiers to Slack.

## Design Doc

The approved design is at `docs/plans/2026-02-22-exa-sales-signal-monitoring-design.md`. Read this before making any architectural changes.

## Project Structure

```
src/
  agents/        # One file per agent (discovery, job-postings, leadership, etc.)
  config/        # Competitor list, signal scoring rules, Slack config
  types/         # Shared TypeScript types
docs/
  plans/         # Design docs and implementation plans
```

## Competitors to Monitor

- Kronos / UKG
- ANSOS / HealthStream
- ShiftWizard
- API Healthcare
- Vitalize
- Symplr

## Key Decisions

- Orchestrator + parallel sub-agents pattern (see design doc)
- Discovery runs first and gates all signal agents
- No persistent storage in V1 — stateless daily runs
- All output goes to shared `#sales-intel` Slack channel (no per-rep routing yet)
- Max 30 accounts per run, 1s delay between Slack posts

## Response Style

- This project is owned by a non-technical product manager
- Explain agent behavior in plain language
- Avoid deep code blocks in explanations — describe what agents do and why
