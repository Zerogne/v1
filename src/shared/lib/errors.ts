/**
 * Application error with HTTP status code
 */
export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly statusCode: number = 500,
    public readonly details?: unknown
  ) {
    super(message)
    this.name = "AppError"
    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

/**
 * Common error codes
 */
export const ErrorCode = {
  // Authentication & Authorization
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",
  
  // Rate Limiting
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  
  // Business Logic
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  CHAT_SESSION_NOT_FOUND: "CHAT_SESSION_NOT_FOUND",
  SNAPSHOT_NOT_FOUND: "SNAPSHOT_NOT_FOUND",
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  FILE_ALREADY_EXISTS: "FILE_ALREADY_EXISTS",
  
  // AI
  AI_RUN_FAILED: "AI_RUN_FAILED",
  AI_NO_TOOLS: "AI_NO_TOOLS",
  
  // Payment & Credits
  PAYMENT_REQUIRED: "PAYMENT_REQUIRED",
  
  // Server
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const

/**
 * Error factory functions
 */
export const Errors = {
  unauthorized: (message = "Unauthorized") =>
    new AppError(ErrorCode.UNAUTHORIZED, message, 401),
  
  forbidden: (message = "Forbidden") =>
    new AppError(ErrorCode.FORBIDDEN, message, 403),
  
  notFound: (resource: string, id?: string) =>
    new AppError(
      ErrorCode.NOT_FOUND,
      `${resource} not found${id ? `: ${id}` : ""}`,
      404
    ),
  
  validationError: (message: string, details?: unknown) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details),
  
  badRequest: (message: string, details?: unknown) =>
    new AppError(ErrorCode.VALIDATION_ERROR, message, 400, details),
  
  rateLimitExceeded: (message = "Rate limit exceeded. Please try again later.") =>
    new AppError(ErrorCode.RATE_LIMIT_EXCEEDED, message, 429),
  
  projectNotFound: (projectId: string) =>
    new AppError(ErrorCode.PROJECT_NOT_FOUND, `Project not found: ${projectId}`, 404),
  
  chatSessionNotFound: (chatId: string) =>
    new AppError(ErrorCode.CHAT_SESSION_NOT_FOUND, `Chat session not found: ${chatId}`, 404),
  
  snapshotNotFound: (snapshotId: string) =>
    new AppError(ErrorCode.SNAPSHOT_NOT_FOUND, `Snapshot not found: ${snapshotId}`, 404),
  
  fileNotFound: (path: string) =>
    new AppError(ErrorCode.FILE_NOT_FOUND, `File not found: ${path}`, 404),
  
  fileAlreadyExists: (path: string) =>
    new AppError(ErrorCode.FILE_ALREADY_EXISTS, `File already exists: ${path}`, 409),
  
  aiRunFailed: (message: string) =>
    new AppError(ErrorCode.AI_RUN_FAILED, message, 400),
  
  aiNoTools: (message = "AI did not return tool actions. Try selecting a file or being more specific.") =>
    new AppError(ErrorCode.AI_NO_TOOLS, message, 400),
  
  paymentRequired: (message = "Payment required or insufficient credits") =>
    new AppError(ErrorCode.PAYMENT_REQUIRED, message, 402),
  
  internalError: (message = "Internal server error") =>
    new AppError(ErrorCode.INTERNAL_ERROR, message, 500),
}

/**
 * Check if error is an AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError
}

/**
 * Convert error to JSON response shape
 */
export function errorToJson(error: unknown): {
  ok: false
  error: {
    code: string
    message: string
    details?: unknown
  }
} {
  if (isAppError(error)) {
    const errorObj: {
      code: string
      message: string
      details?: unknown
    } = {
      code: error.code,
      message: error.message,
    }
    if (error.details) {
      errorObj.details = error.details
    }
    return {
      ok: false,
      error: errorObj,
    }
  }
  
  if (error instanceof Error) {
    return {
      ok: false,
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: error.message || "Internal server error",
      },
    }
  }
  
  return {
    ok: false,
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: "Unknown error",
    },
  }
}

