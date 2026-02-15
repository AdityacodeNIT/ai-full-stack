/**
 * Production-safe logger utility
 * Logs only in development, completely removed in production builds
 */

const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args) => {
    if (isDev) console.log(...args);
  },
  
  warn: (...args) => {
    if (isDev) console.warn(...args);
  },
  
  error: (...args) => {
    // Always log errors, even in production
    console.error(...args);
  },
  
  info: (...args) => {
    if (isDev) console.info(...args);
  },
  
  debug: (...args) => {
    if (isDev) console.debug(...args);
  },
  
  table: (...args) => {
    if (isDev) console.table(...args);
  },
  
  group: (label) => {
    if (isDev) console.group(label);
  },
  
  groupEnd: () => {
    if (isDev) console.groupEnd();
  }
};

// Convenience exports
export const { log, warn, error, info, debug } = logger;
