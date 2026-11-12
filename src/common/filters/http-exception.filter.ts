import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const requestId =
      (response.locals.requestId as string | undefined) ??
      'request-id-unavailable';

    const errMessage = exception instanceof Error ? exception.message : '';
    const errName = exception instanceof Error ? exception.name : '';

    let status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    let errorCode = 'INTERNAL_SERVER_ERROR';
    let errorMessage = 'An unexpected error occurred';
    let failureMode = 'unhandled_exception';

    // Check for specific infrastructural / dependency failure modes
    if (
      errMessage.includes('ENOTFOUND') ||
      errMessage.includes('EAI_AGAIN') ||
      errName === 'MongoServerSelectionError' && errMessage.includes('ENOTFOUND')
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE; // 503
      errorCode = 'DNS_RESOLUTION_FAILURE';
      errorMessage = 'DNS hostname resolution for upstream dependency failed';
      failureMode = 'dns_resolution_failure';
      response.setHeader('Retry-After', '10');
    } else if (
      errMessage.includes('ECONNREFUSED') ||
      errName === 'MongooseServerSelectionError' ||
      errName === 'MongoNetworkError'
    ) {
      status = HttpStatus.SERVICE_UNAVAILABLE; // 503
      errorCode = 'DEPENDENCY_UNAVAILABLE';
      errorMessage = 'Upstream database service is temporarily unreachable';
      failureMode = 'database_connection_refused';
      response.setHeader('Retry-After', '5');
    } else if (
      errName === 'AbortError' ||
      errName === 'TimeoutError' ||
      errMessage.includes('ETIMEDOUT') ||
      errMessage.includes('timed out')
    ) {
      status = HttpStatus.GATEWAY_TIMEOUT; // 504
      errorCode = 'GATEWAY_TIMEOUT';
      errorMessage = 'Upstream dependency request timed out';
      failureMode = 'dependency_timeout';
    } else if (exception instanceof HttpException) {
      const errorDetails: Record<number, { code: string; message: string }> = {
        400: { code: 'BAD_REQUEST', message: 'Invalid request' },
        401: { code: 'UNAUTHORIZED', message: 'Authentication required' },
        403: { code: 'FORBIDDEN', message: 'Access denied' },
        404: { code: 'NOT_FOUND', message: 'Resource not found' },
        409: { code: 'CONFLICT', message: 'Request conflicts with existing data' },
        422: { code: 'VALIDATION_ERROR', message: 'Request validation failed' },
      };
      const details = errorDetails[status] ?? {
        code: status >= 500 ? 'INTERNAL_SERVER_ERROR' : 'REQUEST_ERROR',
        message: status >= 500 ? 'An unexpected error occurred' : 'Request error',
      };
      errorCode = details.code;
      errorMessage = details.message;
      failureMode = `http_${status}`;
    }

    if (status >= 500) {
      const errorLog = {
        timestamp: new Date().toISOString(),
        level: 'error',
        message: 'Server error encountered',
        service_name: 'url-shortener',
        request_id: requestId,
        method: request.method,
        path: request.path,
        status: status,
        failure_mode: failureMode,
        error: errMessage || 'Unknown exception',
        stack: exception instanceof Error ? exception.stack : undefined,
      };
      console.error(JSON.stringify(errorLog));
    }

    response.status(status).json({
      error: {
        code: errorCode,
        message: errorMessage,
        request_id: requestId,
        failure_mode: failureMode,
      },
    });
  }
}
