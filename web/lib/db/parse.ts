// The Neon HTTP driver doesn't always know how to map custom enum array
// columns to JS arrays; it sometimes returns the Postgres text representation
// like '{a,b,"c d"}'. Normalise to a real JS string[] regardless of which
// shape comes back.
export function parsePgTextArray(value: unknown): string[] {
  if (value === null || value === undefined) return [];
  if (Array.isArray(value)) return value.map(String);
  if (typeof value !== 'string') return [];
  const s = value.trim();
  if (!s || s === '{}') return [];
  if (!s.startsWith('{') || !s.endsWith('}')) return [s];

  const out: string[] = [];
  let i = 1;                  // skip leading {
  const end = s.length - 1;   // stop before trailing }
  while (i < end) {
    if (s[i] === '"') {
      // Quoted element; respect \" and \\ escapes.
      let buf = '';
      i++;
      while (i < end) {
        const ch = s[i];
        if (ch === '\\' && i + 1 < end) { buf += s[i + 1]; i += 2; continue; }
        if (ch === '"') { i++; break; }
        buf += ch; i++;
      }
      out.push(buf);
    } else {
      // Unquoted run up to comma or end.
      const start = i;
      while (i < end && s[i] !== ',') i++;
      const token = s.slice(start, i).trim();
      if (token === 'NULL') out.push('');
      else                  out.push(token);
    }
    if (s[i] === ',') i++;
  }
  return out;
}
