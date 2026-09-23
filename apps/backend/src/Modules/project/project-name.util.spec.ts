import { deriveDefaultName } from './project-name.util';

describe('deriveDefaultName', () => {
  it('takes the first 5 words and appends ellipsis when longer', () => {
    expect(
      deriveDefaultName('build a todo app with react and typescript fast'),
    ).toBe('build a todo app with...');
  });

  it('adds ellipsis to any prompt longer than 3 chars', () => {
    expect(deriveDefaultName('hello world')).toBe('hello world...');
  });

  it('leaves very short prompts as-is', () => {
    expect(deriveDefaultName('app')).toBe('app');
  });
});
