#!/usr/bin/env node
import { Command } from 'commander';
import { findEmail } from './finder.js';
import { readCsv, writeCsv } from './csv.js';
import { processRows } from './bulk.js';

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
      const outputRows = await processRows(rows);
      await writeCsv(opts.output, outputRows);
      console.log(JSON.stringify({ processed: rows.length, written: opts.output }, null, 2));
    } catch (error) {
      console.error(error.message);
      process.exit(1);
    }
  });

program.parse();
