# DISCIPLINE — Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership & PII Isolation**: Every `/users/{userId}` document and all child documents in `/habits/{habitId}`, `/tasks/{taskId}`, `/goals/{goalId}`, and `/journal/{entryId}` belong exclusively to `request.auth.uid == userId`. No blanket `isSignedIn()` reads are permitted.
2. **Email Verification Gate**: All writes require `request.auth.token.email_verified == true`.
3. **Master Gate (Relational Sync)**: Subcollection reads (`get`) and writes (`create`, `update`, `delete`) verify that the parent `/users/{userId}` document exists and its `uid` matches `request.auth.uid`.
4. **Secure List Queries**: Every `allow list` rule enforces `isSignedIn() && request.auth.uid == userId && resource.data.uid == request.auth.uid` without `get()` or `exists()` inside `list`.
5. **Strict Schema & Volumetric Bounds**: Every string field enforces `.size()` limits matching `firebase-blueprint.json`. Document IDs match `^[a-zA-Z0-9_\-]+$` up to 128 chars.
6. **Temporal & Identity Immutability**: `uid` and `createdAt` are immutable on update; `createdAt` and `updatedAt` must equal `request.time`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: `auth = null`, creating `/users/user_1` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: `auth = { uid: 'user_1', token: { email_verified: false } }`, creating `/users/user_1` -> `PERMISSION_DENIED`.
3. **Cross-User PII Read**: `auth = { uid: 'user_2', token: { email_verified: true } }`, reading `/users/user_1` -> `PERMISSION_DENIED`.
4. **Identity Spoofing on Create**: `auth = { uid: 'user_1' }`, creating `/users/user_1/habits/h_1` with `{ uid: 'user_2' }` -> `PERMISSION_DENIED`.
5. **Orphan Subcollection Create (Missing Parent)**: Creating `/users/user_1/tasks/t_1` when `/users/user_1` does not exist -> `PERMISSION_DENIED`.
6. **Shadow Field Injection on Create**: Creating `/users/user_1` with extra key `{ isAdmin: true }` -> `PERMISSION_DENIED`.
7. **Shadow Field Injection on Update**: Updating `/users/user_1/habits/h_1` with `{ ghostFlag: 'x' }` -> `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Updating `createdAt` or `uid` on `/users/user_1/tasks/t_1` -> `PERMISSION_DENIED`.
9. **Spoofed Client Timestamp**: Creating `/users/user_1/goals/g_1` with `createdAt` != `request.time` -> `PERMISSION_DENIED`.
10. **Oversized String Denial-of-Wallet**: Creating `/users/user_1/habits/h_1` with `title` of 5,000 chars (limit 140) -> `PERMISSION_DENIED`.
11. **Invalid Enum State Injection**: Updating `/users/user_1/goals/g_1` with `status: 'hacked'` -> `PERMISSION_DENIED`.
12. **ID Poisoning Attack**: Creating document with malformed ID containing spaces or special characters -> `PERMISSION_DENIED`.
