# SmashCourt

A responsive badminton court booking and open match app for a residential community. It provides a daily schedule, a three-day calendar, resident profiles, match editing, WhatsApp sharing, and live booking sync through Firebase Authentication and Cloud Firestore.

## Requirements

- Node.js 22 or later
- npm
- A Firebase project for Google sign-in and cloud bookings (optional for local demo mode)

## Run locally

```sh
npm ci
cp .env.example .env.local
```

Fill `.env.local` with the Firebase Web app values, then run:

```sh
npm run dev
```

See [FIREBASE_SETUP.md](./FIREBASE_SETUP.md) for Google Authentication, authorized domains, Firestore rules, and production configuration.

## Production checks

```sh
npm run lint
npm run build
npm run preview
```

The generated site is written to `dist/`. Firebase Web configuration is bundled into the browser app; it is not a server secret. Keep service account keys and other private credentials out of all `VITE_*` variables and source control.

## Deploy with GitHub Pages

The workflow in [`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml) builds and publishes the site after a push to `main`. Add these repository Actions secrets before the first deployment:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_MEASUREMENT_ID` (optional)

In **Settings → Pages**, set the publishing source to **GitHub Actions**. After the first deployment, add the site's GitHub Pages hostname (for example, `your-account.github.io`) to Firebase Authentication's authorized domains. The first resident sign-in also requires publishing `firestore.rules` to the Firebase project.
