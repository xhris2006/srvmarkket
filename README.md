# 🚀 ServMarket — Global Service Marketplace Platform

A production-ready service marketplace platform built with Next.js 14, featuring real-time chat, voice/video calls, global payments, and a full admin panel.

## ✨ Features

- **Auth System** — JWT access + refresh tokens, bcrypt hashing, role-based access (client / provider / admin)
- **Provider Marketplace** — Geo-based search, filtering by category, rating, distance & availability
- **Real-time Chat** — Socket.io messaging, voice messages (audio recording), typing indicators
- **Voice & Video Calls** — WebRTC peer-to-peer with Socket.io signaling (+ Agora SDK optional)
- **Booking System** — Request → Accept/Reject → In Progress → Complete flow
- **Payment System** — Stripe Connect (split payments), Apple Pay, Google Pay, SEPA; PayPal secondary
- **Admin Panel** — User management (ban/verify), transaction refunds, analytics dashboard
- **Notifications** — Real-time in-app notifications
- **Reviews** — Star ratings with automatic provider score recalculation

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, TailwindCSS |
| State | Zustand with persistence |
| Backend | Next.js API Routes (serverless) |
| Real-time | Socket.io (standalone server) |
| ORM | Prisma |
| Database | PostgreSQL |
| Payments | Stripe Connect + PayPal |
| Calls | WebRTC (built-in) + Agora SDK (optional) |
| Auth | JWT (jose), bcryptjs |
| Deployment | Vercel (app) + Railway/Render (socket + DB) |

---

## 📋 Prerequisites

- Node.js 20+
- PostgreSQL 14+ (or Docker)
- Stripe account
- Agora account (optional, for calls)

---

## ⚡ Quick Start

### 1. Clone and install

```bash
git clone <your-repo-url> servmarket
cd servmarket
npm install
```

### 2. Environment setup

```bash
cp .env.example .env
```

Edit `.env` with your actual values (see **Environment Variables** section below).

### 3. Database setup

```bash
# Push schema to your PostgreSQL database
npx prisma db push

# Generate Prisma client
npx prisma generate

# Seed with demo data
npx tsx prisma/seed.ts
```

### 4. Run locally

**Terminal 1 — Next.js app:**
```bash
npm run dev
```

**Terminal 2 — Socket.io server:**
```bash
npx tsx server/socket.ts
```

App: http://localhost:3000
Socket: http://localhost:3001

---

## 🐳 Docker Setup

```bash
# Copy and fill env
cp .env.example .env

# Start all services
docker-compose up -d

# Run migrations
docker exec servmarket-app npx prisma db push
docker exec servmarket-app npx tsx prisma/seed.ts
```

---

## 🔐 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/servmarket"

# Auth — generate strong random strings (min 32 chars)
JWT_ACCESS_SECRET="your-secret-min-32-chars"
JWT_REFRESH_SECRET="your-refresh-secret-min-32-chars"

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Agora (optional - for calls)
AGORA_APP_ID="your-agora-app-id"
AGORA_APP_CERTIFICATE="your-agora-certificate"
NEXT_PUBLIC_AGORA_APP_ID="your-agora-app-id"

# App URLs
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_SOCKET_URL="http://localhost:3001"
```

---

## 💳 Stripe Setup Guide

1. Create a [Stripe account](https://stripe.com) and get your API keys
2. Enable **Stripe Connect** in your dashboard
3. For webhooks (local testing):
   ```bash
   stripe listen --forward-to localhost:3000/api/payments/webhook
   ```
4. Copy the webhook signing secret to `STRIPE_WEBHOOK_SECRET`
5. In production, add your domain to Stripe webhook endpoints:
   - Endpoint: `https://yourdomain.com/api/payments/webhook`
   - Events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`

---

## 📁 Project Structure

```
/app
  /api                    — API routes (Next.js serverless)
    /auth                 — Login, register, refresh, logout
    /providers            — Search, get provider profile
    /bookings             — Create, list, update bookings
    /messages             — Conversations, real-time messages
    /payments             — Stripe intents, webhooks, PayPal
    /reviews              — Post reviews
    /calls                — Agora token generation
    /admin                — Users, transactions, analytics
    /upload               — Audio file uploads
    /services             — Service details
  /auth                   — Login & register pages
  /search                 — Provider search & discovery
  /profile/[id]           — Provider profile page
  /chat/[id]              — Real-time chat page
  /chat/[id]/call         — Voice/video call page
  /booking                — Create booking
  /payment                — Stripe checkout
  /admin/login            — Admin authentication
  /admin/dashboard        — Admin panel

/server
  socket.ts               — Socket.io standalone server

/lib
  auth.ts                 — JWT utilities
  prisma.ts               — Prisma client singleton
  middleware.ts           — API auth middleware
  store.ts                — Zustand global state

/services
  payment.ts              — Stripe + PayPal abstractions

/types
  index.ts                — TypeScript type definitions

/prisma
  schema.prisma           — Database schema
  seed.ts                 — Demo data seed script
```

---

## 🌍 Deployment on Vercel

### 1. Deploy Next.js app to Vercel

```bash
npm install -g vercel
vercel deploy
```

Add all environment variables in Vercel dashboard → Settings → Environment Variables.

### 2. Deploy Socket.io server

The Socket.io server cannot run on Vercel (serverless). Deploy it separately:

**Options:**
- [Railway](https://railway.app) — `railway up` (recommended)
- [Render](https://render.com) — Deploy as a web service
- [Fly.io](https://fly.io)

Update `NEXT_PUBLIC_SOCKET_URL` in Vercel to point to your deployed socket server.

### 3. Deploy PostgreSQL

- [Neon](https://neon.tech) — Serverless PostgreSQL (recommended for Vercel)
- [PlanetScale](https://planetscale.com)
- [Railway](https://railway.app)
- [Supabase](https://supabase.com)

---

## 🧪 Demo Credentials

After running the seed script:

| Role | Email | Password |
|---|---|---|
| Admin | admin@servmarket.com | Admin1234! |
| Client | client@example.com | Client123! |
| Provider | cleaner@example.com | Provider123! |

---

## 🏗️ Architecture

```
Browser / Mobile App
       │
       ├── HTTP/REST ──→ Next.js API Routes (Vercel Serverless)
       │                        │
       │                        ├── Prisma ORM ──→ PostgreSQL
       │                        ├── Stripe SDK
       │                        └── PayPal REST API
       │
       └── WebSocket ──→ Socket.io Server (standalone Node.js)
                                │
                                ├── Real-time messaging
                                ├── Call signaling (WebRTC)
                                └── Online presence

WebRTC (peer-to-peer)
       ├── Signaling via Socket.io
       └── Media via STUN/TURN servers
```

---

## 🔒 Security Features

- JWT tokens with short-lived access (15min) + long-lived refresh (7d)
- bcrypt password hashing (cost factor 12)
- Stripe webhook signature verification
- Role-based API protection
- Admin-only route guards
- Input validation with Zod on all endpoints
- Refresh tokens hashed before storage
- CORS configuration on Socket.io
- httpOnly cookies for refresh tokens

---

## 📝 License

MIT — build freely!
