import Router from '@koa/router'
import Koa from 'koa'
import { getSessionMiddleware, SessionProvider } from './middleware/session'
import { NeucoreClient } from './neucore'
import { getRouter as getApiRouter } from './routes/api'
import { getRouter as getAuthRouter } from './routes/auth'
import { EveSSOClient } from './sso/eve-sso-client'

export function getApp(options: {
  cookieSigningKeys?: string[],
  eveSsoClient: EveSSOClient,
  neucoreClient: NeucoreClient,
  sessionProvider: SessionProvider,
}): Koa {
  const app = new Koa()
  if (options.cookieSigningKeys && options.cookieSigningKeys.length > 0) {
    app.keys = options.cookieSigningKeys
  }

  const appRouter = new Router()

  app.use(getSessionMiddleware({
    app,
    sessionCookieName: 'pingboard-session',
    sessionProvider: options.sessionProvider,
  }))

  const apiRouter = getApiRouter()
  const authRouter = getAuthRouter(options)

  appRouter.use('/api', apiRouter.routes(), apiRouter.allowedMethods())
  appRouter.use('/auth', authRouter.routes(), authRouter.allowedMethods())

  app.use(appRouter.routes()).use(appRouter.allowedMethods())

  return app
}