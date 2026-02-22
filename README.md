# exa-sales-intel

A daily agent pipeline that uses Exa web search to discover health systems running competitor scheduling platforms and surface actionable sales signals for M7 Health's sales team.

## What it does

1. **Discovers** health systems using competitor platforms (Kronos, ANSOS, ShiftWizard, API Healthcare, Vitalize, Symplr, UKG)
2. **Monitors** each account for 7 signal types: platform age, leadership changes, RFPs, sentiment, M&A activity, conference presence, and job postings
3. **Delivers** a full per-account dossier with AI-generated talking points to `#sales-intel` Slack channel daily

## Signal strength

| Signal | Strength |
|---|---|
| Leadership Change (C-suite/VP) | HIGH |
| RFP/RFI Posted | HIGH |
| Platform Age 2–3 years | HIGH |
| Sentiment (public complaints) | MEDIUM |
| Financial/M&A Activity | MEDIUM |
| Conference/Events | MEDIUM |
| Job Postings | LOW |

## Docs

- [Design doc](docs/plans/2026-02-22-exa-sales-signal-monitoring-design.md)

## Setup

_Coming soon — see implementation plan._
