import z from "zod";

export const updateTutorialPreferencesInput = z.object({
  enabled: z.boolean(),
});

export const markTourSeenInput = z.object({
  tourId: z.string().min(1),
});

export type UpdateTutorialPreferencesInput = z.infer<
  typeof updateTutorialPreferencesInput
>;
export type MarkTourSeenInput = z.infer<typeof markTourSeenInput>;
