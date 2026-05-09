import z from "zod";

import {
  createField,
  defaultFieldState,
  type EncodedField,
  type DefaultFieldState,
  type FieldLike,
  type FieldOutput,
  type FieldState,
  type FieldStateOf,
  type FieldWithModifiers,
  type PopulatableFieldLike,
  type WithFieldState,
  withFieldModifiers,
} from "./Field";
import { Id } from "../utils/id";

export const fileMediaTypes = ["Image", "Video", "Document", "Any"] as const;
export const fileUploadMethods = ["default", "optimize"] as const;
export const fileOptimizeFormats = ["webp", "jpeg", "png", "avif"] as const;

export type FileMediaType = (typeof fileMediaTypes)[number];
export type FileUploadMethod = (typeof fileUploadMethods)[number];
export type FileOptimizeFormat = (typeof fileOptimizeFormats)[number];

export const FileOptimizeOptionsSchema = z.object({
  format: z.enum(fileOptimizeFormats).default("webp"),
  quality: z.number().int().min(1).max(100).default(80),
  generatePreview: z.boolean().default(false),
  minBytesToOptimize: z
    .number()
    .int()
    .positive()
    .default(350 * 1024),
  previewMaxWidth: z.number().int().positive().default(480),
});

export type FileOptimizeOptions = z.infer<typeof FileOptimizeOptionsSchema>;

const defaultOptimize: Partial<FileOptimizeOptions> = {
  format: "webp",
  quality: 90,
  generatePreview: true,
};

const fileRelationSchema = z.object({
  type: z.literal("existing"),
  _id: Id,
  contentType: z.literal("Media"),
});

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

type FileRelation = z.infer<typeof fileRelationSchema>;
export type FileOutputValue = z.infer<typeof fileOutputSchema>;

type MaybeMultiple<Value, Multiple extends boolean> = Multiple extends true
  ? Value[]
  : Value;

export type FileMeta<
  MediaType extends FileMediaType = FileMediaType,
  Multiple extends boolean = boolean,
> = {
  type: "File";
  ui: "File";
  mediaType: MediaType;
  isMultiple: Multiple;
  uploadMethod: FileUploadMethod;
  optimizeOptions?: FileOptimizeOptions;
};

export type EncodedFileField = EncodedField & {
  mediaType: FileMediaType;
  isMultiple: boolean;
  uploadMethod?: FileUploadMethod;
  optimizeOptions?: FileOptimizeOptions;
};

export type FileFieldValue = FileRelation;
export type FileFieldOutput = FileOutputValue;

type FileOptions<
  MediaType extends FileMediaType,
  Multiple extends boolean,
> = {
  mediaType: MediaType;
  multiple: Multiple;
  uploadMethod: FileUploadMethod;
  optimizeOptions?: FileOptimizeOptions;
};

export type FileField<
  MediaType extends FileMediaType = "Any",
  Multiple extends boolean = false,
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<FileFieldCore<MediaType, Multiple, State>>;

type FileFieldCore<
  MediaType extends FileMediaType,
  Multiple extends boolean,
  State extends FieldState,
> = FileFieldBase<MediaType, Multiple, State> &
  PopulatableFieldLike<MaybeMultiple<FileOutputValue, Multiple>, State> & {
    type: <
      TThis extends FileFieldBase<MediaType, Multiple, FieldState>,
      NextMediaType extends FileMediaType,
    >(
      this: TThis,
      mediaType: NextMediaType,
    ) => FileField<NextMediaType, Multiple, FieldStateOf<TThis>>;
    multiple: <
      TThis extends FileFieldBase<MediaType, Multiple, FieldState>,
    >(
      this: TThis,
    ) => FileField<MediaType, true, FieldStateOf<TThis>>;
    optimize: <
      TThis extends FileFieldBase<MediaType, Multiple, FieldState>,
    >(
      this: TThis,
      options?: Partial<FileOptimizeOptions>,
    ) => FileField<MediaType, Multiple, FieldStateOf<TThis>>;
  };

type FileFieldBase<
  MediaType extends FileMediaType,
  Multiple extends boolean,
  State extends FieldState,
> = FieldLike<
  MaybeMultiple<FileRelation, Multiple>,
  MaybeMultiple<FileRelation, Multiple>,
  MaybeMultiple<FileOutputValue, Multiple>,
  FileMeta<MediaType, Multiple>,
  State
>;

export function fileField(): FileField {
  return makeFileField(
    { mediaType: "Any", multiple: false, uploadMethod: "default" },
    defaultFieldState,
  );
}

function makeFileField<
  MediaType extends FileMediaType,
  Multiple extends boolean,
  State extends FieldState,
>(
  options: FileOptions<MediaType, Multiple>,
  state: State,
): FileField<MediaType, Multiple, State> {
  const field: FileFieldCore<MediaType, Multiple, State> = {
    ...createField({
      meta: {
        type: "File",
        ui: "File",
        mediaType: options.mediaType,
        isMultiple: options.multiple,
        uploadMethod: options.uploadMethod,
        optimizeOptions: options.optimizeOptions,
      },
      state,
      schemas: {
        input: () => buildFileRelationSchema(options.multiple),
        db: () => buildFileRelationSchema(options.multiple),
        output: () => buildFileOutputSchema(options.multiple),
      },
    }),
    getPopulatedSchema: () =>
      applyFileOutputPresence(
        buildFileOutputSchema(options.multiple),
        state,
      ) as z.ZodType<
        FieldOutput<MaybeMultiple<FileOutputValue, Multiple>, State>
      >,
    type: function <
      TThis extends FileFieldBase<MediaType, Multiple, FieldState>,
      NextMediaType extends FileMediaType,
    >(this: TThis, mediaType: NextMediaType) {
      return makeFileField(
        { ...options, mediaType },
        this.state as FieldStateOf<TThis>,
      );
    },
    multiple: function <
      TThis extends FileFieldBase<MediaType, Multiple, FieldState>,
    >(this: TThis) {
      return makeFileField(
        { ...options, multiple: true },
        this.state as FieldStateOf<TThis>,
      );
    },
    optimize: function <
      TThis extends FileFieldBase<MediaType, Multiple, FieldState>,
    >(this: TThis, optimizeOptions?: Partial<FileOptimizeOptions>) {
      return makeFileField(
        {
          ...options,
          uploadMethod: "optimize",
          optimizeOptions: FileOptimizeOptionsSchema.parse(
            optimizeOptions ?? defaultOptimize,
          ),
        },
        this.state as FieldStateOf<TThis>,
      );
    },
  };

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeFileField(options, nextState) as WithFieldState<
        FileFieldCore<MediaType, Multiple, State>,
        NextState
      >,
  });
}

function buildFileRelationSchema<Multiple extends boolean>(multiple: Multiple) {
  return (
    multiple ? z.array(fileRelationSchema) : fileRelationSchema
  ) as unknown as z.ZodType<MaybeMultiple<FileRelation, Multiple>>;
}

function buildFileOutputSchema<Multiple extends boolean>(multiple: Multiple) {
  return (
    multiple ? z.array(fileOutputSchema) : fileOutputSchema
  ) as unknown as z.ZodType<MaybeMultiple<FileOutputValue, Multiple>>;
}

function applyFileOutputPresence<Value, State extends FieldState>(
  schema: z.ZodType<Value>,
  state: State,
) {
  return state.required ? schema : schema.optional();
}
