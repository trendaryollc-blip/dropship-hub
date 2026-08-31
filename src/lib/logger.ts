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

export function silentCatch(context: string, error: unknown): void {
  if (process.env.NODE_ENV === "development") {
    logger.warn(`[${context}] silently caught`, { error: error instanceof Error ? error.message : String(error) });
  }
}
