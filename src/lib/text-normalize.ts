// Best-effort text repair for mojibake caused by UTF-8/Latin1 decode mismatches.
// This is intentionally conservative and only targets user-visible display strings.
export function normalizeDisplayText(value?: string | null): string {
  if (!value) return '';

  let out = value;

  // Attempt 2 rounds to handle double-encoded sequences like "CatÃƒÂ©gorie".
  for (let i = 0; i < 2; i++) {
    try {
      const repaired = decodeURIComponent(escape(out));
      if (repaired === out) break;
      out = repaired;
    } catch {
      break;
    }
  }

  // Target known city corruption patterns containing replacement chars.
  const cityFixes: Record<string, string> = {
    'la�youne': 'Laayoune',
    'la?youne': 'Laayoune',
    'dakhla�': 'Dakhla',
    'beni mellal�': 'Beni Mellal',
  };

  const lower = out.toLowerCase();
  for (const [broken, fixed] of Object.entries(cityFixes)) {
    if (lower.includes(broken)) return fixed;
  }

  return out;
}

