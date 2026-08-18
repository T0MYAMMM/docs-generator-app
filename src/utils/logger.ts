/**
 * Logger utility for DocGen
 *
 * Provides structured logging with different levels and colored output.
 * Supports verbose mode for detailed debugging.
 */

import chalk from 'chalk';

/**
 * Log levels in order of severity
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  SILENT = 4,
}

/**
 * Logger configuration
 */
interface LoggerConfig {
  /** Minimum log level to display */
  level: LogLevel;

  /** Enable timestamps */
  timestamps: boolean;

  /** Enable colors */
  colors: boolean;
}

/**
 * Logger class for consistent logging throughout the application
 */
export class Logger {
  private config: LoggerConfig;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      timestamps: false,
      colors: true,
      ...config,
    };
  }

  /**
   * Set the minimum log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Enable or disable colors
   */
  setColors(enabled: boolean): void {
    this.config.colors = enabled;
  }

  /**
   * Log a debug message (verbose mode only)
   */
  debug(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.DEBUG) {
      this.log('DEBUG', chalk.gray, message, ...args);
    }
  }

  /**
   * Log an info message
   */
  info(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.INFO) {
      this.log('INFO', chalk.blue, message, ...args);
    }
  }

  /**
   * Log a success message
   */
  success(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.INFO) {
      this.log('SUCCESS', chalk.green, message, ...args);
    }
  }

  /**
   * Log a warning message
   */
  warn(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.WARN) {
      this.log('WARN', chalk.yellow, message, ...args);
    }
  }

  /**
   * Log an error message
   */
  error(message: string, ...args: unknown[]): void {
    if (this.config.level <= LogLevel.ERROR) {
      this.log('ERROR', chalk.red, message, ...args);
    }
  }

  /**
   * Log an error with stack trace
   */
  errorWithStack(message: string, error: Error): void {
    this.error(message);
    if (this.config.level <= LogLevel.DEBUG) {
      console.error(chalk.gray(error.stack || ''));
    }
  }

  /**
   * Internal log method
   */
  private log(
    level: string,
    colorFn: typeof chalk.gray,
    message: string,
    ...args: unknown[]
  ): void {
    const timestamp = this.config.timestamps
      ? `[${new Date().toISOString()}] `
      : '';

    const levelLabel = this.config.colors
      ? colorFn(`[${level}]`)
      : `[${level}]`;

    const formattedMessage = this.config.colors ? message : message;

    console.log(`${timestamp}${levelLabel} ${formattedMessage}`, ...args);
  }

  /**
   * Create a progress logger for long-running operations
   */
  progress(message: string): ProgressLogger {
    return new ProgressLogger(message, this);
  }
}

/**
 * Progress logger for tracking long-running operations
 */
class ProgressLogger {
  private startTime: number;
  private lastUpdate: number;
  private completed: number = 0;
  private total: number = 0;

  constructor(
    private message: string,
    private logger: Logger
  ) {
    this.startTime = Date.now();
    this.lastUpdate = this.startTime;
    this.logger.info(this.message);
  }

  /**
   * Set the total number of items
   */
  setTotal(total: number): void {
    this.total = total;
  }

  /**
   * Increment progress
   */
  increment(count: number = 1): void {
    this.completed += count;
    this.update();
  }

  /**
   * Update progress display (throttled to avoid spam)
   */
  private update(): void {
    const now = Date.now();

    // Only update every 100ms to avoid spam
    if (now - this.lastUpdate < 100) {
      return;
    }

    this.lastUpdate = now;

    if (this.total > 0) {
      const percentage = Math.round((this.completed / this.total) * 100);
      this.logger.info(
        `${this.message}: ${this.completed}/${this.total} (${percentage}%)`
      );
    } else {
      this.logger.info(`${this.message}: ${this.completed}`);
    }
  }

  /**
   * Mark as complete
   */
  done(): void {
    const duration = Date.now() - this.startTime;
    const durationStr = this.formatDuration(duration);

    this.logger.success(
      `${this.message} completed in ${durationStr} (${this.completed} items)`
    );
  }

  /**
   * Format duration in human-readable format
   */
  private formatDuration(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }

    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) {
      return `${seconds}s`;
    }

    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }
}

/**
 * Global logger instance
 */
export const logger = new Logger();

/**
 * Create a logger with custom configuration
 */
export function createLogger(config: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}
