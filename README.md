# Tally: expense tracker

Track monthly income (salary) and expenses (rent, bills, investments…). You tag each entry with a **category** and any number of **people**, and compare totals by clicking tags.

Built with Next.js 16, shadcn/ui, and Supabase for auth and the database. It deploys to Vercel and syncs between your laptop and your phone.

## Features
- **Month view**: income, outgoings, what's left over, and how much you invested. It also shows spending by category and entries grouped by category. **Copy last month** duplicates recurring items (salary, rent, bills) so you only have to adjust the amounts.
- **Tags & People**: add, rename, recolour and delete categories and people. You can also create them inline while adding an entry.
- **Compare**: click category or person tags and choose a period. Match **Any** or **All** selected tags (e.g. *Rent* + *Alex*). You get per-tag totals, a month-by-month chart and the matching entries.
- Amounts are in HKD. The layout is mobile friendly, and you can add it to your phone's home screen.

## 1. Set up Supabase
1. Create a project at [supabase.com](https://supabase.com).
2. **SQL Editor** → paste and run [`supabase/schema.sql`](supabase/schema.sql).
3. **Create your account** in **Authentication → Users → Add user → Create new user**. Enter your email and a password, and tick **Auto Confirm User**.
4. **Lock it down** in **Authentication → Sign In / Providers**. Turn off **Allow new users to sign up**, so your account is the only one. Row Level Security also keeps each account's data private.

## 2. Run locally
```bash
cp .env.local.example .env.local   # fill in URL + publishable (or anon) key from Project Settings → API
npm install
npm run dev
```
Open http://localhost:3000 and sign in with your email and password. The default categories are created on first sign-in.

## 3. Deploy to Vercel
1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo (framework: Next.js).
3. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Deploy.
5. On your phone, open the URL and choose **Share → Add to Home Screen**.

## Project layout
```
supabase/schema.sql            tables (tags, entries, entry_tags) + RLS policies
src/proxy.ts                   refreshes the session, redirects signed-out users to /login
src/lib/supabase/              browser / server / proxy Supabase clients
src/lib/data.ts                all database reads & writes
src/app/login/                 email + password sign-in
src/app/(app)/page.tsx         month dashboard
src/app/(app)/compare/         tag comparison
src/app/(app)/tags/            manage categories & people
src/components/                entry form, entry list, tag chips, etc. (ui/ = shadcn)
```
