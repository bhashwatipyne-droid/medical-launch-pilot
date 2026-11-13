# Medical Launch Tracker (pilot)

The medical product launch flow from the PMT prototype (`prototype/medical-launch-flow` in pmt-work-management), running on real data.

- **Screens:** the prototype's own React app, unchanged, in `src/pmt` (Home, Projects/launches, launch detail with stage forms, Approvals, Team, Profile, notifications). Hosted by Next.js 15 (`app/page.tsx`), with hash routes like `/#/dashboard` as in the prototype.
- **Rules:** the prototype's launch rules (`src/pmt/demo/server.js`): seven stages, manager approval at each, CEO gates at Costing and Packaging, send-back with a note, notifications. They run **on the server** (`app/api/[...path]`) as the signed-in person, with role checks added so nobody can skip a step by calling the API directly.
- **Data:** Supabase. Sign-ins are Supabase Auth. Records live in `ml_ws_records` (one row per launch, product, approval, notification, person), saved atomically through `ml_ws_commit` with a version check so two people saving at once never overwrite each other. The browser has no direct access to these tables; only the server, with the secret key.

## Set up

1. Apply `supabase/migrations/*.sql` in order (already applied to the shared project).
2. Environment variables (Vercel and `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (the `sb_secret_…` key; server only, mark it Sensitive).
3. First admin: `npm run seed:admin -- you@company.com "Full Name" "password"`, or create the user in Supabase Auth and add them to `ml_ws_records` as a `users` record. Everyone else: Team page.
4. `npm install && npm run dev`, open http://localhost:3000.

Browser push (optional): set the `NEXT_PUBLIC_FIREBASE_*` variables and `FIREBASE_SERVICE_ACCOUNT` (see `.env.example`) and people are offered push notifications after signing in. Each browser's token is stored in `ml_ws_records` (`pushTokens`); after any save that creates a notification, the server sends a data-only push to that person's browsers, and `public/firebase-messaging-sw.js` shows it. Without the variables nothing changes: in-app notifications work as before.

Not in the pilot: email, file uploads (stages take Drive links), password-reset emails (an admin sets a new password from Team).

## Checks

```
npm run build
DATABASE_URL=postgres://... npm run test:flow   # whole launch flow as each role, on a scratch Postgres with the migrations
```
