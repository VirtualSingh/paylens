import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { STATUS_CODES } from 'node:http';

/** RFC 9457 problem details, plus our request id (docs/vault/design/api.md → Errors). */
export interface ProblemDetails {
  readonly type: string;
  readonly title: string;
  readonly status: number;
  readonly detail?: string;
  readonly instance: string;
  readonly requestId?: string;
}

/**
 * The one place where any error becomes an HTTP response. Client errors (4xx) explain
 * themselves; server errors (5xx) say nothing beyond their status and are logged instead.
 */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const isServerError = status >= 500;
    // Express: baseUrl + path is the full path the client asked for, minus the query string.
    const instance = `${request.baseUrl}${request.path}`;

    if (isServerError) {
      this.logger.error(
        `${errorName(exception)} on ${request.method} ${instance} (requestId=${request.requestId ?? 'none'})`,
        stackFramesOnly(exception),
      );
    }

    const problem: ProblemDetails = {
      type: 'about:blank',
      title: STATUS_CODES[status] ?? 'Error',
      status,
      ...(exception instanceof HttpException &&
        !isServerError && { detail: exception.message }),
      instance,
      requestId: request.requestId,
    };

    response.status(status).type('application/problem+json').json(problem);
  }
}

function errorName(exception: unknown): string {
  return exception instanceof Error ? exception.name : 'Non-error thrown';
}

// The first stack line is "Name: message", and messages can carry data (a Postgres
// duplicate-key error quotes the email, a driver error quotes the connection string).
// Only the code locations below it are logged.
function stackFramesOnly(exception: unknown): string | undefined {
  if (!(exception instanceof Error) || exception.stack === undefined) {
    return undefined;
  }
  return exception.stack.split('\n').slice(1).join('\n');
}
