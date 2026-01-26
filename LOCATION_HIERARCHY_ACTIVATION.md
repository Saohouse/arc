# Location Hierarchy Feature Activation Guide

The hierarchical location system (Countries > Provinces > Cities > Towns) is **ready but temporarily disabled** until the database migration runs.

## ✅ What's Ready

1. **Prisma Schema** - Updated with `locationType` and `parentLocationId` fields
2. **Migration File** - Created at `prisma/migrations/20260126012348_add_location_hierarchy/migration.sql`
3. **UI Components** - All forms and pages updated with hierarchy support
4. **Code is Backwards Compatible** - App works with or without migration

## 🚀 How to Activate

### Step 1: Add DIRECT_URL to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard) → Your `arc` project
2. Click **Settings** → **Environment Variables**
3. Add new variable:
   - **Name:** `DIRECT_URL`
   - **Value:** `postgresql://bd2df39aab13027ba60b647655b1ce61cfbce9b52fae36a42aadf509458b7d9b:sk_BeLXkEwRHv4iVohkHaFLR@db.prisma.io:5432/postgres?sslmode=require`
   - **Environments:** Check all (Production, Preview, Development)
4. Click **Save**

### Step 2: Update `prisma.config.ts`

Make sure your `prisma.config.ts` has the `directUrl` configured:

```typescript
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  engine: "classic",
  datasource: {
    url: env("DATABASE_URL"),
    directUrl: env("DIRECT_URL"), // ✅ This line should be present
  },
});
```

### Step 3: Deploy to Vercel

The migration will run automatically during deployment (see `package.json` build script: `"build": "prisma migrate deploy && next build"`).

```bash
git add .
git commit -m "Add location hierarchy feature (ready for migration)"
git push origin main
```

Vercel will automatically apply the migration during the build!

### Step 4: Enable the Code

After successful deployment, uncomment all the "TODO" sections in these files:

#### Query Files (uncomment database queries):
- `app/archive/locations/page.tsx` - Lines with `locationType`, `parentLocationId`, `parent`, `children`
- `app/archive/characters/new/page.tsx` - Location query with hierarchy fields  
- `app/archive/characters/[id]/edit/page.tsx` - Location query with hierarchy fields

#### Form Files (uncomment UI and server actions):
- `app/archive/locations/new/page.tsx`:
  - Line ~60: Uncomment `allLocations` query
  - Lines in form JSX: Uncomment location type & parent selectors
  - Server action: Uncomment `locationType` and `parentLocationId` variables and data fields

- `app/archive/locations/[id]/edit/page.tsx`:
  - Line ~80: Uncomment `allLocations` query
  - Lines in form JSX: Uncomment location type & parent selectors
  - Server action: Uncomment `locationType` and `parentLocationId` variables and data fields

- `app/api/locations/create/route.ts`:
  - Server action: Uncomment `locationType` and `parentLocationId` variables and data fields

#### Search for TODOs:
```bash
grep -r "TODO: Uncomment after running migration" app/
```

## 📋 Features You'll Get

Once activated, you'll have:

### 📍 Locations Page
- **Grouped view** by location type (Countries, Provinces, Cities, Towns)
- **Collapsible sections** for each group
- **Breadcrumb paths** showing full hierarchy (e.g., "Valoria > Luminaire Province > Capital City")
- **Icons** for each type (🌍 Countries, 🏛️ Provinces, 🏙️ Cities, 🏘️ Towns)

### ✏️ Location Forms
- **Location Type** selector (Country, Province, City, Town, Standalone)
- **Parent Location** selector (filtered by type for valid hierarchies)
- **Validation** prevents circular references

### 👥 Character Home Location
- Shows full hierarchy path in selector
- Icons for location types
- Breadcrumb display (e.g., "🏙️ Valoria > Luminaire Province > Capital City")

## 🔍 Verify Migration Worked

After deployment, check:

1. Visit Locations page - should see grouped sections
2. Create new location - should see Type and Parent dropdowns
3. No console errors about "unknown field locationType"

## ❓ Troubleshooting

**If migration fails during Vercel deployment:**
- Check Vercel deployment logs for Prisma errors
- Verify `DIRECT_URL` environment variable is set correctly
- Ensure `prisma.config.ts` has `directUrl` configured

**If still having issues:**
- Contact Vercel support to run the SQL manually (they can do it quickly)
- Or switch to a database provider with better query interface (Neon, Supabase)

## 🎉 Example Usage

After activation, you can create:
```
🌍 Valoria (Country)
  └─ 🏛️ Luminaire Province (Province in Valoria)
      └─ 🏙️ Capital City (City in Luminaire Province)
          └─ 🏘️ Riverside Village (Town in Capital City)
```

Enjoy your organized locations! 🚀
