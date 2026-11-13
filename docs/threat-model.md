# NutriFlexs Mobile & API Threat Model and Security Architecture

## 1. Overview & Scope
This document outlines the security architecture, threat model, and privacy controls for the NutriFlexs mobile application (iOS & Android) and its companion backend REST API (`/app/api/mobile/v1/*`).

The system processes:
- User identities (credentials, phone numbers, OAuth identities).
- Payment transactions (Razorpay integration, bank/UPI references).
- Health and fitness telemetry (daily steps, heart rate, workouts, calories, bodyweight).
- Dietary logs and orders at physical gym kiosks.

---

## 2. Threat Modeling Methodology (STRIDE)

| Threat Category | Potential Attack Vector | NutriFlexs Mitigation Control |
| :--- | :--- | :--- |
| **Spoofing** | Attacker impersonates a customer or kiosk staff member. | Short-lived HS256-only JWT access tokens (15m) signed with isolated `MOBILE_JWT_SECRET` (no fallback), hashed refresh tokens in database with device fingerprinting, Google & Apple ID token cryptographic verification on server, DLT-compliant OTP with HMAC verification and Upstash Redis rate-limiting. |
| **Tampering** | Man-in-the-middle alters price, GST, or nutrition data during checkout. | TLS 1.3 / HTTPS certificate enforcement, server-authoritative bill calculation (the mobile client never computes money), HMAC-SHA256 signature verification for Razorpay webhooks and payment confirmations. |
| **Repudiation** | User denies placing an order or trainer referral credit abuse. | Idempotent order placement keys, tamper-evident payment records with Razorpay transaction IDs, immutable staff access code redemption logs. |
| **Information Disclosure** | Leakage of health metrics, tokens, or PII from client storage or logs. | Secure storage using iOS Keychain / Android Keystore (`expo-secure-store`), strict exclusion of health data from logs/analytics, no hardcoded API keys in app bundle. |
| **Denial of Service** | OTP SMS spamming, brute-force access code guessing, API exhaustion. | Distributed Upstash Redis sliding-window rate limiting on `/auth/*` and OTP endpoints, request body size limits, max attempt lockouts. |
| **Elevation of Privilege** | Normal customer accesses `/api/admin/*` or kitchen kiosk dashboards. | Role-Based Access Control (`CUSTOMER`, `TRAINER`, `KITCHEN`, `ADMIN`) validated on every API request; staff portal codes hashed with bcrypt/SHA256. |

---

## 3. Authentication & Session Security

### 3.1 Token Lifecycle & Rotating Refresh Tokens
- **Access Token**:
  - Format: Standard signed JWT.
  - Algorithm: Strictly **HS256 only**. The token verification engine explicitly disallows algorithm switching or `none` algorithm attacks.
  - Secret Isolation: Signed with dedicated `MOBILE_JWT_SECRET` (distinct from `NEXTAUTH_SECRET`). If `MOBILE_JWT_SECRET` is unset or empty, the server aborts initialization and rejects all mobile requests with zero fallback.
  - Expiry: 15 minutes.
  - Storage: In-memory runtime state, re-hydrated from SecureStore only when refreshing.
- **Refresh Token**:
  - Format: Cryptographically random 256-bit string (`crypto.randomBytes(32).toString('hex')`).
  - Storage on Client: `expo-secure-store` (hardware-backed Keystore on Android, Keychain on iOS).
  - Storage on Server: Hashed (`SHA-256`) before persistence in the `RefreshToken` table.
  - **Rotation & Reuse Detection**:
    - Every refresh request invalidates the used refresh token and issues a new pair.
    - If a revoked or already-used refresh token is presented, the server treats it as token theft and immediately revokes all active sessions for that user account.
- **Revocation**:
  - Explicit logout revokes the current device token.
  - "Log out from all devices" revokes all active refresh tokens in the database.
  - Account deletion purges all tokens, personal profile data, and health samples immediately.

### 3.2 Phone OTP Security & Abuse Prevention
- **OTP Generation**: Cryptographically secure 6-digit integer with 5-minute expiry.
- **Mock OTP Hard-Disabled in Production**:
  - Mock OTP (`123456`) is permitted solely in non-production local development when `NODE_ENV !== 'production'` AND `ENABLE_MOCK_OTP === 'true'`.
  - In production, mock OTP execution paths are hard-disabled; any attempt to utilize mock OTP fails verification immediately.
- **HMAC-SHA256 Code Hashing**:
  - OTP codes are hashed using `HMAC-SHA256` keyed with an isolated server pepper/secret (`OTP_HMAC_SECRET`) prior to database storage, preventing precomputed lookup table / rainbow table attacks on the $10^6$ 6-digit keyspace.
- **Distributed Rate Limiting (Upstash Redis)**:
  - Backed by an external distributed Redis store (`@upstash/ratelimit` / `@upstash/redis`), preventing in-memory reset vulnerabilities across multi-instance serverless Next.js edge/node deployments.
  - Max 3 OTP requests per phone number per 15 minutes.
  - Max 5 failed OTP attempts per session before the session is locked for 1 hour.
  - IP-based rate limiting: Max 10 requests per IP per minute to prevent SMS gateway exhaustion.
- **Storage**: Plaintext OTP is never logged or returned in API responses.
- **Provider Isolation**: Abstracted behind an `OtpProvider` interface (supporting MSG91 / Twilio Verify / Firebase) with DLT template compliance for India telecom regulations.

### 3.3 Third-Party OAuth (Google & Apple)
- **Google Sign-In**: Native SDK retrieves an `idToken`. The backend validates the token signature using Google's public JWKS keys (`googleapis.com/oauth2/v3/certs`) and matches the verified email.
- **Apple Sign-In**: Validates the `identityToken` against Apple's public key endpoint (`appleid.apple.com/auth/keys`).
- Unverified emails or email changes are rejected.

---

## 4. Payment Security & Integrity

- **Zero Client-Side Calculation**: The mobile app is strictly a presentation layer for pricing. Subtotal, coupon discounts, trainer referral credits, and GST (5% split into CGST 2.5% + SGST 2.5%) are computed entirely by `@nutriflexs/shared` on the backend server.
- **Razorpay Server Verification**:
  - The client receives a server-generated `razorpayOrderId`.
  - Upon checkout completion, client sends `razorpayPaymentId`, `razorpayOrderId`, and `razorpaySignature`.
  - The server verifies: `crypto.createHmac('sha256', secret).update(orderId + "|" + paymentId).digest('hex') === signature`.
- **Webhook as Source of Truth**:
  - In cases of dropped network connections or app termination during payment, Razorpay webhooks (`payment.captured`, `order.paid`) provide asynchronous idempotency.
  - Webhook signatures (`X-Razorpay-Signature`) are strictly validated prior to order status transition.

---

## 5. Health Data Privacy & Compliance (DPDP Act & App Store Guidelines)

### 5.1 Data Ingestion Architecture
- Sources supported: **Apple HealthKit** (iOS) and **Google Health Connect** (Android, including Samsung Health sync).
- **Read-Only Ingestion**: NutriFlexs version 1 never writes back or modifies the user's native health store.
- **Permissions**:
  - Runtime permissions are requested granularly with plain-language rationales (e.g. "We read active energy and steps to calculate your daily remaining calorie balance").
  - Graceful degradation: If a user denies permission, the app operates with standard BMR/TDEE estimates.

### 5.2 Storage & Minimization
- High-frequency sensor samples (e.g. continuous heart rate) are aggregated into `HealthDailySummary` records (steps, active calories, resting HR, average HR).
- Downsampled raw samples (`HealthSample`) are retained with a sliding 90-day retention policy.
- Synced health records are isolated to the authenticated user ID and protected by row-level database foreign keys.

### 5.3 Privacy & Store Compliance
- **No Analytics / Crash Logging of Health Data**: Under Apple HealthKit and Google Health Connect Developer Policies, health metrics (steps, heart rate, calories, weight) are never transmitted to third-party crash reporting tools (e.g., Sentry) or marketing SDKs.
- **User Disconnect & Data Erasure**:
  - Users can disconnect the integration anytime from settings.
  - A "Delete All Synced Health Data" option is provided, which immediately executes an explicit delete on all health summaries and samples belonging to the user.
- **India DPDP Act (2023) Alignment**:
  - Explicit, itemized digital consent before health data access.
  - Right to access, correction, and erasure fully implemented via API endpoints.

---

## 6. Client Application Hardening

1. **No Bundled Secrets**:
   - Razorpay key secrets, NextAuth secrets, and database credentials exist only in server environment variables and EAS secrets.
   - Client bundle only contains the public key ID (`NEXT_PUBLIC_RAZORPAY_KEY_ID`).
2. **Strict Schema Validation**:
   - Every input payload to `/app/api/mobile/v1/*` is parsed and validated by `@nutriflexs/shared` Zod schemas before touching Prisma or business services.
   - Malformed, oversized, or unexpected keys are rejected with HTTP 400.
3. **Database Access**:
   - Connection pooling via Neon pooled connection string.
   - Migrations applied exclusively using direct connection strings.
   - Additive-only schema changes to eliminate risk of production downtime or accidental column deletion.
