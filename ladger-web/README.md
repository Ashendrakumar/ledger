# Ladger download page (Next.js)

1. Copy your APK to `public/Ladger.apk`.
2. `npm install`
3. `npm run dev` to preview, `npm run build && npm start` to run in production.

Edit `lib/config.ts` for the app name, version, APK link, checksum and developer name.
Edit `lib/features.ts` for the feature cards and questions.

To host on any static host (Netlify Drop, GitHub Pages, shared hosting), uncomment
`output: 'export'` in `next.config.mjs`, run `npm run build`, and upload the `out/` folder
(your `Ladger.apk` is copied into it).
Vercel and Netlify also deploy the project directly from Git with no changes.
