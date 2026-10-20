# Testing on your phone

Your laptop runs the stand-in J2. Your phone runs the APK and talks to the laptop.

## 1. Start the server on the laptop

Follow "Run it on a laptop" in the [README](../README.md). Only step 1 (`j2-mock`) is needed for the APK. Keep it running with `0.0.0.0:8000` so the phone can reach it.

## 2. Let the phone reach the laptop

Pick one.

**Same Wi-Fi (quickest).** Find the laptop's address:

- Windows: run `ipconfig` and use the IPv4 address, for example `192.168.1.23`.
- Mac: System Settings › Wi-Fi › Details › IP address.

Your server address is then `192.168.1.23:8000`. If the phone can't connect, allow Python through the laptop firewall when Windows asks, or add a rule for port 8000. Company and guest Wi-Fi often block phone-to-laptop traffic; use Tailscale then.

**Tailscale (works anywhere, including on cellular).** Install [Tailscale](https://tailscale.com/download) on the laptop and the phone and sign in to both with the same account. The laptop's Tailscale address (starts with `100.`) is shown in the Tailscale app. Your server address is `100.x.y.z:8000`.

Check from the phone's browser first: `http://<server address>/api/auth/session/` should show `{"authenticated": false}`.

## 3. Install the APK

1. On GitHub, open **Actions** › latest **Android APK** run › download `avl-field-debug-apk` (a zip with `app-debug.apk` inside).
2. Get the APK onto the phone: open the GitHub page on the phone directly, or email or Drive it to yourself.
3. Tap the APK. Android asks to allow installs from that app (Chrome, Files, Gmail) once. Allow it, then Install.
4. Newer builds install over the old one. All builds share one test signing key, so no uninstall is needed.

Play Protect may warn that the app is unknown. That is expected for a test build: tap "Install anyway".

## 4. First launch

1. The sign-in screen asks for the server. Type the address from step 2 and tap **Save server**.
2. Tap **Sign in with Microsoft**. On the test server this opens a "Pick an account" page instead of Microsoft. Tap the account.
3. Try it offline: turn on airplane mode, tap Arrive on site and scan a few LPs. The pill shows "Offline · N queued". Turn signal back on; the queue sends by itself, or tap the pill.

To change the server later, sign out and tap the address under the buttons.

To start the day over, run `python manage.py flush --no-input` and then `python manage.py seed` in `j2-mock` on the laptop, then sign in again.

## Real Microsoft sign-in

The test page stands in for Microsoft until J2 is connected. For real Entra sign-in against J2, an Entra admin needs to:

- Add the app's return address as a redirect URI on J2's app registration.
- Allow J2 to redirect back to the app after sign-in.

Details are tracked in [api.md](api.md) under open questions.
