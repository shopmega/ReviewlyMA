/**
 * Standardized error handling and response types
 * Ensures consistent error responses across all server actions
 */

/**
 * Standard error codes for categorizing errors
 */
export enum ErrorCode {
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  SERVER_ERROR = 'SERVER_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
}

/**
 * Standard error response format
 */
export interface ErrorResponse {
  status: 'error';
  message: string;
  code: ErrorCode;
  details?: Record<string, unknown>;
}

/**
 * Standard success response format
 */
export interface SuccessResponse<T = any> {
  status: 'success';
  message: string;
  data?: T;
}

/**
 * Union type for all possible responses
 */
export type ApiResponse<T = any> = ErrorResponse | SuccessResponse<T>;

/**
 * Create a standardized error response
 * @param code - Error code for categorization
 * @param message - User-friendly error message
 * @param details - Additional error details (not shown to user)
 * @returns Formatted error response
 */
export function createErrorResponse(
  code: ErrorCode,
  message: string,
  details?: Record<string, unknown>
): ErrorResponse {
  return {
    status: 'error',
    message,
    code,
    ...(details && { details }),
  };
}

/**
 * Create a standardized success response
 * @param message - Success message
 * @param data - Response data
 * @returns Formatted success response
 */
export function createSuccessResponse<T = any>(
  message: string,
  data?: T
): SuccessResponse<T> {
  return {
    status: 'success',
    message,
    ...(data && { data }),
  };
}

/**
 * Handle database errors with appropriate error codes
 */
export function handleDatabaseError(error: any): ErrorResponse {
  const message = error?.message || 'Database operation failed';
  const code = error?.code || '';

  // Check for specific error types
  // PostgreSQL unique violation error code
  if (code === '23505' || message.includes('duplicate') || message.includes('already exists')) {
    // Check if it's an email duplication (common in signup)
    if (message.toLowerCase().includes('email') || message.includes('auth.users_email_key')) {
      return createErrorResponse(
        ErrorCode.CONFLICT,
        'Cette adresse e-mail est déjà utilisée. Veuillez vous connecter ou utiliser une autre adresse.',
        { originalError: message }
      );
    }
    return createErrorResponse(
      ErrorCode.CONFLICT,
      'Cette valeur existe déjà. Veuillez en utiliser une différente.',
      { originalError: message }
    );
  }

  if (message.includes('not found') || message.includes('No rows')) {
    return createErrorResponse(
      ErrorCode.NOT_FOUND,
      'The requested item was not found.',
      { originalError: message }
    );
  }

  if (message.includes('permission') || message.includes('denied')) {
    return createErrorResponse(
      ErrorCode.AUTHORIZATION_ERROR,
      'You do not have permission to perform this action.',
      { originalError: message }
    );
  }

  return createErrorResponse(
    ErrorCode.DATABASE_ERROR,
    'An error occurred while accessing the database. Please try again.',
    { originalError: message }
  );
}

/**
 * Handle validation errors
 */
export function handleValidationError(
  message: string,
  details?: Record<string, string[]>
): ErrorResponse {
  return createErrorResponse(
    ErrorCode.VALIDATION_ERROR,
    message || 'Please correct the errors in the form.',
    { fieldErrors: details }
  );
}

/**
 * Handle authentication errors
 */
export function handleAuthenticationError(message?: string): ErrorResponse {
  return createErrorResponse(
    ErrorCode.AUTHENTICATION_ERROR,
    message || 'Authentication failed. Please try logging in again.',
    { timestamp: new Date().toISOString() }
  );
}

/**
 * Handle authorization errors
 */
export function handleAuthorizationError(message?: string): ErrorResponse {
  return createErrorResponse(
    ErrorCode.AUTHORIZATION_ERROR,
    message || 'You do not have permission to access this resource.',
    { timestamp: new Date().toISOString() }
  );
}

/**
 * Handle file upload errors
 */
export function handleFileUploadError(message?: string): ErrorResponse {
  return createErrorResponse(
    ErrorCode.FILE_UPLOAD_ERROR,
    message || 'Failed to upload file. Please try again.',
    { timestamp: new Date().toISOString() }
  );
}

/**
 * Handle generic server errors
 */
export function handleServerError(error: any): ErrorResponse {
  console.error('Server error:', error);

  return createErrorResponse(
    ErrorCode.SERVER_ERROR,
    'An unexpected error occurred. Please try again later.',
    {
      originalError: error?.message,
      timestamp: new Date().toISOString(),
    }
  );
}

/**
 * Log error with context for debugging
 */
export function logError(
  context: string,
  error: any,
  additionalInfo?: Record<string, unknown>
): void {
  console.error(`[${context}]`, {
    error: error?.message || String(error),
    errorCode: error?.code,
    errorDetails: error?.details,
    timestamp: new Date().toISOString(),
    ...additionalInfo,
  });
}
