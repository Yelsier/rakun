import z from "zod";

export const robotsOutput = z.object({
  content: z.string(),
});

export type RobotsOutput = z.output<typeof robotsOutput>;
