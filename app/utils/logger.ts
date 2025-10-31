/**
 * Production-Safe Logging Utility
 * 
 * Features:
 * - Environment-aware logging (dev vs production)
 * - Automatic sensitive data redaction in production
 * - Prevents API keys, tokens, passwords from leaking
 * - Optimized for security and performance
 */

const isDev = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production';

/**
 * Sanitize data to prevent logging sensitive information
 * Redacts: API keys, tokens, passwords, secrets, auth headers
 */
function sanitizeForProduction(data: any): any {
  if (!data || isDev) return data; // Skip sanitization in development
  
  if (typeof data === 'string') {
    // Redact common sensitive patterns
    return data
      .replace(/(['"]?(?:api[_-]?key|token|password|secret|auth|bearer)['"]\s*[:=]\s*['"])([^'"]+)(['"])/gi, '$1[REDACTED]$3')
      .replace(/(Bearer\s+)[^\s]+/gi, '$1[REDACTED]')
      .replace(/([a-zA-Z0-9_-]{20,})/g, (match) => {
        // Redact long strings that might be tokens
        return match.length > 30 ? '[REDACTED]' : match;
      });
  }
  
  if (Array.isArray(data)) {
    return data.map(sanitizeForProduction);
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      // Redact sensitive keys
      if (lowerKey.includes('password') || 
          lowerKey.includes('secret') || 
          lowerKey.includes('token') ||
          lowerKey.includes('apikey') ||
          lowerKey.includes('api_key') ||
          lowerKey.includes('auth') ||
          lowerKey.includes('credential')) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForProduction(value);
      }
    }
    return sanitized;
  }
  
  return data;
}

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
    } else {
      // In production, sanitize before logging
      console.log(...args.map(sanitizeForProduction));
    }
  },

  /**
   * Info logs - sanitized in production
   * Alias for log()
   */
  info: (...args: any[]) => {
    if (isDev) {
      console.info(...args);
    } else {
      console.info(...args.map(sanitizeForProduction));
    }
  },

  /**
   * Warning logs - shown in all environments, sanitized in production
   * Use for non-critical issues that should be investigated
   */
  warn: (...args: any[]) => {
    if (isDev) {
      console.warn(...args);
    } else {
      console.warn(...args.map(sanitizeForProduction));
    }
  },

  /**
   * Error logs - shown in all environments, sanitized in production
   * Use for errors and exceptions
   */
  error: (...args: any[]) => {
    if (isDev) {
      console.error(...args);
    } else {
      console.error(...args.map(sanitizeForProduction));
    }
  },

  /**
   * Production-safe log
   * Only logs in production if explicitly enabled
   */
  prod: (...args: any[]) => {
    if (process.env.ENABLE_PROD_LOGGING === 'true') {
      console.log('[PROD]', ...args.map(sanitizeForProduction));
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
