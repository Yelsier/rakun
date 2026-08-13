import z from 'zod'

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
  type FieldCapabilities,
  type PopulatableFieldLike,
  type WithFieldState,
  withFieldModifiers,
} from './Field'
import { Id } from '../utils/id'

export const fileMediaTypes = ['Image', 'Video', 'Document', 'Any'] as const
export const fileUploadMethods = ['default', 'optimize'] as const
export const fileOptimizeFormats = ['webp', 'jpeg', 'png', 'avif'] as const
export const DEFAULT_RESPONSIVE_IMAGE_WIDTHS = [320, 640, 960, 1280, 1920] as const

export type FileMediaType = (typeof fileMediaTypes)[number]
export type FileUploadMethod = (typeof fileUploadMethods)[number]
export type FileOptimizeFormat = (typeof fileOptimizeFormats)[number]

export const FileOptimizeOptionsSchema = z.object({
  format: z.enum(fileOptimizeFormats).default('webp'),
  quality: z.number().int().min(1).max(100).default(80),
  generatePreview: z.boolean().default(true),
  generateSizes: z.boolean().default(true),
  responsiveSizes: z
    .array(z.number().int().positive())
    .default([...DEFAULT_RESPONSIVE_IMAGE_WIDTHS]),
  minBytesToOptimize: z
    .number()
    .int()
    .positive()
    .default(350 * 1024),
  previewMaxWidth: z.number().int().positive().default(32),
})

export type FileOptimizeOptions = z.infer<typeof FileOptimizeOptionsSchema>

const defaultOptimize: Partial<FileOptimizeOptions> = {
  format: 'webp',
  quality: 90,
  generatePreview: true,
}

const fileRelationSchema = z.object({
  type: z.literal('existing'),
  _id: Id,
  contentType: z.literal('Media'),
})

const fileOutputSchema = z.object({
  key: z.string().optional(),
  access: z.enum(['public', 'private']).optional(),
  url: z.string(),
  previewKey: z.string().nullable().optional(),
  previewUrl: z.string().nullable(),
  name: z.string(),
  title: z.string().optional(),
  alt: z.string().nullable().optional(),
  mime: z.string(),
  width: z.number().int().positive().nullable(),
  height: z.number().int().positive().nullable(),
  size: z.number().int().nonnegative(),
  orientation: z.enum(['portrait', 'landscape']).nullable(),
  sizes: z
    .array(
      z.object({
        key: z.string(),
        url: z.string(),
        width: z.number().int().positive(),
        height: z.number().int().positive(),
        mime: z.string(),
        size: z.number().int().nonnegative(),
      })
    )
    .optional(),
  srcSet: z.string().nullable().optional(),
})

type FileRelation = z.infer<typeof fileRelationSchema>
export type FileOutputValue = z.infer<typeof fileOutputSchema>

type MaybeMultiple<Value, Multiple extends boolean> = Multiple extends true ? Value[] : Value

export type FileMeta<
  MediaType extends FileMediaType = FileMediaType,
  Multiple extends boolean = boolean,
> = {
  type: 'File'
  ui: 'File'
  mediaType: MediaType
  isMultiple: Multiple
  minItems?: number
  maxItems?: number
  uploadMethod: FileUploadMethod
  optimizeOptions?: FileOptimizeOptions
  capabilities: FieldCapabilities
}

export type EncodedFileField = EncodedField & {
  mediaType: FileMediaType
  isMultiple: boolean
  minItems?: number
  maxItems?: number
  uploadMethod?: FileUploadMethod
  optimizeOptions?: FileOptimizeOptions
}

export type FileFieldValue = FileRelation
export type FileFieldOutput = FileOutputValue

type FileOptions<MediaType extends FileMediaType, Multiple extends boolean> = {
  mediaType: MediaType
  multiple: Multiple
  minItems?: number
  maxItems?: number
  uploadMethod: FileUploadMethod
  optimizeOptions?: FileOptimizeOptions
}

export type FileField<
  MediaType extends FileMediaType = 'Any',
  Multiple extends boolean = false,
  State extends FieldState = DefaultFieldState,
> = FieldWithModifiers<FileFieldCore<MediaType, Multiple, State>>

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
      mediaType: NextMediaType
    ) => FileField<NextMediaType, Multiple, FieldStateOf<TThis>>
    multiple: <TThis extends FileFieldBase<MediaType, Multiple, FieldState>>(
      this: TThis
    ) => FileField<MediaType, true, FieldStateOf<TThis>>
    min: <TThis extends FileFieldBase<MediaType, Multiple, FieldState>>(
      this: Multiple extends true ? TThis : never,
      count: number
    ) => FileField<MediaType, Multiple, FieldStateOf<TThis>>
    max: <TThis extends FileFieldBase<MediaType, Multiple, FieldState>>(
      this: Multiple extends true ? TThis : never,
      count: number
    ) => FileField<MediaType, Multiple, FieldStateOf<TThis>>
    optimize: <TThis extends FileFieldBase<MediaType, Multiple, FieldState>>(
      this: TThis,
      options?: Partial<FileOptimizeOptions>
    ) => FileField<MediaType, Multiple, FieldStateOf<TThis>>
  }

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
>

export function fileField(): FileField {
  return makeFileField(
    { mediaType: 'Any', multiple: false, uploadMethod: 'default' },
    defaultFieldState
  )
}

function makeFileField<
  MediaType extends FileMediaType,
  Multiple extends boolean,
  State extends FieldState,
>(options: FileOptions<MediaType, Multiple>, state: State): FileField<MediaType, Multiple, State> {
  const field: FileFieldCore<MediaType, Multiple, State> = {
    ...createField({
      meta: {
        type: 'File',
        ui: 'File',
        mediaType: options.mediaType,
        isMultiple: options.multiple,
        minItems: options.minItems,
        maxItems: options.maxItems,
        uploadMethod: options.uploadMethod,
        optimizeOptions: options.optimizeOptions,
        capabilities: {
          valueKind: options.multiple ? 'array' : 'object',
          dynamic: {
            properties: {
              url: 'string',
              previewUrl: 'string',
              name: 'string',
              title: 'string',
              alt: 'string',
              mime: 'string',
              srcSet: 'string',
              width: 'number',
              height: 'number',
              size: 'number',
            },
          },
        },
      },
      state,
      schemas: {
        input: () => buildFileRelationSchema(options),
        db: () => buildFileRelationSchema(options),
        output: () => buildFileOutputSchema(options),
      },
    }),
    getPopulatedSchema: () =>
      applyFileOutputPresence(buildFileOutputSchema(options), state) as z.ZodType<
        FieldOutput<MaybeMultiple<FileOutputValue, Multiple>, State>
      >,
    type: function <
      TThis extends FileFieldBase<MediaType, Multiple, FieldState>,
      NextMediaType extends FileMediaType,
    >(this: TThis, mediaType: NextMediaType) {
      return makeFileField({ ...options, mediaType }, this.state as FieldStateOf<TThis>)
    },
    multiple: function <TThis extends FileFieldBase<MediaType, Multiple, FieldState>>(this: TThis) {
      return makeFileField({ ...options, multiple: true }, this.state as FieldStateOf<TThis>)
    },
    min: function <TThis extends FileFieldBase<MediaType, Multiple, FieldState>>(
      this: Multiple extends true ? TThis : never,
      count: number
    ) {
      return makeFileField({ ...options, minItems: count }, this.state as FieldStateOf<TThis>)
    },
    max: function <TThis extends FileFieldBase<MediaType, Multiple, FieldState>>(
      this: Multiple extends true ? TThis : never,
      count: number
    ) {
      return makeFileField({ ...options, maxItems: count }, this.state as FieldStateOf<TThis>)
    },
    optimize: function <TThis extends FileFieldBase<MediaType, Multiple, FieldState>>(
      this: TThis,
      optimizeOptions?: Partial<FileOptimizeOptions>
    ) {
      return makeFileField(
        {
          ...options,
          uploadMethod: 'optimize',
          optimizeOptions: FileOptimizeOptionsSchema.parse(optimizeOptions ?? defaultOptimize),
        },
        this.state as FieldStateOf<TThis>
      )
    },
  }

  return withFieldModifiers({
    field,
    rebuild: <NextState extends FieldState>(nextState: NextState) =>
      makeFileField(options, nextState) as WithFieldState<
        FileFieldCore<MediaType, Multiple, State>,
        NextState
      >,
  })
}

function buildFileRelationSchema<MediaType extends FileMediaType, Multiple extends boolean>(
  options: FileOptions<MediaType, Multiple>
) {
  return (options.multiple
    ? applyFileListLimits(z.array(fileRelationSchema), options)
    : fileRelationSchema) as unknown as z.ZodType<MaybeMultiple<FileRelation, Multiple>>
}

function buildFileOutputSchema<MediaType extends FileMediaType, Multiple extends boolean>(
  options: FileOptions<MediaType, Multiple>
) {
  return (options.multiple
    ? applyFileListLimits(z.array(fileOutputSchema), options)
    : fileOutputSchema) as unknown as z.ZodType<MaybeMultiple<FileOutputValue, Multiple>>
}

function applyFileListLimits<Item extends z.ZodTypeAny>(
  schema: z.ZodArray<Item>,
  options: Pick<FileOptions<FileMediaType, boolean>, 'minItems' | 'maxItems'>
) {
  let next = schema
  if (options.minItems !== undefined) next = next.min(options.minItems)
  if (options.maxItems !== undefined) next = next.max(options.maxItems)
  return next
}

function applyFileOutputPresence<Value, State extends FieldState>(
  schema: z.ZodType<Value>,
  state: State
) {
  return state.required ? schema : schema.optional()
}
