import { defineOperation } from "@rakun-kit/next";
import { z } from "zod";

export const apiOperations = {
  "demo.helloWorld": defineOperation({
    access: "public",
    kind: "query",
    method: "get",
    description: "Return a hello world message with the provided text",
    input: z.object({
      text: z.string().default("world"),
    }),
    output: z.object({
      message: z.string(),
    }),
    resolve: ({ input }) => ({
      message: `Hello ${input.text}`,
    }),
  }),
};

export type ApiOperations = typeof apiOperations;
