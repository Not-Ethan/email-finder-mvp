import express from 'express';
import multer from 'multer';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { findEmail } from './finder.js';
import { readCsv, writeCsv } from './csv.js';
import { processRows } from './bulk.js';

const app = express();
const upload = multer({ dest: path.join(os.tmpdir(), 'email-finder-mvp') });
const port = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: true }));

function page({ body, title = 'Email Finder MVP' }) {
  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 40px auto; max-width: 1000px; padding: 0 16px; background: #0b1020; color: #e6edf3; }
    .card { background: #11182b; border: 1px solid #24304a; border-radius: 14px; padding: 20px; margin-bottom: 20px; }
    h1,h2 { margin-top: 0; }
    label { display:block; font-weight: 600; margin: 10px 0 6px; }
    input, button { font: inherit; }
    input[type=text], input[type=file] { width: 100%; padding: 10px 12px; border-radius: 10px; border: 1px solid #33415c; background: #0f172a; color: #e6edf3; }
    button { background: #4f46e5; color: white; border: 0; border-radius: 10px; padding: 10px 16px; cursor: pointer; }
    button:hover { background: #4338ca; }
    .grid { display:grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    .muted { color: #93a4bf; font-size: 14px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 14px; }
    th, td { border-bottom: 1px solid #24304a; padding: 8px; text-align: left; vertical-align: top; }
    .ok { color: #4ade80; }
    .error { color: #f87171; }
    a { color: #93c5fd; }
    code, pre { background: #0f172a; border-radius: 8px; }
    pre { padding: 12px; overflow:auto; }
    @media (max-width: 700px) { .grid { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
  <h1>Email Finder MVP</h1>
  <p class="muted">Single lookups and bulk CSV. Input columns for bulk: <code>first,middle,last,company,domain</code>.</p>
  ${body}
</body>
</html>`;
}

app.get('/', (_req, res) => {
  res.send(page({ body: `
    <div class="card">
      <h2>Single lookup</h2>
      <form method="post" action="/find">
        <label>Name</label>
        <input type="text" name="name" placeholder="John Smith" required />
        <div class="grid">
          <div>
            <label>Company</label>
            <input type="text" name="company" placeholder="OpenAI" />
          </div>
          <div>
            <label>Domain</label>
            <input type="text" name="domain" placeholder="openai.com" />
          </div>
        </div>
        <p class="muted">Pass company or domain.</p>
        <button type="submit">Find email</button>
      </form>
    </div>

    <div class="card">
      <h2>Bulk CSV</h2>
      <form method="post" action="/bulk" enctype="multipart/form-data">
        <label>CSV file</label>
        <input type="file" name="csv" accept=".csv,text/csv" required />
        <p class="muted">Expected columns: first, middle, last, company, domain</p>
        <button type="submit">Process CSV</button>
      </form>
    </div>
  ` }));
});

app.post('/find', async (req, res) => {
  try {
    const { name, company, domain } = req.body;
    if (!name || (!company && !domain)) throw new Error('Pass name and company or domain');
    const result = await findEmail({ name, company, domain });
    res.send(page({ title: 'Single lookup result', body: `
      <div class="card">
        <h2>Result</h2>
        <p><strong>Top email:</strong> ${result.topEmail}</p>
        <p><strong>Confidence:</strong> ${result.confidence}</p>
        <p><strong>Pattern:</strong> ${result.pattern}</p>
        <p><strong>MX:</strong> ${result.mx}</p>
        <p><a href="/">← Back</a></p>
        <pre>${escapeHtml(JSON.stringify(result, null, 2))}</pre>
      </div>
    ` }));
  } catch (error) {
    res.status(400).send(page({ title: 'Error', body: `<div class="card"><h2>Error</h2><p class="error">${escapeHtml(error.message)}</p><p><a href="/">← Back</a></p></div>` }));
  }
});

app.post('/bulk', upload.single('csv'), async (req, res) => {
  let outputPath = null;
  try {
    if (!req.file) throw new Error('Upload a CSV file');
    const rows = await readCsv(req.file.path);
    const outputRows = await processRows(rows);
    outputPath = path.join(os.tmpdir(), `email-finder-results-${Date.now()}.csv`);
    await writeCsv(outputPath, outputRows);

    const preview = outputRows.slice(0, 20).map((row) => `
      <tr>
        <td>${escapeHtml(row.full_name || '')}</td>
        <td>${escapeHtml(row.resolved_domain || row.domain || '')}</td>
        <td>${escapeHtml(row.top_email || '')}</td>
        <td>${escapeHtml(String(row.confidence || ''))}</td>
        <td class="${row.status === 'ok' ? 'ok' : 'error'}">${escapeHtml(row.status || '')}</td>
        <td>${escapeHtml(row.error || '')}</td>
      </tr>
    `).join('');

    res.send(page({ title: 'Bulk results', body: `
      <div class="card">
        <h2>Bulk results</h2>
        <p>Processed <strong>${outputRows.length}</strong> rows.</p>
        <p><a href="/download?file=${encodeURIComponent(outputPath)}">Download results CSV</a></p>
        <table>
          <thead>
            <tr><th>Name</th><th>Domain</th><th>Top Email</th><th>Confidence</th><th>Status</th><th>Error</th></tr>
          </thead>
          <tbody>${preview}</tbody>
        </table>
        <p class="muted">Showing first ${Math.min(outputRows.length, 20)} rows.</p>
        <p><a href="/">← Back</a></p>
      </div>
    ` }));
  } catch (error) {
    res.status(400).send(page({ title: 'Error', body: `<div class="card"><h2>Error</h2><p class="error">${escapeHtml(error.message)}</p><p><a href="/">← Back</a></p></div>` }));
  } finally {
    if (req.file?.path) await fs.unlink(req.file.path).catch(() => {});
  }
});

app.get('/download', async (req, res) => {
  const filePath = req.query.file;
  if (!filePath) return res.status(400).send('Missing file');
  try {
    await fs.access(filePath);
    res.download(filePath, 'email-finder-results.csv');
  } catch {
    res.status(404).send('File not found');
  }
});

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

app.listen(port, () => {
  console.log(`Email Finder MVP UI running at http://localhost:${port}`);
});
