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

/** Responsive variants append a descriptor to the signed upload key stem. */
export const isCompatibleMediaUploadRelatedKey = (
  tokenKey: string,
  relatedKey: string,
): boolean => {
  const tokenParsed = path.posix.parse(tokenKey);
  const relatedParsed = path.posix.parse(relatedKey);

  return (
    tokenParsed.dir === relatedParsed.dir &&
    Boolean(tokenParsed.name) &&
    (relatedParsed.name === tokenParsed.name ||
      relatedParsed.name.startsWith(`${tokenParsed.name}.`))
  );
};
