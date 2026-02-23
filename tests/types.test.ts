import { SignalStrength, SignalType } from '../src/types';

test('SignalStrength enum has correct values', () => {
  expect(SignalStrength.HIGH).toBe('HIGH');
  expect(SignalStrength.MEDIUM).toBe('MEDIUM');
  expect(SignalStrength.LOW).toBe('LOW');
});

test('SignalType enum has all 7 types', () => {
  expect(Object.keys(SignalType)).toHaveLength(7);
});
