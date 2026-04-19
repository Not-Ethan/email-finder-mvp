export const PATTERNS = [
  { key: 'first.last', make: (f, l) => `${f}.${l}` },
  { key: 'first', make: (f) => f },
  { key: 'firstlast', make: (f, l) => `${f}${l}` },
  { key: 'flast', make: (f, l) => `${f[0]}${l}` },
  { key: 'firstl', make: (f, l) => `${f}${l[0]}` },
  { key: 'f.last', make: (f, l) => `${f[0]}.${l}` },
  { key: 'last.first', make: (f, l) => `${l}.${f}` },
  { key: 'first_last', make: (f, l) => `${f}_${l}` },
  { key: 'last', make: (_, l) => l },
  { key: 'fi.li', make: (f, l) => `${f[0]}.${l[0]}` }
];

export function splitName(name) {
  const parts = String(name).trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length < 2) throw new Error('Please provide at least first and last name');
  return { first: parts[0].replace(/[^a-z]/g, ''), last: parts[parts.length - 1].replace(/[^a-z]/g, '') };
}

export function generateEmails(name, domain) {
  const { first, last } = splitName(name);
  return PATTERNS.map((pattern) => ({
    pattern: pattern.key,
    email: `${pattern.make(first, last)}@${domain}`
  }));
}
