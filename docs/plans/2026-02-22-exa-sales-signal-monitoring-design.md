# Exa Sales Signal Monitoring System — Design

**Date:** 2026-02-22
**Status:** Approved
**Goal:** Continuously monitor and surface actionable sales signals from health systems using competitor scheduling platforms, delivered as a daily dossier to a shared Slack channel for sales ops triage.

---

## Context

The product competes with ANSOS/HealthStream, Kronos, ShiftWizard, API Healthcare, Vitalize, Symplr, and UKG for nurse/staff scheduling in health systems. This system uses Exa web search to:

1. **Discover** health systems currently using competitor platforms (no pre-built account list — discovery-first)
2. **Monitor** those accounts for 7 signal types indicating sales opportunity
3. **Deliver** a full per-account dossier daily to `#sales-intel` Slack channel for human triage

---

## Architecture

```
[Daily Cron Trigger]
        |
        v
[Orchestrator Agent]
        |
        |-- [Discovery Agent] ──────────────────────────────────────────────┐
        |       Uses Exa to find health systems on each competitor platform  │
        |       Outputs: list of {health_system, competitor_platform}        │
        |                                                                    │
        v                                                                    │
[Account List] <────────────────────────────────────────────────────────────┘
        |
        |── parallel ──────────────────────────────────────────────────────┐
        |                                                                   │
        v                                                                   │
[Signal Sub-Agents] (all run in parallel against Account List)             │
  ├── Job Postings Agent        (Exa → job boards, career pages)           │
  ├── RFP/RFI Agent             (Exa → procurement portals, govt sites)    │
  ├── Leadership Change Agent   (Exa → press releases, LinkedIn, news)     │
  ├── Sentiment Agent           (Exa → Reddit, Glassdoor, forums, news)    │
  ├── Financial/M&A Agent       (Exa → news, SEC filings, health trade press) │
  ├── Conference/Events Agent   (Exa → event sites, sponsor lists, agendas) │
  └── Platform Age Agent        (Exa → go-live announcements, trade press) │
        |                                                                   │
        v                                                                   │
[Signal Collector] ─────────────────────────────────────────────────────────┘
        |
        v
[Dossier Compiler Agent]
  - Groups signals by account
  - Scores signal strength (HIGH / MEDIUM / LOW)
  - Generates talking point per signal via LLM
        |
        v
[Slack Delivery Agent]
  - Posts one message per account to #sales-intel
  - Formats as Slack Block Kit with action buttons
  - Posts run summary to #sales-intel-ops
```

---

## Discovery Agent

Runs first and gates all downstream agents. For each of the 7 competitor platforms, runs Exa neural searches to surface health systems that are known users.

**Sample queries per competitor:**

| Competitor         | Sample Exa Queries                                                                                         |
| ------------------ | ---------------------------------------------------------------------------------------------------------- |
| Kronos/UKG         | `"Kronos Workforce" site:*.org hospital OR "health system"`, `"UKG Pro" nursing scheduling implementation` |
| ANSOS/HealthStream | `"ANSOS" nurse scheduling hospital system`, `HealthStream "workforce management" health system`            |
| ShiftWizard        | `ShiftWizard "health system" OR hospital scheduling`                                                       |
| API Healthcare     | `"API Healthcare" staffing scheduling hospital`                                                            |
| Symplr             | `Symplr "workforce" health system case study OR implementation`                                            |
| Vitalize           | `Vitalize scheduling "health system" OR hospital`                                                          |

**Quality control:** Requires at least 2 independent sources confirming the same health system + competitor pairing before adding to the account list. Single-source matches are logged for human review.

**Output:** `{ health_system_name, competitor_platform, source_url, confidence }` — approximately 20–80 accounts per run.

---

## Signal Sub-Agents

All 7 run in parallel against the account list. Each loops through accounts running 1–3 targeted Exa searches.

### 1. Platform Age Agent

- **Query:** `"[Health System]" "[Competitor]" "go-live" OR "launched" OR "implemented" OR "rolled out" 2022 OR 2023`
- **Sources:** Press releases, Becker's, Health IT News, PR Newswire
- **Interpretation:** 2–3 years post-implementation = renewal window open, post-go-live frustrations have matured

### 2. Leadership Change Agent

- **Query:** `"[Health System]" "appointed" OR "named" OR "joins" CIO OR CNO OR "VP of Workforce" OR "Chief Nursing"`
- **Interpretation:** New executive = 90-day window where inherited systems are under evaluation

### 3. RFP/RFI Agent

- **Query:** `"[Health System]" RFP OR RFI "scheduling" OR "workforce management" OR "nurse staffing"`
- **Sources:** Bonfire, DemandStar, SAM.gov, state procurement portals
- **Interpretation:** Open procurement = active vendor evaluation, must engage immediately

### 4. Sentiment Agent

- **Query:** `"[Competitor]" "[Health System]" complaint OR problems OR issues OR switching OR replacing`
- **Also:** Glassdoor, Reddit (`"[Health System]" Kronos OR ShiftWizard review problems`)
- **Interpretation:** Public frustration = internal pressure building, empathy hook for reps

### 5. Financial/M&A Agent

- **Query:** `"[Health System]" acquisition OR merger OR "financial distress" OR "cost reduction" 2025 OR 2026`
- **Interpretation:** M&A = tech stack consolidation opportunity; cost pressure = ROI conversation opener

### 6. Conference/Events Agent

- **Query:** `"[Health System]" OR "[Competitor]" conference sponsor OR presenting OR keynote 2025 OR 2026`
- **Sources:** ANCC Magnet, HIMSS, Becker's Hospital Review event agendas
- **Interpretation:** Competitor sponsoring = entrenched; health system presenting case study = poachable champion

### 7. Job Postings Agent

- **Query:** `"[Health System]" (Kronos OR ShiftWizard OR "workforce management") job posting`
- **Also:** `"[Health System]" "Workforce Management Analyst" OR "Scheduling Coordinator" OR "Staffing Systems"` hiring
- **Interpretation:** Active hiring into scheduling roles = lagging indicator of platform pain or transition project

---

## Signal Strength Scoring

| Signal Type                    | Strength   | Rationale                            |
| ------------------------------ | ---------- | ------------------------------------ |
| Leadership Change (C-suite/VP) | **HIGH**   | New exec = open evaluation window    |
| RFP/RFI Posted                 | **HIGH**   | Active procurement = must engage now |
| Platform Age 2–3 years         | **HIGH**   | Renewal window — in-market           |
| Sentiment (public complaints)  | **MEDIUM** | Internal pressure building           |
| Financial/M&A Activity         | **MEDIUM** | Consolidation or ROI pressure        |
| Conference/Events              | **MEDIUM** | Relationship/timing intelligence     |
| Job Postings                   | **LOW**    | Lagging indicator of pain            |

---

## Dossier Compiler

Groups all signals by account. For each signal, an LLM generates a 1–2 sentence talking point by prompting with: signal text + competitor platform + "what does this mean for a sales rep trying to displace this platform?"

**Example dossier:**

```
Account: Mercy Health
Competitor Platform: Kronos
Signals Found: 3

[HIGH] Platform Age
  Mercy Health went live on Kronos in Q1 2023 (~3 years ago)
  Source: Health IT News
  Talking point: "3-year mark on a Kronos implementation — contract renewal
  window is open and post-go-live frustrations have had time to accumulate.
  Ideal timing to start a conversation."

[HIGH] Leadership Change
  New CNO appointed Jan 2026: Dr. Sarah Chen (prev. Advocate Aurora)
  Source: Becker's Hospital Review
  Talking point: "New CNO from a system that runs a different platform — she
  may not have loyalty to Kronos and will be evaluating her inherited stack."

[LOW] Job Postings
  4 workforce/scheduling roles posted this week
  Sources: mercy.org/careers, Indeed
  Talking point: "Active Kronos admin hiring signals a painful upgrade cycle
  or a stretched team — worth a conversation about what's driving it."
```

---

## Slack Delivery

One Slack Block Kit message per account posted to `#sales-intel`. Accounts ordered by highest signal count.

**Message format:**

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏥 Mercy Health  |  📍 Cincinnati, OH
🔴 Currently on: Kronos  |  🟢 3 signals today
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔥 HIGH  •  Platform Age
Went live on Kronos Q1 2023 (~3 years ago)
→ [Health IT News]
💬 "3-year mark — renewal window open..."

🔥 HIGH  •  Leadership Change
New CNO: Dr. Sarah Chen appointed Jan 2026
→ [Becker's article]
💬 "New CNO may not have loyalty to Kronos..."

🔵 LOW  •  Job Postings
4 workforce/scheduling roles posted this week
→ [careers page]  [Indeed]
💬 "Active Kronos admin hiring signals pain..."

[Claim this account]  [Mark as contacted]  [Snooze 30 days]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Action buttons:**

- **Claim this account** — posts a reply in thread tagging the rep who clicked
- **Mark as contacted** — suppresses from future digests until unclaimed
- **Snooze 30 days** — suppresses that account for 30 days

**Rate limiting:** 1-second delay between posts; max 30 accounts per run (prioritized by signal count).

---

## Error Handling

- **Exa failures:** Each agent retries once with exponential backoff. On second failure, logs the error and continues — dossier notes which agent was unavailable.
- **Discovery false positives:** Filtered by requiring 2+ independent sources per account.
- **Slack rate limits:** 1s delay between messages; hard cap at 30 accounts per run.
- **Observability:** Run summary posted to `#sales-intel-ops`:

```
Daily run complete — Feb 22 2026
Accounts discovered: 43  |  Accounts with signals: 12
Signals: Jobs(8) RFP(2) Leadership(5) Sentiment(14) Financial(3) Events(4) PlatformAge(7)
Agents failed: 0  |  Runtime: 4m 12s
```

---

## V1 Constraints (intentional)

- **No persistent storage** — every run starts fresh; same signal may appear on multiple days. Deduplication is a V2 concern once signal quality is validated.
- **No per-rep routing** — all signals go to shared `#sales-intel` channel for human triage.
- **No CRM integration** — manual follow-through after Slack triage. CRM write-back is V2.
