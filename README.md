# KnitFlow - Your Knitting Companion

KnitFlow is a utility-first knitting companion that lets users upload their own patterns (PDF/link) and turn them into an interactive workflow with row counters, anchored notes/photos, and step-based Q&A.

## Features

- **PDF Pattern Viewer**: Upload and view PDF patterns with zoom, navigation, and bookmarking
- **Smart Notes**: Create highlights and sticky notes anchored to specific parts of patterns
- **Row Counters**: Track progress with main and section counters with targets
- **Q&A Community**: Ask and answer questions about patterns (private or shared)
- **Photo Checkpoints**: Attach photos to notes to document your progress
- **Pro Subscription**: Unlimited projects, notes, and questions via Stripe
- **Official Support Packs**: One-time purchase packs with FAQs, errata, and videos

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth (Magic Link + Google OAuth)
- **Storage**: Supabase Storage
- **Payments**: Stripe (Subscriptions + One-time)
- **PDF**: pdf.js

## Setup

### 1. Clone and Install

```bash
npm install
```

### 2. Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL schema in `sql/schema.sql`
3. Run the RLS policies in `sql/rls_policies.sql`
4. Run the storage policies in `sql/storage_policies.sql`
5. Create storage buckets: `patterns` (private), `note-photos` (private)
6. Enable Google OAuth provider (optional)

### 3. Environment Variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

Required:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Optional (app works without these):
- `SUPABASE_SERVICE_ROLE_KEY` - Required for webhooks and admin
- `STRIPE_SECRET_KEY` - Required for payments
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` - Required for payments
- `STRIPE_WEBHOOK_SECRET` - Required for webhook verification
- `STRIPE_PRO_PRICE_ID` - Your Stripe price ID for Pro subscription
- `ADMIN_EMAIL_ALLOWLIST` - Comma-separated admin emails

### 4. Stripe Setup (Optional)

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Create a Product for Pro subscription with a recurring Price
3. Create a webhook endpoint pointing to `/api/stripe/webhook`
4. Add webhook secret to environment variables

### 5. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Deployment

### Deploy to Vercel

```bash
git init
gh repo create knit-community-hub --public --source=. --remote=origin
git add . && git commit -m "Initial build" && git push -u origin main
npx vercel --yes
npx vercel --prod
vercel git connect
```

After deployment:
1. Add environment variables in Vercel dashboard
2. Update Stripe webhook URL to production URL
3. Update Supabase redirect URLs

## Project Structure

```
app/
├── layout.tsx          # Root layout
├── page.tsx            # Landing page
├── login/              # Auth page
├── auth/callback/      # OAuth callback
├── app/                # Authenticated app
│   ├── layout.tsx      # App shell
│   ├── page.tsx        # Dashboard
│   ├── projects/       # Project pages
│   └── billing/        # Billing page
├── admin/              # Admin pages
└── api/                # API routes
    ├── projects/       # Project CRUD
    ├── notes/          # Notes CRUD
    ├── counters/       # Counters CRUD
    ├── qna/            # Q&A endpoints
    ├── stripe/         # Stripe endpoints
    └── admin/          # Admin endpoints

components/
├── ui/                 # Base UI components
├── pdf/                # PDF viewer
├── counter/            # Counter widgets
├── notes/              # Note components
├── qna/                # Q&A components
└── auth/               # Auth components

lib/
├── supabase/           # Supabase clients
├── stripe.ts           # Stripe helpers
├── limits.ts           # Usage limits
├── validators.ts       # Zod schemas
└── utils.ts            # Utilities

sql/
├── schema.sql          # Database schema
├── rls_policies.sql    # Row level security
└── storage_policies.sql # Storage policies
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | No | For webhooks/admin |
| `STRIPE_SECRET_KEY` | No | Stripe secret key |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | No | Stripe public key |
| `STRIPE_WEBHOOK_SECRET` | No | Webhook verification |
| `STRIPE_PRO_PRICE_ID` | No | Pro subscription price |
| `ADMIN_EMAIL_ALLOWLIST` | No | Admin emails (comma-separated) |

## Graceful Fallbacks

- **No Stripe**: App works in free mode, upgrade buttons hidden
- **No Service Role**: Basic features work, webhooks disabled
- **No Admin Config**: Admin pages show "not configured" message

## License

MIT

---

Live at: https://knit-community-hub.vercel.app
