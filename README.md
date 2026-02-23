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

1. Clone the repo and install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in your keys:
   - `EXA_API_KEY` — from [exa.ai](https://exa.ai)
   - `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
   - `SLACK_BOT_TOKEN` — Bot token from your Slack app (needs `chat:write` scope)
   - `SLACK_SALES_INTEL_CHANNEL_ID` — Channel ID of `#sales-intel`
   - `SLACK_OPS_CHANNEL_ID` — Channel ID of `#sales-intel-ops`

3. Run the pipeline:
   ```bash
   npm start
   ```

4. To schedule daily runs, add a cron job:
   ```
   0 7 * * 1-5 cd /path/to/exa-sales-intel && npm start >> logs/daily.log 2>&1
   ```
   This runs at 7am Monday–Friday.
