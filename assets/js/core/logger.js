/* ═══════════════════════════════════════════════
   logger.js — Level-gated console output.
   Replaces the scattered console.log calls that used
   to run on every diagram export in production.
   ═══════════════════════════════════════════════ */

class Logger {
  /** Ordered severities; anything below `level` is dropped. */
  static LEVELS = { debug: 10, info: 20, warn: 30, error: 40, silent: 99 };

  /** Change at runtime: Logger.level = 'debug' */
  static level = "warn";

  static _enabled(name) {
    return Logger.LEVELS[name] >= (Logger.LEVELS[Logger.level] ?? 30);
  }

  static debug(...args) {
    if (Logger._enabled("debug")) console.log("%c[md]", "color:#888", ...args);
  }

  static info(...args) {
    if (Logger._enabled("info")) console.info("[md]", ...args);
  }

  static warn(...args) {
    if (Logger._enabled("warn")) console.warn("[md]", ...args);
  }

  static error(...args) {
    if (Logger._enabled("error")) console.error("[md]", ...args);
  }

  /** Measure a block and log its duration at debug level. */
  static async time(label, fn) {
    if (!Logger._enabled("debug")) return fn();
    const t0 = performance.now();
    try {
      return await fn();
    } finally {
      Logger.debug(`${label}: ${(performance.now() - t0).toFixed(1)}ms`);
    }
  }
}
