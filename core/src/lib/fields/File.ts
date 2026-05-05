import z from "zod";

import type { EncodedField } from "./Field";
import { Field } from "./Field";
import type { FieldHKT, Visibility, getRequiredType } from "../types";
import { Id } from "../utils/id";
import { getDefaultOutputSchema } from "../utils/getSchemas";

export const FileMediaType = z.enum(["Image", "Video", "Document", "Any"]);
export const FileUploadMethod = z.enum(["default", "optimize"]);
export const FileOptimizeFormat = z.enum(["webp", "jpeg", "png", "avif"]);

export type FileMediaType = z.infer<typeof FileMediaType>;
export type FileUploadMethod = z.infer<typeof FileUploadMethod>;
export type FileOptimizeFormat = z.infer<typeof FileOptimizeFormat>;

const defaultOptimize: Partial<FileOptimizeOptions> = {
  format: "webp",
  quality: 90,
  generatePreview: true,
};

/**
 * Optimization settings for image uploads in `FileField.optimize`.
 */
export const FileOptimizeOptionsSchema = z.object({
  /**
   * Output format used when the image is optimized.
   */
  format: FileOptimizeFormat.default("webp"),
  /**
   * Output encoder quality (1-100).
   *
   * What this value does:
   * - Lower quality reduces file size more aggressively, but can introduce visible artifacts
   *   (blurry edges, banding, loss of fine detail).
   * - Higher quality preserves more detail, but produces larger files.
   *
   * Practical guidance:
   * - `60-75`: strong compression, useful for very heavy images where size is priority.
   * - `75-85`: balanced default for most web images.
   * - `85-95`: high fidelity, larger output, useful when visual quality is critical.
   *
   * Notes:
   * - The exact visual result depends on the selected `format` and the source image.
   * - This value is only applied when optimization runs (for example, files above
   *   `minBytesToOptimize` and where optimization is enabled).
   */
  quality: z.number().int().min(1).max(100).default(80),
  /**
   * If `true`, generates an additional preview variant.
   */
  generatePreview: z.boolean().default(false),
  /**
   * Minimum file size in bytes required to run optimization.
   * Files below this threshold are stored without transformation.
   */
  minBytesToOptimize: z
    .number()
    .int()
    .positive()
    .default(350 * 1024),
  /**
   * Maximum width in pixels for the preview image.
   * Smaller images are not upscaled (`withoutEnlargement`).
   */
  previewMaxWidth: z.number().int().positive().default(480),
});

export type FileOptimizeOptions = z.infer<typeof FileOptimizeOptionsSchema>;

const fileRelationSchema = z.object({
  type: z.literal("existing"),
  _id: Id,
  contentType: z.literal("Media"),
});
const fileRelationArraySchema = z.array(fileRelationSchema);

const fileOutputSchema = z.object({
  url: z.string(),
  previewUrl: z.string().nullable(),
  name: z.string(),
  mime: z.string(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  size: z.number().int().nonnegative(),
  orientation: z.enum(["portrait", "landscape"]).nullable(),
});

interface FileFieldHKT<
  T extends FileMediaType,
  M extends boolean,
> extends FieldHKT {
  type: FileField<
    T,
    M,
    M extends true ? typeof fileRelationArraySchema : typeof fileRelationSchema,
    M extends true
      ? z.ZodArray<typeof fileOutputSchema>
      : typeof fileOutputSchema,
    this["args"][1],
    this["args"][2],
    this["args"][3]
  >;
}

export class FileField<
  TMediaType extends FileMediaType = "Any",
  M extends boolean = false,
  S extends typeof fileRelationSchema | typeof fileRelationArraySchema =
    M extends true ? typeof fileRelationArraySchema : typeof fileRelationSchema,
  Sout extends typeof fileOutputSchema | z.ZodArray<typeof fileOutputSchema> =
    M extends true
      ? z.ZodArray<typeof fileOutputSchema>
      : typeof fileOutputSchema,
  TRequired extends boolean = false,
  TTranslatable extends boolean = false,
  TVisibility extends Visibility = "all",
> extends Field<
  FileFieldHKT<TMediaType, M>,
  S,
  Sout,
  TRequired,
  TTranslatable,
  TVisibility
> {
  mediaType: TMediaType = "Any" as TMediaType;
  isMultiple: M = false as M;
  uploadMethod: FileUploadMethod = "default";
  optimizeOptions?: FileOptimizeOptions;

  constructor() {
    super({
      config: { ui: "File", type: "File" },
      schema: fileRelationSchema as S,
    });
  }

  type<T extends FileMediaType>(mediaType: T) {
    this.mediaType = mediaType as unknown as TMediaType;
    return this as unknown as FileField<
      T,
      M,
      S,
      Sout,
      TRequired,
      TTranslatable,
      TVisibility
    >;
  }

  multiple() {
    this.schema = fileRelationArraySchema as S;
    this.isMultiple = true as M;
    return this as unknown as FileField<
      TMediaType,
      true,
      typeof fileRelationArraySchema,
      z.ZodArray<typeof fileOutputSchema>,
      TRequired,
      TTranslatable,
      TVisibility
    >;
  }

  /**
   * Enables the optimized upload strategy for images.
   *
   * @param options - Optimization options:
   * `format`, `quality`, `generatePreview`, `minBytesToOptimize`, `previewMaxWidth`.
   */
  optimize(options?: Partial<FileOptimizeOptions>) {
    this.uploadMethod = "optimize";
    this.optimizeOptions = FileOptimizeOptionsSchema.parse(
      options ?? defaultOptimize,
    );
    return this;
  }

  protected override getBaseOutputSchema() {
    const outputSchema = (
      this.isMultiple ? z.array(fileOutputSchema) : fileOutputSchema
    ) as Sout;
    return getDefaultOutputSchema(
      outputSchema,
      this.isRequired,
    ) as getRequiredType<Sout, TRequired>;
  }

  getPopulatedSchema() {
    return this.getBaseOutputSchema();
  }
}

export type EncodedFileField = EncodedField & {
  mediaType: FileMediaType;
  isMultiple: boolean;
  uploadMethod?: FileUploadMethod;
  optimizeOptions?: FileOptimizeOptions;
};

export type FileFieldValue = z.infer<typeof fileRelationSchema>;
export type FileFieldOutput = z.infer<typeof fileOutputSchema>;
