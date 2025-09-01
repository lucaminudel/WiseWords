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
    return 'Invalid date';
  }
};

/**
 * Formats a Unix timestamp (in seconds) to a localized date string without seconds.
 * 
 * @param unixTimestamp - Unix timestamp in seconds (as string)
 * @param locale - Optional locale for formatting (defaults to user's locale)
 * @returns Formatted date string without seconds
 */
export const formatUnixTimestampNoSeconds = (unixTimestamp: string, locale?: string): string => {
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

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    };

    return date.toLocaleString(locale, options);
  } catch (error) {
    return 'Invalid date';
  }
};

