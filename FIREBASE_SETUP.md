# Firebase setup

The app uses Firebase Authentication with Google, Cloud Firestore for resident profiles and live bookings, and no Firebase Storage. The app stays in demo mode until the required Web app config values are set.

## 1. Add the Web app config

In Firebase Console, open **Project settings → General → Your apps**. Register a Web app if needed, then copy its configuration into `.env.local` in the project root:

```dotenv
VITE_FIREBASE_API_KEY=your-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_APP_ID=your-web-app-id
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
```

`VITE_FIREBASE_MEASUREMENT_ID` is optional. These are browser app identifiers, not Admin SDK credentials. Never put a service account key in this app. `.env.local` is ignored by Git. Restart the Vite server after changing it. `VITE_FIREBASE_STORAGE_BUCKET` is no longer used and may be removed.

## 2. Enable Google sign-in

In Firebase Console, open **Authentication → Sign-in method**, enable **Google**, choose a support email, and save. Under **Authentication → Settings → Authorized domains**, add the exact local hostname you use: `localhost` for `http://localhost:5173`, or `127.0.0.1` for `http://127.0.0.1:5173`. Add your deployed app's domain before deployment. Firebase's Google provider supports the Firebase JavaScript SDK popup flow used by this app. [Google sign-in setup](https://firebase.google.com/docs/auth/web/google-signin); [authorized domains](https://firebase.google.com/docs/auth/web/start).

The app takes the resident's name, email, and profile photo from their Google account. First-time residents also enter their tower/flat number; the profile is saved to Firestore. No photo upload or Storage setup is needed.

## 3. Enable Firestore and publish rules

Create a **Cloud Firestore** database in the same project. Open **Firestore Database → Rules**, replace the editor contents with [`firestore.rules`](./firestore.rules), and click **Publish**. The app stores resident profiles at `users/{Firebase UID}`, reservations at `bookings/{booking ID}`, and the per-quarter-hour conflict locks at `courtSlots/{date}_{minute}`. Rules must be published before signed-in clients can read or write. [Firestore rules setup](https://firebase.google.com/docs/rules/get-started).

## 4. Run the app

Restart the dev server with `npm run dev` after editing `.env.local`. Sign in with Google. Bookings sync across signed-in clients.
