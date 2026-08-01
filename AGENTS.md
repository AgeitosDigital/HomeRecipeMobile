# Agent / Cursor instructions — HomeRecipe Mobile

## Expo version (critical)

This project uses **Expo SDK 57**. Expo APIs change often.

**Before writing Expo or React Native code**, read the versioned docs:

https://docs.expo.dev/versions/v57.0.0/

Do not use patterns from older SDKs or generic RN tutorials without checking SDK 57.

---

## What this app is

- Native client for **HomeRecipe** (recipes, cookbooks, meal calendar, grocery, account)
- **Auth:** Clerk (`@clerk/expo`) — session token
- **Data:** Supabase JS with Clerk JWT (`accessToken`) — same backend as web
- **Import / billing:** call the **web app** via `EXPO_PUBLIC_APP_URL` (never call OpenAI or import workers from mobile)

## Getting started (for agents helping a new contributor)

1. Confirm Node 20+, `npm install`, copy `.env.example` → `.env.local` with team keys  
2. Run `npx expo start` → prefer iOS Simulator (`i`) over Expo Go for SDK 57  
3. Never commit `.env.local` or service-role / secret keys  
4. Full human setup: see [`README.md`](./README.md)

## Design / product source of truth

Prefer matching the **web app** when polishing UI or copy:

- Local (if present): `/Users/…/Documents/HomeRecipe/AI-Recipe-App/HomeRecipe/next-app`
- Tokens: accent `#dc2100`, fonts Creato Display + Playfair Display, light only
- Mobile theme: `src/constants/theme.ts`

## Code layout

| Path | Role |
|------|------|
| `src/app/(app)/(tabs)/` | Main tabs |
| `src/app/(app)/recipe/` | Detail / create / import |
| `src/components/ui.tsx` | Shared UI primitives |
| `src/components/recipe-card.tsx` | Overlay list card |
| `src/lib/*` | Supabase + entitlements + web API |
| `assets/icons/` | Tab / action SVGs |

## Branch naming

Use short kebab-case topic branches: `ui-ux`, `cookbooks`, `recipe-extraction`, `calendar`, `grocery`, `auth`, `billing`.

## Do / don’t

**Do**

- Follow existing screen patterns and theme tokens  
- Gate Pro features with entitlements (`useEntitlements`)  
- Keep hit targets ≥ 44pt; use brand SVGs not emoji icons  

**Don’t**

- Add server secrets to the mobile client  
- Port FullCalendar / video upload without an explicit request  
- Invent new design systems (purple gradients, Inter, etc.) when brand tokens exist  
- Edit plan files the user attached unless asked  
