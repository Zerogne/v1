/**
 * Helper function to create fetch headers with user authentication
 */
export function getAuthHeaders(): HeadersInit {
  const headers: HeadersInit = {}
  
  const userEmail = typeof window !== "undefined" ? localStorage.getItem("userEmail") : null
  if (userEmail) {
    headers["x-user-email"] = userEmail
  }
  
  // Only add Content-Type if not already set
  if (!headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }
  
  return headers
}

/**
 * Wrapper for fetch that automatically includes auth headers
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = {
    ...getAuthHeaders(),
    ...options.headers,
  }
  
  return fetch(url, {
    ...options,
    headers,
    // Pass through signal if provided (for cancellation)
    signal: options.signal,
  })
}

