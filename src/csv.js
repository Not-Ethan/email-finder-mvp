import fs from 'node:fs/promises';

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      out.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  out.push(current);
  return out.map((value) => value.trim());
}

export async function readCsv(filePath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const row = { __row: index + 2 };
    headers.forEach((header, i) => {
      row[header] = values[i] || '';
    });
    return row;
  });
}

function escapeCsv(value) {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

export async function writeCsv(filePath, rows) {
  if (!rows.length) {
    await fs.writeFile(filePath, '');
    return;
  }

  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header] ?? '')).join(','));
  }
  await fs.writeFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}
