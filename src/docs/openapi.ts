export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'AjoSave ROSCA Savings API',
    version: '1.0.0',
    description: 'Production-grade backend API for ROSCA savings groups with JWT auth, Paystack payments, Brevo OTP, Socket.io events, and lifecycle-safe payouts.'
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Versioned API'
    }
  ],
  tags: [
    { name: 'Health' },
    { name: 'Auth' },
    { name: 'Groups' },
    { name: 'Payments' },
    { name: 'Contributions' },
    { name: 'Payouts' },
    { name: 'Notifications' }
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health'],
        summary: 'Check API health',
        responses: {
          200: {
            description: 'API is healthy'
          }
        }
      }
    },
    '/auth/register': {
      post: {
        tags: ['Auth'],
        summary: 'Register a new user and send OTP through Brevo',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RegisterRequest' },
              example: {
                fullName: 'Ada Okafor',
                email: 'ada@example.com',
                phone: '+2348012345678',
                password: 'Password123'
              }
            }
          }
        },
        responses: {
          201: {
            description: 'Registration successful; OTP sent'
          },
          409: {
            description: 'Email or phone already exists'
          }
        }
      }
    },
    '/auth/verify-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Verify registration OTP and issue token pair',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyOtpRequest' },
              example: {
                email: 'ada@example.com',
                otpCode: '123456'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Account verified'
          },
          400: {
            description: 'Invalid or expired OTP'
          },
          429: {
            description: 'Too many OTP attempts for this IP/email'
          }
        }
      }
    },
    '/auth/login': {
      post: {
        tags: ['Auth'],
        summary: 'Log in a verified user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/LoginRequest' },
              example: {
                email: 'ada@example.com',
                password: 'Password123'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Login successful'
          },
          401: {
            description: 'Invalid credentials or unverified account'
          },
          429: {
            description: 'Too many login attempts for this IP/email'
          }
        }
      }
    },
    '/auth/refresh': {
      post: {
        tags: ['Auth'],
        summary: 'Rotate refresh token and issue a new access token',
        description: 'Refresh token can be supplied in the signed HttpOnly cookie or in the request body for Postman/mobile testing.',
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
              example: {
                refreshToken: '{{refreshToken}}'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Token refreshed'
          },
          401: {
            description: 'Missing, invalid, reused, or expired refresh token'
          }
        }
      }
    },
    '/auth/logout': {
      post: {
        tags: ['Auth'],
        summary: 'Invalidate the active refresh token',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RefreshRequest' },
              example: {
                refreshToken: '{{refreshToken}}'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Logout successful'
          },
          401: {
            description: 'Access token missing or invalid'
          }
        }
      }
    },
    '/auth/me': {
      get: {
        tags: ['Auth'],
        summary: 'Get the authenticated user',
        description: 'Frontend/mobile clients use this endpoint to restore the current user after app reload or token refresh.',
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: 'Authenticated user retrieved'
          },
          401: {
            description: 'Access token missing, invalid, or expired'
          }
        }
      }
    },
    '/auth/resend-otp': {
      post: {
        tags: ['Auth'],
        summary: 'Resend registration OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmailRequest' },
              example: {
                email: 'ada@example.com'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'OTP sent when account exists and is unverified'
          }
        }
      }
    },
    '/auth/forgot-password': {
      post: {
        tags: ['Auth'],
        summary: 'Send password reset OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/EmailRequest' },
              example: {
                email: 'ada@example.com'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Password reset OTP sent when account exists'
          }
        }
      }
    },
    '/auth/reset-password': {
      post: {
        tags: ['Auth'],
        summary: 'Reset password using OTP',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResetPasswordRequest' },
              example: {
                email: 'ada@example.com',
                otpCode: '123456',
                newPassword: 'NewPassword123'
              }
            }
          }
        },
        responses: {
          200: {
            description: 'Password reset successful'
          }
        }
      }
    },
    '/groups': {
      post: {
        tags: ['Groups'],
        summary: 'Create a ROSCA savings group',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateGroupRequest' },
              example: {
                name: 'Lekki Ajo Circle',
                description: 'Monthly savings group for trusted friends',
                contributionAmount: 10000,
                frequency: 'monthly',
                maxMembers: 3,
                rotationOrder: 'sequential'
              }
            }
          }
        },
        responses: {
          201: { description: 'Group created; creator becomes admin and member slot 1' },
          401: { description: 'Access token missing or invalid' },
          403: { description: 'Account is not verified' }
        }
      },
      get: {
        tags: ['Groups'],
        summary: 'List groups the authenticated user belongs to',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Groups retrieved' },
          401: { description: 'Access token missing or invalid' }
        }
      }
    },
    '/groups/join': {
      post: {
        tags: ['Groups'],
        summary: 'Join a pending group using invite code',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/JoinGroupRequest' },
              example: {
                inviteCode: 'ABC123'
              }
            }
          }
        },
        responses: {
          200: { description: 'Joined group successfully' },
          404: { description: 'Invite code does not match a pending group' },
          409: { description: 'Already a member or group is full' }
        }
      }
    },
    '/groups/{groupId}': {
      get: {
        tags: ['Groups'],
        summary: 'Get group details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        responses: {
          200: { description: 'Group retrieved' },
          403: { description: 'Authenticated user is not a member' },
          404: { description: 'Group not found' }
        }
      },
      patch: {
        tags: ['Groups'],
        summary: 'Update pending group settings',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/UpdateGroupRequest' },
              example: {
                description: 'Updated group description'
              }
            }
          }
        },
        responses: {
          200: { description: 'Group updated' },
          400: { description: 'Group is not pending or invalid update' },
          403: { description: 'Only admin can update' }
        }
      },
      delete: {
        tags: ['Groups'],
        summary: 'Soft-delete a pending group',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        responses: {
          200: { description: 'Group deleted' },
          400: { description: 'Only pending groups can be deleted' },
          403: { description: 'Only admin can delete' }
        }
      }
    },
    '/groups/{groupId}/leave': {
      post: {
        tags: ['Groups'],
        summary: 'Leave a pending group',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        responses: {
          200: { description: 'Left group successfully' },
          400: { description: 'Admin cannot leave or group is not pending' },
          403: { description: 'User is not a member' }
        }
      }
    },
    '/groups/{groupId}/start': {
      post: {
        tags: ['Groups'],
        summary: 'Start a full pending group',
        description: 'Phase 2 starts the group and locks membership. Phase 3 creates the first cycle.',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        responses: {
          200: { description: 'Group started' },
          400: { description: 'Group is not pending, has fewer than 2 members, or is not full' },
          403: { description: 'Only admin can start' }
        }
      }
    },
    '/groups/{groupId}/members': {
      get: {
        tags: ['Groups'],
        summary: 'List group members and payout slots',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        responses: {
          200: { description: 'Members retrieved' },
          403: { description: 'User is not a member' }
        }
      }
    },
    '/groups/{groupId}/activity': {
      get: {
        tags: ['Groups'],
        summary: 'List paginated group activity',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/GroupId' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          200: { description: 'Activity retrieved' },
          403: { description: 'User is not a member' }
        }
      }
    },
    '/contributions/initialize-payment': {
      post: {
        tags: ['Contributions'],
        summary: 'Initialize Paystack payment for the current cycle contribution',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/InitializeContributionPaymentRequest' },
              example: {
                groupId: '665f1f1f1f1f1f1f1f1f1f1f'
              }
            }
          }
        },
        responses: {
          201: { description: 'Paystack checkout initialized' },
          400: { description: 'Group/cycle is not open for contributions' },
          409: { description: 'Member has already contributed for this cycle' }
        }
      }
    },
    '/contributions/verify-payment': {
      post: {
        tags: ['Contributions'],
        summary: 'Verify Paystack reference and fulfill contribution',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/VerifyContributionPaymentRequest' },
              example: {
                reference: 'AJO-ABC123-DEF456-GHI789-001122'
              }
            }
          }
        },
        responses: {
          200: { description: 'Payment verified and contribution recorded' },
          400: { description: 'Payment is not successful or amount mismatch' },
          404: { description: 'Payment transaction not found' }
        }
      }
    },
    '/contributions/group/{groupId}': {
      get: {
        tags: ['Contributions'],
        summary: 'List contributions for a group',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/GroupId' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          200: { description: 'Group contributions retrieved' },
          403: { description: 'User is not a group member' }
        }
      }
    },
    '/contributions/cycle/{cycleId}': {
      get: {
        tags: ['Contributions'],
        summary: 'List contributions for a cycle',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/CycleId' }],
        responses: {
          200: { description: 'Cycle contributions retrieved' },
          403: { description: 'User is not a group member' }
        }
      }
    },
    '/contributions/my/{groupId}': {
      get: {
        tags: ['Contributions'],
        summary: 'List authenticated user contributions in a group',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        responses: {
          200: { description: 'User contributions retrieved' },
          403: { description: 'User is not a group member' }
        }
      }
    },
    '/contributions/{contribId}/confirm': {
      patch: {
        tags: ['Contributions'],
        summary: 'Admin manually confirms a pending contribution',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/ContributionId' }],
        responses: {
          200: { description: 'Contribution confirmed' },
          403: { description: 'Only group admin can confirm' },
          404: { description: 'Contribution not found' }
        }
      }
    },
    '/contributions/status/{groupId}': {
      get: {
        tags: ['Contributions'],
        summary: 'Get current cycle payment status snapshot',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/GroupId' }],
        responses: {
          200: { description: 'Contribution status retrieved' },
          403: { description: 'User is not a group member' }
        }
      }
    },
    '/withdrawal-accounts/banks': {
      get: {
        tags: ['Payouts'],
        summary: 'List Nigerian banks supported by Paystack transfers',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Banks retrieved' }
        }
      }
    },
    '/withdrawal-accounts/resolve': {
      post: {
        tags: ['Payouts'],
        summary: 'Resolve a bank account number before saving payout destination',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/ResolveWithdrawalAccountRequest' },
              example: { accountNumber: '0000000000', bankCode: '058' }
            }
          }
        },
        responses: {
          200: { description: 'Account resolved' }
        }
      }
    },
    '/withdrawal-accounts': {
      post: {
        tags: ['Payouts'],
        summary: 'Save default withdrawal account and create Paystack transfer recipient',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CreateWithdrawalAccountRequest' },
              example: { accountNumber: '0000000000', bankCode: '058', bankName: 'Guaranty Trust Bank' }
            }
          }
        },
        responses: {
          201: { description: 'Withdrawal account saved' }
        }
      }
    },
    '/withdrawal-accounts/me': {
      get: {
        tags: ['Payouts'],
        summary: 'Get authenticated user default withdrawal account',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Withdrawal account retrieved' },
          404: { description: 'No withdrawal account found' }
        }
      }
    },
    '/payouts/request': {
      post: {
        tags: ['Payouts'],
        summary: 'Cycle recipient requests payout after cycle closes',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RequestPayoutRequest' },
              example: { groupId: '665f1f1f1f1f1f1f1f1f1f1f' }
            }
          }
        },
        responses: {
          201: { description: 'Payout requested' },
          400: { description: 'Cycle is not closed' },
          403: { description: 'Only assigned recipient can request payout' },
          409: { description: 'Payout already requested for cycle' }
        }
      }
    },
    '/payouts/group/{groupId}': {
      get: {
        tags: ['Payouts'],
        summary: 'List group payout history',
        security: [{ bearerAuth: [] }],
        parameters: [
          { $ref: '#/components/parameters/GroupId' },
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } }
        ],
        responses: {
          200: { description: 'Group payouts retrieved' }
        }
      }
    },
    '/payouts/{payoutId}': {
      get: {
        tags: ['Payouts'],
        summary: 'Get payout details',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PayoutId' }],
        responses: {
          200: { description: 'Payout retrieved' },
          404: { description: 'Payout not found' }
        }
      }
    },
    '/payouts/{payoutId}/approve': {
      patch: {
        tags: ['Payouts'],
        summary: 'Admin approves payout and initiates Paystack transfer',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PayoutId' }],
        responses: {
          200: { description: 'Payout approved and transfer initiated' },
          403: { description: 'Only admin can approve payout' }
        }
      }
    },
    '/payouts/{payoutId}/reject': {
      patch: {
        tags: ['Payouts'],
        summary: 'Admin rejects payout with notes',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/PayoutId' }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/RejectPayoutRequest' },
              example: { notes: 'Recipient requested to update withdrawal account first.' }
            }
          }
        },
        responses: {
          200: { description: 'Payout rejected' },
          403: { description: 'Only admin can reject payout' }
        }
      }
    },
    '/notifications': {
      get: {
        tags: ['Notifications'],
        summary: 'List authenticated user notifications',
        description: 'Returns persisted notifications so users who were offline can catch up after reconnecting.',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', minimum: 1, default: 1 } },
          { name: 'limit', in: 'query', schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 } },
          { name: 'unreadOnly', in: 'query', schema: { type: 'boolean', default: false } }
        ],
        responses: {
          200: {
            description: 'Notifications retrieved',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/NotificationListResponse' }
              }
            }
          },
          401: { description: 'Access token missing or invalid' },
          403: { description: 'Account is not verified' }
        }
      }
    },
    '/notifications/{notificationId}/read': {
      patch: {
        tags: ['Notifications'],
        summary: 'Mark a notification as read',
        security: [{ bearerAuth: [] }],
        parameters: [{ $ref: '#/components/parameters/NotificationId' }],
        responses: {
          200: { description: 'Notification marked as read' },
          403: { description: 'User does not own this notification' },
          404: { description: 'Notification not found' }
        }
      }
    }
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    },
    parameters: {
      GroupId: {
        name: 'groupId',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          pattern: '^[a-f\\d]{24}$'
        }
      },
      CycleId: {
        name: 'cycleId',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          pattern: '^[a-f\\d]{24}$'
        }
      },
      ContributionId: {
        name: 'contribId',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          pattern: '^[a-f\\d]{24}$'
        }
      },
      PayoutId: {
        name: 'payoutId',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          pattern: '^[a-f\\d]{24}$'
        }
      },
      NotificationId: {
        name: 'notificationId',
        in: 'path',
        required: true,
        schema: {
          type: 'string',
          pattern: '^[a-f\\d]{24}$'
        }
      }
    },
    schemas: {
      RegisterRequest: {
        type: 'object',
        required: ['fullName', 'email', 'phone', 'password'],
        properties: {
          fullName: { type: 'string', minLength: 2, maxLength: 120 },
          email: { type: 'string', format: 'email' },
          phone: { type: 'string' },
          password: { type: 'string', minLength: 8, maxLength: 128 }
        }
      },
      VerifyOtpRequest: {
        type: 'object',
        required: ['email', 'otpCode'],
        properties: {
          email: { type: 'string', format: 'email' },
          otpCode: { type: 'string', pattern: '^\\d{6}$' }
        }
      },
      LoginRequest: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string' }
        }
      },
      RefreshRequest: {
        type: 'object',
        properties: {
          refreshToken: { type: 'string' }
        }
      },
      EmailRequest: {
        type: 'object',
        required: ['email'],
        properties: {
          email: { type: 'string', format: 'email' }
        }
      },
      ResetPasswordRequest: {
        type: 'object',
        required: ['email', 'otpCode', 'newPassword'],
        properties: {
          email: { type: 'string', format: 'email' },
          otpCode: { type: 'string', pattern: '^\\d{6}$' },
          newPassword: { type: 'string', minLength: 8, maxLength: 128 }
        }
      },
      CreateGroupRequest: {
        type: 'object',
        required: ['name', 'contributionAmount', 'frequency', 'maxMembers'],
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120 },
          description: { type: 'string', maxLength: 500 },
          contributionAmount: { type: 'number', minimum: 1 },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          maxMembers: { type: 'integer', minimum: 2, maximum: 100 },
          rotationOrder: { type: 'string', enum: ['sequential', 'random', 'bidding'], default: 'sequential' }
        }
      },
      UpdateGroupRequest: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 2, maxLength: 120 },
          description: { type: 'string', maxLength: 500 },
          contributionAmount: { type: 'number', minimum: 1 },
          frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly'] },
          maxMembers: { type: 'integer', minimum: 2, maximum: 100 },
          rotationOrder: { type: 'string', enum: ['sequential', 'random', 'bidding'] }
        }
      },
      JoinGroupRequest: {
        type: 'object',
        required: ['inviteCode'],
        properties: {
          inviteCode: { type: 'string', minLength: 6, maxLength: 12 }
        }
      },
      InitializeContributionPaymentRequest: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', pattern: '^[a-f\\d]{24}$' }
        }
      },
      VerifyContributionPaymentRequest: {
        type: 'object',
        required: ['reference'],
        properties: {
          reference: { type: 'string', minLength: 8, maxLength: 120 }
        }
      },
      ResolveWithdrawalAccountRequest: {
        type: 'object',
        required: ['accountNumber', 'bankCode'],
        properties: {
          accountNumber: { type: 'string', pattern: '^\\d{10}$' },
          bankCode: { type: 'string' }
        }
      },
      CreateWithdrawalAccountRequest: {
        type: 'object',
        required: ['accountNumber', 'bankCode', 'bankName'],
        properties: {
          accountNumber: { type: 'string', pattern: '^\\d{10}$' },
          bankCode: { type: 'string' },
          bankName: { type: 'string' }
        }
      },
      RequestPayoutRequest: {
        type: 'object',
        required: ['groupId'],
        properties: {
          groupId: { type: 'string', pattern: '^[a-f\\d]{24}$' }
        }
      },
      RejectPayoutRequest: {
        type: 'object',
        required: ['notes'],
        properties: {
          notes: { type: 'string', minLength: 2, maxLength: 500 }
        }
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          user: { type: 'string' },
          group: { type: 'string' },
          type: {
            type: 'string',
            enum: [
              'member_joined',
              'cycle_started',
              'contribution_new',
              'contribution_confirmed',
              'cycle_closed',
              'payout_requested',
              'payout_approved',
              'payout_rejected',
              'payout_disbursed'
            ]
          },
          title: { type: 'string' },
          message: { type: 'string' },
          payload: { type: 'object', additionalProperties: true },
          readAt: { type: 'string', format: 'date-time', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        }
      },
      NotificationListResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: {
            type: 'object',
            properties: {
              notifications: {
                type: 'array',
                items: { $ref: '#/components/schemas/Notification' }
              }
            }
          },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer' },
              limit: { type: 'integer' },
              total: { type: 'integer' },
              totalPages: { type: 'integer' }
            }
          }
        }
      }
    }
  }
};
