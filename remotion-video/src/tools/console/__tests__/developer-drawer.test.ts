import {describe, expect, it} from 'vitest';
import {formatJobDuration, formatJobTimestamp} from '../DeveloperDrawer';

describe('developer drawer task timing', () => {
  it('formats backend task timestamps with seconds', () => {
    expect(formatJobTimestamp('2026-07-23T10:23:08.926Z')).toMatch(/^07-23\s\d{2}:23:08$/);
    expect(formatJobTimestamp('invalid')).toBe('等待同步');
  });

  it('calculates completed and running task duration from backend time fields', () => {
    expect(formatJobDuration('2026-07-23T10:23:08.000Z', '2026-07-23T10:26:55.000Z')).toBe('3分47秒');
    expect(formatJobDuration('2026-07-23T10:23:08.000Z', null, Date.parse('2026-07-23T11:24:13.000Z'))).toBe('1小时1分5秒');
    expect(formatJobDuration(undefined, undefined)).toBe('等待计时');
  });
});
