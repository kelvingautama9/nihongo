# Phase 0: Payload-First Security TDD Specification

## 1. Data Invariants
1. **Owner Isolation Invariant**: Every `/users/{userId}` document and its subcollections (`srs_items/{itemId}`, `sessions/{sessionId}`) can only be read, listed, created, or updated by an authenticated user with `request.auth.uid == userId` and `request.auth.token.email_verified == true`.
2. **Parent Existence Gate (Master Gate)**: A document in `/users/{userId}/srs_items/{itemId}` or `/users/{userId}/sessions/{sessionId}` requires the parent `/users/{userId}` document to exist (`exists(/databases/$(database)/documents/users/$(userId))`).
3. **Strict Schema & Bounds**:
   - `srs_stage` must be an integer between `0` and `8`.
   - `item_id` must match `^[VK][0-9]{4}$` and equal the `{itemId}` path parameter.
   - `daily_vocab_quota` (`1..50`), `daily_kanji_quota` (`1..20`), `daily_review_cap` (`10..500`), `current_sprint` (`1..26`), `current_day` (`1..14`).
4. **Temporal & Identity Immutability**: `userId` and `item_id` cannot be altered on update; `updatedAt` and `createdAt` must equal `request.time`.

## 2. The "Dirty Dozen" Payloads (All Must Return `PERMISSION_DENIED`)
1. **Unverified Email Spoof**: Authenticated user with `email_verified: false` writing to `/users/{uid}`.
2. **Cross-Tenant Read/Write**: User `user_A` reading or writing `/users/user_B/srs_items/V0001`.
3. **Shadow Field Injection**: Payload to `/users/{uid}` containing an extra key `isAdmin: true`.
4. **Orphaned Subcollection Write**: Creating `/users/{uid}/srs_items/V0001` when `/users/{uid}` does not exist.
5. **Path vs Payload ID Mismatch**: Writing `item_id: "V0002"` to path `/users/{uid}/srs_items/V0001`.
6. **Out-of-Bounds SRS Stage**: Setting `srs_stage: 99` or `-1` on `SrsItemState`.
7. **Timestamp Forgery**: Setting `updatedAt` to a client-chosen past timestamp instead of `request.time`.
8. **Value Poisoning on Update**: Updating `current_sprint` with a string `"one"` or integer `999`.
9. **ID Poisoning Attack**: Document ID containing special characters or exceeding 128 chars.
10. **Immutable Field Mutation**: Updating `SessionLog` after creation (sessions are append-only logs).
11. **Unbounded String Exhaustion**: Sending a 5KB string inside `next_review_at`.
12. **Blanket List Scraping**: Listing `/users/{otherUid}/srs_items` where `userId != request.auth.uid`.
