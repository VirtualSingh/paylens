import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
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

/** The one place where any error becomes an HTTP response. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const problem: ProblemDetails = {
      type: 'about:blank',
      // `status` is a number from HttpException/HttpStatus, not user input.
      // eslint-disable-next-line security/detect-object-injection
      title: STATUS_CODES[status] ?? 'Error',
      status,
      ...(exception instanceof HttpException && { detail: exception.message }),
      // Express: baseUrl + path is the full path the client asked for, minus the query string.
      instance: `${request.baseUrl}${request.path}`,
      requestId: request.requestId,
    };

    response.status(status).type('application/problem+json').json(problem);
  }
}
