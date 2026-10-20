"""Mock project week, copied from the design prototype.

Per the handoff, the only named person is the signed-in user. Crew, PM and site
contacts come from J2, so they stay as role labels here.
"""

USER = {
    "username": "justin",
    "first_name": "Justin",
    "last_name": "Alleman",
    "email": "justin@pierson.it",
    "role": "Team lead",
}

TODAY_INDEX = 1

WEEK = {
    "job_code": "J-2231",
    "customer": "Riverside USD",
    "report_time": "6:00 AM",
    "report_location": "PCCi",
    "days": [
        {
            "day": "Mon", "date": "2026-10-19", "school": "Lincoln Elementary",
            "address": "410 Oak St, Riverside", "drive": "48 min", "site_hours": "7:00–3:30",
            "rooms": 8, "site_contact": "Facilities office", "site_phone": "",
            "arrival_window": "", "hotel_distance": "6.2 mi from site", "state": "done",
        },
        {
            "day": "Tue", "date": "2026-10-20", "school": "Riverside High",
            "address": "2200 River Rd, Riverside", "drive": "52 min", "site_hours": "7:15–3:45",
            "rooms": 6, "site_contact": "Facilities office", "site_phone": "",
            "arrival_window": "Crew arriving 7:30–8:00 AM", "hotel_distance": "4.8 mi from site",
            "state": "today",
        },
        {
            "day": "Wed", "date": "2026-10-21", "school": "Oakview Middle",
            "address": "91 Ridge Ave, Riverside", "drive": "12 min", "site_hours": "7:30–4:00",
            "rooms": 7, "site_contact": "Front office", "site_phone": "",
            "arrival_window": "", "hotel_distance": "3.1 mi from site", "state": "upcoming",
        },
        {
            "day": "Thu", "date": "2026-10-22", "school": "Westgate Elementary",
            "address": "5 Westgate Ln, Riverside", "drive": "15 min", "site_hours": "7:00–3:30",
            "rooms": 5, "site_contact": "Facilities office", "site_phone": "",
            "arrival_window": "", "hotel_distance": "5.0 mi from site", "state": "upcoming",
        },
    ],
    "crew": {"lead": "Justin Alleman", "members_note": "Crew from J2"},
    "vehicles": ["Isuzu 14 · Route A", "Sprinter 06"],
    "hotel": {
        "name": "Hampton Inn Riverside",
        "rooms": 3,
        "confirmation": "84417290",
        "check_out": "Thu Oct 22",
    },
}

RUN = {
    "truck": "Isuzu 14",
    "departs": "Tue 6:00 AM",
    "stop_number": 1,
}

LPS = [
    ("LP-000981", 'Box · ActivPanel 9 75" · Room 210'),
    ("LP-000982", 'Box · ActivPanel 9 75" · Room 212'),
    ("LP-000983", 'Box · ActivPanel 9 75" · Room 214'),
    ("LP-000984", 'Box · ActivPanel 9 75" · Room 216'),
    ("LP-000985", 'Box · ActivPanel 9 75" · Room 218'),
    ("LP-000986", 'Box · ActivPanel 9 75" · Library'),
    ("LP-000987", "Skid · 6 wall mounts, anchors, HDMI"),
]
