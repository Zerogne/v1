/**
 * Supabase Management API client
 * Server-only - never expose tokens to browser
 */

const MANAGEMENT_API_BASE = "https://api.supabase.com/v1"

export interface CreateProjectRequest {
  name: string
  organization_slug: string
  db_pass: string
  region_selection: string // e.g., "apac"
  desired_instance_size?: string // e.g., "micro"
}

export interface CreateProjectResponse {
  id: string
  ref: string
  name: string
  organization_id: string
  created_at: string
  database?: {
    host: string
    version: string
  }
}

export interface ProjectHealth {
  status: "ACTIVE_HEALTHY" | "ACTIVE_UNHEALTHY" | "COMING_UP" | "GOING_DOWN" | "INACTIVE" | "UNKNOWN"
  services: Array<{
    name: string
    status: "ACTIVE_HEALTHY" | "ACTIVE_UNHEALTHY" | "COMING_UP" | "GOING_DOWN" | "INACTIVE" | "UNKNOWN"
  }>
}

export interface ApiKey {
  id: string
  name: string
  api_key: string
  tags: string[]
}

/**
 * Get Management API token from env
 */
function getManagementToken(): string {
  const token = process.env.SUPABASE_MGMT_TOKEN
  if (!token) {
    throw new Error("SUPABASE_MGMT_TOKEN environment variable is not set")
  }
  return token
}

/**
 * Make authenticated request to Management API
 */
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getManagementToken()
  const url = `${MANAGEMENT_API_BASE}${endpoint}`
  
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Unknown error" }))
    throw new Error(`Management API error: ${error.message || `HTTP ${response.status}`}`)
  }

  return response.json()
}

/**
 * Create a new Supabase project
 */
export async function createProject(
  request: CreateProjectRequest
): Promise<CreateProjectResponse> {
  return apiRequest<CreateProjectResponse>("/projects", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

/**
 * Get project health status
 */
export async function getProjectHealth(projectRef: string): Promise<ProjectHealth> {
  return apiRequest<ProjectHealth>(`/projects/${projectRef}/health`)
}

/**
 * Get API keys for a project
 * Set reveal=true to get actual key values
 */
export async function getApiKeys(projectRef: string, reveal: boolean = false): Promise<ApiKey[]> {
  return apiRequest<ApiKey[]>(`/projects/${projectRef}/api-keys?reveal=${reveal}`)
}

/**
 * Create API keys for a project
 */
export async function createApiKey(
  projectRef: string,
  name: string,
  tags: string[] = []
): Promise<ApiKey> {
  return apiRequest<ApiKey>(`/projects/${projectRef}/api-keys`, {
    method: "POST",
    body: JSON.stringify({ name, tags }),
  })
}

/**
 * Delete a Supabase project
 */
export async function deleteProject(projectRef: string): Promise<void> {
  await apiRequest(`/projects/${projectRef}`, {
    method: "DELETE",
  })
}

/**
 * Wait for project to become healthy with exponential backoff
 */
export async function waitForProjectHealthy(
  projectRef: string,
  timeoutMs: number = 300000, // 5 minutes default
  pollIntervalMs: number = 5000 // Start with 5 seconds
): Promise<ProjectHealth> {
  const startTime = Date.now()
  let currentInterval = pollIntervalMs

  while (Date.now() - startTime < timeoutMs) {
    try {
      const health = await getProjectHealth(projectRef)
      
      // Check if all required services are ACTIVE_HEALTHY
      const requiredServices = ["rest", "auth", "realtime", "storage"]
      const allHealthy = requiredServices.every((serviceName) => {
        const service = health.services.find((s) => s.name === serviceName)
        return service?.status === "ACTIVE_HEALTHY"
      })

      if (health.status === "ACTIVE_HEALTHY" && allHealthy) {
        return health
      }

      // Exponential backoff: increase interval up to 30 seconds
      await new Promise((resolve) => setTimeout(resolve, currentInterval))
      currentInterval = Math.min(currentInterval * 1.5, 30000)
    } catch (error) {
      // If error, wait and retry
      await new Promise((resolve) => setTimeout(resolve, currentInterval))
      currentInterval = Math.min(currentInterval * 1.5, 30000)
    }
  }

  throw new Error(`Project did not become healthy within ${timeoutMs}ms`)
}

/**
 * Get or create publishable and secret API keys
 * Returns { publishableKey, secretKey }
 */
export async function ensureApiKeys(projectRef: string): Promise<{
  publishableKey: string
  secretKey: string
}> {
  // First, try to get existing keys
  const keys = await getApiKeys(projectRef, true)
  
  let publishableKey = keys.find((k) => k.tags.includes("anon") || k.tags.includes("publishable"))?.api_key
  let secretKey = keys.find((k) => k.tags.includes("service_role") || k.tags.includes("secret"))?.api_key

  // If missing, create them
  if (!publishableKey) {
    const newPublishable = await createApiKey(projectRef, "Publishable Key", ["anon", "publishable"])
    publishableKey = newPublishable.api_key
  }

  if (!secretKey) {
    const newSecret = await createApiKey(projectRef, "Service Role Key", ["service_role", "secret"])
    secretKey = newSecret.api_key
  }

  if (!publishableKey || !secretKey) {
    throw new Error("Failed to obtain API keys")
  }

  return { publishableKey, secretKey }
}

