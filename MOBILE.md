# BatumHub Mobile

BatumHub v4.8 is prepared for a single web-first codebase with native Android and iOS containers using Capacitor 8.

## Why this architecture

The existing web app, PWA, Android app and iOS app should share the same learning engine, Supabase account/progress model, grade/CEFR logic, vocabulary memory system and responsive layouts. Capacitor adds native app lifecycle, hardware back behavior, haptics, local review reminders, splash/status bars and future native APIs without maintaining separate Android/iOS feature code.

## Current native-ready features

- Bundled/offline-capable web UI rather than a remote URL wrapper
- Android hardware back mapped to BatumHub navigation/history
- Optional native vocabulary-review notifications
- Native haptic feedback hooks for review success/warning
- Safe-area CSS for notches and gesture bars
- PWA install support remains available on the web
- Per-device Desktop / Tablet / Mobile presets
- Grades 1–3 early learner visual mode and optional Turkish helper hints

## Local setup

Capacitor 8 requires Node 22+. Android requires a current Android Studio toolchain. iOS requires a recent macOS/Xcode setup.

```bash
npm install
npm run mobile:prepare
npx cap add android
npx cap sync android
npx cap open android
```

On macOS for iOS:

```bash
npm install
npm run mobile:prepare
npx cap add ios
npx cap sync ios
npx cap open ios
```

## CI

GitHub Actions includes **Android Debug APK** as a manual workflow. It generates a test APK artifact without committing the generated Android project.

## Before store submission

1. Test on real phones and tablets, especially back navigation, keyboards, audio/video, notifications and offline startup.
2. Produce final native app icons/splash assets and screenshots.
3. Decide the App Store age/category strategy. If entering Apple's Kids Category, external web links need a parental-gate design and the app must follow the additional Kids Category privacy/link restrictions.
4. Add a parent area before exposing external publisher links to very young learners in a Kids Category build.
5. Prepare privacy policy, support URL, store metadata, Play signing/AAB and Apple signing.
6. Confirm that the store build feels app-like and includes native value beyond merely wrapping the website.

The web app remains the source of truth; native platform folders can be generated from this repository.
