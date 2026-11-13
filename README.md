# Medical Launch Tracker (pilot)

Tracks every medical product launch from first sample to dispatch. Each launch holds products (main unit, variants, accessories, parts). Each product moves through seven stages, owned by different teams, with manager approval at every stage and CEO approval at two gates.

| # | Stage | Owner team | CEO gate |
|---|-------|-----------|----------|
| 1 | Sample: brief & first sample | Product | |
| 2 | Sourcing: raw materials & timeline | Procurement | |
| 3 | Costing: material & cost verification, final sample | Product | yes (sends back to Sample) |
| 4 | BOM: bill of materials | R&D | |
| 5 | Packaging: box content, approval form, projection, box design | Graphics, with Product | yes (sends back to Packaging) |
| 6 | Purchase: first purchase order | Purchase | |
| 7 | Production: ready for dispatch | Production | |

A team fills its stage and submits it. The team's manager approves (not the person who submitted). At the two gates the CEO approves after the manager. Any approver can send the product back to the same or an earlier stage with a note. The launch window is split across the stages by weight automatically, and managers can adjust dates.

**Stack:** Next.js 15 (App Router, TypeScript, Tailwind), Supabase Auth and Postgres. All rules live in the database (`supabase/migrations`), so the app cannot be tricked into skipping a step.

## How it is secured

- Every table is prefixed `ml_` (the Supabase project is shared with other apps) and has row security on.
- Browsers can only read. Every change goes through a `ml_*` database function that checks who you are, your team and your role, and the state of the product.
- Anyone who signs up in the shared project but has no `ml_profiles` row sees nothing.
- The service-role key is used only on the server (Team page, `seed:admin`).

## Set up

1. Apply the migration in `supabase/migrations/` to your Supabase project (already applied to `occiztgbyxtslbuhtavb`).
2. `cp .env.example .env.local` and fill in the three values.
3. Create the first CEO sign-in, then use the Team page for everyone else:
   ```
   npm install
   npm run seed:admin -- ceo@yourcompany.com "Full Name" "a-long-password"
   ```
4. `npm run dev`, open http://localhost:3000.

### Deploy on Vercel

Import the repo, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY`, and deploy. In Supabase, Authentication > URL configuration, add the deployed URL. Turn off "Allow new users to sign up" if this project should be invite-only (the Team page creates sign-ins itself).

## Checks

```
npm run typecheck
npm test                       # permission and formatting rules
DATABASE_URL=... npm run db:test   # full approval flow in a rolled-back transaction
```

`supabase/tests/scenario.sql` walks two products through all seven stages, covering manager and CEO approvals, send-back, shared Packaging fields, and the checks that stop the wrong person acting. It rolls back, but run it against a scratch database, not production: it writes auth users inside its transaction.
