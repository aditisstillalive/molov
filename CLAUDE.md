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

**Stack**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Tesseract.js v5, Nodemailer (Gmail SMTP)

**Page flow** (3 steps, state via sessionStorage `molov_state` key):

| Step | Route | Purpose |
|------|-------|---------|
| 1 | `/` | Upload image, client-side OCR via Tesseract.js |
| 2 | `/review` | Edit/delete extracted items, add items manually |
| 3 | `/summary` | Review totals, submit → sends email via `/api/send-email` |

**OCR** (`src/lib/ocr.ts`): Client-side Tesseract.js v5. Finds `Rp` in each line, splits to extract name + amount. Has `fixOcrAmount()` for common OCR errors (%→9, o→0, l→1). Multi-line fallback: standalone name lines pair with next Rp line.

**Amount parsing** (`parseAmount`): Handles Indonesian thousands format (dots: 1.286.056) and European decimal (commas: 1.000,00). Treats 3-digit tail after dot as thousands separator.

**Email** (`src/app/api/send-email/route.ts`): POST endpoint using nodemailer with Gmail SMTP. Reads recipients from `TO_EMAIL`/`CC_EMAIL` env vars, falling back to `recipient.txt`/`cc.txt`.

**Session storage** (`src/lib/store.ts`): `saveState()`, `loadState()`, `clearState()`. Also stores `rawText` for debug.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SMTP_USER` | Yes | Gmail address (e.g., aditisstillalive@gmail.com) |
| `SMTP_PASS` | Yes | Gmail App Password (16 chars, no spaces) |
| `SMTP_HOST` | No | SMTP server (default: smtp.gmail.com) |
| `SMTP_PORT` | No | SMTP port (default: 587) |
| `TO_EMAIL` | No | Primary recipient (falls back to `recipient.txt`) |
| `CC_EMAIL` | No | CC recipient (falls back to `cc.txt`) |

Copy `.env.local.example` to `.env.local` and fill in values.

## Vercel Deployment

- Set `SMTP_USER` and `SMTP_PASS` in Vercel environment variables
- Gmail requires App Password (not regular password): enable 2FA → https://myaccount.google.com/apppasswords
- `recipient.txt` and `cc.txt` are read from deployed filesystem
