export const createNewRelationState = (
  contentType: string,
  data: object | undefined,
) => ({
  type: 'new' as const,
  data: {
    ...data,
    _type: contentType,
  },
})
