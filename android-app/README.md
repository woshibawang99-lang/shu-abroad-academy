# ShuAbroadAcademy Android internal test app

This is a small native Android WebView app for the hosted ShuAbroadAcademy website.

- App name: `ShuAbroadAcademy`
- Application ID: `com.shuabroad.academy`
- Website: `https://shu-abroad-academy.vercel.app`
- Minimum Android version: Android 8.0 (API 26)

The app keeps cookies and website storage, supports file selection/upload, downloads, page navigation and an offline retry screen.

## Build

The GitHub Actions workflow at `.github/workflows/build-android-apk.yml` automatically builds an installable, debug-signed APK whenever the Android project changes on `main`.

1. Push the repository to GitHub.
2. Open the repository's **Actions** tab.
3. Open the successful **Build Android APK** run.
4. Download the `ShuAbroadAcademy-internal-apk` artifact.
5. Extract the ZIP and install `app-debug.apk` on an Android device.

For a local build, install JDK 17, Android SDK API 35 and Gradle 8.9, then run `gradle :app:assembleDebug` in this directory.

