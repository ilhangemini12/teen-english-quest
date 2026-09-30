# GUA Android v1.2

Personal Android companion for the Guatemala Citizenship Academy.

## v1.2
- Multi-mirror Radio Browser loading with local last-known-good cache.
- Persistent bottom player with previous, play/pause, next and playback speed.
- CC captions for locally generated GUA audio with karaoke-style approximate word highlighting based on current segment playback position.
- A2 / B1 / B1+ / B2 level selector. It changes local Spanish TTS pace and the density/difficulty of the adaptive weekly episode.
- VOA Español shortcuts for Avance Informativo, Buenos Días América, El Mundo al Día, podcasts and Guatemala coverage.
- In-app update checker backed by public GitHub Releases.
- The signing keystore is stored only as an AES-256/PBKDF2 encrypted blob; the decryption password remains only in GitHub Actions Secrets. The private key is never committed in plaintext.
- Automatic daily update check; new APK can be downloaded in-app and handed to Android's installer.

## Update security
Android requires the same application ID and signing certificate for an APK to update an installed app. v1.2 is the first GUA version built with the stable long-lived signing key. Because v1.1 used an ephemeral CI debug key, upgrading from v1.1 to v1.2 requires one final uninstall/reinstall. Versions after v1.2 can update through the app, subject to Android's package-install confirmation/security settings.

## Privacy
Academy personal state is copied only to the app's private internal storage for adaptive podcast generation. It is not committed to GitHub. The signing private key is not stored in source control.
