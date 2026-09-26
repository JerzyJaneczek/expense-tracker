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
3. **Authentication → URL Configuration**:
   - Site URL: your Vercel URL (use `http://localhost:3000` until you deploy)
   - Redirect URLs: add `http://localhost:3000/**` and `https://<your-app>.vercel.app/**`
4. **Authentication → Emails → Magic Link** template: add the one-time code, so you can also sign in by typing it. This is needed for the home-screen app on iPhone, which can't receive a link. For example:
   ```html
   <h2>Sign in to Tally</h2>
   <p><a href="{{ .ConfirmationURL }}">Sign in</a></p>
   <p>Or enter this code: <strong>{{ .Token }}</strong></p>
   ```
5. Optional: to stop other people signing up, go to **Authentication → Sign In / Providers** and turn off *Allow new users to sign up* after you've signed in once. Row Level Security already keeps each account's data private.

## 2. Run locally
```bash
cp .env.local.example .env.local   # fill in URL + publishable (or anon) key from Project Settings → API
npm install
npm run dev
```
Open http://localhost:3000 and sign in with your email. The default categories are created on first sign-in.

## 3. Deploy to Vercel
1. Push this repo to GitHub.
2. [vercel.com/new](https://vercel.com/new) → import the repo (framework: Next.js).
3. Add the environment variables `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Deploy, then add the Vercel URL to Supabase's Site URL and Redirect URLs (step 1.3).
5. On your phone, open the URL and choose **Share → Add to Home Screen**.

## Project layout
```
supabase/schema.sql            tables (tags, entries, entry_tags) + RLS policies
src/proxy.ts                   refreshes the session, redirects signed-out users to /login
src/lib/supabase/              browser / server / proxy Supabase clients
src/lib/data.ts                all database reads & writes
src/app/login/                 magic link + code sign-in
src/app/(app)/page.tsx         month dashboard
src/app/(app)/compare/         tag comparison
src/app/(app)/tags/            manage categories & people
src/components/                entry form, entry list, tag chips, etc. (ui/ = shadcn)
```
