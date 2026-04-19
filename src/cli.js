#!/usr/bin/env node
import { Command } from 'commander';
import { findEmail } from './finder.js';

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

program.parse();
