export enum SignalStrength {
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW',
}

export enum SignalType {
  PLATFORM_AGE = 'PLATFORM_AGE',
  LEADERSHIP_CHANGE = 'LEADERSHIP_CHANGE',
  RFP_RFI = 'RFP_RFI',
  SENTIMENT = 'SENTIMENT',
  FINANCIAL_MA = 'FINANCIAL_MA',
  CONFERENCE_EVENTS = 'CONFERENCE_EVENTS',
  JOB_POSTINGS = 'JOB_POSTINGS',
}

export interface DiscoveredAccount {
  healthSystemName: string;
  competitorPlatform: string;
  sourceUrls: string[];
  confidence: 'high' | 'low'; // high = 2+ sources, low = 1 source
}

export interface Signal {
  type: SignalType;
  strength: SignalStrength;
  headline: string;
  sourceUrls: string[];
  rawText: string;
  talkingPoint?: string; // added by DossierCompiler
}

export interface AccountDossier {
  account: DiscoveredAccount;
  signals: Signal[];
  generatedAt: Date;
}

export interface RunSummary {
  date: string;
  accountsDiscovered: number;
  accountsWithSignals: number;
  signalCounts: Record<SignalType, number>;
  agentsFailed: string[];
  runtimeMs: number;
}
