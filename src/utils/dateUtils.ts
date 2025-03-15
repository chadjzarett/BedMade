/**
 * Utility functions for date handling in the app
 * These ensure consistent date handling across the app using local time
 */

/**
 * Returns a date string in YYYY-MM-DD format using local time
 * @param date The date to format
 * @returns A string in YYYY-MM-DD format
 */
export const getLocalDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns today's date string in YYYY-MM-DD format using local time
 * @returns Today's date as a string in YYYY-MM-DD format
 */
export const getTodayLocalDateString = (): string => {
  return getLocalDateString(new Date());
};

/**
 * Returns yesterday's date string in YYYY-MM-DD format using local time
 * @returns Yesterday's date as a string in YYYY-MM-DD format
 */
export const getYesterdayLocalDateString = (): string => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return getLocalDateString(yesterday);
}; 