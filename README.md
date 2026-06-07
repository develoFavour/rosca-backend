# AjoSave API

AjoSave is a production-grade backend API for digital ROSCA savings groups. A ROSCA lets trusted members contribute a fixed amount on a schedule and take turns receiving the pooled money.

The backend manages the trust-critical parts of that workflow: users, authentication, groups, cycles, contributions, Paystack payment confirmation, payouts, notifications, auditability, and real-time group updates.

## Why This Project Exists

Traditional ROSCA groups are often coordinated through chat, notebooks, spreadsheets, and manual transfers. That creates gaps:

- Members cannot always see who has paid.
- Admins manually track contributions and payout turns.
- Payout disputes are hard to audit.
- Frontend/mobile apps have no reliable source of truth.

AjoSave turns the process into a clear backend workflow with strict state rules, secure authentication, payment verification, and documented APIs.

## Stack

- Node.js, Express, TypeScript
- MongoDB with Mongoose
- Brevo for OTP email delivery
- Paystack for real contribution payments and webhooks
- Socket.io for realtime group events
- Swagger/OpenAPI and Postman documentation
- TypeScript typecheck/build gates, with Postman/manual API testing against the configured MongoDB environment

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Use MongoDB Compass to inspect the database configured by `MONGODB_URI`. Compass is the GUI client; the API still needs a real MongoDB URI, typically from MongoDB Atlas.

## Important URLs

- Health: `GET /api/v1/health`
- Swagger: `/api-docs`
- OpenAPI JSON: `/openapi.json`
- Paystack webhook: `POST /webhooks/paystack`

## Phase 1 Auth Flow

1. `POST /api/v1/auth/register`
2. `POST /api/v1/auth/verify-otp`
3. `POST /api/v1/auth/login`
4. `POST /api/v1/auth/refresh`
5. `POST /api/v1/auth/logout`
6. `POST /api/v1/auth/forgot-password`
7. `POST /api/v1/auth/reset-password`

For Phase 1 closure, set `OTP_DEV_MODE=false` and configure Brevo so OTPs are delivered to real inboxes.

```env
OTP_DEV_MODE=false
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=your-verified-brevo-sender@example.com
BREVO_SENDER_NAME=AjoSave
```

For quick local-only testing, `OTP_DEV_MODE=true` returns `devOtp` in API responses and avoids sending real email. Do not use dev mode for the final Phase 1 demo.

## Quality Gates

```bash
npm run typecheck
npm run build
npm test
```

`npm test` currently runs the TypeScript typecheck. Jest and `mongodb-memory-server` are intentionally not installed; Phase 1 API behavior is tested manually through Postman/Swagger against the configured cloud MongoDB.

## Auth Security

Sensitive auth routes use layered rate limiting:

- broad IP-based limiter across `/api/v1/auth`
- route-specific `IP + email` limiters for login, OTP verification, OTP resend, forgot password, and reset password

This protects both against noisy clients from one IP and targeted brute-force attempts against a specific account.

## Documentation

- Engineering standards: `GUIDELINES.md`
- Technical decisions: `TECHNICAL_DECISIONS.md`
- Phase tracker: `PHASE_CHECKLIST.md`
- Frontend auth notes: `docs/FRONTEND_AUTH_INTEGRATION.md`
- Frontend group notes: `docs/FRONTEND_GROUP_INTEGRATION.md`
- Frontend contribution notes: `docs/FRONTEND_CONTRIBUTION_INTEGRATION.md`
- Postman auth collection: `postman/ajosave-auth.postman_collection.json`
