import { COMPETITORS, getDiscoveryQueries } from '../src/config/competitors';
import { getSignalStrength } from '../src/config/scoring';
import { SignalType, SignalStrength } from '../src/types';

test('COMPETITORS has all 6 platforms', () => {
  expect(COMPETITORS).toHaveLength(6);
});

test('getDiscoveryQueries returns 2+ queries per competitor', () => {
  COMPETITORS.forEach((c) => {
    const queries = getDiscoveryQueries(c.name);
    expect(queries.length).toBeGreaterThanOrEqual(2);
  });
});

test('leadership change scores HIGH', () => {
  expect(getSignalStrength(SignalType.LEADERSHIP_CHANGE)).toBe(SignalStrength.HIGH);
});

test('job postings score LOW', () => {
  expect(getSignalStrength(SignalType.JOB_POSTINGS)).toBe(SignalStrength.LOW);
});

test('sentiment scores MEDIUM', () => {
  expect(getSignalStrength(SignalType.SENTIMENT)).toBe(SignalStrength.MEDIUM);
});
