export const MEDIA_UPLOAD_FILE_NAME_ENCODING = 'uri-component-v1'

export const encodeMediaUploadFileName = (fileName: string): string =>
  encodeURIComponent(fileName)
