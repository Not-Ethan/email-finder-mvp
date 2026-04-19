#!/usr/bin/env node
import { Command } from 'commander';
import { findEmail } from './finder.js';
import { readCsv, writeCsv } from './csv.js';

function buildName(row) {
  const first = row.first?.trim();
  const middle = row.middle?.trim();
  const last = row.last?.trim();
  return [first, middle, last].filter(Boolean).join(' ');
}

const program = new Command();
program.name('email-finder');

program
  .command('find')
  .requiredOption('--name <name>', 'full name')
  .option('--company <company>', 'company name')
  .option('--domain <domain>', 'company domain')
  .action(async (opts) => {
    if (!opts.company && !opts.domain) {
      console.error('Pass --company or --domain');
      process.exit(1);
    }
    try {
      const result = await findEmail(opts);
      console.log(JSON.stringify(result, null, 2));
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program
  .command('bulk')
  .requiredOption('--input <file>', 'input CSV path')
  .requiredOption('--output <file>', 'output CSV path')
  .action(async (opts) => {
    try {
      const rows = await readCsv(opts.input);
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

      await writeCsv(opts.output, outputRows);
      console.log(JSON.stringify({ processed: rows.length, written: opts.output }, null, 2));
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program.parse();
