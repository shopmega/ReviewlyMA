import { describe, expect, it } from 'vitest';
import { normalizeCompanyName, resolveBusinessMatch } from '../company-match';

describe('company match helpers', () => {
  it('normalizes business names by removing legal noise', () => {
    expect(normalizeCompanyName('ADM Value (Maroc) SARL')).toBe('adm value maroc');
    expect(normalizeCompanyName('Groupe Intelcia SA')).toBe('intelcia');
  });

  it('resolves an exact route-key match with high confidence', () => {
    const match = resolveBusinessMatch('ADM Value (Maroc)', [
      {
        id: 'adm-value-maroc',
        slug: 'adm-value-maroc',
        name: 'ADM Value (Maroc)',
        website: 'https://admvalue.com',
        city: 'Rabat',
      },
    ], {
      city: 'Rabat',
    });

    expect(match.businessId).toBe('adm-value-maroc');
    expect(match.confidence).toBe('high');
    expect(match.method).toBe('slug');
  });

  it('keeps ambiguous partial matches unresolved', () => {
    const match = resolveBusinessMatch('Orange', [
      {
        id: 'orange-maroc',
        slug: 'orange-maroc',
        name: 'Orange Maroc',
        city: 'Casablanca',
      },
      {
        id: 'orange-business',
        slug: 'orange-business',
        name: 'Orange Business Services',
        city: 'Casablanca',
      },
    ]);

    expect(match.businessId).toBeNull();
    expect(match.confidence === 'medium' || match.confidence === 'low').toBe(true);
    expect(match.candidates.length).toBeGreaterThan(0);
  });
});
