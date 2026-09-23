import { cleanCrawledItems } from './crawl-pipeline';

jest.mock('./clean.service', () => ({
  cleanHTMLToMarkdown: jest.fn((html: string, url: string) => ({
    title: `title:${url}`,
    markdown: `md:${html}`,
  })),
}));

describe('cleanCrawledItems', () => {
  it('keeps items with html or content and drops empty ones', () => {
    const result = cleanCrawledItems([
      { html: '<p>hi</p>', url: 'https://a.test' },
      { content: '', sourceURL: 'https://b.test' },
      { content: 'plain', sourceURL: 'https://c.test' },
    ]);

    expect(result).toEqual([
      {
        url: 'https://a.test',
        title: 'title:https://a.test',
        content: 'md:<p>hi</p>',
      },
      {
        url: 'https://c.test',
        title: 'title:https://c.test',
        content: 'md:plain',
      },
    ]);
  });

  it('drops items that throw during cleaning', () => {
    const { cleanHTMLToMarkdown } = jest.requireMock('./clean.service');
    cleanHTMLToMarkdown.mockImplementationOnce(() => {
      throw new Error('parse failed');
    });

    expect(
      cleanCrawledItems([{ html: 'bad', url: 'https://bad.test' }]),
    ).toEqual([]);
  });
});
