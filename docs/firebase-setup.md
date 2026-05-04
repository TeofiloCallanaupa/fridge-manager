# Firebase Setup Guide — Fridge Manager

> Follow these steps when you're ready to enable push notifications (Phase 6.4).
> FCM is **100% free** — no Blaze plan upgrade needed.

## Step 1: Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Create a project"** (or "Add project")
3. Name it `fridge-manager` (the project ID will default to `fridge-manager` — if taken, try `fridge-manager-app`)
4. **Enable Google Analytics** — it's free with no limits and gives you notification open rates + engagement metrics
5. When prompted, select your Google Analytics account (or create one — it auto-creates a default)
6. Click **Create project**
7. Wait ~30 seconds for provisioning

## Step 2: Add an Android App

1. In the Firebase console, click **"+ Add app"** (under the project name)
2. Select **Android**
2. **Android package name**: `com.teofilo.fridgemanager` (must match `app.json` → `android.package`)
3. **App nickname**: `Fridge Manager`
4. **Debug signing certificate**: Skip for now (only needed for some auth features)
5. Click **Register app**
6. **Download `google-services.json`**
7. Place it at: `apps/mobile/google-services.json`
8. Click **Continue** through the remaining steps (we don't need to modify Gradle files — Expo handles this)

## Step 3: Generate a Service Account Key (for Edge Function)

1. In Firebase console, click the **gear icon** → **Project settings**
2. Go to the **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Download the JSON file (e.g., `fridge-manager-firebase-adminsdk-xxxxx.json`)
5. **⚠️ Do NOT commit this file to git!**

## Step 4: Store the Key as a Supabase Secret

1. Go to your [Supabase Edge Function settings](https://supabase.com/dashboard) → your project → Settings → Edge Functions
2. Scroll to **"Edge Function Secrets"**
3. Click **"Add new secret"**
4. **Name**: `FIREBASE_SERVICE_ACCOUNT_KEY`
5. **Value**: Open the downloaded service account JSON file in a text editor, copy the entire contents, and paste it here
6. Click **Save**

## Step 5: Update Expo Config

Ensure `app.json` has:

```json
{
  "expo": {
    "android": {
      "package": "com.teofilo.fridgemanager",
      "googleServicesFile": "./google-services.json"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#206140"
        }
      ]
    ]
  }
}
```

## Step 6: Test

After completing these steps, tell the agent:
```
Firebase is set up. The google-services.json is at apps/mobile/google-services.json
and FIREBASE_SERVICE_ACCOUNT_KEY is stored as a Supabase secret. Enable real FCM sending.
```

## Cost

| Feature | Free Tier (Spark) | Limit |
|---|---|---|
| **FCM Push** | ✅ Free | **Unlimited** — no cap |
| **Firebase project** | ✅ Free | Up to ~30 projects per Google account |
| **Service accounts** | ✅ Free | 100 per project |

You do **not** need multiple Gmail accounts. One account can hold all your projects.

## Security Notes

- `google-services.json` is safe to commit (it only contains public project config)
- The service account key JSON is **secret** — never commit it
- Add to `.gitignore`: already covered by default Expo `.gitignore`
