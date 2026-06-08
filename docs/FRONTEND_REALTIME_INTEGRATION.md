# Frontend Real-Time Notification Integration Notes

## Socket Connection

Use the same JWT access token used for REST requests. The socket server rejects missing, invalid, or unverified-user tokens.

```ts
import { io } from 'socket.io-client';

const socket = io('http://localhost:5000', {
  auth: {
    token: accessToken
  },
  withCredentials: true
});
```

On connection, the backend looks up the authenticated user's active groups and joins rooms internally. The frontend does not need to send group IDs to subscribe.

## Persisted Notification Inbox

Use this inbox after app launch, reconnect, or tab focus to catch up on events missed while the user was offline.

```http
GET /api/v1/notifications?page=1&limit=20
GET /api/v1/notifications?page=1&limit=20&unreadOnly=true
PATCH /api/v1/notifications/:notificationId/read
```

Every notification response follows the standard API envelope:

```json
{
  "success": true,
  "message": "Notifications retrieved successfully.",
  "data": {
    "notifications": [
      {
        "id": "665f1f1f1f1f1f1f1f1f1f1f",
        "user": "665f1f1f1f1f1f1f1f1f1f1a",
        "group": "665f1f1f1f1f1f1f1f1f1f1b",
        "type": "contribution_new",
        "title": "Contribution received",
        "message": "A member contribution was confirmed.",
        "payload": {
          "groupId": "665f1f1f1f1f1f1f1f1f1f1b"
        },
        "readAt": null,
        "createdAt": "2026-06-08T08:00:00.000Z"
      }
    ]
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "totalPages": 1
  }
}
```

## Real-Time Events

All group lifecycle events are emitted only to authenticated members of the group room.

| Event | Trigger | Important payload fields |
| --- | --- | --- |
| `member:joined` | A verified user joins a pending group by invite code. | `groupId`, `userId`, `currentMemberCount` |
| `cycle:started` | Admin starts a full group or a payout advances to the next cycle. | `groupId`, `cycleId`, `cycleNumber`, `recipientId`, `dueDate` |
| `contribution:new` | Paystack payment is verified and contribution is recorded. | `groupId`, `cycleId`, `memberId`, `contributionId`, `amount`, `status` |
| `contribution:confirmed` | Admin manually confirms a pending contribution. | `groupId`, `cycleId`, `contributionId`, `memberId`, `confirmedBy` |
| `cycle:closed` | All required contributions for a cycle are confirmed. | `groupId`, `cycleId`, `cycleNumber`, `recipientId` |
| `payout:requested` | Assigned cycle recipient requests payout. | `groupId`, `cycleId`, `payoutId`, `recipientId`, `amount` |
| `payout:approved` | Admin approves payout and Paystack transfer is initiated. | `groupId`, `cycleId`, `payoutId`, `recipientId`, `amount`, `status`, `transferReference` |
| `payout:rejected` | Admin rejects a payout request with notes. | `groupId`, `cycleId`, `payoutId`, `recipientId`, `reason` |
| `notification:new` | Any persisted notification is created for the group. | `type`, `title`, `message`, `groupId`, `payload`, `timestamp`, `notificationCount` |

Example listener:

```ts
socket.on('notification:new', (event) => {
  // Show toast, increment unread badge, then optionally refetch /notifications.
  console.log(event.type, event.title, event.payload);
});
```

## Frontend State Guidance

Use Socket.io events for instant UI updates, then refetch the relevant REST resource when the event changes money or lifecycle state. For example:

- `contribution:new`: refetch `GET /api/v1/contributions/status/:groupId`.
- `cycle:closed`: refetch current group details and contribution status.
- `payout:approved`: refetch `GET /api/v1/payouts/group/:groupId`.
- `cycle:started`: refetch group details and reset contribution dashboard for the next cycle.

This keeps the UI fast while still treating the API as the source of truth.
