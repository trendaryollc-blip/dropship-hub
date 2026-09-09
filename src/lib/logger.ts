type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  uid?: string;
  route?: string;
  [key: string]: unknown;
}

function formatLog(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const ctx = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${ctx}`;
}

export function createLogger(defaultContext?: LogContext) {
  return {
    debug(message: string, context?: LogContext) {
      // Debug logs are only shown in development to reduce noise
      if (process.env.NODE_ENV === "development") {
        console.debug(formatLog("debug", message, { ...defaultContext, ...context }));
      }
    },
    info(message: string, context?: LogContext) {
      console.info(formatLog("info", message, { ...defaultContext, ...context }));
    },
    warn(message: string, context?: LogContext) {
      console.warn(formatLog("warn", message, { ...defaultContext, ...context }));
    },
    error(message: string, context?: LogContext) {
      console.error(formatLog("error", message, { ...defaultContext, ...context }));
    },
  };
}

export const logger = createLogger();

/**
 * Log a caught error. Always logs in production for visibility.
 * Use this in catch blocks instead of silently swallowing errors.
 */
export function silentCatch(context: string, error: unknown): void {
  logger.warn(`[${context}] caught error`, { error: error instanceof Error ? error.message : String(error) });
}
