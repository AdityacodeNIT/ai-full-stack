// utils/logger.js

const env = process.env.NODE_ENV || "development";
const isDev = env !== "production";

const format = (level, args) => {
  const timestamp = new Date().toISOString();
  return [`[${timestamp}] [${level}]`, ...args];
};

export const logger = {
  log: (...args) => {
    if (isDev) console.log(...format("LOG", args));
  },

  warn: (...args) => {
    if (isDev) console.warn(...format("WARN", args));
  },

  info: (...args) => {
    if (isDev) console.info(...format("INFO", args));
  },

  debug: (...args) => {
    if (isDev) console.debug(...format("DEBUG", args));
  },

  error: (...args) => {
    console.error(...format("ERROR", args));
  },
};
