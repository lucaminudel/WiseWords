/**
 * Date and timestamp utilities for formatting display dates.
 */

/**
 * Formats a Unix timestamp (in seconds) to a localized date string.
 * 
 * @param unixTimestamp - Unix timestamp in seconds (as string)
 * @param locale - Optional locale for formatting (defaults to user's locale)
 * @returns Formatted date string
 */
export const formatUnixTimestamp = (unixTimestamp: string, locale?: string): string => {
  try {
    // Check for null, undefined, or empty string
    if (!unixTimestamp || unixTimestamp.trim() === '') {
      return 'Invalid date';
    }
    
    // Check if string contains only digits (and optional minus sign)
    if (!/^-?\d+$/.test(unixTimestamp.trim())) {
      return 'Invalid date';
    }
    
    const timestamp = Number(unixTimestamp);
    if (isNaN(timestamp)) {
      return 'Invalid date';
    }
    
    // Convert from seconds to milliseconds
    const date = new Date(timestamp * 1000);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleString(locale);
  } catch (error) {
    console.warn('Error formatting timestamp:', unixTimestamp, error);
    return 'Invalid date';
  }
};

/**
 * Formats a Unix timestamp with custom options.
 * 
 * @param unixTimestamp - Unix timestamp in seconds (as string)
 * @param options - Intl.DateTimeFormatOptions for custom formatting
 * @param locale - Optional locale for formatting
 * @returns Formatted date string
 */
export const formatUnixTimestampCustom = (
  unixTimestamp: string, 
  options: Intl.DateTimeFormatOptions,
  locale?: string
): string => {
  try {
    // Check for null, undefined, or empty string
    if (!unixTimestamp || unixTimestamp.trim() === '') {
      return 'Invalid date';
    }
    
    // Check if string contains only digits (and optional minus sign)
    if (!/^-?\d+$/.test(unixTimestamp.trim())) {
      return 'Invalid date';
    }
    
    const timestamp = Number(unixTimestamp);
    if (isNaN(timestamp)) {
      return 'Invalid date';
    }
    
    const date = new Date(timestamp * 1000);
    
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    
    return date.toLocaleDateString(locale, options);
  } catch (error) {
    console.warn('Error formatting timestamp with custom options:', unixTimestamp, error);
    return 'Invalid date';
  }
};

/**
 * Gets a relative time string (e.g., "2 hours ago", "yesterday").
 * 
 * @param unixTimestamp - Unix timestamp in seconds (as string)
 * @returns Relative time string
 */
export const getRelativeTime = (unixTimestamp: string): string => {
  try {
    // Check for null, undefined, or empty string
    if (!unixTimestamp || unixTimestamp.trim() === '') {
      return 'Invalid date';
    }
    
    // Check if string contains only digits (and optional minus sign)
    if (!/^-?\d+$/.test(unixTimestamp.trim())) {
      return 'Invalid date';
    }
    
    const timestamp = Number(unixTimestamp);
    if (isNaN(timestamp)) {
      return 'Invalid date';
    }
    
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMinutes < 1) {
      return 'just now';
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
    } else {
      return formatUnixTimestamp(unixTimestamp);
    }
  } catch (error) {
    console.warn('Error calculating relative time:', unixTimestamp, error);
    return 'Invalid date';
  }
};