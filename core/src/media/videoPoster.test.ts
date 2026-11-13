import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { expect, test } from 'bun:test'

import { requirePeerDependency } from '../lib/utils/peerDependencies'
import { getPlatform } from '../platform'
import { extractVideoPosterFrame } from './videoPoster'

test('extracts a JPEG poster at the requested video second', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'rakun-poster-test-'))
  const videoPath = path.join(directory, 'sample.mp4')
  try {
    const ffmpeg = requirePeerDependency<string>('ffmpeg-static', '', '')
    const generated = await getPlatform().workers.runProcess(
      ffmpeg,
      ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'color=c=red:s=32x32:d=2', '-c:v', 'mpeg4', videoPath],
      { windowsHide: true }
    )
    expect(generated.exitCode).toBe(0)

    const poster = await extractVideoPosterFrame(videoPath, 1)
    expect(poster[0]).toBe(0xff)
    expect(poster[1]).toBe(0xd8)
    expect(poster.at(-2)).toBe(0xff)
    expect(poster.at(-1)).toBe(0xd9)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
