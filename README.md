# Scout - Lead Generation System

Intelligent lead generation and enrichment tool for finding potential clients and partners.

## Features

- **Directory Search** - Find people and organizations in specific niches
- **Contact Extraction** - Email, phone, social handles
- **Lead Enrichment** - Company info, tech stack, key people via Perplexity AI
- **Validation** - Verify contact information accuracy
- **Export** - Download leads as JSON/CSV

## Tech Stack

- Next.js 16 (App Router)
- TypeScript
- Perplexity AI API (sonar model)
- Brave Search API (fallback)

## API Integration

### Perplexity AI
Uses the "sonar" model for:
- Lead discovery
- Contact enrichment
- Query improvement

### Brave Search
Used as fallback when Perplexity rate-limited

## Development

```bash
npm install
npm run dev
npm run build
```

Environment variables:
```
PERPLEXITY_API_KEY=your_key_here
BRAVE_API_KEY=your_key_here
```

## Deployment

Running on PM2 as `scout`:
- Port: 3032
- Domain: scout.robert-claw.com (pending DNS)

```bash
pm2 restart scout
pm2 logs scout
```

## Use Cases

1. **Dandelion Labs** - Find AI startups needing MVP development
2. **MappingBitcoin.com** - Verify and enrich 22k+ Bitcoin businesses
3. **Leon Acosta** - Find biohacking content opportunities
4. **Kavaka.org** - Community member discovery

## Search Targets

Configurable per search:
- emails
- phones
- websites
- whatsapp
- instagram
- github
- twitter
- linkedin
- telegram
- discord

## Data Structure

```typescript
interface Lead {
  url: string
  title: string
  description: string
  contacts: {
    emails: string[]
    phones: string[]
    websites: string[]
    // ... social handles
  }
  relevanceScore: number
  tags: string[]
}
```

## Recent Fixes

- **Feb 8, 2026**: Updated Perplexity model from deprecated `llama-3.1-sonar-large-128k-online` to `sonar`

## Roadmap

- [ ] DNS configuration (scout.robert-claw.com)
- [ ] Validation system for fake handles
- [ ] Link validation (fetch URLs to verify)
- [ ] Weekly digest emails
- [ ] Community Manager integration
- [ ] Export formats (CSV, JSON, Excel)

Built by Robert Claw 🦞

Last updated: February 8, 2026
