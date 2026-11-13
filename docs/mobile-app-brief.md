0. How you (the agent) must work
1. Plan first. Before any code, read the whole repo and the design system folder, then give me a written plan with phases, risks, and every question you have. Wait for my approval.
2. Work in phases (section 14). After each phase: run typecheck, lint, and tests, run the app on an iOS simulator and an Android emulator, and show me screenshots or a short recording as proof. Do not start the next phase until I approve.
3. Ask, don't guess. If a requirement is unclear, a library is deprecated, or something needs an account, key, or store setting from me, stop and ask. Section 15 lists decisions I expect you to ask about.
4. Verify the latest. Use the latest stable Expo SDK and the current stable versions of every library at build time. Check official docs for anything that changes often (Expo config plugins, Health Connect, HealthKit, Razorpay, Google sign-in). Do not rely on memory.
5. Small, reviewable commits on a feature branch, one per task. Never commit secrets.
1. Goal
Build a native iOS and Android app for NutriFlexs, a fresh juice and high-protein meal kiosk business outside gyms. The existing Next.js website stays as it is. The app shares its backend and its Neon Postgres database.
The app has two sides, switched by Swiggy-style folder tabs at the top:
• Order food: browse the menu, add to cart, pay, pick up at a gym kiosk.
• Track health: calorie and macro diary, trends, coach insights, and wearable data.
The unique feature is the link between the two: ordering a meal can auto-log its macros to the diary, and the coach can suggest a menu item to close a nutrition gap.
2. Hard constraints
• Do not break the website. next build must keep passing, and the Vercel deployment must work with no settings changes. Do not move or restructure the web app unless you prove it is safe and I approve.
• Database: Neon Postgres through Prisma. Migrations are additive only: no drops, renames, or destructive changes to existing tables or columns. Use a Neon dev branch for all development and never run anything against production. Use the pooled connection string at runtime and the direct one for migrations; check how the repo already configures this.
• Reuse before you build. Read prisma/schema.prisma, app/api/*, services/*, and lib/* first. Reuse existing models and business logic for orders, menu, payments, nutrition logs, and goals. Add new tables only for what is truly new (section 6).
• One source of truth for business rules (pricing, GST, coupons, pickup slots, macros). The mobile app never recomputes money; it displays what the server returns.
• Not Expo Go. Native modules (Razorpay, Google sign-in, health data) require development builds with EAS Build.
3. Repo layout (monorepo)
Keep the web app where it is. Add:
/mobile              Expo app (TypeScript, Expo Router)
/packages/shared     zod schemas, API types, constants shared by web and mobile
/docs                this brief and notes
Use npm workspaces (or pnpm if the repo already uses it). Confirm Metro resolves the shared package correctly and that Vercel still builds the web app from the repo as before.
4. Tech stack
• Expo (latest stable SDK), React Native with the New Architecture, TypeScript in strict mode
• Expo Router for navigation, React Native Reanimated and Gesture Handler for animation
• TanStack Query for server state with persisted cache; Zustand for small client state
• react-hook-form with zod for forms; zod schemas shared from packages/shared
• expo-secure-store for tokens, expo-image for images, FlashList for long lists, react-native-svg for the calorie ring and charts (keep chart libraries lightweight)
• expo-notifications for push
• Tests: Jest with React Native Testing Library for logic and key components, plus API contract tests on the server
• CI: GitHub Actions for typecheck, lint, tests; EAS Build profiles for development, preview, and production
5. Design system and UI
First, read the design system folder at O:\Nutriflex\System_design-main (1), including all of its skills and references. It is the source of truth for colors, typography, spacing, radii, shadows, components, and motion. Convert its tokens into a typed theme in the app and build reusable components from it. Never hard-code colors, sizes, or fonts in screens. If my mockup description below conflicts with the design system, the design system wins for style, and the mockup wins for layout and behavior. Brand reference: the website uses a deep green (about #2F7D16), Poppins for headings, and Inter for body text.
Look and feel: clean, warm, high-quality food-app feel (Swiggy and Zomato for ordering) with a calm, data-first tracker (Google Fit and Apple Fitness for health). Large rounded cards, big food photography, bold prices, generous touch targets (at least 44 by 44), subtle motion, skeleton loading states, and no gradient glows or neon effects.
Shell:
• Solid brand-colored header band with the selected gym/kiosk (tap to change) and an avatar.
• Two folder-style tabs at the bottom of the header band: Order food (live subtext such as "Ready in 5 min") and Track health (live subtext such as "1,170 kcal left"). The selected tab is light and flows into the page below with a curved flare on both sides, like Swiggy's tabs. Animate the switch. Remember the last-used side.
• Each side has its own bottom tab bar. Order: Home, Reorder, Orders, Profile. Track: Today, Trends, Coach, Profile.
• On a first launch, a short mode chooser is allowed, but the tabs remain the main switcher.
Order screens:
• Home: search bar with mic and a VEG toggle; sub-tabs (All, Under ₹199, High protein, Offers) that filter; promo banner carousel; "What's on your mind?" category circles; a segmented "Top rated | Ready in 5 min" sort; two-column food cards with photo, veg or non-veg dot, rating, prep time, a protein chip, kcal, price, and an ADD button that becomes a quantity stepper; a floating cart bar when the cart has items.
• Item detail: photo, ingredients, full macros, add-ons.
• Cart: pickup slot chips (Now, 15 min, 30 min), items with steppers, coupon apply and remove, a "Log to my diary" toggle that shows the kcal and protein it will add, and a bill (item total, discount, GST, total) from the server.
• Payment: Razorpay checkout (UPI, cards, wallets), processing and success states.
• Live order: large pickup code, ETA, a progress stepper (placed, preparing, ready), kiosk location, and "logged to your diary" confirmation. Update in near real time (push plus polling fallback).
• Orders and Reorder: history with one-tap reorder.
Track screens:
• Today: week strip; streak and nutrition score chips; a calorie ring showing Goal minus Food plus Exercise equals Left; protein, carbs, and fat bars; a quick-log row (Search, Scan, Snap, Voice, Quick add); a coach card; meals by type (Breakfast, Lunch, Snacks, Dinner, Post-workout) with add buttons; order-sourced entries tagged "Auto-logged"; a water tracker; a weight sparkline; and a wearable card (steps, heart rate) once connected.
• Add food: debounced search, NutriFlexs menu items first, then common Indian foods; tapping opens a bottom sheet with servings (steps of 0.5), meal type, and live macros.
• Trends: weekly calories against the goal, protein-goal days, weight line, macro split, with week and month ranges.
• Coach: weekly check-in, rule-based insights (protein shortfall with an "Order a shake" deep link into the Order side, hydration reminder toggle, streak), and badges. No LLM in version 1.
• Onboarding: height, weight, age, and activity level produce calorie and protein goals (this replaces the website's recommendation card), then a clear health-permission explainer.
Version 1 feature flags: Scan, Snap, and Voice logging appear in the UI behind a feature flag set to off ("Coming soon"). They are Phase 2.
Devices: support phones and tablets, small and large screens, safe areas and notches, dynamic type and font scaling, light and dark if the design system defines both, and orientation lock to portrait on phones. On tablets, center content in a max-width column or use a two-pane layout where it helps. Meet WCAG-level accessibility basics: labels, roles, contrast, focus order, and reduced-motion support.
6. Backend (in the existing web repo)
Add a versioned REST API under app/api/mobile/v1/* using route handlers that call the existing services and Prisma. Keep the existing cookie-based NextAuth flow untouched for the website.
• Validate every request and response with zod from packages/shared.
• Consistent error format, pagination, and idempotency keys for payment and order creation.
• Rate limit auth and OTP endpoints.
• Generate an OpenAPI document or typed client from the schemas so the app and server cannot drift.
New tables (additive, via Prisma migration), adjust names to the repo's conventions:
• RefreshToken / Device (hashed token, device info, expiry, revoked at)
• Phone number fields on the user and an OTP record (hashed code, expiry, attempts), or the provider's session
• PushToken
• HealthConnection (user, platform, granted data types, status, last sync)
• HealthDailySummary (user, date, steps, active kcal, resting and average heart rate, distance, source)
• HealthSample (user, type, start, end, value, unit, source app, external id) with a unique constraint so syncs are idempotent
• WeightEntry and WaterLog if they do not already exist
Order and diary link: when an order is paid and the user chose "log to diary", the server creates the food log entries (idempotent, tagged source ORDER). The app only sends the toggle.
7. Authentication
Support all three methods and let one account have several:
1. Email and password (same accounts as the website).
2. Google sign-in using the native library; the backend verifies the Google ID token and links accounts by verified email.
3. Phone number with OTP. Implement behind an OtpProvider interface. Ask me which SMS or OTP provider to use before implementing (India needs DLT-compliant SMS; consider Firebase phone auth, MSG91, or Twilio Verify).
4. Sign in with Apple on iOS. Apple requires it when an app offers other social sign-in. Include it.
Sessions: short-lived access token (about 15 minutes) plus a rotating refresh token stored hashed server-side, with reuse detection. Store tokens only in expo-secure-store. Support logout on this device and on all devices, and account deletion (required by the stores).
8. Orders and payments
Reuse the existing Razorpay order creation and signature verification. In the app use the official native Razorpay SDK (development build). The server verifies the signature and the Razorpay webhook is the source of truth, handled idempotently, so a killed app never leaves an order half-paid. Show clear states: pending, paid, failed, refunded.
9. Tracker logic
• Calorie budget: Left = Goal minus Food plus Exercise (active energy from health data when connected).
• Goals come from onboarding (formula for BMR and activity, with a protein target based on body weight) and are editable.
• Food database for v1: the existing food library plus a seeded list of common Indian foods. Put search behind a FoodProvider interface so an external database (for example Open Food Facts) can be added in Phase 2.
• Coach insights are deterministic rules computed on the server, with unit tests.
• Compute day boundaries in the user's time zone (India, IST by default).
10. Health integrations (version 1)
Three sources, one unified model:
• Apple Health on iOS through HealthKit. Use a maintained library with an Expo config plugin and add the HealthKit entitlement and usage descriptions.
• Google Health Connect on Android through Health Connect. Do not use the Google Fit APIs; they are deprecated.
• Samsung Health on Samsung phones works through Health Connect, because Samsung Health syncs into it. Do not build a separate Samsung SDK integration (it needs a partner agreement). If Samsung data is missing, guide the user to turn on Health Connect sharing inside Samsung Health.
Read-only in v1: steps, active energy, distance, heart rate (store daily summaries plus downsampled samples), workouts, and weight. Requirements:
• Check availability at runtime; on devices without it, hide the card and keep everything else working.
• Request only the permissions needed, each with a plain-language reason, and handle partial grants.
• Sync on app open and in the background where the OS allows (HealthKit background delivery; periodic background tasks on Android). Make syncs incremental and idempotent.
• Let users disconnect and delete all synced health data. Never log raw health values to analytics or crash reports.
• Prepare what the stores need: the Google Play health apps declaration and Health Connect permission rationale, the Apple HealthKit review notes, and a privacy policy that covers health data and DPDP-style consent. List these as a checklist for me.
11. Notifications, offline, and performance
• Push through expo-notifications (FCM and APNs): order ready, hydration reminders (opt-in), streak nudges (opt-in). The server sends them; respect quiet hours.
• Cache the menu and diary for offline viewing; queue food logs made offline and sync them with optimistic updates.
• Target a smooth 60 fps on mid-range Android phones. Use FlashList, memoized rows, image sizing and caching, and lazy-loaded screens. Report cold-start time.
12. Security and privacy
No secrets in the app bundle; use EAS secrets and server env vars. Certificate-safe HTTPS only. Validate all input on the server. Hash OTPs and refresh tokens. Log access to health data endpoints. Follow least privilege for database access. Add a short threat-model note to the docs.
13. Quality gates
TypeScript strict with zero errors, ESLint clean, tests passing, no console errors on a clean run, and the web app's build and existing tests unchanged. Add Maestro (or similar) smoke tests for login, add to cart, pay (test mode), and log food.
14. Phases and acceptance
1. Recon and plan. Read the repo and design system, produce the plan and open questions. Accept: I approve the plan.
2. Foundation. Monorepo wiring, Expo app, theme from design tokens, base components, the folder-tab shell and both tab bars. Accept: shell runs on iOS and Android, web build unchanged.
3. Backend and auth. Mobile API skeleton, new tables, all login methods, token refresh, logout, account deletion. Accept: contract tests pass; I can log in three ways on a real device.
4. Order flow. Home, item detail, cart, payment, live order, orders and reorder, push for order ready. Accept: a real test-mode order from cart to pickup code.
5. Tracker core. Onboarding, Today, Add food, water, weight, Trends, Coach rules, order-to-diary auto-log. Accept: totals match the server and survive offline use.
6. Health sync. Apple Health, Health Connect (including Samsung data), consent and delete flows. Accept: real steps and heart rate show on an iPhone and on a Samsung and a Pixel-class Android phone.
7. Polish. Accessibility, tablets, dark mode if defined, performance, empty and error states, analytics without personal data. Accept: checklist in section 13 passes.
8. Release prep. EAS profiles, app icons and splash, store listing assets, privacy and data-safety answers, TestFlight and Play internal testing builds. Accept: both internal builds install and run.
15. Decisions to ask me before building
• The path to the design system folder and anything in it that conflicts with this brief
• Which SMS or OTP provider to use for phone login
• The app name, bundle identifier, and Apple and Google developer account details
• Whether production images and menu photography exist yet, or placeholders are needed
• Any existing analytics or crash tools to reuse
16. Out of scope for version 1
Barcode, photo, and voice food logging (UI present behind a flag), a wearable write-back, social features, LLM-based coaching, and any change to the website's look.