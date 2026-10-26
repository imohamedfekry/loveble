const MAX_DEFAULT_NAME_WORDS = 5;
const MAX_DEFAULT_NAME_LENGTH = 255;

/** Instant placeholder name from the prompt while the final name is generated. */
export function deriveDefaultName(prompt: string): string {
  const words = prompt
    .trim()
    .split(/\s+/)
    .slice(0, MAX_DEFAULT_NAME_WORDS)
    .join(' ');
  if (words.length <= 3) return words;

  const maxBaseLength = MAX_DEFAULT_NAME_LENGTH - 3;
  const base =
    words.length > maxBaseLength ? words.slice(0, maxBaseLength) : words;
  return `${base}...`;
}
