/**
 * Logging utility that respects environment
 * In production, only errors and warnings are logged
 * In development, all logs are shown
 */

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

export const logger = {
  /**
   * Debug logs - only in development
   * Use for detailed debugging information
   */
  debug: (...args: any[]) => {
    if (isDev) {
      console.log('[DEBUG]', ...args);
    }
  },

  /**
   * Info logs - only in development
   * Use for general informational messages
   */
  log: (...args: any[]) => {
    if (isDev) {
      console.log(...args);
    }
  },

  /**
   * Info logs - only in development
   * Alias for log()
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    }
  },

  /**
   * Warning logs - shown in all environments
   * Use for non-critical issues that should be investigated
   */
  warn: (...args: any[]) => {
    console.warn(...args);
  },

  /**
   * Error logs - shown in all environments
   * Use for errors and exceptions
   */
  error: (...args: any[]) => {
    console.error(...args);
  },

  /**
   * Production-safe log
   * Only logs in production if explicitly enabled
   */
  prod: (...args: any[]) => {
    if (process.env.ENABLE_PROD_LOGGING === 'true') {
      console.log('[PROD]', ...args);
    }
  }
};

/**
 * Performance logging helper
 * Only logs in development
 */
export const perfLogger = {
  start: (label: string): number | null => {
    if (isDev) {
      console.time(label);
      return Date.now();
    }
    return null;
  },

  end: (label: string): void => {
    if (isDev) {
      console.timeEnd(label);
    }
  },

  mark: (label: string, startTime: number | null): void => {
    if (isDev && startTime) {
      const duration = Date.now() - startTime;
      console.log(`⏱️ ${label}: ${duration}ms`);
    }
  }
};

export default logger;
