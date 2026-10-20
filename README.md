# AVL Field

Phone app for Pierson's AVL install crews: the day's plan, truck LPs, room-by-room install, and the end-of-day report. Android first, iOS later.

The backend is **J2 WMS** (Django, `JKim-Pierson/pcci-wms`). Until the field API lands in J2, `j2-mock/` stands in for it with the same URLs and test data.

| Folder | What it is |
| --- | --- |
| `app/` | The phone app: React + TypeScript + Vite, packaged for Android with Capacitor |
| `app/android/` | Capacitor's Android project. The APK is built from here |
| `j2-mock/` | Small Django server copying J2's sign-in endpoints plus the proposed field API |
| `docs/` | API contract and how to test on a phone |

## What works in this build

- Sign-in: "Sign in with Microsoft" runs through J2's `/auth/microsoft/` path (a test page on `j2-mock`), plus J2 username and password.
- Today: day picker, site card, arrival window, crew, vehicles, hotel, Arrive on site.
- Truck: LP list, Scan next (simulated scan for now), tap to confirm. LPs load before arrival and are accepted after.
- Offline: every update is saved on the phone first and sent when there is signal. The header pill shows the queue. J2 ignores repeats using `request_key`.

Next: camera barcode scanning, delivery receipt signature, Rooms, Report.

## Run it on a laptop

You need [Node.js 22](https://nodejs.org) and [Python 3.12+](https://www.python.org/downloads/).

```bash
# 1. Stand-in J2 (leave running)
cd j2-mock
pip install -r requirements.txt
python manage.py migrate
python manage.py seed
python manage.py runserver 0.0.0.0:8000

# 2. Phone app in the browser (second terminal, leave running)
cd app
npm install
npm run dev
```

Open http://localhost:5173. Password sign-in is `justin` / `fieldtest`.

To test on your phone, see [docs/phone-testing.md](docs/phone-testing.md).

## Get the APK

Every push to `main` builds a debug APK in GitHub Actions. Open the repo's **Actions** tab, pick the latest **Android APK** run, and download `avl-field-debug-apk` under Artifacts.
