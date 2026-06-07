# Frontend Contribution Integration Notes

Base URL: `/api/v1`

All contribution endpoints require:

```txt
Authorization: Bearer <accessToken>
```

## Lifecycle

When the admin starts a full pending group:

```txt
POST /groups/:groupId/start
```

the backend now creates cycle `1` automatically.

Cycle `1` recipient is the member in slot `1`. Sequential rotation uses slot order. Random rotation shuffles slot order at group start.

## Contribution Payment Flow

1. Member opens the group dashboard.
2. Frontend calls:

```txt
GET /contributions/status/:groupId
```

3. If current user has not paid, call:

```txt
POST /contributions/initialize-payment
```

Body:

```json
{
  "groupId": "<groupId>"
}
```

4. Backend creates a Paystack transaction and returns:

```txt
payment.authorizationUrl
payment.reference
cycle
```

5. Frontend redirects the user to `authorizationUrl`.
6. Paystack sends `charge.success` webhook.
7. Backend verifies Paystack reference and records the contribution.
8. Frontend can call:

```txt
POST /contributions/verify-payment
```

as a fallback after redirect/callback.

## Important Rules

- Group must be active.
- Current cycle must be open.
- User must be a group member.
- User can contribute only once per cycle.
- Payment amount must match the group contribution amount.
- Successful Paystack reference can fulfill only one contribution.
- Cycle closes automatically when all members have confirmed/late contributions.

## Dashboard Calls

```txt
GET /contributions/status/:groupId
GET /contributions/group/:groupId?page=1&limit=20
GET /contributions/my/:groupId
GET /contributions/cycle/:cycleId
```

## Errors To Handle

- `400`: group/cycle is not open, payment failed, or amount mismatch.
- `403`: user is not a group member.
- `404`: group, cycle, or payment reference not found.
- `409`: user already contributed for this cycle.
