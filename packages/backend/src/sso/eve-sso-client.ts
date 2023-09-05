import ClientOAuth2 from 'client-oauth2'
import crypto from 'node:crypto'
import { EveJWT, parseEveJWT } from './eve-jwt'
import type { ParsedUrlQuery } from 'querystring'
import { BadRequest } from 'http-errors'
import { createIntervalScheduler, IntervalScheduler } from '../util/create-interval-scheduler'

export interface EveSSOClientConfig {
  /** The Client ID as obtained from https://developers.eveonline.com/ */
  clientId: string
  /** The client's Secret Key as obtained from https://developers.eveonline.com/ */
  clientSecret: string
  /** The Callback URL configured on https://developers.eveonline.com/ */
  redirectUri: string

  /**
   * Time in seconds after which OAuth2 login states expire.
   * Defaults to 5 minutes.
   */
  stateTimeout?: number
}

interface LoginState {
  /** The sessionId the state is linked to */
  sessionId: string
  /** Timestamp of when the state was created */
  createdAt: number
}

/**
 * Takes care of interacting with EVE SSO.
 * https://docs.esi.evetech.net/docs/sso/
 */
export class EveSSOClient {
  private readonly clientId: string
  private readonly client: ClientOAuth2
  private readonly loginStates = new Map<string, LoginState>()
  private readonly stateTimeout: number

  private readonly cleanupScheduler: IntervalScheduler

  constructor(options: EveSSOClientConfig) {
    this.clientId = options.clientId
    this.client = new ClientOAuth2({
      clientId: options.clientId,
      clientSecret: options.clientSecret,
      redirectUri: options.redirectUri,
      accessTokenUri: 'https://login.eveonline.com/v2/oauth/token',
      authorizationUri: 'https://login.eveonline.com/v2/oauth/authorize/',
    })

    this.stateTimeout = options.stateTimeout ?? 300
    this.cleanupScheduler = createIntervalScheduler(() => this.cleanupStates())
  }

  /**
   * Starts regularly checking for and removing expired login states.
   * @param cleanupInterval the time between checks, in seconds
   */
  startAutoCleanup(cleanupInterval = this.stateTimeout): void {
    this.cleanupScheduler.start(cleanupInterval * 1000)
  }

  /**
   * Stops any previously started automatic cleanup of login states.
   */
  stopAutoCleanup(): void {
    this.cleanupScheduler.stop()
  }

  /** Removes all expired login states. */
  private cleanupStates() {
    const expirationTime = Date.now() - (this.stateTimeout * 1000)
    for (const [state, { createdAt }] of this.loginStates) {
      if (createdAt >= expirationTime) {
        this.loginStates.delete(state)
      }
    }
  }

  /**
   * Builds a login URL a user can be redirected to to log them in using EVE SSO.
   *
   * @param sessionId the sessionId to associate the login with
   */
  async getLoginUrl(sessionId: string): Promise<string> {
    const state = crypto.randomUUID()
    const redirectUri = await this.client.code.getUri({ state })
    this.loginStates.set(state, {
      sessionId,
      createdAt: Date.now(),
    })
    return redirectUri
  }

  /**
   * Performs the OAuth2.0 token exchange with the EVE SSO server.
   * Should be called when the user was redirected back to the application.
   * @param sessionId the sessionId associated with the callback request
   * @param query the parsed query of the callback request
   * @param href the full href of the callback request
   * @returns the parsed access token obtained using the token exchange
   */
  async handleCallback(sessionId: string, query: ParsedUrlQuery, href: string): Promise<EveJWT> {
    // Verify the state belongs to the active session.
    // Helps preventing CSRF attacks.
    let state = query['state']
    if (!state) {
      throw new BadRequest('missing state')
    }
    if (Array.isArray(state)) {
      state = state[0]
    }
    const stateData = this.loginStates.get(state)
    this.loginStates.delete(state)
    if (stateData?.sessionId !== sessionId) {
      throw new BadRequest('invalid state')
    }

    // Obtain the actual access token from EVE SSO
    const tokens = await this.client.code.getToken(href)
    const accessToken = parseEveJWT(tokens.accessToken, this.clientId)
    return accessToken
  }
}
