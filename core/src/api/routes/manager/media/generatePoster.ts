import { Media } from '../../../../internal-content-types'
import { throwAppError } from '../../../../lib/errors'
import { Logger } from '../../../../lib/Logger'
import { getMediaService } from '../../../../media'
import { extractVideoPosterFrame } from '../../../../media/videoPoster'
import { getMongoService } from '../../../../orm'
import type {
  GeneratePosterInput,
  GeneratePosterOutput,
} from '../../../../schemas/manager/media/generatePoster'
import type { RakunRequestContext } from '../../../context'
import { setApiSuccessEventData } from '../../../operations/apiEventLog'
import { checkOwnership } from '../../../utils/checkOwnership'
import { checkPermissions } from '../../../utils/checkPermissions'
import { revalidateMediaDependencies } from './replaceMedia'

export const generatePosterHandler = async ({
  input,
  ctx,
}: {
  input: GeneratePosterInput
  ctx: RakunRequestContext
}): Promise<GeneratePosterOutput> => {
  const user = ctx.getUser()
  checkPermissions(user, ['content.Media.own'])
  await checkOwnership({ ctx, contentType: Media, id: input.id, permission: 'updateAny' })

  const db = await getMongoService()
  const video = await db.get(Media, input.id)
  if (!video.mime.startsWith('video/')) {
    throwAppError('VALIDATION', {
      errors: [{ message: 'A poster can only be generated from a video' }],
    })
  }

  const mediaService = getMediaService()
  const videoUrl = await mediaService.getMediaUrl({ key: video.key, access: video.access })
  let image: Uint8Array
  try {
    image = await extractVideoPosterFrame(videoUrl.url, input.second)
  } catch {
    throwAppError('VALIDATION', {
      errors: [{ message: 'No video frame is available at the selected second' }],
    })
  }

  const fileName = `poster-${Math.round(input.second * 1000)}ms.jpg`
  const prepared = await mediaService.prepareUpload({
    fileName,
    mime: 'image/jpeg',
    size: image.length,
    access: video.access,
  })
  let posterMediaId: string | undefined
  try {
    await mediaService.rawAdapter.putObject({
      key: prepared.key,
      access: video.access,
      mime: 'image/jpeg',
      content: image,
    })
    const poster = await db.create(Media, {
      _type: 'Media',
      name: `${video.name} (${input.second}s)`,
      originalName: fileName,
      key: prepared.key,
      access: video.access,
      mime: 'image/jpeg',
      extension: 'jpg',
      size: image.length,
      folder: video.folder,
      uploadedAt: new Date(),
      status: 'uploaded',
      createdBy: user._id,
      updatedBy: user._id,
    })
    posterMediaId = poster._id
    await db.update(
      Media,
      video._id,
      { posterMediaId, updatedBy: user._id },
      { actorId: user._id, reason: 'generate video poster from a selected frame' }
    )
  } catch (error) {
    if (posterMediaId) {
      await db.delete(Media, { _id: posterMediaId }).catch(() => undefined)
    }
    await mediaService.rawAdapter
      .deleteObject({ key: prepared.key, access: video.access })
      .catch(() => undefined)
    throw error
  }

  let dependencyCount = 0
  let dependenciesRevalidated = true
  try {
    dependencyCount = await revalidateMediaDependencies({
      loadDependencies: () => db.findDependencies(Media, video._id),
    })
  } catch (error) {
    dependenciesRevalidated = false
    Logger.error('manager.media.generatePoster: dependency revalidation failed', error as Error)
  }

  setApiSuccessEventData(ctx, {
    videoId: video._id,
    posterMediaId,
    second: input.second,
    dependencyCount,
    dependenciesRevalidated,
  })
  const posterUrl = await mediaService
    .getMediaUrl({ key: prepared.key, access: video.access })
    .then((result) => result.url)
    .catch(() => undefined)
  return { posterMediaId: posterMediaId!, posterUrl }
}
