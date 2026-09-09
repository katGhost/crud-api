import * as z from "zod";

export const schema = z.object({
  title: z.string().min(1, { message: "title must be a non-empty string" }).max(100, { message: "title exceeds 100 characters" }),
  done: z.boolean({ error: "done must be a boolean value" }),
  confidence: z.number().min(0, { error: "confidence must be a number between 0 and 1" }).max(1, { error: "confidence must not exceed 1" }),
  warnings: z.array(z.string(), { error: "warnings must be an array" }),
});

export const userSchema = z.object({
  text: z.string().min(1, { message: "title must be a non-empty string" }).max(100, { message: "title exceeds 100 characters" }),
})