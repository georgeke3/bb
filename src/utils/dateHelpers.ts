import { differenceInDays, parseISO, startOfToday, subWeeks, startOfWeek } from 'date-fns';

/**
 * Calculates the Anniversary Date (0w0d) of the pregnancy.
 * Based on user requirement: 
 * Sat May 9, 2026 is the start of W16 (15w0d).
 * Working back, W1 (0w0d) starts Saturday Jan 24, 2026.
 */
export const getAnniversaryDate = (birthDate: string): Date => {
  const targetDate = parseISO(birthDate);
  // For Oct 25, 2026 (Sun), subWeeks(targetDate, 39) = Jan 25 (Sun).
  // startOfWeek(..., { weekStartsOn: 6 }) = Jan 24 (Sat).
  return startOfWeek(subWeeks(targetDate, 39), { weekStartsOn: 6 });
};

/**
 * Calculates the current pregnancy week using 1-based indexing.
 */
export const calculateCurrentWeek = (birthDate: string): number => {
  const today = startOfToday();
  const anniversaryDate = getAnniversaryDate(birthDate);
  
  const daysPassed = differenceInDays(today, anniversaryDate);
  
  // Floor(days / 7) + 1 gives the 1-based week number
  // e.g., Days 0-6 are Week 1.
  const currentWeek = Math.floor(daysPassed / 7) + 1;
  
  // Clamp for safety
  return Math.max(1, Math.min(42, currentWeek));
};

/**
 * Calculates which week a specific date falls into.
 */
export const getWeekForDate = (date: Date, anniversaryDate: Date): number => {
  const daysPassed = differenceInDays(date, anniversaryDate);
  return Math.floor(daysPassed / 7) + 1;
};

/**
 * Returns the trimester for a given week number.
 */
export const getTrimester = (week: number): 1 | 2 | 3 => {
  if (week <= 13) return 1;
  if (week <= 27) return 2;
  return 3;
};
