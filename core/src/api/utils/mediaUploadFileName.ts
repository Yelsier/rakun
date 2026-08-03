export const MEDIA_UPLOAD_FILE_NAME_ENCODING = "uri-component-v1";

export const decodeMediaUploadFileName = (
  fileName: string,
  encoding: string | undefined,
): string => {
  if (encoding !== MEDIA_UPLOAD_FILE_NAME_ENCODING) {
    return fileName;
  }

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
};
