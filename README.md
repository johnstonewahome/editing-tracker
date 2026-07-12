# Editing Tracker

A Vercel-hosted video editing tracker built with Next.js and Convex. Register videos by storage path, optionally link a YouTube preview, track versions, and leave change requests while edits are in progress.

## Features

- Sign up / sign in with email and password
- Register videos with filesystem paths and optional YouTube links
- Dashboard tabs for **To Edit**, **In Progress**, and **Completed**
- Version history with path and notes per version
- Real-time comments on videos currently being edited
- Profile settings: username, avatar, password
- Admin promotion and restricted video deletion (admin or uploader)

## Tech stack

- Next.js App Router
- Convex (database, auth, file storage, real-time)
- Tailwind CSS + shadcn/ui
- Vercel deployment

## Local development

1. Install dependencies:

```bash
npm install
```

2. Configure Convex Auth keys:

```bash
npm run setup-auth
```

3. Set bootstrap admin email and site URL:

```bash
npx convex env set BOOTSTRAP_ADMIN_EMAIL admin@example.com
npx convex env set SITE_URL http://localhost:3000
```

4. Start the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The first account created with the bootstrap admin email becomes an admin.

**If signup/login shows `fetch failed`:** the Convex backend is not running. Stop `npm run dev`, run `npm run setup-auth`, then start `npm run dev` again. Both Next.js (port 3000) and Convex (port 3210) must be up.

## Deploy to production

See **[DEPLOYMENT.md](./DEPLOYMENT.md)** for the full step-by-step guide (Convex + Vercel, env vars, auth keys, and verification).

Quick summary:

1. `npx convex login` → `npx convex deploy`
2. `npm run setup-auth:prod` and set Convex `--prod` env vars
3. Import repo on Vercel with build command `npx convex deploy --cmd 'npm run build'`
4. Set `CONVEX_DEPLOY_KEY` and `NEXT_PUBLIC_CONVEX_URL` on Vercel
5. Deploy and sign up with your bootstrap admin email

## Scripts

- `npm run dev` – Next.js + Convex dev servers
- `npm run setup-auth` – generate and apply Convex Auth JWT keys (local)
- `npm run setup-auth:prod` – apply auth JWT keys to Convex production
- `npm run build` – production build
- `npm run lint` – ESLint
- `npm run typecheck` – TypeScript check
