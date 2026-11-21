# ARISE: Shadow Monarch — 3D Idle RPG (Expo React Native Web + PWA)

A Solo Leveling-inspired 3D cel-shaded Idle RPG built with **Expo (React Native Web)**, **TypeScript**, and **Three.js**, pre-configured as an installable **Progressive Web App (PWA)** so you can publish it to the web and tap **Add to Home Screen** on iPhone or Android for a fullscreen native-like experience.

## Quick Start (Local)

```bash
npm install
npx expo start --web
```

## Publish to the Web (Free)

Build the static PWA bundle:

```bash
npx expo export --platform web
```

This outputs a ready-to-host `dist/` folder. Deploy `dist/` to:
- **Vercel**: `npx vercel --prod` (set output directory to `dist`)
- **Netlify**: Drag and drop `dist/` onto Netlify Drop or run `npx netlify deploy --prod --dir=dist`
- **Expo EAS Hosting**: `npx eas deploy`

## Add to Home Screen (iOS & Android)

- **iPhone (Safari)**: Open your published URL -> tap **Share** -> **Add to Home Screen** -> **Add**. Opens fullscreen without Safari chrome using the custom Shadow Monarch icon.
- **Android (Chrome)**: Open your published URL -> tap **Install App** (or menu -> **Add to Home Screen**).

## Swapping in Custom Blender `.glb` Characters

The 3D arena (`src/components/Arena3D.tsx`) currently builds a lightweight procedural cel-shaded anime Sung Jinwoo + Shadow Army rig with `MeshToonMaterial`. To load your own sculpted Blender `.glb` characters:
1. Export your rigged model from Blender as `.glb` into `public/models/jinwoo.glb`.
2. Import `GLTFLoader` from `three/examples/jsm/loaders/GLTFLoader.js` in `Arena3D.tsx` and apply `MeshToonMaterial` + `AnimationMixer` for idle/slash clips.

## Database Setup (Supabase)

Player saves, server-side offline reward timers, and the global Hunter Association Leaderboard are pre-wired for **Supabase** (`src/lib/supabase.ts`, `src/services/playerSync.ts`, `supabase/schema.sql`).

1. Create a free project at [supabase.com](https://supabase.com), open **SQL Editor**, and run `supabase/schema.sql`.
2. In **Authentication -> Providers**, enable **Anonymous Sign-Ins** so players save to the cloud immediately with zero login wall.
3. Copy `.env.example` to `.env`, paste your `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`, then run `npx expo start --web` or `npx expo export --platform web`.
