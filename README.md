# HomeRecipe Mobile

Expo (SDK 57) app for HomeRecipe — same Clerk + Supabase backend as the web app.

## Run

```bash
cd /Users/cristianageitos/Documents/HomeRecipeMobile
npx expo start
```

Press `i` for iOS Simulator. App Store Expo Go may not support SDK 57 yet — use the simulator or an EAS development build (`eas.json` included).

## Env

Copy `.env.example` to `.env.local` with:

- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `EXPO_PUBLIC_APP_URL` (web app origin for URL import + billing links)

Never put server secrets in this project.
