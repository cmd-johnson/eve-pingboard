import fetch, { Response } from 'node-fetch'
import { NeucoreGroup } from '@ping-board/common'
import { NeucoreApplicationInfo } from './types'

/**
 * Thrown when there was an issue getting a response from Neucore.
 */
export class NeucoreError extends Error {
  constructor(
    message: string,
    public readonly underlyingError?: Error
  ) {
    super(message)
  }
}
/**
 * Thrown when the request to Neucore returned a non-success status code (≥ 400).
 */
export class NeucoreResponseError extends NeucoreError {
  constructor(
    message: string,
    path: string,
    public readonly response: Response,
    underlyingError?: Error
  ) {
    super(message + ` (while fetching ${path})`, underlyingError)
  }
}

export interface NeucoreClientConfig {
  /** The base URL of the Neucore application API */
  baseUrl: string
  /** The app ID as obtained from Neucore  */
  appId: string
  /** The app token as obtained from Neucore  */
  appToken: string
}
export class NeucoreClient {
  private readonly baseUrl: string
  private readonly authHeaders: { authorization: string }

  constructor({ baseUrl, appId, appToken }: NeucoreClientConfig) {
    // Strip trailing slashes off the baseUrl, just in case
    this.baseUrl = baseUrl.replace(/[/]+$/g, '')

    const bearerToken = Buffer.from(`${appId}:${appToken}`).toString('base64')
    this.authHeaders = {
      authorization: `Bearer ${bearerToken}`,
    }
  }

  /** Performs a GET request to Neucore */
  private async get<T>(path: string): Promise<T> {
    let response: Response
    const url = `${this.baseUrl}${path}`
    try {
      response = await fetch(url, {
        headers: this.authHeaders,
      })
    } catch (error) {
      throw new NeucoreError(
        `Request failed (GET ${url})`,
        error instanceof Error ? error : new Error(String(error))
      )
    }
    if (response.status < 400) {
      try {
        return (await response.json()) as T
      } catch (error) {
        throw new NeucoreResponseError(
          'Failed to parse response',
          path,
          response,
          error instanceof Error ? error : new Error(String(error))
        )
      }
    }
    throw new NeucoreResponseError(
      `Received unexpected status code: ${response.status}`,
      path,
      response
    )
  }

  /**
   * Queries the character's user's groups from Neucore.
   * Throws a NeucoreResponseError with status code 404 if neucore does not know the character.
   */
  async getCharacterGroups(characterId: number): Promise<NeucoreGroup[]> {
    return this.get(`/app/v2/groups/${characterId}`)
  }

  async getAppInfo(): Promise<NeucoreApplicationInfo> {
    return this.get('/app/v1/show')
  }
}
