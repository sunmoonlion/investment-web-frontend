import { NextResponse } from 'next/server'
import { serverEnv } from '@/env/server'

export const dynamic = 'force-dynamic'

export function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      surface: 'web',
      deployment_id: serverEnv.DEPLOYMENT_ID,
    },
    {
      headers: {
        'Cache-Control': 'no-store',
        'X-Deployment-ID': serverEnv.DEPLOYMENT_ID,
      },
    },
  )
}
