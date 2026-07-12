# Editing Tracker — Production Deployment Guide

This guide walks you through deploying **Editing Tracker** to production using **Convex** (backend) and **Vercel** (frontend). Follow every step in order.

---

## What you are deploying

| Layer | Service | Purpose |
|-------|---------|---------|
| Frontend | [Vercel](https://vercel.com) | Next.js app (UI) |
| Backend | [Convex](https://convex.dev) | Database, auth, file storage, real-time API |

You will end up with:

- A public URL like `https://your-app.vercel.app`
- A Convex production deployment like `https://your-project.convex.cloud`
- Email/password signup, admin bootstrap, and all app features live

---

## Prerequisites

Before you start, make sure you have:

1. **Node.js 18+** and **npm 8+**

   ```bash
   node --version
   npm --version
   ```

2. A **Convex account** (free tier is fine)  
   Sign up at [https://convex.dev](https://convex.dev)

3. A **Vercel account** (free tier is fine)  
   Sign up at [https://vercel.com](https://vercel.com)

4. A **GitHub account** (recommended for automatic Vercel deploys)

5. **Git** installed

   ```bash
   git --version
   ```

6. The project working locally (optional but recommended):

   ```bash
   cd "/Applications/XAMPP/xamppfiles/htdocs/Editting Tracker"
   npm install
   npm run build
   ```

---

## Part 1 — Prepare the repository

### Step 1.1: Initialize Git (if not already done)

From the project folder:

```bash
cd "/Applications/XAMPP/xamppfiles/htdocs/Editting Tracker"
git init
git add .
git commit -m "Initial commit: Editing Tracker"
```

### Step 1.2: Create a GitHub repository

1. Open [https://github.com/new](https://github.com/new)
2. Name it (e.g. `editing-tracker`)
3. Do **not** add a README, `.gitignore`, or license (you already have them)
4. Click **Create repository**

### Step 1.3: Push to GitHub

Replace `YOUR_USERNAME` and `YOUR_REPO` with your values:

```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

---

## Part 2 — Connect Convex (cloud backend)

Your local project may currently use an **anonymous** Convex backend (`CONVEX_DEPLOYMENT=anonymous:anonymous-agent`). Production requires a **real Convex cloud project**.

### Step 2.1: Log in to Convex

```bash
cd "/Applications/XAMPP/xamppfiles/htdocs/Editting Tracker"
npx convex login
```

Complete the browser login when prompted.

### Step 2.2: Create / link a Convex project

Run:

```bash
npx convex dev
```

When prompted:

1. Choose **Create a new project** (or link an existing one)
2. Pick a project name (e.g. `editing-tracker`)
3. Wait until you see: `Convex functions ready!`

This updates `.env.local` with real cloud URLs, for example:

```env
CONVEX_DEPLOYMENT=dev:your-project-name
NEXT_PUBLIC_CONVEX_URL=https://your-dev-deployment.convex.cloud
NEXT_PUBLIC_CONVEX_SITE_URL=https://your-dev-deployment.convex.site
```

Press **Ctrl+C** to stop `convex dev` after it succeeds.

> **Important:** Do not use `CONVEX_AGENT_MODE=anonymous` for production. The `dev:backend` script uses it only for local anonymous dev. Production deploys use your logged-in Convex account.

### Step 2.3: Deploy Convex functions to production

```bash
npx convex deploy
```

Confirm when asked. This pushes your schema and functions to the **production** deployment.

Note the production URL printed in the output or in the [Convex Dashboard](https://dashboard.convex.dev). It looks like:

```text
https://happy-animal-123.convex.cloud
```

You will need this URL for Vercel.

### Step 2.4: Create a Convex deploy key for Vercel

1. Open [https://dashboard.convex.dev](https://dashboard.convex.dev)
2. Select your project
3. Go to **Settings** → **Deploy Keys** (or **URL & Deploy Key**)
4. Click **Generate Deploy Key** / **Create production deploy key**
5. Copy the key and store it somewhere safe (you will only see it once)

This value becomes `CONVEX_DEPLOY_KEY` on Vercel.

---

## Part 3 — Configure Convex production environment variables

Auth and admin bootstrap run on the **Convex production** deployment. Set these with the CLI using `--prod`.

### Step 3.1: Set auth signing keys (JWT)

From the project folder, after `npx convex login` and `npx convex deploy`:

```bash
npm run setup-auth:prod
```

You should see:

```text
Setting Convex Auth environment variables (production)...
✔ Successfully set JWT_PRIVATE_KEY
✔ Successfully set JWKS
Done.
```

> These keys are secrets. Never commit them to Git or paste them in public chat.

### Step 3.2: Set bootstrap admin email

Choose the email that should become **admin** on first signup:

```bash
npx convex env set BOOTSTRAP_ADMIN_EMAIL "you@yourdomain.com" --prod
```

Replace with your real email.

### Step 3.3: Set production site URL (placeholder)

You will set the final Vercel URL after deploy. For now, use a placeholder or your expected domain:

```bash
npx convex env set SITE_URL "https://your-app.vercel.app" --prod
```

You can update this after Vercel gives you the real URL (Step 5.5).

### Step 3.4: Verify Convex production env vars

```bash
npx convex env list --prod
```

You should see at least:

| Variable | Example |
|----------|---------|
| `JWT_PRIVATE_KEY` | (set, hidden) |
| `JWKS` | (set) |
| `BOOTSTRAP_ADMIN_EMAIL` | `you@yourdomain.com` |
| `SITE_URL` | `https://your-app.vercel.app` |

---

## Part 4 — Deploy the frontend to Vercel

### Step 4.1: Install Vercel CLI (optional but useful)

```bash
npm install -g vercel
```

Or use `npx vercel` without installing globally.

### Step 4.2: Import the project on Vercel

**Option A — Vercel Dashboard (recommended)**

1. Go to [https://vercel.com/new](https://vercel.com/new)
2. Click **Import** next to your GitHub repository
3. Configure the project:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `.` (project root)
   - **Build Command:** `npx convex deploy --cmd 'npm run build'`
   - **Output Directory:** leave default (Next.js)
   - **Install Command:** `npm install`

**Option B — Vercel CLI**

```bash
cd "/Applications/XAMPP/xamppfiles/htdocs/Editting Tracker"
npx vercel login
npx vercel link
```

Follow prompts to link the folder to a Vercel project.

### Step 4.3: Add environment variables on Vercel

In the Vercel project: **Settings** → **Environment Variables**

Add each variable for **Production** (and optionally Preview/Development):

| Name | Value | Where to get it |
|------|-------|-----------------|
| `CONVEX_DEPLOY_KEY` | `prod:xxxx...` | Convex Dashboard → Settings → Deploy Keys |
| `NEXT_PUBLIC_CONVEX_URL` | `https://....convex.cloud` | Convex Dashboard → production deployment URL |
| `BOOTSTRAP_ADMIN_EMAIL` | `you@yourdomain.com` | Same email you set in Convex `--prod` |

Notes:

- `NEXT_PUBLIC_CONVEX_URL` must be the **production** Convex URL (ends with `.convex.cloud`).
- If you use the build command `npx convex deploy --cmd 'npm run build'`, Convex may inject `NEXT_PUBLIC_CONVEX_URL` at build time. Setting it explicitly on Vercel is still recommended for clarity.
- Do **not** set `CONVEX_AGENT_MODE` on Vercel.

### Step 4.4: Deploy

**From Vercel Dashboard:** click **Deploy** on the imported project.

**From CLI:**

```bash
npx vercel --prod
```

Wait for the build to finish. Copy your live URL, e.g.:

```text
https://editing-tracker.vercel.app
```

---

## Part 5 — Post-deploy configuration

### Step 5.1: Update Convex `SITE_URL` to your real Vercel URL

```bash
npx convex env set SITE_URL "https://YOUR-ACTUAL-VERCEL-URL.vercel.app" --prod
```

Use the exact URL Vercel shows (no trailing slash).

### Step 5.2: Redeploy if you changed env vars only on Vercel

If you added or changed Vercel environment variables after the first deploy:

1. Vercel Dashboard → **Deployments** → **Redeploy** (latest deployment)

Or:

```bash
npx vercel --prod
```

### Step 5.3: Create your admin account

1. Open your live site: `https://YOUR-ACTUAL-VERCEL-URL.vercel.app`
2. Go to **Sign up**
3. Use the **same email** as `BOOTSTRAP_ADMIN_EMAIL`
4. Choose a username and password (minimum 8 characters)
5. You should land on the dashboard as an **admin**

### Step 5.4: Smoke-test the app

Verify on production:

- [ ] Sign up / sign in / sign out
- [ ] Register a video (path + optional YouTube link)
- [ ] Dashboard **Active** tab shows to-edit and in-progress videos
- [ ] Change video status to **In Progress**
- [ ] Add a comment on an in-progress video
- [ ] Add a second version
- [ ] Upload avatar and change username in **Settings**
- [ ] **Admin** panel lists users (admin only)
- [ ] Delete a video as uploader or admin

### Step 5.5: Custom domain (optional)

1. Vercel → **Settings** → **Domains**
2. Add your domain and follow DNS instructions
3. Update Convex production `SITE_URL` to match:

   ```bash
   npx convex env set SITE_URL "https://yourdomain.com" --prod
   ```

---

## Part 6 — Ongoing deployments

After the first setup, every push to `main` can auto-deploy if Vercel Git integration is enabled.

### Typical workflow

```bash
# Make changes locally
git add .
git commit -m "Describe your change"
git push origin main
```

Vercel builds and deploys automatically.

### When you change Convex schema or functions

Convex deploy runs as part of the Vercel build if you use:

```text
npx convex deploy --cmd 'npm run build'
```

Or deploy Convex manually before pushing:

```bash
npx convex deploy
```

---

## Environment variable reference

### Vercel (frontend)

| Variable | Required | Description |
|----------|----------|-------------|
| `CONVEX_DEPLOY_KEY` | Yes | Lets Vercel deploy Convex during build |
| `NEXT_PUBLIC_CONVEX_URL` | Yes | Production Convex HTTP API URL |
| `BOOTSTRAP_ADMIN_EMAIL` | Recommended | Email that gets admin on first signup |

### Convex production (`--prod`)

| Variable | Required | Description |
|----------|----------|-------------|
| `JWT_PRIVATE_KEY` | Yes | Auth signing key (via `npm run setup-auth:prod`) |
| `JWKS` | Yes | Public JWKS for auth (via `npm run setup-auth:prod`) |
| `BOOTSTRAP_ADMIN_EMAIL` | Yes | Admin bootstrap email |
| `SITE_URL` | Yes | Public site URL (your Vercel or custom domain) |

### Local only (`.env.local` — do not commit)

| Variable | Description |
|----------|-------------|
| `CONVEX_DEPLOYMENT` | Dev deployment name |
| `NEXT_PUBLIC_CONVEX_URL` | Dev Convex URL |
| `NEXT_PUBLIC_CONVEX_SITE_URL` | Dev Convex site URL for HTTP actions |

---

## Troubleshooting

### `fetch failed` on signup or login

**Cause:** Frontend cannot reach Convex, or auth keys are missing.

**Fix:**

1. Confirm `NEXT_PUBLIC_CONVEX_URL` on Vercel matches production Convex URL
2. Run `npx convex env list --prod` and confirm `JWT_PRIVATE_KEY` and `JWKS` exist
3. Re-run `npm run setup-auth:prod` if keys are missing
4. Redeploy Vercel

### `A local backend is still running on port 3210`

**Cause:** Old local Convex process still running.

**Fix:**

```bash
kill -9 $(lsof -ti :3210) 2>/dev/null
kill -9 $(lsof -ti :3211) 2>/dev/null
```

Then run `npx convex deploy` or `npm run dev` again.

### Vercel build fails on `convex deploy`

**Cause:** Missing or invalid `CONVEX_DEPLOY_KEY`.

**Fix:**

1. Regenerate deploy key in Convex Dashboard
2. Update `CONVEX_DEPLOY_KEY` on Vercel
3. Redeploy

### Admin role not applied after signup

**Cause:** Signup email does not match `BOOTSTRAP_ADMIN_EMAIL`.

**Fix:**

1. Confirm exact email (case-insensitive match is used in code, but use the same address)
2. Check Convex production env: `npx convex env list --prod`
3. Sign up with the correct email, or promote user manually via another admin in **Admin** panel

### Images / YouTube thumbnails not loading

**Cause:** `next.config.ts` remote image patterns.

**Fix:** Ensure production build includes `i.ytimg.com`, `img.youtube.com`, and `images.unsplash.com` in `images.remotePatterns` (already configured in this project). Redeploy after any config change.

---

## Quick command checklist

```bash
# One-time setup
npx convex login
npx convex dev                    # link project, then Ctrl+C
npx convex deploy
npm run setup-auth:prod
npx convex env set BOOTSTRAP_ADMIN_EMAIL "you@yourdomain.com" --prod
npx convex env set SITE_URL "https://your-app.vercel.app" --prod

# Git + Vercel
git push origin main
npx vercel --prod

# After you know final URL
npx convex env set SITE_URL "https://YOUR-ACTUAL-URL.vercel.app" --prod
```

---

## Security reminders

- Never commit `.env.local` or deploy keys to Git (`.gitignore` already excludes `.env*`)
- Rotate `CONVEX_DEPLOY_KEY` if it is ever exposed
- Use a strong admin password
- Only share production URLs with your team

---

## Support links

- Convex docs: [https://docs.convex.dev](https://docs.convex.dev)
- Convex + Vercel: [https://docs.convex.dev/production/hosting/vercel](https://docs.convex.dev/production/hosting/vercel)
- Convex Auth: [https://labs.convex.dev/auth](https://labs.convex.dev/auth)
- Vercel docs: [https://vercel.com/docs](https://vercel.com/docs)
