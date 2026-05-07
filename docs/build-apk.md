# Building the Fridge Manager APK

Step-by-step guide to build and install the Android APK on your phone.

---

## Prerequisites

### 1. Create a free Expo account

Go to **https://expo.dev/signup** and sign up (GitHub login works too).

> This is free. EAS Build gives you [30 free builds/month](https://expo.dev/pricing) on the free plan — more than enough.

### 2. Enable Developer Options on your Android phone

1. Go to **Settings → About Phone**
2. Tap **Build Number** 7 times
3. Go back to **Settings → Developer Options**
4. Enable **Install via USB** and **USB debugging** (optional — you can also just download the APK directly)

---

## Build Steps

Run all commands from the `apps/mobile` directory:

```bash
cd apps/mobile
```

### Step 1: Log into EAS

```bash
npx eas-cli login --sso
```

This opens your browser to sign in with Google (or whatever you used to sign up). No password needed.

To verify you're logged in:
```bash
npx eas-cli whoami
```

### Step 2: Link the project (first time only)

```bash
npx eas-cli build:configure
```

This creates the project on Expo's servers and links it to your local `app.json`. It may ask you to select an Expo account/org — pick your personal account.

### Step 3: Build the APK

```bash
npx eas-cli build --platform android --profile preview
```

**What happens:**
- EAS uploads your source code to their cloud build servers
- It installs dependencies, runs the native Android build
- Takes **10-20 minutes** the first time
- You'll see a progress URL — you can close the terminal and check later

**When it finishes**, you get a download link like:
```
✔ Build finished
🤖 Android build: https://expo.dev/artifacts/eas/xxxxx.apk
```

### Step 4: Install on your phone

**Option A — Direct download (easiest):**
1. Open the download link on your Android phone's browser
2. Tap the downloaded `.apk` file
3. Allow "Install from unknown sources" if prompted
4. Done!

**Option B — Via QR code:**
1. Go to https://expo.dev → your project → Builds
2. Find the latest build and scan the QR code with your phone

**Option C — Via USB:**
```bash
adb install path/to/downloaded.apk
```

---

## Environment Variables

The mobile app reads Supabase config from `apps/mobile/.env`. Make sure this file exists with:

```
EXPO_PUBLIC_SUPABASE_URL=https://vsjyngzffwdhqgjuoady.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
```

> These get baked into the APK at build time. If you change them, you need to rebuild.

---

## Subsequent Builds

After the first setup, future builds are just:

```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Not logged in` | Run `npx eas-cli login` |
| `google-services.json` missing | Make sure `apps/mobile/google-services.json` exists (Firebase config for FCM) |
| Build fails on native deps | Check the build logs at the Expo dashboard URL |
| App crashes on launch | Check Sentry dashboard or run `adb logcat` via USB |

---

## Build Profiles

The `eas.json` has 3 profiles:

| Profile | Output | Use case |
|---------|--------|----------|
| `preview` | `.apk` | Sideload on your phone for testing |
| `development` | Dev client | Live reload during development |
| `production` | `.aab` | Google Play Store upload |
