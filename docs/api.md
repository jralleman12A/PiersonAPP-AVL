# Field API contract

What the phone app calls. `j2-mock` serves all of it today. The sign-in endpoints already exist in J2 (`J2_app/entra_sso.py`, `views.py`). The `/api/field/` endpoints are proposed additions to J2.

All requests carry J2's Django session cookie. Every write carries a `request_key` (a UUID made on the phone). J2 must apply a write once per key and return the first answer on a repeat, as `DeliveryReceipt.request_key` already does. That is what makes offline retries safe.

## Sign-in (exists in J2)

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/auth/microsoft/?next=<url>` | Starts Entra sign-in, sets the session, redirects to `next` |
| GET | `/api/auth/session/` | `{authenticated, user: {name, email, initials, role}, method, expires_in_days}` |
| POST | `/api/auth/login/` | `{username, password}`. Password fallback |
| POST | `/api/auth/logout/` | Ends the session |

## Field API (new)

| Method | Path | Body | J2 source |
| --- | --- | --- | --- |
| GET | `/api/field/week/` | | `Project`, plus the fields J2 doesn't hold yet (below) |
| GET | `/api/field/truck/` | | `VehicleRun`, `ShipmentStop`, `Bin`, `ShipmentAllocation.state` |
| POST | `/api/field/arrive/` | `{at, request_key}` | `VehicleRun` state. `at` is the time the crew tapped, which may be hours before it syncs |
| POST | `/api/field/arrival-window/` | `{sent, request_key}` | New field per stop |
| POST | `/api/field/lps/<code>/scan/` | `{action: "load" or "accept", request_key}` | `ShipmentAllocation.state` loaded → accepted |

Errors are `{"error": "<message the crew can read>"}` with a 4xx status. A 401 means the session ended; the app keeps queued writes and sends them after the next sign-in.

### `/api/field/week/` response

```json
{
  "job_code": "J-2231",
  "customer": "Riverside USD",
  "report_time": "6:00 AM",
  "report_location": "PCCi",
  "today_index": 1,
  "days": [
    {
      "day": "Tue", "date": "2026-10-20", "school": "Riverside High",
      "address": "2200 River Rd, Riverside", "drive": "52 min", "site_hours": "7:15–3:45",
      "rooms": 6, "site_contact": "Facilities office", "site_phone": "",
      "arrival_window": "Crew arriving 7:30–8:00 AM", "hotel_distance": "4.8 mi from site",
      "state": "today"
    }
  ],
  "crew": { "lead": "…", "members_note": "…" },
  "vehicles": ["Isuzu 14 · Route A"],
  "hotel": { "name": "…", "rooms": 3, "confirmation": "…", "check_out": "Thu Oct 22" },
  "run": { "on_site_at": null, "arrival_window_sent": false }
}
```

Fields J2 doesn't hold yet (site contact and hours, drive, arrival window, hotel, crew roster, report time) can be empty or `null`; the app hides them.

### `/api/field/truck/` response

```json
{
  "truck": "Isuzu 14", "departs": "Tue 6:00 AM", "stop_number": 1,
  "state": "loading", "phase": "loading", "school": "Riverside High",
  "lps": [{ "code": "LP-000981", "description": "Box · ActivPanel 9 75\" · Room 210", "state": "staged" }]
}
```

## Open questions for J2

- **App sign-in return.** The APK opens J2's `/auth/microsoft/` inside the app and J2 sends the crew back to `next=https://localhost/`. J2 must allow that target for the app only, and must return a small page that moves there with JavaScript, not a 302: Android's WebView won't let the app serve a redirect to `https://localhost` and shows "connection refused". `j2-mock` does this in `return_to_app.html`.
- **CSRF.** `j2-mock` skips CSRF checks. J2 should either exempt the field API (session + `request_key` + same-site cookie) or expose the CSRF token for the app to send.
- **Session length on phones.** `SESSION_COOKIE_AGE`; 14 days for now.
- **Roles.** Django groups → crew, team lead, PM.
- **Photos.** Stored in J2, or a SharePoint folder per job.
