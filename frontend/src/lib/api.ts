import type { ApiEnvelope } from './types'
import { m } from '../paraglide/messages.js'

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined
const API_BASE_URL = (configuredBaseUrl || '/api').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  code?: string

  constructor(message: string, status: number, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}

type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown
  token?: string | null
  skipAuthRecovery?: boolean
  skipUnauthorizedNotification?: boolean
}

let refreshPromise: Promise<boolean> | null = null

function notifyUnauthorized() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('fastschema:unauthorized'))
  }
}

function getMessage(payload: unknown, status: number) {
  if (payload && typeof payload === 'object') {
    const envelope = payload as Partial<ApiEnvelope<unknown>>
    if (envelope.error?.message) return envelope.error.message
  }

  return m.api_request_failed({ status })
}

export async function apiRequest<T>(
  path: string,
  {
    body,
    token,
    headers,
    skipAuthRecovery = false,
    skipUnauthorizedNotification = false,
    ...init
  }: RequestOptions = {},
): Promise<T> {
  const requestHeaders = new Headers(headers)
  if (token) requestHeaders.set('Authorization', `Bearer ${token}`)

  let requestBody: BodyInit | undefined
  if (body instanceof FormData) {
    requestBody = body
  } else if (body !== undefined) {
    requestHeaders.set('Content-Type', 'application/json')
    requestBody = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      credentials: 'include',
      ...init,
      headers: requestHeaders,
      body: requestBody,
    })
  } catch (error) {
    throw new ApiError(
      m.api_unreachable({ url: API_BASE_URL }),
      0,
      error instanceof Error ? error.name : undefined,
    )
  }

  if (response.status === 401) {
    if (!skipAuthRecovery) {
      refreshPromise ??= apiRequest('/auth/token/refresh', {
        method: 'POST',
        body: {},
        skipAuthRecovery: true,
        skipUnauthorizedNotification: true,
      })
        .then(() => true)
        .catch(() => false)
        .finally(() => {
          refreshPromise = null
        })

      if (await refreshPromise) {
        return apiRequest<T>(path, {
          ...init,
          body,
          token,
          headers,
          skipAuthRecovery: true,
          skipUnauthorizedNotification,
        })
      }
    }
    if (!skipUnauthorizedNotification) notifyUnauthorized()
  }

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    const envelope =
      payload && typeof payload === 'object'
        ? (payload as Partial<ApiEnvelope<unknown>>)
        : undefined
    throw new ApiError(getMessage(payload, response.status), response.status, envelope?.error?.code)
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as ApiEnvelope<T>).data
  }

  return payload as T
}

export function withQuery(
  path: string,
  values: Record<string, string | number | boolean | undefined>,
) {
  const query = new URLSearchParams()
  Object.entries(values).forEach(([key, value]) => {
    if (value !== undefined && value !== '') query.set(key, String(value))
  })
  const suffix = query.toString()
  return suffix ? `${path}?${suffix}` : path
}
