import dns from 'node:dns/promises';
import { generateEmails } from './patterns.js';

async function fetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

export async function resolveDomain(company, domain) {
  if (domain) return domain.toLowerCase();
  const q = encodeURIComponent(company);
  const url = `https://autocomplete.clearbit.com/v1/companies/suggest?query=${q}`;
  try {
    const data = await fetchJson(url);
    if (Array.isArray(data) && data[0]?.domain) return data[0].domain.toLowerCase();
  } catch {}
  throw new Error('Could not resolve domain automatically; pass --domain explicitly');
}

export async function checkMx(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return { ok: records.length > 0, records };
  } catch {
    return { ok: false, records: [] };
  }
}

export async function searchEvidence({ name, company, domain, emails }) {
  const apiKey = process.env.BRAVE_API_KEY;
  const evidence = [];
  const mentions = { personCompany: 0, exactEmail: {}, domainMentions: 0 };

  if (!apiKey) return { evidence, mentions, provider: 'none' };

  const queries = [
    `"${name}" "${company || domain}"`,
    `site:${domain} "${name}"`,
    `"@${domain}"`
  ];

  for (const query of queries) {
    try {
      const data = await fetchJson(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=5`, {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey
        }
      });
      const items = data?.web?.results || [];
      if (query.includes(name)) mentions.personCompany += items.length;
      if (query.includes(`@${domain}`)) mentions.domainMentions += items.length;
      for (const item of items) evidence.push(`${item.title} — ${item.url}`);
    } catch {}
  }

  for (const candidate of emails.slice(0, 5)) {
    try {
      const query = `"${candidate.email}"`;
      const data = await fetchJson(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=3`, {
        headers: {
          Accept: 'application/json',
          'X-Subscription-Token': apiKey
        }
      });
      const count = (data?.web?.results || []).length;
      mentions.exactEmail[candidate.email] = count;
      if (count > 0) evidence.push(`Exact email mention found for ${candidate.email}`);
    } catch {
      mentions.exactEmail[candidate.email] = 0;
    }
  }

  return { evidence, mentions, provider: 'brave' };
}

export function scoreCandidates({ emails, mxOk, evidenceData }) {
  const ranked = emails.map((candidate, index) => {
    let score = 0.2;
    if (mxOk) score += 0.2;
    if (index === 0) score += 0.15;
    if (candidate.pattern === 'first.last') score += 0.1;
    if (candidate.pattern === 'flast') score += 0.08;
    if ((evidenceData.mentions.personCompany || 0) > 0) score += 0.1;
    if ((evidenceData.mentions.domainMentions || 0) > 0) score += 0.05;
    const exact = evidenceData.mentions.exactEmail?.[candidate.email] || 0;
    if (exact > 0) score += 0.3;
    return { ...candidate, score: Math.min(0.99, Number(score.toFixed(2))) };
  }).sort((a, b) => b.score - a.score);

  return ranked;
}

export async function findEmail({ name, company, domain }) {
  const resolvedDomain = await resolveDomain(company, domain);
  const emails = generateEmails(name, resolvedDomain);
  const mx = await checkMx(resolvedDomain);
  const evidenceData = await searchEvidence({ name, company, domain: resolvedDomain, emails });
  const ranked = scoreCandidates({ emails, mxOk: mx.ok, evidenceData });
  return {
    input: { name, company: company || null, domain: resolvedDomain },
    topEmail: ranked[0].email,
    confidence: ranked[0].score,
    mx: mx.ok,
    pattern: ranked[0].pattern,
    evidence: [
      `Resolved domain: ${resolvedDomain}`,
      mx.ok ? 'MX records present' : 'No MX records found',
      evidenceData.provider === 'brave' ? 'Public web evidence searched with Brave API' : 'No web evidence search (BRAVE_API_KEY missing)',
      ...evidenceData.evidence.slice(0, 5)
    ],
    alternatives: ranked.slice(1, 4).map((x) => x.email),
    ranked
  };
}
