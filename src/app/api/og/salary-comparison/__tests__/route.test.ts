import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('og salary-comparison route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders default heading when mode is unknown', async () => {
    const response = await GET(new Request('https://example.com/api/og/salary-comparison?mode=unknown'));
    const text = collectText((response as any).element).join(' ');

    expect(imageResponseMock).toHaveBeenCalledOnce();
    expect((response as any).options).toEqual({ width: 1200, height: 630 });
    expect(text).toContain('Comparaison des salaires');
    expect(text).toContain('Comparez entreprises, roles et villes');
  });

  it('renders company mode heading with truncated labels', async () => {
    const url =
      `https://example.com/api/og/salary-comparison?mode=company` +
      `&companyALabel=${'A'.repeat(60)}` +
      `&companyBLabel=${'B'.repeat(60)}`;

    const response = await GET(new Request(url));
    const text = collectText((response as any).element).join(' ');

    expect(imageResponseMock).toHaveBeenCalledOnce();
    expect(text).toContain(`${'A'.repeat(40)} vs ${'B'.repeat(40)}`);
    expect(text).toContain('Benchmark salarial anonymise');
    expect(text).not.toContain('A'.repeat(50));
    expect(text).not.toContain('B'.repeat(50));
  });
});
