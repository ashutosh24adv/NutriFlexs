# NutriFlexs — REAL FOOD. REAL FUEL.

**NutriFlexs** is a gym-adjacent nutrition startup and ordering platform built for post-workout recovery. Physical express kiosks (150–200 sq. ft.) located 50–100 meters from premium gyms (e.g., Cult.fit, Gold's Gym, Nitrro) serve fresh cold-pressed organic juices and freshly prepared high-protein meals within 3–5 minutes of ordering.

---

## 🚀 Key Business Differentiation
1. **Immediate**: 3–5 minute preparation & pickup experience right after workout.
2. **Fresh**: Organic cold-pressed juices & freshly grilled warm protein meals.
3. **Transparent**: Complete protein, calories, carbs, fats, and ingredients listed on every product.
4. **Gym-Adjacent**: Orders routed directly to gym-adjacent express kiosks.
5. **Habit-Based**: One-tap reordering, NutriFlexs Pass, and Trainer referral program.

---

## 🛠️ Technology Stack
- **Frontend**: Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js Server Components, Server Actions, Route Handlers
- **Database**: Neon PostgreSQL + Prisma ORM
- **Authentication**: Auth.js / NextAuth (Role-based access for CUSTOMER, TRAINER, KITCHEN, ADMIN)
- **Payments**: Razorpay Integration (with server-side signature & price verification)
- **Validation**: Zod + React Hook Form
- **Icons & Analytics**: Lucide React + Recharts

---

## 📁 Key Portals & Workflows
- **Customer Experience** (`/home`, `/menu`, `/pass`, `/orders`): Mobile-first ordering flow with workout streak tracking, protein goal progress, data-driven post-workout recommendations, 1-tap reordering, and live pickup tracking (`~3 min`).
- **Kitchen Display System** (`/kitchen`): Kiosk/Tablet operational board with 4 real-time status columns (`NEW`, `PREPARING`, `READY`, `COMPLETED`).
- **Trainer Partner Dashboard** (`/trainer`): Client referral code (`NUTRI-ARJUN`), auto-generated QR code, active subscriber count tracking, and free meal voucher milestone rewards.
- **Admin Operations Suite** (`/admin`): Executive KPI dashboard, Recharts revenue & category analytics, menu product CRUD, coupons management, and kiosk stock tracking.

---

## 💻 Local Setup & Development

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Database Setup (Prisma & Neon PostgreSQL)
Generate the Prisma client:
```bash
npx prisma generate
```

Push schema changes to your database:
```bash
npx prisma db push
```

Seed initial database (includes 13 exact menu items, demo gyms, outlets, and users):
```bash
npm run db:seed
```

### 4. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📦 Vercel Deployment
This application is fully optimized for Vercel serverless deployment:
- No local file system persistence dependencies.
- Database access through serverless Prisma client + Neon PostgreSQL.
- Build command automatically executes `prisma generate`.
