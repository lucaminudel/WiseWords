import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  formatUnixTimestamp, 
  formatUnixTimestampCustom, 
  getRelativeTime 
} from '../dateUtils';

describe('dateUtils', () => {
  beforeEach(() => {
    // Mock current time for consistent relative time tests
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2023-07-22T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatUnixTimestamp', () => {
    it('should format valid Unix timestamp correctly', () => {
      // Unix timestamp for 2023-07-22T10:00:00Z (2 hours before mocked current time)
      const timestamp = '1690200000';
      const result = formatUnixTimestamp(timestamp);
      
      // Should return a valid date string (exact format depends on locale)
      expect(result).not.toBe('Invalid date');
      expect(result).toMatch(/2023/); // Should contain the year
    });

    it('should handle timestamp as number string', () => {
      const timestamp = '1690000000'; // Valid Unix timestamp
      const result = formatUnixTimestamp(timestamp);
      
      expect(result).not.toBe('Invalid date');
      expect(typeof result).toBe('string');
    });

    it('should handle invalid timestamp strings', () => {
      expect(formatUnixTimestamp('invalid')).toBe('Invalid date');
      expect(formatUnixTimestamp('abc123')).toBe('Invalid date');
      expect(formatUnixTimestamp('')).toBe('Invalid date');
    });

    it('should handle edge cases', () => {
      expect(formatUnixTimestamp('0')).not.toBe('Invalid date'); // Unix epoch
      expect(formatUnixTimestamp('-1')).not.toBe('Invalid date'); // Before epoch
    });

    it('should use custom locale when provided', () => {
      const timestamp = '1690000000';
      const result = formatUnixTimestamp(timestamp, 'en-US');
      
      expect(result).not.toBe('Invalid date');
      expect(typeof result).toBe('string');
    });
  });

  describe('formatUnixTimestampCustom', () => {
    it('should format with custom options', () => {
      const timestamp = '1690000000';
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      
      const result = formatUnixTimestampCustom(timestamp, options);
      
      expect(result).not.toBe('Invalid date');
      expect(result).toMatch(/\d{4}/); // Should contain year
    });

    it('should handle invalid timestamps with custom options', () => {
      const options: Intl.DateTimeFormatOptions = { year: 'numeric' };
      
      expect(formatUnixTimestampCustom('invalid', options)).toBe('Invalid date');
      expect(formatUnixTimestampCustom('', options)).toBe('Invalid date');
    });

    it('should use custom locale with options', () => {
      const timestamp = '1690000000';
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      };
      
      const result = formatUnixTimestampCustom(timestamp, options, 'en-US');
      
      expect(result).not.toBe('Invalid date');
      expect(typeof result).toBe('string');
    });
  });

  describe('getRelativeTime', () => {
    it('should return "just now" for very recent timestamps', () => {
      // Current mocked time minus 30 seconds
      const timestamp = String(Math.floor(Date.now() / 1000) - 30);
      
      expect(getRelativeTime(timestamp)).toBe('just now');
    });

    it('should return minutes ago for recent timestamps', () => {
      // Current mocked time minus 5 minutes
      const timestamp = String(Math.floor(Date.now() / 1000) - (5 * 60));
      
      expect(getRelativeTime(timestamp)).toBe('5 minutes ago');
    });

    it('should return singular minute for 1 minute ago', () => {
      // Current mocked time minus 1 minute
      const timestamp = String(Math.floor(Date.now() / 1000) - 60);
      
      expect(getRelativeTime(timestamp)).toBe('1 minute ago');
    });

    it('should return hours ago for timestamps within 24 hours', () => {
      // Current mocked time minus 3 hours
      const timestamp = String(Math.floor(Date.now() / 1000) - (3 * 60 * 60));
      
      expect(getRelativeTime(timestamp)).toBe('3 hours ago');
    });

    it('should return singular hour for 1 hour ago', () => {
      // Current mocked time minus 1 hour
      const timestamp = String(Math.floor(Date.now() / 1000) - (60 * 60));
      
      expect(getRelativeTime(timestamp)).toBe('1 hour ago');
    });

    it('should return days ago for timestamps within a week', () => {
      // Current mocked time minus 2 days
      const timestamp = String(Math.floor(Date.now() / 1000) - (2 * 24 * 60 * 60));
      
      expect(getRelativeTime(timestamp)).toBe('2 days ago');
    });

    it('should return singular day for 1 day ago', () => {
      // Current mocked time minus 1 day
      const timestamp = String(Math.floor(Date.now() / 1000) - (24 * 60 * 60));
      
      expect(getRelativeTime(timestamp)).toBe('1 day ago');
    });

    it('should return formatted date for timestamps older than a week', () => {
      // Current mocked time minus 10 days
      const timestamp = String(Math.floor(Date.now() / 1000) - (10 * 24 * 60 * 60));
      
      const result = getRelativeTime(timestamp);
      
      expect(result).not.toBe('Invalid date');
      expect(result).not.toMatch(/ago$/); // Should not end with "ago"
    });

    it('should handle invalid timestamps', () => {
      expect(getRelativeTime('invalid')).toBe('Invalid date');
      expect(getRelativeTime('')).toBe('Invalid date');
      expect(getRelativeTime('abc')).toBe('Invalid date');
    });

    it('should handle future timestamps gracefully', () => {
      // Future timestamp (1 hour from now)
      const timestamp = String(Math.floor(Date.now() / 1000) + (60 * 60));
      
      const result = getRelativeTime(timestamp);
      
      // Should not crash, might return negative values or formatted date
      expect(typeof result).toBe('string');
    });
  });

  describe('error handling', () => {
    it('should handle null and undefined inputs', () => {
      expect(formatUnixTimestamp(null as any)).toBe('Invalid date');
      expect(formatUnixTimestamp(undefined as any)).toBe('Invalid date');
      expect(getRelativeTime(null as any)).toBe('Invalid date');
      expect(getRelativeTime(undefined as any)).toBe('Invalid date');
    });

    it('should handle extremely large timestamps', () => {
      const largeTimestamp = '999999999999999'; // Very large timestamp
      
      // Should handle gracefully without crashing
      const result = formatUnixTimestamp(largeTimestamp);
      expect(typeof result).toBe('string');
    });

    it('should handle negative timestamps', () => {
      const negativeTimestamp = '-1000';
      
      const result = formatUnixTimestamp(negativeTimestamp);
      expect(typeof result).toBe('string');
    });
  });
});