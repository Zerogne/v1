import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { errorToJson, isAppError, AppError } from "@/src/shared/lib/errors"

/**
 * Generate a unique request ID for tracing
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Standard API response shape
 */
type ApiResponse<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; details?: unknown } }

/**
 * Route handler options
 */
interface RouteHandlerOptions<TBody = unknown> {
  /**
   * Zod schema to validate request body
   * If provided, body will be validated and parsed
   */
  bodySchema?: z.ZodSchema<TBody>
  
  /**
   * Custom error handler
   * If provided, will be called for all errors
   */
  onError?: (error: unknown, requestId: string) => void
}

/**
 * Route handler wrapper
 * Provides:
 * - Consistent error handling
 * - Request ID for logging
 * - Body validation with zod
 * - Standardized response format
 */
export function createRouteHandler<TBody = unknown, TResponse = unknown>(
  handler: (args: {
    request: NextRequest
    body: TBody
    requestId: string
    params: Promise<Record<string, string>>
  }) => Promise<TResponse>,
  options: RouteHandlerOptions<TBody> = {}
) {
  return async (
    request: NextRequest,
    context: { params: Promise<Record<string, string>> }
  ): Promise<NextResponse<ApiResponse<TResponse>>> => {
    const requestId = generateRequestId()
    
    try {
      // Parse and validate body if schema provided
      let body: TBody = undefined as TBody
      
      if (options.bodySchema) {
        try {
          const rawBody = await request.json()
          body = options.bodySchema.parse(rawBody)
        } catch (error) {
          if (error instanceof z.ZodError) {
            return NextResponse.json(
              {
                ok: false,
                error: {
                  code: "VALIDATION_ERROR",
                  message: "Invalid request body",
                  details: error.issues,
                },
              },
              { status: 400 }
            )
          }
          throw error
        }
      }
      
      // Call handler
      const data = await handler({
        request,
        body,
        requestId,
        params: context.params,
      })
      
      // Return success response
      return NextResponse.json({ ok: true, data })
    } catch (error) {
      // Log error with request ID
      const errorMessage = isAppError(error)
        ? error.message
        : error instanceof Error
        ? error.message
        : "Unknown error"
      
      console.error(`[${requestId}] Error:`, {
        error: errorMessage,
        stack: error instanceof Error ? error.stack : undefined,
      })
      
      // Call custom error handler if provided
      if (options.onError) {
        options.onError(error, requestId)
      }
      
      // Convert to standard error response
      const errorResponse = errorToJson(error)
      const statusCode = isAppError(error) ? error.statusCode : 500
      
      return NextResponse.json(errorResponse, { status: statusCode })
    }
  }
}

/**
 * Helper for GET handlers (no body validation)
 */
export function createGetHandler<TResponse = unknown>(
  handler: (args: {
    request: NextRequest
    requestId: string
    params: Promise<Record<string, string>>
  }) => Promise<TResponse>
) {
  return createRouteHandler(async ({ request, requestId, params }) => {
    return handler({ request, requestId, params })
  })
}

/**
 * Helper for POST/PUT/PATCH handlers (with body validation)
 */
export function createPostHandler<TBody, TResponse = unknown>(
  bodySchema: z.ZodSchema<TBody>,
  handler: (args: {
    request: NextRequest
    body: TBody
    requestId: string
    params: Promise<Record<string, string>>
  }) => Promise<TResponse>
) {
  return createRouteHandler(handler, { bodySchema })
}

