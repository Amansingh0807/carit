# CarIt — Carbon Footprint Awareness Platform

CarIt is a production-grade, full-stack application designed to track, estimate, and optimize daily carbon footprint logs. The frontend is built on a highly custom **3D Solarpunk Cyber-Eco** design system, featuring physical mouse-tilt elements, real-time light reflections, and zero emojis.

---

## 🚀 Key Features

- **Root Landing Page**: Fully immersive entrance with animated 3D perspective grids and interactive console mockups.
- **Emission Console (Dashboard)**: Dynamic carbon metrics, logging streaks, unlocked badges, and data charts (Recharts) that transition with staggered reveals.
- **Carbon Log CRUD**: Track commutes, home energy, food, and shopping activities. Includes live carbon calculations and pagination.
- **Rule-Based Recommendations**: Sugggestions to cut carbon, with dynamic save indicators and action locks.
- **Medal showcase**: Unlocked green metrics styled as 3D metallic medal decals (Gold, Silver, Bronze, Emerald gradients) reflecting mouse tilts.
- **Accessibility Integration**: WCAG 2.1 AA compliant keyboard navigation indicators, text alternatives, and toggles for high contrast and larger text sizes.
- **Security & Validation**: JWT authorization (short-lived access tokens + HTTP-only refresh tokens), password encryption (bcryptjs), runtime Zod schema parsing, Helmet headers, and rate limiting.

---

## 🛠️ Technology Stack

- **Frontend**: React 18, Vite, TypeScript 6.x, TailwindCSS 3.x, Zustand, Recharts, and custom mouse physics.
- **Backend**: Node.js 18 LTS, Express 4.x, TypeScript 6.x.
- **Database**: SQLite3 via `sql.js` (zero-config, zero native binary dependencies).
- **Security**: JWT, bcryptjs, Zod, Helmet, express-rate-limit, cookie-parser.
- **Testing**: Jest, React Testing Library, Supertest.

---

## 📦 Project Structure

```text
carbon-footprint-platform/
├── client/                 # React frontend application
│   ├── src/
│   │   ├── components/     # Layout, ProtectedRoute, TiltCard
│   │   ├── pages/          # Landing, Login, Register, Dashboard, Activities...
│   │   ├── store/          # Zustand auth and app stores
│   │   ├── types/          # Shared type configurations
│   │   └── index.css       # Core Solarpunk styling sheets
│   └── package.json
│
├── server/                 # Express backend application
│   ├── src/
│   │   ├── config/         # Environment variables & constants
│   │   ├── database/       # SQLite connection & WAL auto-save
│   │   ├── routes/         # Router controllers mapping
│   │   ├── controllers/    # API business logic layers
│   │   ├── middleware/     # JWT verification & rate-limiters
│   │   └── index.ts        # App bootstrap & schema seeds
│   └── package.json
│
├── package.json            # Root combined workspace config
└── README.md
```

---

## 💻 Local Setup & Execution

### 1. Installation
Run the root script to install node dependencies for both directories:
```bash
npm run install:all
```

### 2. Development Mode
Run both frontend and backend in concurrent watch modes:
- **Terminal 1 (Backend)**:
  ```bash
  npm run dev:server
  ```
- **Terminal 2 (Frontend)**:
  ```bash
  npm run dev:client
  ```
The client console will launch at `http://localhost:5173`.
A pre-seeded developer profile is loaded:
- **Email**: `demo@example.com`
- **Password**: `Password123!`

### 3. Testing
Run server-side unit, validation, and endpoint tests:
```bash
npm run test:server
```

---

## ☁️ Production Deployment on Render (Unified Single Server)

For SQLite apps, deploying unified builds with persistent storage disks is the most stable and cost-efficient architecture.

### Step 1: Link Code to GitHub
Push this codebase to a private/public Git repository.

### Step 2: Configure Web Service on Render
1. Go to [Render](https://render.com/) and create a **Web Service**.
2. Connect your Git repository.
3. Configure settings:
   - **Runtime**: `Node`
   - **Build Command**: `npm run install:all && npm run build:client && npm run build:server`
   - **Start Command**: `npm run start`
   - **Plan**: `Free` (or Starter if attaching disks)

### Step 3: Add a Persistent Storage Disk
Because SQLite writes data to the disk at runtime, you need to mount a persistent disk volume to prevent database resets:
1. Go to service **Disks** settings.
2. Click **Add Disk**.
3. **Mount Path**: `/opt/render/project/src/server/data`
4. **Size**: `1 GB` (or larger)

### Step 4: Environment Configurations
Add these variables in the **Environment** tab on Render:
- `NODE_ENV`: `production`
- `PORT`: `10000` (Render handles port routing)
- `JWT_ACCESS_SECRET`: `[random-hash-key]`
- `JWT_REFRESH_SECRET`: `[other-random-hash-key]`
- `CLIENT_ORIGIN`: `https://your-domain-name.onrender.com`
- `DB_FILE_PATH`: `/opt/render/project/src/server/data/carbon_footprint.db`


