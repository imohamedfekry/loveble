import * as v from "valibot";

export const loginSchema = v.object({
  email: v.pipe(v.string(), v.email("Invalid email")),
  password: v.pipe(
    v.string(),
    v.minLength(6, "Password must be at least 6 chars"),
  ),
});

export type LoginSchema = v.InferOutput<typeof loginSchema>;