import type { ImageFormat, ImageProcessor, ImageTransformOptions } from './types'
import { requirePeerDependency } from '../lib/utils/peerDependencies'

type Sharp = typeof import('sharp')
type SharpFactory = Sharp

const getSharp = (): SharpFactory => {
  const sharp = requirePeerDependency<Sharp & { default?: SharpFactory }>(
    'sharp',
    'npm install sharp',
    'Rakun uses sharp to read image dimensions and optimize media uploads on Node.js.'
  )
  return sharp.default ?? (sharp as unknown as SharpFactory)
}

const applySharpFormat = (
  pipeline: ReturnType<SharpFactory>,
  format: ImageFormat,
  quality: number
) => {
  if (format === 'webp') return pipeline.webp({ quality })
  if (format === 'jpeg') return pipeline.jpeg({ quality })
  if (format === 'png') return pipeline.png({ quality })
  return pipeline.avif({ quality })
}

export const sharpImage = (): ImageProcessor => ({
  id: 'sharp',
  async metadata(input) {
    const metadata = await getSharp()(input, { failOn: 'none' }).metadata()
    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
    }
  },
  async transform(input, options) {
    let pipeline = getSharp()(input, { failOn: 'none' })
    if (options.autoOrient !== false) pipeline = pipeline.rotate()
    if (options.width) {
      pipeline = pipeline.resize({
        width: options.width,
        withoutEnlargement: options.withoutEnlargement,
      })
    }
    return await applySharpFormat(pipeline, options.format, options.quality).toBuffer()
  },
})

type BunImagePipeline = {
  metadata(): Promise<{ width: number; height: number; format: string }>
  resize(
    width: number,
    height?: number,
    options?: { withoutEnlargement?: boolean }
  ): BunImagePipeline
  webp(options: { quality: number }): BunImagePipeline
  jpeg(options: { quality: number }): BunImagePipeline
  png(options: { compressionLevel: number }): BunImagePipeline
  avif(options: { quality: number }): BunImagePipeline
  bytes(): Promise<Uint8Array>
}

type BunImageConstructor = new (
  input: Uint8Array,
  options?: { autoOrient?: boolean }
) => BunImagePipeline

const getBunImage = (): BunImageConstructor => {
  const BunImage = (
    globalThis as typeof globalThis & {
      Bun?: { Image?: BunImageConstructor }
    }
  ).Bun?.Image

  if (!BunImage) {
    throw new Error('Bun.Image is not available in this Bun runtime.')
  }

  return BunImage
}

export const hasBunImage = (): boolean =>
  typeof (
    globalThis as typeof globalThis & {
      Bun?: { Image?: unknown }
    }
  ).Bun?.Image === 'function'

const applyBunFormat = (
  pipeline: BunImagePipeline,
  options: ImageTransformOptions
): BunImagePipeline => {
  if (options.format === 'webp') return pipeline.webp({ quality: options.quality })
  if (options.format === 'jpeg') return pipeline.jpeg({ quality: options.quality })
  if (options.format === 'png') {
    return pipeline.png({
      compressionLevel: Math.max(0, Math.min(9, Math.round((options.quality / 100) * 9))),
    })
  }
  return pipeline.avif({ quality: options.quality })
}

const shouldFallbackFromBunImage = (error: unknown): boolean =>
  !!error &&
  typeof error === 'object' &&
  'code' in error &&
  (error.code === 'ERR_IMAGE_FORMAT_UNSUPPORTED' || error.code === 'ERR_IMAGE_ENCODE_FAILED')

export const bunImage = (): ImageProcessor => ({
  id: 'bun',
  async metadata(input) {
    try {
      return await new (getBunImage())(input, { autoOrient: false }).metadata()
    } catch (error) {
      if (shouldFallbackFromBunImage(error)) {
        return await sharpImage().metadata(input)
      }
      throw error
    }
  },
  async transform(input, options) {
    let pipeline = new (getBunImage())(input, {
      autoOrient: options.autoOrient !== false,
    })
    if (options.width) {
      pipeline = pipeline.resize(options.width, undefined, {
        withoutEnlargement: options.withoutEnlargement,
      })
    }
    try {
      return await applyBunFormat(pipeline, options).bytes()
    } catch (error) {
      if (shouldFallbackFromBunImage(error)) {
        return await sharpImage().transform(input, options)
      }
      throw error
    }
  },
})
