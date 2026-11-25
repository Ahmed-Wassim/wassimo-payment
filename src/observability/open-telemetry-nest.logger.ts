import { ConsoleLogger, type LogLevel, type LoggerService } from '@nestjs/common';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

type LogSeverity = 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' | 'TRACE' | 'FATAL';

const severityNumber: Record<LogSeverity, SeverityNumber> = {
  INFO: SeverityNumber.INFO,
  WARN: SeverityNumber.WARN,
  ERROR: SeverityNumber.ERROR,
  DEBUG: SeverityNumber.DEBUG,
  TRACE: SeverityNumber.TRACE,
  FATAL: SeverityNumber.FATAL,
};

export class OpenTelemetryNestLogger implements LoggerService {
  private readonly consoleLogger = new ConsoleLogger();
  private readonly otelLogger = logs.getLogger('wassimo-payment');

  log(message: any, ...optionalParams: any[]): void {
    this.consoleLogger.log(message, ...optionalParams);
    this.send('INFO', message, optionalParams);
  }

  error(message: any, ...optionalParams: any[]): void {
    this.consoleLogger.error(message, ...optionalParams);
    this.send('ERROR', message, optionalParams);
  }

  warn(message: any, ...optionalParams: any[]): void {
    this.consoleLogger.warn(message, ...optionalParams);
    this.send('WARN', message, optionalParams);
  }

  debug(message: any, ...optionalParams: any[]): void {
    this.consoleLogger.debug(message, ...optionalParams);
    this.send('DEBUG', message, optionalParams);
  }

  verbose(message: any, ...optionalParams: any[]): void {
    this.consoleLogger.verbose(message, ...optionalParams);
    this.send('TRACE', message, optionalParams);
  }

  fatal(message: any, ...optionalParams: any[]): void {
    this.consoleLogger.fatal(message, ...optionalParams);
    this.send('FATAL', message, optionalParams);
  }

  setLogLevels(levels: LogLevel[]): void {
    this.consoleLogger.setLogLevels(levels);
  }

  private send(
    severity: LogSeverity,
    message: unknown,
    optionalParams: unknown[],
  ): void {
    const context = optionalParams.findLast(
      (param): param is string => typeof param === 'string',
    );

    this.otelLogger.emit({
      severityText: severity,
      severityNumber: severityNumber[severity],
      body: String(message),
      ...(context ? { attributes: { 'logger.context': context } } : {}),
    });
  }
}
