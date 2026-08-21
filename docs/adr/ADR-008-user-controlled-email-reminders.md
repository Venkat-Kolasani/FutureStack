# ADR-008: User-controlled email reminder preference

- Date written: 2026-07-16
- Status: Accepted

## Problem

Email is a user-facing notification channel, not an administrator's choice. A global Resend configuration alone cannot express whether an individual FutureStack user wants deadline emails.

## Assumptions

- In-app notifications remain available to every signed-in user.
- Email delivery requires both a configured server-side provider and explicit user preference.
- A missing preference must never imply consent to email delivery.

## Options considered

1. Enable email for every account once the Resend key exists.
2. Keep email as an environment-only global feature gate.
3. Store an account-scoped deadline-email preference and expose it through a visible notification settings page.

## Decision

Use a `user_notification_preferences` row keyed by the internal user ID. The `deadline_email_enabled` setting defaults to `false`; each user can turn it on or off from FutureStack's notification page. The delivery worker checks this preference after confirming that the provider is configured and before resolving the recipient from `users.email` or Clerk.

The Resend configuration remains a server-side capability gate, not the user's preference. If a user has opted in while the provider is not configured, FutureStack keeps their stored preference and continues its in-app notification baseline until the provider becomes available.

## Consequences and failure modes

The extra preference read is an acceptable cost for the small, bounded reminder batch. At a higher notification volume, batch-fetch preferences with the leased jobs or include them in the lease query. The default-off setting avoids assuming email consent, but means a user must explicitly choose the channel.

## Metrics and revisit threshold

Track opt-in rate, delivery failures for opted-in users, and the share of reminders served only in-app. Add per-reminder timing, timezone, and channel preferences when users request more than one reminder policy.
