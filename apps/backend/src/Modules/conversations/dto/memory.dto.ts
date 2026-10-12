import * as v from 'valibot';

// The working memory is a free-form markdown scratchpad the user may edit or
// wipe. An empty string is allowed (that is how the client clears it).
export const UpdateMemorySchema = v.object({
  workingMemory: v.pipe(
    v.string('Working memory must be a string'),
    v.maxLength(20000, 'Working memory cannot exceed 20000 characters'),
  ),
});

export type UpdateMemoryDto = v.InferOutput<typeof UpdateMemorySchema>;
