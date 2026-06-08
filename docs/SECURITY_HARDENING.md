# Security Hardening Notes

This document summarizes the security posture for AjoSave as a fintech-style ROSCA backend.

## Authentication

- Access tokens are short-lived JWTs.
- Refresh tokens are rotated on every refresh.
- Refresh tokens are stored as SHA-256 hashes in MongoDB, never in plain text.
- Refresh token reuse clears the user's stored refresh tokens and forces login again.
- Refresh tokens are set in a signed, HttpOnly cookie for browser clients.
- Postman/mobile clients may send `refreshToken` in the request body for non-browser testing.

## OTP Protection

- OTP values are hashed before storage.
- OTPs expire based on `OTP_TTL_MINUTES`.
- OTPs are scoped to purpose: account verification or password reset.
- OTP resend has a user-level hourly limit.
- Login, OTP verification, resend, forgot-password, and reset-password routes also have route-specific `IP + email` rate limits.

## Request Validation

- Every state-changing route validates request body, route params, and query strings with Zod.
- Request schemas are strict, so unknown fields are rejected instead of silently accepted.
- MongoDB operator keys such as `$where` and dotted keys are stripped from request bodies and params before routing.
- Request body size is limited to `25kb`.
- Pagination limits are capped at `100`.

## Authorization

- Group, contribution, payout, withdrawal-account, and notification routes require authentication and verified accounts.
- Group data is only returned to members.
- Group mutation and payout approval/rejection are admin-only.
- Contribution and payout services repeat authorization checks at the service layer.
- Only the assigned cycle recipient can request payout.
- A cycle must be closed before payout request/approval can proceed.
- Users can only mark their own notifications as read.

## Payment & Webhook Security

- Paystack webhooks require `x-paystack-signature`.
- Signatures are verified with HMAC SHA-512 and timing-safe comparison.
- Optional Paystack webhook IP allowlisting can be enabled with `PAYSTACK_WEBHOOK_IP_WHITELIST_ENABLED=true`.
- Contribution fulfillment verifies Paystack transaction status and exact expected amount.
- Payment fulfillment is idempotent through stored Paystack references and contribution links.
- Payout approval is manual and admin-gated by design.

## Browser Cookie & CSRF Posture

The API uses bearer access tokens for protected resource requests and a signed HttpOnly refresh-token cookie for browser refresh flows.

Current browser CSRF mitigations:

- refresh cookie is `HttpOnly`
- refresh cookie is signed
- refresh cookie uses `SameSite=Strict`
- refresh cookie uses `secure: true` in production
- state-changing business endpoints require `Authorization: Bearer <accessToken>`

Because business mutations require bearer tokens rather than ambient cookies, CSRF risk is concentrated around refresh/logout. For a full production browser deployment, add a double-submit CSRF token or same-origin CSRF middleware around cookie-backed auth endpoints if `CLIENT_ORIGIN` expands beyond a tightly controlled frontend.

## Production Environment Checklist

- Set `NODE_ENV=production`.
- Use strong random values for `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `COOKIE_SECRET`.
- Set `OTP_DEV_MODE=false`.
- Use a MongoDB Atlas URI with least-privilege credentials.
- Configure a verified Brevo sender.
- Configure Paystack secrets from the deployment platform's secret store.
- Restrict `CLIENT_ORIGIN` to the deployed frontend origin.
- Enable HTTPS so secure cookies work.
- Consider enabling `PAYSTACK_WEBHOOK_IP_WHITELIST_ENABLED=true` after confirming proxy/IP behavior on the host.
- Keep `.env` out of git.

## Threat Model Summary

| Threat | Current mitigation |
| --- | --- |
| Brute-force login or OTP guessing | Layered IP and `IP + email` rate limits |
| Token theft | Short access-token lifetime, refresh rotation, reuse detection |
| Password/OTP disclosure from DB | bcrypt password hashes, hashed OTPs, sensitive fields `select: false` |
| NoSQL injection | Operator/dotted-key sanitization, strict Zod schemas |
| Unauthorized group access | Member checks on group-scoped reads and writes |
| Unauthorized payout | Assigned-recipient guard plus admin approval |
| Fake payment webhook | Paystack HMAC verification and transaction re-verification |
| Duplicate contribution or payout | Unique indexes and idempotent service checks |
| Offline missed events | Persisted notifications plus Socket.io events |
