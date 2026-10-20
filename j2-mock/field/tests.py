import io
import json

from django.core.management import call_command
from django.test import TestCase

from .models import LicensePlate, RunState


class FieldApiTests(TestCase):
    def setUp(self):
        call_command("seed", stdout=io.StringIO())
        self.client.post(
            "/api/auth/login/",
            json.dumps({"username": "justin", "password": "fieldtest"}),
            content_type="application/json",
        )

    def post(self, path, body):
        return self.client.post(path, json.dumps(body), content_type="application/json")

    def test_signed_out_is_refused(self):
        self.client.post("/api/auth/logout/")
        self.assertEqual(self.client.get("/api/field/week/").status_code, 401)

    def test_repeated_request_key_applies_once(self):
        first = self.post("/api/field/lps/LP-000981/scan/", {"action": "load", "request_key": "a"})
        again = self.post("/api/field/lps/LP-000981/scan/", {"action": "accept", "request_key": "a"})
        self.assertEqual(first.json(), again.json())
        self.assertEqual(LicensePlate.objects.get(code="LP-000981").state, "loaded")

    def test_scan_needs_request_key(self):
        res = self.post("/api/field/lps/LP-000981/scan/", {"action": "load"})
        self.assertEqual(res.status_code, 400)

    def test_unknown_lp_is_404(self):
        res = self.post("/api/field/lps/LP-999999/scan/", {"action": "load", "request_key": "b"})
        self.assertEqual(res.status_code, 404)

    def test_arrive_keeps_the_phone_time(self):
        self.post("/api/field/arrive/", {"at": "2026-10-20T12:42:00+00:00", "request_key": "c"})
        self.assertEqual(RunState.current().on_site_at.isoformat(), "2026-10-20T12:42:00+00:00")
        self.assertEqual(self.client.get("/api/field/truck/").json()["phase"], "on_site")


class MicrosoftSignInTests(TestCase):
    def setUp(self):
        call_command("seed", stdout=io.StringIO())

    def test_returns_to_app_with_a_page_not_a_redirect(self):
        res = self.client.post("/auth/microsoft/", {"next": "https://localhost/"})
        self.assertEqual(res.status_code, 200)
        self.assertContains(res, 'href="https://localhost/"')
        self.assertTrue(self.client.get("/api/auth/session/").json()["authenticated"])


class RoomsAndReportTests(FieldApiTests):
    JPEG = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAACf/EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q=="

    def test_room_needs_every_step_before_complete(self):
        res = self.post("/api/field/rooms/r0/", {"done": True, "request_key": "d1"})
        self.assertEqual(res.status_code, 400)
        self.post("/api/field/rooms/r0/", {"serial": "AP9-75-482113", "height_ok": True, "packed": True, "request_key": "d2"})
        self.post("/api/field/rooms/r0/photo/", {"image": self.JPEG, "request_key": "d3"})
        res = self.post("/api/field/rooms/r0/", {"done": True, "request_key": "d4"})
        self.assertTrue(res.json()["done"])
        self.assertTrue(res.json()["photo_url"].startswith("/media/photos/"))

    def test_serial_must_be_on_the_if(self):
        res = self.post("/api/field/rooms/r0/", {"serial": "AP9-75-000000", "request_key": "e1"})
        self.assertEqual(res.status_code, 400)

    def test_report_to_pcci_ships_and_returns_truck(self):
        res = self.post("/api/field/report/send/", {"return_to": "pcci", "ship_on_if": True, "notes": "", "request_key": "f1"})
        self.assertEqual(res.json()["if_status"], "partially_shipped")
        self.assertEqual(self.client.get("/api/field/truck/").json()["state"], "returned")

    def tearDown(self):
        from .models import Room

        for room in Room.objects.exclude(photo=""):
            room.photo.delete(save=False)
