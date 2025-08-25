# Futbolero Backend (Express + Stripe)

## Setup
1. Copy `.env.example` to `.env` and set your keys:
```
PORT=3000
NODE_ENV=production
STRIPE_SECRET_KEY=sk_live_...
RETURN_BASE=https://futbolero.netlify.app
```
2. Install deps and run:
- Windows PowerShell: if `npm` is blocked, use `npm.cmd install`
- Dev: `npm run dev`
- Build: `npm run build` then `npm start`

API:
- POST `/api/payments/create-session-from-total` with `{ total: number }`
- GET `/api/health`

Webhook placeholder at `/api/payments/webhook`.

## Deploy to Render

This folder contains a `render.yaml` blueprint.

Option A — Blueprint deploy
- In Render, create a new Blueprint and connect this GitHub repo.
- Render will read `render.yaml` and provision a Web Service.
- Build: `npm ci && npm run build`
- Start: `npm start`
- Health check: `/api/health`

Option B — Manual Web Service
- New > Web Service > from repo
- Root directory: `maillots-store/server`
- Runtime: Node
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Add env vars:
	- `NODE_ENV=production`
	- `STRIPE_SECRET_KEY=sk_live_...`
	- `RETURN_BASE=https://<your-frontend-domain>`
	- (Optional) `STRIPE_WEBHOOK_SECRET`, `SMTP_*`

After deploy, update the frontend `client/src/scripts/api-config.js` production baseURL to the Render URL + `/api` (e.g., `https://fvs-backend.onrender.com/api`).

## Webhook Stripe – Mise en route

This project exposes a secure webhook endpoint at `/api/payments/webhook`.

Quick start (local):

1. Copy `.env.example` → `.env` and set `STRIPE_SECRET_KEY`.
2. Start the API in dev mode:

```
npm install
npm run dev
```

3. In another terminal, login to Stripe CLI and forward events:

```
stripe login
npm run stripe:listen
```

4. Trigger a test payment event:

```
npm run stripe:trigger:paid
```

Expected result: the server logs the event and triggers an email to the address in `ORDER_NOTIFY_TO` (or logs a warning if SMTP is not configured).

Notes for production:
- Ensure `STRIPE_WEBHOOK_SECRET` is copied from your Stripe dashboard or from the Stripe CLI when you run `stripe listen`.
- Do NOT enable a global JSON parser on the webhook route; the code mounts the webhook with `express.raw({ type: 'application/json' })` before `express.json()`.

## Migration note — removed insecure fallback

The previous implementation attempted to parse the raw webhook body as JSON when `STRIPE_WEBHOOK_SECRET` was not set. This allowed unsigned payloads and made it possible to bypass Stripe signature verification. That fallback has been removed and replaced with a strict `constructEvent` verification. If you require local testing without a webhook secret, use the Stripe CLI which provides the proper signed events.
