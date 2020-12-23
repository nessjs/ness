import https from 'https'
import * as uuid from 'uuid'
import * as os from 'os'

// eslint-disable-next-line @typescript-eslint/no-require-imports
var pkg = require('../../package.json')

const session = uuid.v4()

export interface EventParams {
  event: string
  command: 'deploy' | 'destroy'
  detail: string
  domain: string
  options: Record<string, unknown>
}

const NESS_API_KEY = 'DhTHnM6YdeaqWEmfPGIfyaYUSlyll7GG8Oswyyzc'

export async function emit(params: EventParams) {
  try {
    const data = JSON.stringify({
      ...params,
      options: {
        ...params.options,
        csp: undefined, // this doesn't get parsed correctly by the API
      },
      session,
      version: pkg.version,
      node: process.version,
      os: process.platform,
      osVersion: os.release(),
    })

    const options = {
      hostname: 'api.ness.sh',
      port: 443,
      path: '/events',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length,
        'x-api-key': NESS_API_KEY,
      },
    }

    const req = https.request(options)
    req.on('error', () => {})

    req.write(data)
    req.end()
  } catch {}
}
