# Frontend Payout Integration Notes

Base URL: `/api/v1`

All withdrawal account and payout endpoints require:

```txt
Authorization: Bearer <accessToken>
```

## Withdrawal Account UX

Users should not type Nigerian bank codes manually.

Recommended UI flow:

1. Call `GET /withdrawal-accounts/banks`.
2. Show a searchable bank dropdown using each bank's `name`.
3. Store the selected bank's hidden `code`.
4. User enters a 10-digit account number.
5. Call `POST /withdrawal-accounts/resolve`.
6. Show resolved `accountName` for confirmation.
7. Call `POST /withdrawal-accounts` to save the default payout destination.

The API only returns safe account display data such as `accountNumberLast4`, not the full account number.

## Payout Flow

Payout is manual by design.

1. Current cycle closes after all members contribute.
2. Assigned cycle recipient calls:

```txt
POST /payouts/request
```

3. Group admin reviews the payout.
4. Admin calls:

```txt
PATCH /payouts/:payoutId/approve
```

5. Backend initiates a Paystack transfer to the recipient's default withdrawal account.
6. If Paystack returns success, backend marks payout `disbursed`, marks cycle `paid_out`, and opens the next cycle.
7. If all members have received payout, backend marks the group `completed`.

Admin can reject with:

```txt
PATCH /payouts/:payoutId/reject
```

## Important Rules

- Only the assigned cycle recipient can request payout.
- Cycle must be `closed` before payout can be requested.
- Only one payout request is allowed per cycle.
- Only group admin can approve or reject payout.
- Recipient must have a default withdrawal account before requesting payout.
- Manual approval is intentional for fraud/dispute/compliance review.

## Dashboard Calls

```txt
GET /withdrawal-accounts/me
GET /payouts/group/:groupId?page=1&limit=20
GET /payouts/:payoutId
```

## Paystack Test Mode

With Paystack test keys, transfer recipients and transfers can be created without moving real money. This lets the frontend demonstrate the complete payout workflow safely.
