import 'server-only'

import { parseServerEnv } from './server-schema'

export const serverEnv = parseServerEnv(
  {
    NODE_ENV: process.env.NODE_ENV,
    DEPLOYMENT_ENV: process.env.DEPLOYMENT_ENV,
    AUTH_APP: process.env.AUTH_APP,
    APP_ORIGIN: process.env.APP_ORIGIN,
    WEB_BACKEND_INTERNAL_URL: process.env.WEB_BACKEND_INTERNAL_URL,
    DEPLOYMENT_ID: process.env.DEPLOYMENT_ID,
    REFERENCE_UI_ENABLED: process.env.REFERENCE_UI_ENABLED,
  },
  {
    phase: process.env.NEXT_PHASE,
  },
)

export type { ServerEnv } from './server-schema'
