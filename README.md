# 🏋️ MyCoach

A coaching platform that connects personal trainers with their clients — booking, scheduling, progress tracking, and billing, all in one place. Three portals (Admin, Coach, Client) share one codebase, one Supabase backend, and one fully automated Stripe billing system.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20DB-3FCF8E?logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind%20CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF?logo=stripe&logoColor=white)

## About This Project

MyCoach is a full-stack coaching platform built around three roles:

- **Admin** — approves coach applications, oversees every coach/client account, and gets a read-only financial view of billing (Stripe runs the actual payments — nothing here for an admin to manually review or approve).
- **Coach** — manages their own availability, client roster, incoming session requests, and subscription. A coach needs an active subscription to keep taking bookings; a 5-day grace period softens what happens right after a payment lapses.
- **Client** — links to a coach via a 4-digit Coach ID, books sessions against the coach's open hours, and tracks their own progress and token balance.

Billing is 100% Stripe-automated: a coach pays a flat monthly fee through a Stripe-hosted Checkout page, a webhook credits their account for 30 days, and the whole grace-period/lockout state machine is computed from that one date — no manual invoice review anywhere in the app.

## ✨ Core Features

- **🔐 Role-based authentication** — one login, routed to the right portal (Admin/Coach/Client) based on the account's role, enforced both client-side (route guards) and server-side (Postgres Row Level Security).
- **💳 Automated billing** — Stripe Checkout for payment, a webhook for fulfillment, and a 5-day grace period before a lapsed coach is actually locked out.
- **📅 Booking system** — coaches publish open time slots; clients book directly, with a same-day-booking restriction and live conflict checking.
- **👥 Client & coach management** — approve/reject coach applications, link clients to coaches via a short numeric code, suspend accounts for policy violations independently of billing status.
- **📊 Dashboards per role** — today's sessions, pending requests, earnings/token tracking, and progress history, each tailored to what that role actually needs to see.
- **🌗 Theme-aware UI** — client and admin surfaces follow a light/dark toggle; the coach and admin portals use a deliberately fixed-dark brand treatment.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite 7 |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI primitives) |
| Routing | React Router 7 |
| Backend | Supabase — Postgres, Auth, Storage, Edge Functions (Deno) |
| Payments | Stripe (Checkout Sessions + Webhooks) |
| Local dev | Supabase CLI (Docker-based local stack), Mailpit (catches local auth emails) |
| Hosting | Vercel |

For a deep breakdown of every technology here — official docs, what each one actually does, and a from-scratch setup guide for Stripe, Docker, local Supabase, and Mailpit — see the **[Developer Playbook](https://claude.ai/code/artifact/770bff33-058d-4845-b019-a6d094987c11)**.

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (runs the local Supabase stack)
- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) (`brew install supabase/tap/supabase` on macOS)
- A [Stripe](https://dashboard.stripe.com/register) account in test mode (only needed if you're working on billing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Iwadss/my-coach.git
   cd my-coach
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the local Supabase stack**
   ```bash
   supabase start
   ```
   This prints an `API_URL` and `ANON_KEY` — you'll need both in the next step. (First run pulls several Docker images and can take a few minutes.)

4. **Set up environment variables**

   Root `.env` (Vite reads this — values from the `supabase start` output above):
   ```env
   VITE_SUPABASE_URL=http://127.0.0.1:54421
   VITE_SUPABASE_ANON_KEY=<the ANON_KEY supabase start printed>
   ```

   `supabase/functions/.env` (only needed to test billing — copy from `supabase/functions/.env.example`):
   ```env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   SITE_URL=http://localhost:5173
   ```
   Editing this file requires `supabase stop && supabase start` to take effect — the Edge Functions runtime only reads it at container startup.

   Roles (admin/coach/client) live in the database, not an env var — see `supabase/migrations/` for how a coach or admin actually gets promoted.

5. **Start the dev server**
   ```bash
   npm run dev
   ```

6. Open [http://localhost:5173](http://localhost:5173) for the app, and [http://127.0.0.1:54423](http://127.0.0.1:54423) for Supabase Studio (the local database/auth dashboard).

## 📁 Project Structure

Organized by role — each portal owns its own pages and components; only genuinely cross-role code lives in `shared/`.

```
my-coach/
├── src/
│   ├── app/          # App.tsx, theme provider, 404 page — the app shell everything sits on
│   ├── marketing/     # Public landing page and its sections
│   ├── auth/          # Login, sign-up, password reset, route guards
│   ├── admin/         # Admin portal — pages + layout
│   ├── coach/         # Coach portal — pages, shell, billing guard
│   ├── client/        # Client portal — pages, shell
│   ├── shared/         # Cross-role components & lib (billing, brand, formatting, DetailRow, etc.)
│   ├── components/ui/  # shadcn/ui primitives — untouched, matches what `shadcn add` generates
│   ├── hooks/, lib/     # Generic, role-agnostic leftovers (use-mobile, shadcn's cn() helper)
│   └── supabase/        # The one Supabase client instance
├── supabase/
│   ├── migrations/       # Every schema change, in order
│   └── functions/         # Edge Functions: create-checkout-session, stripe-webhook, create-portal-session
└── public/                 # Static assets
```

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check, then build for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview the production build locally |
| `supabase start` / `stop` | Start/stop the local backend stack |
| `supabase status` | Show local URLs, keys, and service status |

## 📄 License

This project is private and proprietary.

---

Built with ❤️ by **Iwad**
