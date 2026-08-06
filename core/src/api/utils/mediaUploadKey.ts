import path from "path";

/** Optimized uploads may rewrite the object extension (e.g. .png → .webp). */
export const isCompatibleMediaUploadKey = (
  tokenKey: string,
  uploadedKey: string,
): boolean => {
  if (tokenKey === uploadedKey) return true;

  const tokenParsed = path.posix.parse(tokenKey);
  const uploadedParsed = path.posix.parse(uploadedKey);

  return (
    tokenParsed.dir === uploadedParsed.dir &&
    tokenParsed.name === uploadedParsed.name &&
    Boolean(tokenParsed.name)
  );
};
