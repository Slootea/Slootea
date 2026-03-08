/**
 * Timezone Utility Module
 * 
 * TIMEZONE STANDARD FOR THIS APPLICATION:
 * 
 * 1. DATABASE STORAGE:
 *    - All appointment startTime/endTime are stored as UTC timestamps
 *    - Availability and BlockedTimes store date (YYYY-MM-DD) and time (HH:MM) strings
 *      in the organization's local timezone (timezone-agnostic schedules)
 * 
 * 2. ORGANIZATION SETTINGS:
 *    - Each organization has a `timezone` field (IANA timezone, e.g., 'Europe/Istanbul')
 *    - This is used for all display and calculation purposes
 * 
 * 3. CONVERSION RULES:
 *    - Input (from user): Local time → Convert to UTC before storing
 *    - Output (to user): UTC → Convert to organization timezone for display
 *    - Notifications: MUST use organization timezone when formatting dates
 * 
 * 4. NEVER:
 *    - Use server's local timezone for formatting
 *    - Use Date.toLocaleString() without specifying timeZone option
 *    - Assume any specific timezone for user-facing operations
 */

/**
 * Format a UTC Date to a localized date string in the specified timezone
 * 
 * @param date - Date object (stored in UTC)
 * @param timezone - IANA timezone string (e.g., 'Europe/Istanbul')
 * @param locale - Locale for formatting (default: 'tr-TR')
 * @returns Formatted date string (e.g., "4 Şubat 2026")
 */
export function formatDateInTimezone(
  date: Date,
  timezone: string = 'UTC',
  locale: string = 'tr-TR',
): string {
  try {
    return date.toLocaleDateString(locale, {
      timeZone: timezone,
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    console.error(`Invalid timezone '${timezone}', falling back to UTC:`, error);
    return date.toLocaleDateString(locale, {
      timeZone: 'UTC',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
}

/**
 * Format a UTC Date to a localized time string in the specified timezone
 * 
 * @param date - Date object (stored in UTC)
 * @param timezone - IANA timezone string (e.g., 'Europe/Istanbul')
 * @param locale - Locale for formatting (default: 'tr-TR')
 * @returns Formatted time string (e.g., "14:30")
 */
export function formatTimeInTimezone(
  date: Date,
  timezone: string = 'UTC',
  locale: string = 'tr-TR',
): string {
  try {
    return date.toLocaleTimeString(locale, {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    console.error(`Invalid timezone '${timezone}', falling back to UTC:`, error);
    return date.toLocaleTimeString(locale, {
      timeZone: 'UTC',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}

/**
 * Format a UTC Date to a full datetime string in the specified timezone
 * 
 * @param date - Date object (stored in UTC)
 * @param timezone - IANA timezone string
 * @param locale - Locale for formatting (default: 'tr-TR')
 * @returns Formatted datetime (e.g., "4 Şubat 2026, 14:30")
 */
export function formatDateTimeInTimezone(
  date: Date,
  timezone: string = 'UTC',
  locale: string = 'tr-TR',
): string {
  const dateStr = formatDateInTimezone(date, timezone, locale);
  const timeStr = formatTimeInTimezone(date, timezone, locale);
  return `${dateStr}, ${timeStr}`;
}

/**
 * Format a UTC Date to YYYY-MM-DD string in the specified timezone
 * 
 * @param date - Date object (stored in UTC)
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function formatISODateInTimezone(date: Date, timezone: string = 'UTC'): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(date);
  } catch (error) {
    // Fallback to UTC if timezone is invalid
    return date.toISOString().split('T')[0];
  }
}

/**
 * Get the day of week (0 = Monday, 6 = Sunday) for a date in a specific timezone
 * 
 * @param date - Date object (stored in UTC)
 * @param timezone - IANA timezone string
 * @returns Day of week (0 = Monday, 6 = Sunday)
 */
export function getDayOfWeekInTimezone(date: Date, timezone: string = 'UTC'): number {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      weekday: 'short',
    });
    const dayName = formatter.format(date);
    const dayMap: Record<string, number> = {
      'Mon': 0, 'Tue': 1, 'Wed': 2, 'Thu': 3, 'Fri': 4, 'Sat': 5, 'Sun': 6
    };
    return dayMap[dayName] ?? ((date.getDay() + 6) % 7);
  } catch {
    return ((date.getDay() + 6) % 7);
  }
}

/**
 * Create a UTC Date from a local time in a specific timezone
 * 
 * This is used when a user inputs a time in their local timezone and we need
 * to store it as UTC.
 * 
 * For example: if dateStr="2026-02-04", time="14:00", timezone="Europe/Istanbul" (UTC+3)
 * This returns a Date representing 11:00 UTC (which is 14:00 in Istanbul)
 * 
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param time - Time string in HH:MM format
 * @param timezone - IANA timezone string
 * @returns Date object in UTC
 */
export function createUTCFromLocalTime(
  dateStr: string,
  time: string,
  timezone: string = 'UTC',
): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const [year, month, day] = dateStr.split('-').map(Number);
  
  // For UTC, just create the date directly
  if (timezone === 'UTC') {
    return new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  }
  
  try {
    // Create a formatter that outputs in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    
    // Start with an initial guess: treat the input as UTC
    let guess = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
    
    // Format the guess in the target timezone
    const parts = formatter.formatToParts(guess);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    
    const guessHourInTz = getPart('hour');
    const guessMinuteInTz = getPart('minute');
    const guessDayInTz = getPart('day');
    
    // Calculate how far off we are
    let hourDiff = guessHourInTz - hours;
    let dayDiff = guessDayInTz - day;
    
    // Handle day wraparound
    if (dayDiff > 15) dayDiff -= 30; // Month boundary
    if (dayDiff < -15) dayDiff += 30;
    
    // Total offset in minutes
    const offsetMinutes = dayDiff * 24 * 60 + hourDiff * 60 + (guessMinuteInTz - minutes);
    
    // Adjust our guess by subtracting the offset
    const result = new Date(guess.getTime() - offsetMinutes * 60000);
    
    return result;
  } catch (error) {
    console.error('createUTCFromLocalTime error:', error);
    // Fallback: parse as local time (server timezone) - not ideal but better than crashing
    return new Date(`${dateStr}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:00`);
  }
}

/**
 * Get the current time in a specific timezone
 * 
 * @param timezone - IANA timezone string
 * @returns Object with hour and minute in the specified timezone
 */
export function getCurrentTimeInTimezone(timezone: string = 'UTC'): { hour: number; minute: number } {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const parts = formatter.formatToParts(now);
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0', 10);
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0', 10);
  return { hour, minute };
}

/**
 * Get today's date string (YYYY-MM-DD) in a specific timezone
 * 
 * @param timezone - IANA timezone string
 * @returns Date string in YYYY-MM-DD format
 */
export function getTodayInTimezone(timezone: string = 'UTC'): string {
  return formatISODateInTimezone(new Date(), timezone);
}

/**
 * Check if a Date falls on today in a specific timezone
 * 
 * @param date - Date to check
 * @param timezone - IANA timezone string
 * @returns true if the date is today in the given timezone
 */
export function isToday(date: Date, timezone: string = 'UTC'): boolean {
  return formatISODateInTimezone(date, timezone) === getTodayInTimezone(timezone);
}

/**
 * Validate that a timezone string is valid
 * 
 * @param timezone - IANA timezone string to validate
 * @returns true if valid, false otherwise
 */
export function isValidTimezone(timezone: string): boolean {
  try {
    Intl.DateTimeFormat('en-US', { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Get the UTC offset for a timezone at a specific time
 * 
 * @param timezone - IANA timezone string
 * @param date - Date to get offset for (default: now)
 * @returns Offset in minutes (e.g., 180 for UTC+3)
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
  if (timezone === 'UTC') return 0;
  
  try {
    // Get the date components in the target timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    
    const parts = formatter.formatToParts(date);
    const getPart = (type: string) => parseInt(parts.find(p => p.type === type)?.value || '0', 10);
    
    const localDate = new Date(Date.UTC(
      getPart('year'),
      getPart('month') - 1,
      getPart('day'),
      getPart('hour'),
      getPart('minute'),
    ));
    
    // The difference between the local representation and UTC gives us the offset
    return Math.round((localDate.getTime() - date.getTime()) / 60000);
  } catch {
    return 0;
  }
}
