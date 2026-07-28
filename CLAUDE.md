# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Payment history OCR webapp. Upload image → extract tenant names + amounts → review/edit → email summary.

## Commands

```bash
npm run dev      # Start dev server (http://localhost:3000)
npm run build    # Production build
npm run lint     # ESLint
```

## Architecture

**Stack**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Tesseract.js v5, Resend

**Page flow** (3 steps, state via sessionStorage `molov_state` key):

| Step | Route | Purpose |
|------|-------|---------|
| 1 | `/` | Upload image, client-side OCR via Tesseract.js |
| 2 | `/review` | Edit/delete extracted items, add items manually |
| 3 | `/summary` | Review totals, submit → sends email via `/api/send-email` |

**OCR** (`src/lib/ocr.ts`): Client-side. Uses Tesseract.js v5 `createWorker("eng", 1, { logger })`. Parser tries multiple regex strategies: colon/dash-separated, whitespace-separated, amount-first, amount-last. Falls back to any line containing a number.

**Amount parsing** (`parseAmount`): Handles Indonesian format (`1.000,00`) and US format (`1,000.00`).

**Email** (`src/app/api/send-email/route.ts`): POST endpoint. Uses Resend SDK. Reads recipients from `TO_EMAIL`/`CC_EMAIL` env vars, falling back to `recipient.txt`/`cc.txt` files.

**Session storage** (`src/lib/store.ts`): `saveState()`, `loadState()`, `clearState()` wrapping `sessionStorage`.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `RESEND_API_KEY` | Yes | Resend API key for email sending |
| `TO_EMAIL` | No | Primary recipient (falls back to `recipient.txt`) |
| `CC_EMAIL` | No | CC recipient (falls back to `cc.txt`) |
| `FROM_EMAIL` | No | Sender address (defaults to `onboarding@resend.dev`) |

Copy `.env.local.example` to `.env.local` and fill in values.

## Vercel Deployment

- Set `RESEND_API_KEY` in Vercel environment variables
- `recipient.txt` and `cc.txt` are read from deployed filesystem (works on Vercel serverless)
- For custom sender domain: verify domain in Resend and set `FROM_EMAIL`
- Resend free tier: `onboarding@resend.dev` only sends to the Resend account owner's email
