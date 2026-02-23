export interface Competitor {
  name: string;
  aliases: string[];
}

export const COMPETITORS: Competitor[] = [
  { name: 'Kronos', aliases: ['Kronos Workforce', 'UKG Pro', 'UKG'] },
  { name: 'ANSOS', aliases: ['ANSOS', 'HealthStream'] },
  { name: 'ShiftWizard', aliases: ['ShiftWizard'] },
  { name: 'API Healthcare', aliases: ['API Healthcare'] },
  { name: 'Symplr', aliases: ['Symplr'] },
  { name: 'Vitalize', aliases: ['Vitalize'] },
];

export function getDiscoveryQueries(competitorName: string): string[] {
  const competitor = COMPETITORS.find((c) => c.name === competitorName);
  if (!competitor) return [];

  return competitor.aliases.flatMap((alias) => [
    `"${alias}" "health system" OR hospital scheduling implementation`,
    `"${alias}" nurse staffing workforce management site:*.org OR site:*.com`,
  ]);
}

export function getSignalQueries(
  healthSystem: string,
  competitorName: string,
  signalType: string,
): string[] {
  const thisYear = new Date().getFullYear();
  const lastYear = thisYear - 1;

  const queries: Record<string, string[]> = {
    PLATFORM_AGE: [
      `"${healthSystem}" "${competitorName}" "go-live" OR "launched" OR "implemented" OR "rolled out" ${lastYear - 2} OR ${lastYear - 1} OR ${lastYear}`,
      `"${healthSystem}" "${competitorName}" implementation "went live" press release`,
    ],
    LEADERSHIP_CHANGE: [
      `"${healthSystem}" "appointed" OR "named" OR "joins" CIO OR CNO OR "VP of Workforce" OR "Chief Nursing"`,
      `"${healthSystem}" new CIO OR CNO OR "Chief Information Officer" OR "Chief Nursing Officer" ${thisYear}`,
    ],
    RFP_RFI: [
      `"${healthSystem}" RFP OR RFI "scheduling" OR "workforce management" OR "nurse staffing"`,
      `"${healthSystem}" "request for proposal" OR "request for information" workforce scheduling`,
    ],
    SENTIMENT: [
      `"${competitorName}" "${healthSystem}" complaint OR problems OR issues OR switching OR replacing`,
      `"${healthSystem}" "${competitorName}" review problems OR frustration OR "switching systems"`,
    ],
    FINANCIAL_MA: [
      `"${healthSystem}" acquisition OR merger OR "financial distress" OR "cost reduction" ${thisYear} OR ${lastYear}`,
      `"${healthSystem}" "cost savings" OR "restructuring" OR "budget cuts" ${thisYear}`,
    ],
    CONFERENCE_EVENTS: [
      `"${healthSystem}" OR "${competitorName}" conference sponsor OR presenting OR keynote ${thisYear}`,
      `"${competitorName}" HIMSS OR "Becker's" OR ANCC sponsor ${thisYear}`,
    ],
    JOB_POSTINGS: [
      `"${healthSystem}" "${competitorName}" OR "workforce management" job posting hiring`,
      `"${healthSystem}" "Workforce Management Analyst" OR "Scheduling Coordinator" OR "Staffing Systems" hiring`,
    ],
  };

  return queries[signalType] ?? [];
}
