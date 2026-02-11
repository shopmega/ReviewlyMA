/**
 * Centralized Logging Service
 * Replaces console.log/error/warn with structured logging
 * Supports different log levels and can integrate with external services
 */

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  CRITICAL = 'critical',
}

export interface LogContext {
  [key: string]: any;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  private isProduction = process.env.NODE_ENV === 'production';
  private logLevel: LogLevel;

  constructor() {
    // Set log level based on environment
    this.logLevel = this.isDevelopment ? LogLevel.DEBUG : LogLevel.INFO;
  }

  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR, LogLevel.CRITICAL];
    const currentIndex = levels.indexOf(this.logLevel);
    const messageIndex = levels.indexOf(level);
    return messageIndex >= currentIndex;
  }

  private formatMessage(level: LogLevel, message: string, context?: LogContext): string {
    const timestamp = new Date().toISOString();
    const contextStr = context ? ` ${JSON.stringify(context)}` : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
  }

  private async sendToExternalService(level: LogLevel, message: string, context?: LogContext) {
    // Only send errors and critical logs to external services in production
    if (!this.isProduction || (level !== LogLevel.ERROR && level !== LogLevel.CRITICAL)) {
      return;
    }

    try {
      // Send to error tracking service if configured
      if (process.env.NEXT_PUBLIC_ERROR_WEBHOOK) {
        await fetch(process.env.NEXT_PUBLIC_ERROR_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            level,
            message,
            context,
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
          }),
        });
      }
    } catch (error) {
      // Fallback to console if external service fails
      console.error('Failed to send log to external service:', error);
    }
  }

  debug(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    if (this.isDevelopment) {
      console.debug(this.formatMessage(LogLevel.DEBUG, message, context));
    }
  }

  info(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.INFO)) return;

    if (this.isDevelopment) {
      console.info(this.formatMessage(LogLevel.INFO, message, context));
    } else {
      // In production, only log important info
      console.log(this.formatMessage(LogLevel.INFO, message, context));
    }
  }

  warn(message: string, context?: LogContext) {
    if (!this.shouldLog(LogLevel.WARN)) return;

    console.warn(this.formatMessage(LogLevel.WARN, message, context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext) {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : String(error),
    };

    console.error(this.formatMessage(LogLevel.ERROR, message, errorContext));
    this.sendToExternalService(LogLevel.ERROR, message, errorContext);
  }

  critical(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext: LogContext = {
      ...context,
      error: error instanceof Error ? {
        message: error.message,
        stack: error.stack,
        name: error.name,
      } : String(error),
    };

    console.error(this.formatMessage(LogLevel.CRITICAL, message, errorContext));
    this.sendToExternalService(LogLevel.CRITICAL, message, errorContext);
  }

  // Server-side logging (for server actions, API routes, etc.)
  server(level: LogLevel, message: string, context?: LogContext) {
    const formatted = this.formatMessage(level, message, context);
    
    switch (level) {
      case LogLevel.DEBUG:
        this.debug(message, context);
        break;
      case LogLevel.INFO:
        this.info(message, context);
        break;
      case LogLevel.WARN:
        this.warn(message, context);
        break;
      case LogLevel.ERROR:
      case LogLevel.CRITICAL:
        this.error(message, undefined, context);
        break;
    }

    // In production, also log to file or external service
    if (this.isProduction && (level === LogLevel.ERROR || level === LogLevel.CRITICAL)) {
      this.sendToExternalService(level, message, context);
    }
  }
}

// Singleton instance
export const logger = new Logger();

// Convenience functions
export const log = {
  debug: (message: string, context?: LogContext) => logger.debug(message, context),
  info: (message: string, context?: LogContext) => logger.info(message, context),
  warn: (message: string, context?: LogContext) => logger.warn(message, context),
  error: (message: string, error?: Error | unknown, context?: LogContext) => logger.error(message, error, context),
  critical: (message: string, error?: Error | unknown, context?: LogContext) => logger.critical(message, error, context),
  server: (level: LogLevel, message: string, context?: LogContext) => logger.server(level, message, context),
};

export default logger;



