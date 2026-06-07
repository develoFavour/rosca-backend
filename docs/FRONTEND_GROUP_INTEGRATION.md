# Frontend Group Integration Notes

Base URL: `/api/v1`

All group endpoints require:

```txt
Authorization: Bearer <accessToken>
```

The user must also be verified. Unverified users receive `403`.

## Product Flow

After auth, the user lands on a product onboarding screen with two choices:

1. Create a group.
2. Join a group using an invite code.

Group creation and joining are not part of authentication. They are authenticated product actions.

## Create Group

Call:

```txt
POST /groups
```

Example:

```json
{
  "name": "Lekki Ajo Circle",
  "description": "Monthly savings group for trusted friends",
  "contributionAmount": 10000,
  "frequency": "monthly",
  "maxMembers": 3,
  "rotationOrder": "sequential"
}
```

The creator becomes:

- group admin
- member slot `1`

The response includes `inviteCode`. Show this code so the admin can invite other verified users.

## Join Group

Call:

```txt
POST /groups/join
```

Example:

```json
{
  "inviteCode": "ABC123"
}
```

Rules:

- The group must be pending.
- The user cannot already be a member.
- The group cannot exceed `maxMembers`.

## Start Group

Call:

```txt
POST /groups/:groupId/start
```

Rules:

- Only the admin can start.
- Group must be pending.
- Group must be full.
- At least two members are required.

Phase 2 starts the group and locks membership. Phase 3 creates the first cycle.

## Dashboard Calls

Use these to render the group dashboard:

```txt
GET /groups
GET /groups/:groupId
GET /groups/:groupId/members
GET /groups/:groupId/activity?page=1&limit=20
```

## Important Errors

- `401`: missing or invalid access token.
- `403`: user is not verified, not a member, or not the group admin.
- `404`: group or invite code not found.
- `409`: duplicate join or group is full.
