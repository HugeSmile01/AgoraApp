# Agora Business OS — Mobile App

A full-featured business management app for Filipino micro-businesses,
built with **Expo** (expo-router) and **React Native**.

Converted from the Agora Business OS web app (Vite + React) into a
fully Expo-compliant mobile project using the **expo-template-default**
as the base scaffold.

---

## What's inside

```
src/
├── app/                     # Expo Router file-based routes
│   ├── _layout.tsx          # Root layout (all providers)
│   ├── index.tsx            # Root redirect
│   ├── onboarding.tsx       # Business profile setup
│   ├── (auth)/
│   │   ├── _layout.tsx      # Auth guard
│   │   └── login.tsx        # Sign in / sign up
│   ├── (tabs)/
│   │   ├── _layout.tsx      # Bottom tab navigator
│   │   ├── index.tsx        # Dashboard (Today)
│   │   ├── pos.tsx          # Point of Sale
│   │   ├── inventory.tsx    # Inventory management
│   │   ├── expenses.tsx     # Expense tracking
│   │   └── more.tsx         # Hub for secondary screens
│   ├── reports.tsx          # Sales & profit reports
│   ├── customers.tsx        # Customers / Utang tracker
│   ├── ai.tsx               # AI Advisor (Pro tier)
│   ├── quality.tsx          # Quality management hub
│   ├── quality/             # Quality sub-modules (12 screens)
│   ├── settings.tsx         # App & profile settings
│   └── upgrade.tsx          # Pricing / upgrade plans
│
├── lib/
│   ├── storage.ts           # AsyncStorage adapter (replaces localStorage + IndexedDB)
│   ├── db.ts                # Data layer (replaces idb/IndexedDB)
│   ├── supabase.ts          # Supabase client (expo-constants env vars)
│   ├── sync.ts              # Cloud sync queue (Cloud/Pro tiers)
│   ├── notifications.ts     # Push notifications (expo-notifications)
│   ├── constants.js         # Business types [unchanged from web]
│   ├── financials.js        # Financial calculations [unchanged from web]
│   └── ai.js                # AI/OpenRouter integration [unchanged from web]
│
├── hooks/
│   ├── useAuth.tsx          # Auth context (AsyncStorage-backed)
│   ├── useTier.tsx          # Subscription tier (AsyncStorage-backed)
│   └── useNetworkStatus.ts  # Online/offline (NetInfo)
│
└── constants/
    └── theme.ts             # Colors, spacing, Agora brand palette
```

---

## Web -> Mobile: What changed

| Web (Vite + React)            | Mobile (Expo + React Native)              |
|-------------------------------|-------------------------------------------|
| react-router-dom              | expo-router (file-based)                  |
| localStorage                  | AsyncStorage via storage.ts               |
| IndexedDB / idb               | AsyncStorage + JSON encoding via db.ts    |
| HTML div, button, input       | View, TouchableOpacity, TextInput         |
| CSS classes + CSS files       | StyleSheet.create()                       |
| recharts                      | Custom bar charts with View widths        |
| Browser Notification API      | expo-notifications                        |
| Vite import.meta.env          | expo-constants / EXPO_PUBLIC_ prefix      |
| Service Worker / PWA          | Native iOS/Android app                    |
| Sidebar navigation            | Bottom tab bar                            |

---

## Getting started

### Prerequisites
- Node.js 18+
- Expo CLI: npm install -g expo
- iOS: Xcode (Mac) or Expo Go
- Android: Android Studio or Expo Go

### Install
```bash
cd agora-mobile
npm install
```

### Configure (optional)
Copy `.env.example` to `.env` and fill in Supabase credentials.
Leave them blank for Libre mode (offline only).

### Run
```bash
npx expo start           # Expo Dev Tools
npx expo start --ios     # iOS simulator
npx expo start --android # Android emulator
```

### Expo Go
Install Expo Go on your phone and scan the QR code.

---

## Tiers

| Feature               | Libre (Free) | Cloud (299/mo) | Pro (799/mo) |
|-----------------------|:------------:|:--------------:|:------------:|
| POS & sales           | Yes          | Yes            | Yes          |
| Inventory             | Yes          | Yes            | Yes          |
| Expenses              | Yes          | Yes            | Yes          |
| Reports               | Yes          | Yes            | Yes          |
| Quality management    | Yes          | Yes            | Yes          |
| Offline-first storage | Yes          | Yes            | Yes          |
| Cloud sync            |              | Yes            | Yes          |
| AI Advisor            |              |                | Yes          |

---

## Build for production

```bash
npm install -g eas-cli
eas login
eas build --platform ios
eas build --platform android
```

## Security

- Use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY` for client-safe cloud access.
- Keep private service keys out of the app bundle.
- The AI Advisor runs locally by default, so no AI API key is needed on the client.
