const MAX_DEFAULT_NAME_WORDS = 5;

/** Instant placeholder name from the prompt while the final name is generated. */
export function deriveDefaultName(prompt: string): string {
  const words = prompt.split(/\s+/).slice(0, MAX_DEFAULT_NAME_WORDS).join(' ');
  return words.length > 3 ? `${words}...` : words;
}
