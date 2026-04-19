# email-finder-mvp

A lightweight AnyMail-Finder-style MVP.

## What it does
- Resolves likely company domains from a company name or explicit domain
- Generates common email patterns for a person
- Checks MX records
- Searches the public web for evidence of the person, domain, and email format
- Returns a scored best guess plus alternatives
- Supports bulk CSV processing
- Includes a simple web UI

## Why this exists
This is an 80/20 tool. It does **confidence scoring**, not perfect mailbox verification.

## Install
```bash
npm install
```

## Current input format
### Single lookup
```bash
node src/cli.js find --name "John Smith" --company "OpenAI"
node src/cli.js find --name "John Smith" --domain "openai.com"
```

Current single-record inputs:
- `--name`: full name
- `--company`: company name
- `--domain`: company domain

You must pass `--company` or `--domain`.

### Bulk CSV
```bash
node src/cli.js bulk --input leads.csv --output results.csv
```

Input CSV columns:
- `first` (required)
- `middle` (optional)
- `last` (required)
- `company` (optional if `domain` is present)
- `domain` (optional if `company` is present)

Example input CSV:
```csv
first,middle,last,company,domain
John,,Smith,OpenAI,
Sam,,Altman,,openai.com
Ada,Lovelace,Byron,Analytical Engines,
```

Output CSV adds:
- `full_name`
- `resolved_domain`
- `top_email`
- `confidence`
- `pattern`
- `mx`
- `alternative_1`
- `alternative_2`
- `alternative_3`
- `status`
- `error`

## Web UI
Run:
```bash
npm run web
```

Then open:
```text
http://localhost:3000
```

The UI supports:
- single lookups from a simple form
- bulk CSV upload
- preview table for results
- CSV download for processed bulk output

Optional Brave API key for better search results:
```bash
export BRAVE_API_KEY=...
```

## Output
The single-record CLI prints JSON like:

```json
{
  "input": {
    "name": "John Smith",
    "company": "Acme AI",
    "domain": "acme.com"
  },
  "topEmail": "john.smith@acme.com",
  "confidence": 0.78,
  "mx": true,
  "pattern": "first.last",
  "evidence": [
    "Found company domain via website search",
    "MX records present",
    "Found public web mention matching company + person"
  ],
  "alternatives": [
    "jsmith@acme.com",
    "john@acme.com"
  ]
}
```

## Notes
- No SMTP probing by default
- No proxies required for low volume
- Public-web evidence is optional but improves ranking a lot
