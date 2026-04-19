# email-finder-mvp

A lightweight AnyMail-Finder-style MVP.

## What it does
- Resolves likely company domains from a company name or explicit domain
- Generates common email patterns for a person
- Checks MX records
- Searches the public web for evidence of the person, domain, and email format
- Returns a scored best guess plus alternatives

## Why this exists
This is an 80/20 tool. It does **confidence scoring**, not perfect mailbox verification.

## Install
```bash
npm install
```

## Usage
```bash
node src/cli.js find --name "John Smith" --company "OpenAI"
node src/cli.js find --name "John Smith" --domain "openai.com"
```

Optional Brave API key for better search results:
```bash
export BRAVE_API_KEY=...
```

## Output
The CLI prints JSON like:

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
