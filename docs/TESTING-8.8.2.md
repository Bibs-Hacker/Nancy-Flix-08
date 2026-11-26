# NANCYFLIX 8.8.2 verification

Live diagnosis (26 November 2026): production 8.8.1; lib catalogue HTTP 404; Kids endpoint HTTP 200 with 24 older, incompatible entries.

Passed local/isolated checks:
- All embedded and server JavaScript syntax checks; 11 API functions.
- Official eight-card API, Tom filter (3), Bluey search (2), empty page 2; trailer proxy regression.
- Mobile Google/guest controls, previous trailer-data regression, Kids search/filter/collection-close, eleven live Kids cards retained.
- Catalogue primary API, static fallback on API failure, static fallback on outdated response, built-in fallback when both fail. No missing lib request remains.
- Free six theme locks; Plus Amazing lock; Premium/Super all themes. Actual Free queue cap (3) and download cap (10) reject extra items. History limit values follow plans.
- Free cannot open PLUS TV cards; Plus/Premium/Super have no TV locks. Kids channels remain Free.
- Four simulated verified admins recognized; normal, unverified and removed admins denied admin/developer grants; cached paid status not trusted after new login.
- Extracted Firebase user-builder unit test: ID token assigned, verified allowlist recognized, unverified email denied even with an admin claim.
- Mocked Firebase server verification: bad/unverified tokens rejected; exact four-admin allowlist; owner-bound entitlement lookup; invalid plan and expired/malformed expiry denied.
- Mocked Stripe checkout: owner matching, plan metadata, Firebase entitlement persistence; mismatched owner denied.
- Mobile render review completed with no observed content clipping/overlap. Third-party video networks were blocked in isolated tests.

Not live verified or changed: actual Google sign-in, published Firebase rules, server credentials, entitlement database writes, payment lifecycle, video/TV playback. No production accounts, Firebase rules or subscriptions were modified. See UPDATE-8.8.2.md for deployment and rule-publication steps.
