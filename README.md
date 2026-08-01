# HomeRecipe Mobile

Expo (SDK **57**) app for [HomeRecipe](https://github.com/AgeitosDigital/HomeRecipeMobile). Shares Clerk auth + Supabase data with the web app.

Use this README to get a machine running. Cursor / Claude should also read [`AGENTS.md`](./AGENTS.md).

---

## Prerequisites

Install these before cloning:

| Tool | Notes |
|------|--------|
| **Node.js 20+** | LTS recommended (`node -v`) |
| **npm** | Comes with Node |
| **Git** | |
| **Xcode** (macOS) | For iOS Simulator — App Store → Xcode → open once to finish install |
| **Android Studio** (optional) | Only if you need Android emulator |
| **Expo CLI** | Not required globally — use `npx expo` |

Optional but useful:

- [Expo Orbit](https://expo.dev/orbit) or the Expo dashboard account for EAS builds later
- Access to the team’s Clerk + Supabase keys (ask a teammate — never commit secrets)

---

## Clone & install

```bash
git clone https://github.com/AgeitosDigital/HomeRecipeMobile.git
cd HomeRecipeMobile
git checkout ui-ux   # or main / your feature branch
npm install
```

---

## Environment

```bash
cp .env.example .env.local
```

Fill in `.env.local` (client-safe values only):

| Variable | Purpose |
|----------|---------|
| `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (`pk_…`) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase anon / publishable key |
| `EXPO_PUBLIC_APP_URL` | Web app origin (import API + billing links), e.g. `https://your-app.vercel.app` or `http://localhost:3000` |

Rules:

- **Never** put server secrets, service-role keys, or Stripe secret keys in this repo
- `.env.local` is gitignored — do not commit it
- Ask your partner for a copy of working keys if you don’t have dashboard access

---

## Run the app

```bash
npx expo start
```

Then:

- Press **`i`** — iOS Simulator (recommended on Mac)
- Press **`a`** — Android emulator (if installed)
- Scan QR with Expo Go — **may not work** yet for SDK 57; prefer simulator or an EAS development build

Scripts from `package.json`:

```bash
npm start          # same as npx expo start
npm run ios
npm run android
npm run web        # limited; product UI is native-first
```

### First-time iOS Simulator tips

1. Open **Xcode → Settings → Platforms** and install an iOS runtime if needed  
2. Boot a simulator once from Xcode (**Open Developer Tool → Simulator**)  
3. From the Expo terminal, press `i`

---

## Project map (for humans & LLMs)

```
src/app/                 Expo Router screens
  (app)/(tabs)/          Home, Cookbooks, Calendar, Grocery, Account
  (app)/recipe/          Detail, create, import
  sign-in.tsx            Clerk email OTP + hosted auth
src/components/          UI kit, recipe card, SVG icons
src/constants/theme.ts   Brand tokens (match web)
src/lib/                 Supabase queries, entitlements, web BFF helpers
assets/brand|icons|fonts Brand assets
```

**Stack:** Expo 57 · React Native 0.86 · Expo Router · Clerk Expo · Supabase JS · Creato Display + Playfair  

**Design source of truth (web):** local checkout if you have it —  
`~/Documents/HomeRecipe/AI-Recipe-App/HomeRecipe/next-app`  
(or the team’s HomeRecipe web repo). Mobile tokens mirror `app/globals.css`.

---

## Branch naming

Keep branches short and topic-based (kebab-case):

| Topic | Branch example |
|-------|----------------|
| UI / UX | `ui-ux` |
| Recipe import / extraction | `recipe-extraction` |
| Cookbooks | `cookbooks` |
| Calendar | `calendar` |
| Grocery | `grocery` |
| Auth | `auth` |
| Billing | `billing` |

```bash
git checkout main
git pull
git checkout -b cookbooks
```

---

## Cursor / AI workflow

1. Open this folder in Cursor  
2. Point the agent at **`AGENTS.md`** (always applied via `CLAUDE.md`)  
3. For Expo APIs, use **SDK 57 docs**: https://docs.expo.dev/versions/v57.0.0/  
4. Prefer matching the **web app** UX/copy over inventing new patterns  
5. Do not invent env vars or put secrets in code

---

## Common issues

| Problem | Fix |
|---------|-----|
| Blank / missing env errors | Ensure `.env.local` exists and restart `npx expo start` |
| Expo Go won’t open | Use iOS Simulator or EAS dev build (`eas.json` is in repo) |
| Clerk sign-in fails | Check publishable key + Clerk allowed redirect / native scheme `homerecipemobile` |
| Supabase RLS errors | Confirm you’re using the same Clerk JWT → Supabase third-party auth setup as web |
| Fonts look wrong | First launch loads Creato + Playfair; wait for splash / reload |

---

## Related repos

- **Mobile (this):** https://github.com/AgeitosDigital/HomeRecipeMobile  
- **Web:** team HomeRecipe / AI-Recipe-App repo (ask partner for link if you don’t have it)

Questions about keys or product behavior → ask your teammate before changing auth or billing code.
