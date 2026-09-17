import {
  collectFolderPaths,
  deriveDefaultName,
  parseScaffoldResponse,
  sanitizeScaffold,
} from './scaffold.parser';

describe('scaffold.parser', () => {
  describe('parseScaffoldResponse', () => {
    it('parses a plain JSON object', () => {
      const scaffold = parseScaffoldResponse(
        '{"name":"Todo App","files":[{"path":"index.html","content":"<h1/>"}]}',
      );
      expect(scaffold).toEqual({
        name: 'Todo App',
        files: [{ path: 'index.html', content: '<h1/>' }],
      });
    });

    it('strips markdown fences and trailing commentary', () => {
      const scaffold = parseScaffoldResponse(
        '```json\n{"files":[{"path":"src/main.ts","content":"1"}]}\n```\nGood luck!',
      );
      expect(scaffold.files[0].path).toBe('src/main.ts');
    });

    it('drops malformed and empty-path entries', () => {
      const scaffold = parseScaffoldResponse(
        '{"files":[null,{"path":"","content":"x"},{"path":"a.js","content":"y"},{"path":5,"content":"z"}]}',
      );
      expect(scaffold.files).toEqual([{ path: 'a.js', content: 'y' }]);
    });

    it('coerces content types to strings', () => {
      const scaffold = parseScaffoldResponse(
        '{"files":[{"path":"a.js","content":42}]}',
      );
      expect(scaffold.files[0].content).toBe('');
    });

    it('throws when no object is present', () => {
      expect(() => parseScaffoldResponse('nope')).toThrow();
    });
  });

  describe('sanitizeScaffold', () => {
    it('normalizes paths and de-duplicates', () => {
      const scaffold = sanitizeScaffold({
        files: [
          { path: '/src\\App.tsx', content: 'a' },
          { path: 'src/App.tsx', content: 'b' },
          { path: '', content: 'c' },
        ],
      });
      expect(scaffold.files).toEqual([{ path: 'src/App.tsx', content: 'a' }]);
    });

    it('caps the number of files', () => {
      const scaffold = sanitizeScaffold({
        files: Array.from({ length: 40 }, (_, i) => ({
          path: `file-${i}.js`,
          content: '',
        })),
      });
      expect(scaffold.files).toHaveLength(24);
    });

    it('caps file content length', () => {
      const scaffold = sanitizeScaffold({
        files: [{ path: 'big.js', content: 'x'.repeat(1_000_000) }],
      });
      expect(scaffold.files[0].content).toHaveLength(200_000);
    });

    it('caps the project name length', () => {
      const scaffold = sanitizeScaffold({
        name: 'n'.repeat(500),
        files: [],
      });
      expect(scaffold.name).toHaveLength(100);
    });
  });

  describe('collectFolderPaths', () => {
    it('returns unique directory paths shallowest-first, excluding root files', () => {
      const folders = collectFolderPaths([
        { path: 'src/components/Button.tsx', content: '' },
        { path: 'src/utils/format.ts', content: '' },
        { path: 'readme.md', content: '' },
      ]);
      expect(folders).toEqual([
        ['src'],
        ['src', 'components'],
        ['src', 'utils'],
      ]);
    });
  });

  describe('deriveDefaultName', () => {
    it('uses the first words with an ellipsis on a long prompt', () => {
      expect(deriveDefaultName('build a todo app with stripes')).toBe(
        'build a todo app with...',
      );
    });

    it('keeps short prompts as-is', () => {
      expect(deriveDefaultName('todo')).toBe('todo...');
    });
  });
});
