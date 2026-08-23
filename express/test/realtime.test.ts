import { afterAll, describe, expect, it } from 'bun:test'
import {
  createEventLogService,
  createPlatform,
  setPlatform,
  sseRealtime,
  type EventLogAdapter,
  type EventLogRecord,
} from '@rakun-kit/core'
import express from 'express'
import type { AddressInfo } from 'node:net'

import { rakunExpressRealtime } from '../src/realtime'

const events: EventLogRecord[] = []
const eventLog: EventLogAdapter = {
  async append(event) {
    const record = { ...event, id: String(events.length + 1) }
    events.push(record)
    return record
  },
  async query() {
    return { items: events }
  },
}

setPlatform(
  createPlatform({
    framework: 'express',
    realtime: sseRealtime(),
  })
)
createEventLogService({ adapter: eventLog })

const app = express()
const router = express.Router()
rakunExpressRealtime()(router)
app.use('/api', router)
app.use((_request, response) => response.status(404).end())

const server = app.listen(0)
const address = server.address() as AddressInfo
const baseUrl = `http://127.0.0.1:${address.port}`

afterAll(
  () =>
    new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
)

describe('Rakun Express realtime', () => {
  it('owns the SSE endpoint configured by the core platform', async () => {
    const response = await fetch(`${baseUrl}/api/realtime?topic=content:1`)

    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ message: 'Authentication required' })
    expect(events.at(-1)?.resource?.id).toBe('manager.realtime.subscribe')
  })

  it('leaves unrelated endpoints to the rest of the Express host', async () => {
    const response = await fetch(`${baseUrl}/api/other?topic=content:1`)

    expect(response.status).toBe(404)
  })

  it('does not match nested paths that happen to end in realtime', async () => {
    const response = await fetch(`${baseUrl}/api/nested/realtime?topic=content:1`)

    expect(response.status).toBe(404)
  })
})
