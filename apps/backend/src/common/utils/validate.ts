import * as v from 'valibot';

type ValidateOptions = {
  exitOnError?: boolean;
  title?: string;
};

export function validate<
  const TSchema extends v.BaseSchema<any, any, any>,
>(
  schema: TSchema,
  data: unknown,
  options?: ValidateOptions,
): v.InferOutput<TSchema> {
  const result = v.safeParse(schema, data);

  if (!result.success) {
    const errors = v.flatten(result.issues).nested ?? {} as Record<string, string[] | undefined>;

    const R = '\x1b[38;5;203m';
    const RD = '\x1b[38;5;167m';
    const G = '\x1b[38;5;114m';
    const W = '\x1b[38;5;250m';
    const D = '\x1b[2m';
    const B = '\x1b[1m';
    const RS = '\x1b[0m';

    const divider = `${D}${'─'.repeat(50)}${RS}`;

    const entries = Object.entries(errors)
      .map(([key, msgs]) =>
        [
          `  ${R}▸${RS} ${B}${key}${RS}`,
          ...(Array.isArray(msgs) ? msgs : []).map((m) => `    ${D}└─${RS} ${RD}${m}${RS}`),
        ].join('\n'),
      )
      .join('\n\n');

    const output = [
      '',
      `  ${R}${B}✖  ${options?.title ?? 'VALIDATION FAILED'}${RS}`,
      `  ${divider}`,
      '',
      `  ${D}Invalid fields:${RS}`,
      '',
      entries,
      '',
      `  ${divider}`,
      '',
    ].join('\n');

    process.stderr.write(output + '\n');

    if (options?.exitOnError) {
      process.exit(1);
    }

    throw new Error('Validation failed');
  }

  return result.output;
}