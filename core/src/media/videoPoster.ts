import path from 'node:path'

import { requirePeerDependency } from '../lib/utils/peerDependencies'
import { getPlatform } from '../platform'

export const extractVideoPosterFrame = async (url: string, second: number): Promise<Uint8Array> => {
  const ffmpegPath = requirePeerDependency<string | null>(
    'ffmpeg-static',
    'npm install ffmpeg-static',
    'Rakun uses FFmpeg to generate video poster images.'
  )
  if (!ffmpegPath) throw new Error('Rakun could not resolve the ffmpeg-static executable.')

  const { filesystem, workers } = getPlatform()
  const directory = await filesystem.makeTemporaryDirectory('rakun-video-poster-')
  const outputPath = path.join(directory, 'poster.jpg')

  try {
    const result = await workers.runProcess(
      ffmpegPath,
      [
        '-y',
        '-loglevel',
        'error',
        '-ss',
        String(second),
        '-i',
        url,
        '-frames:v',
        '1',
        '-q:v',
        '2',
        outputPath,
      ],
      { windowsHide: true }
    )
    if (result.exitCode !== 0) {
      throw new Error('The video frame could not be extracted at the selected second.')
    }
    const image = await filesystem.readFile(outputPath)
    if (image.length === 0) throw new Error('The selected video frame is empty.')
    return image
  } finally {
    await filesystem.remove(directory, { recursive: true, force: true })
  }
}
