import type {
  PreviewSlugRedirectsInput,
  PreviewSlugRedirectsOutput,
} from '../../../schemas/manager/slugRedirects'
import type { RakunRequestContext } from '../../context'
import { checkOwnership } from '../../utils/checkOwnership'
import { computeSlugPathChanges } from '../../utils/redirects/slugPathChanges'
import { requireContentType } from '../../utils/requireContentType'

export const previewSlugRedirectsHandler = async ({
  input,
  ctx,
}: {
  input: PreviewSlugRedirectsInput
  ctx: RakunRequestContext
}): Promise<PreviewSlugRedirectsOutput> => {
  const contentType = requireContentType(input.contentType)
  await checkOwnership({
    ctx,
    contentType,
    id: input.documentId,
    permission: 'updateAny',
  })

  const changes = await computeSlugPathChanges({
    contentType: input.contentType,
    documentId: input.documentId,
    data: input.data,
    assumePublished: input.assumePublished,
    languageCodes: input.languageCodes,
  })

  return { changes }
}
