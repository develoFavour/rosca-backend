# Frontend Auth Integration Notes

Base URL: `/api/v1`

## Response Envelope

All auth endpoints return:

```json
{
  "success": true,
  "message": "Human-readable status",
  "data": {}
}
```

Validation failures return:

```json
{
  "success": false,
  "message": "Validation failed",
  "details": [
    {
      "path": "body.email",
      "message": "Invalid email"
    }
  ]
}
```

Rate-limited auth requests return `429`:

```json
{
  "success": false,
  "message": "Too many attempts. Please retry later."
}
```

The backend uses layered auth rate limits:

- broad IP-based auth limit across `/auth`
- route-specific `IP + email` limits for login, OTP verification, OTP resend, forgot password, and reset password

Frontend clients should show a cooldown message and avoid automatic retries when `429` is returned.

## Registration Flow

1. Call `POST /auth/register`.
2. Show OTP screen.
3. Call `POST /auth/verify-otp`.
4. Store `data.tokens.accessToken` in app memory or secure storage.
5. The API also sets a signed HttpOnly refresh-token cookie for browser clients.

For final Phase 1 testing, use `OTP_DEV_MODE=false` so the OTP is delivered through Brevo. `OTP_DEV_MODE=true` is only a local shortcut and returns `data.devOtp`.

## Login Flow

1. Call `POST /auth/login`.
2. Store `data.tokens.accessToken`.
3. Use `Authorization: Bearer <accessToken>` for protected requests.

Unverified users receive `401` with message: `Please verify your account before logging in.`

## Refresh Flow

Browser clients can call `POST /auth/refresh` with credentials enabled so the signed cookie is sent.

Mobile/Postman clients may send:

```json
{
  "refreshToken": "<refresh token>"
}
```

The backend rotates refresh tokens on every refresh. If an old refresh token is reused, all stored refresh tokens for that user are cleared.

## Current User Flow

Call `GET /auth/me` with:

```txt
Authorization: Bearer <accessToken>
```

Use this after app reload, after token refresh, or when the frontend needs to restore the current session user.

## Logout Flow

Call `POST /auth/logout` with:

- `Authorization: Bearer <accessToken>`
- optional `refreshToken` body for mobile/Postman clients

The backend removes the refresh token hash and clears the browser cookie.

## Password Reset Flow

1. Call `POST /auth/forgot-password`.
2. Show OTP + new password form.
3. Call `POST /auth/reset-password`.
4. Ask the user to log in again.

Password reset clears all refresh tokens for the user.

## Postman Token Automation

The Postman collection automatically saves `accessToken` and `refreshToken` after successful `Verify OTP`, `Login`, and `Refresh Token` requests. For real OTP testing, copy the OTP from the Brevo email into the `otpCode` collection variable before calling `Verify OTP` or `Reset Password`.
