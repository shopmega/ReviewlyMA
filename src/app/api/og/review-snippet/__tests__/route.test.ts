import { describe, expect, it, vi, beforeEach } from 'vitest';

const { imageResponseMock } = vi.hoisted(() => ({
  imageResponseMock: vi.fn().mockImplementation((element, options) => ({
    element,
    options,
  })),
}));

vi.mock('next/og', () => ({
  ImageResponse: imageResponseMock,
}));

import { GET } from '../route';

function collectText(node: any): string[] {
  if (node == null) return [];
  if (typeof node === 'string' || typeof node === 'number') return [String(node)];
  if (Array.isArray(node)) return node.flatMap(collectText);
  if (node?.props?.children !== undefined) return collectText(node.props.children);
  return [];
}

describe('og review-snippet route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses fallback values when params are missing', async () => {
    const response = await GET(new Request('https://example.com/api/og/review-snippet'));
    const text = collectText((response as any).element).join(' ');

    expect(imageResponseMock).toHaveBeenCalledOnce();
    expect((response as any).options).toEqual({ width: 1200, height: 630 });
    expect(text).toContain('Entreprise');
    expect(text).toContain('Maroc');
    expect(text).toContain('0');
  });

  it('sanitizes and truncates provided params', async () => {
    const longSnippet = `${'x'.repeat(220)}   with   spaces`;
    const url =
      `https://example.com/api/og/review-snippet?company=${'A'.repeat(90)}` +
      `&city=   Casablanca   ` +
      `&rating=4.8` +
      `&snippet=${longSnippet}`;

    const response = await GET(new Request(url));
    const text = collectText((response as any).element).join(' ');

    expect(imageResponseMock).toHaveBeenCalledOnce();
    expect(text).toContain('Casablanca');
    expect(text).toContain('4.8');
    expect(text).toContain('A'.repeat(40));
    expect(text).not.toContain('A'.repeat(60));
    expect(text).toContain('x'.repeat(180));
    expect(text).not.toContain('x'.repeat(200));
  });
});
