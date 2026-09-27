import * as v from 'valibot';

export const CreateSandboxSchema = v.object({});

export const ExecuteSandboxSchema = v.object({
  sandboxId: v.pipe(
    v.string('Sandbox ID must be a string'),
    v.nonEmpty('Sandbox ID is required'),
  ),
  command: v.pipe(
    v.string('Command must be a string'),
    v.nonEmpty('Command is required'),
  ),
});

export const SandboxIdSchema = v.object({
  sandboxId: v.pipe(
    v.string('Sandbox ID must be a string'),
    v.nonEmpty('Sandbox ID is required'),
  ),
});

export type CreateSandboxDto = v.InferOutput<typeof CreateSandboxSchema>;
export type ExecuteSandboxDto = v.InferOutput<typeof ExecuteSandboxSchema>;
export type SandboxIdDto = v.InferOutput<typeof SandboxIdSchema>;
