import { findEmail } from './finder.js';

export function buildName(row) {
  const first = row.first?.trim();
  const middle = row.middle?.trim();
  const last = row.last?.trim();
  return [first, middle, last].filter(Boolean).join(' ');
}

export async function processRows(rows) {
  const outputRows = [];

  for (const row of rows) {
    const fullName = buildName(row);
    const company = row.company?.trim();
    const domain = row.domain?.trim();

    if (!fullName || (!company && !domain)) {
      outputRows.push({
        ...row,
        status: 'error',
        error: 'Row must include first/last (middle optional) and company or domain'
      });
      continue;
    }

    try {
      const result = await findEmail({ name: fullName, company, domain });
      outputRows.push({
        ...row,
        full_name: fullName,
        resolved_domain: result.input.domain,
        top_email: result.topEmail,
        confidence: result.confidence,
        pattern: result.pattern,
        mx: result.mx,
        alternative_1: result.alternatives[0] || '',
        alternative_2: result.alternatives[1] || '',
        alternative_3: result.alternatives[2] || '',
        status: 'ok',
        error: ''
      });
    } catch (error) {
      outputRows.push({
        ...row,
        full_name: fullName,
        status: 'error',
        error: error.message
      });
    }
  }

  return outputRows;
}
