# GUA Android

Private-use Android companion for the Guatemala Citizenship Academy.

## What it does
- Opens the live Guatemala Academy.
- Generates gym-friendly Spanish practice episodes locally using Android TextToSpeech.
- Plays generated lessons in the background using AndroidX Media3 `MediaSessionService`.
- Shows lock-screen / notification media controls through the Android media session.
- Loads Spanish-language internet radio from the free, open Radio Browser directory.
- Stores a ChatGPT GUA Project URL locally and opens it in ChatGPT/browser.

## Privacy
The Android source does not embed personal citizenship history. Personal conversation context belongs in the ChatGPT GUA Project instructions. The GUA Project URL is stored only in Android SharedPreferences.

## Build
The GitHub Actions workflow `GUA Android APK` builds a debug APK suitable for sideloading.

## Install
Enable installation from the browser/file-manager you use, then install the downloaded `GUA-debug.apk`. Android may warn because this is a sideloaded private build, not a Play Store release.
