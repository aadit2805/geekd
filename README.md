# Espress

A personal coffee logging app to track your coffee experiences, discover patterns, and build streaks.

## Stack

- **Frontend:** Next.js, Tailwind, shadcn/ui, Radix UI, Framer Motion
- **Backend:** Express + TypeScript
- **Database:** PostgreSQL
- **Auth:** Clerk
- **Maps:** Google Places API

## Prerequisites

- Node.js 18+
- PostgreSQL
- Clerk account
- Google Cloud account (for Places API)

## Local Development

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd espress

# Install frontend dependencies
cd client
npm install

# Install backend dependencies
cd ../server
npm install
```

### 2. Set Up PostgreSQL

**Option A: Local PostgreSQL (macOS)**
```bash
brew install postgresql
brew services start postgresql
createdb espress
```

**Option B: Docker**
```bash
docker run --name espress-db -e POSTGRES_DB=espress -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:15
```

### 3. Run Migrations

```bash
cd server
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/espress"
for file in migrations/*.sql; do psql $DATABASE_URL -f "$file"; done
```

### 4. Environment Variables

**server/.env**
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/espress
CLERK_SECRET_KEY=sk_test_xxxxx
PORT=3001
```

**client/.env.local**
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxx
CLERK_SECRET_KEY=sk_test_xxxxx
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=AIza_xxxxx
```

### 5. Get API Keys

**Clerk**
1. Create account at [clerk.com](https://clerk.com)
2. Create application
3. Copy keys from API Keys section
4. Add `http://localhost:3000` to allowed origins

**Google Maps**
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Enable: Places API, Places API (New), Maps JavaScript API
3. Create API key, restrict to `http://localhost:3000/*`

### 6. Run

**Terminal 1 - Backend:**
```bash
cd server
npm run dev
# Runs on http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
cd client
npm run dev
# Runs on http://localhost:3000
```
