import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  formatUnixTimestamp
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


  describe('error handling', () => {
    it('should handle null and undefined inputs', () => {
      expect(formatUnixTimestamp(null as any)).toBe('Invalid date');
      expect(formatUnixTimestamp(undefined as any)).toBe('Invalid date');
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