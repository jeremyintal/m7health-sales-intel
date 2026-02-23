import { SignalType, SignalStrength } from '../types';

const SCORING: Record<SignalType, SignalStrength> = {
  [SignalType.LEADERSHIP_CHANGE]: SignalStrength.HIGH,
  [SignalType.RFP_RFI]: SignalStrength.HIGH,
  [SignalType.PLATFORM_AGE]: SignalStrength.HIGH,
  [SignalType.SENTIMENT]: SignalStrength.MEDIUM,
  [SignalType.FINANCIAL_MA]: SignalStrength.MEDIUM,
  [SignalType.CONFERENCE_EVENTS]: SignalStrength.MEDIUM,
  [SignalType.JOB_POSTINGS]: SignalStrength.LOW,
};

export function getSignalStrength(type: SignalType): SignalStrength {
  return SCORING[type];
}
