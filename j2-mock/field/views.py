"""Proposed J2 field API, served from mock data. Contract in docs/api.md."""

import base64
import binascii
import functools
import json

from django.core.files.base import ContentFile
from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import data
from .models import DailyReport, LicensePlate, ProcessedRequest, Room, RunState


def api_login_required(view):
    @functools.wraps(view)
    def wrapper(request, *args, **kwargs):
        if not request.user.is_authenticated:
            return JsonResponse({"error": "Sign in required."}, status=401)
        return view(request, *args, **kwargs)

    return wrapper


def idempotent(view):
    """Apply a write once per request_key; repeats get the first answer back."""

    @functools.wraps(view)
    def wrapper(request, *args, **kwargs):
        try:
            body = json.loads(request.body or b"{}")
        except json.JSONDecodeError:
            return JsonResponse({"error": "Body must be JSON."}, status=400)
        key = body.get("request_key")
        if not key:
            return JsonResponse({"error": "request_key is required."}, status=400)
        seen = ProcessedRequest.objects.filter(request_key=key).first()
        if seen:
            return JsonResponse(seen.response)
        response = view(request, body, *args, **kwargs)
        if response.status_code == 200:
            ProcessedRequest.objects.create(request_key=key, response=json.loads(response.content))
        return response

    return wrapper


def run_json():
    run = RunState.current()
    return {
        "on_site_at": run.on_site_at.isoformat() if run.on_site_at else None,
        "arrival_window_sent": run.arrival_window_sent,
    }


def lp_json(lp):
    return {"code": lp.code, "description": lp.description, "state": lp.state}


@require_GET
@api_login_required
def week(request):
    return JsonResponse({**data.WEEK, "today_index": data.TODAY_INDEX, "run": run_json()})


@require_GET
@api_login_required
def truck(request):
    run = RunState.current()
    lps = list(LicensePlate.objects.all())
    return JsonResponse({
        **data.RUN,
        "state": "returned" if run.returned else "in_transit" if run.on_site_at else "loading",
        "phase": "on_site" if run.on_site_at else "loading",
        "school": data.WEEK["days"][data.TODAY_INDEX]["school"],
        "lps": [lp_json(lp) for lp in lps],
    })


@csrf_exempt
@require_POST
@api_login_required
@idempotent
def arrive(request, body):
    run = RunState.current()
    if not run.on_site_at:
        # The phone may have been offline, so keep the time the crew tapped, not when it arrived here.
        run.on_site_at = parse_datetime(body.get("at") or "") or timezone.now()
        run.save()
    return JsonResponse(run_json())


@csrf_exempt
@require_POST
@api_login_required
@idempotent
def arrival_window(request, body):
    run = RunState.current()
    run.arrival_window_sent = bool(body.get("sent"))
    run.save()
    return JsonResponse(run_json())


@csrf_exempt
@require_POST
@api_login_required
@idempotent
def scan_lp(request, body, code):
    """Before arrival a scan loads the LP; after arrival it is accepted on site."""
    lp = LicensePlate.objects.filter(code=code).first()
    if lp is None:
        return JsonResponse({"error": f"{code} is not on this truck."}, status=404)
    action = body.get("action")
    if action == "load" and lp.state == "staged":
        lp.state = "loaded"
    elif action == "accept":
        lp.state = "accepted"
    elif action not in ("load", "accept"):
        return JsonResponse({"error": "action must be load or accept."}, status=400)
    lp.save()
    return JsonResponse(lp_json(lp))


def room_json(room):
    return {
        "id": room.id,
        "name": room.name,
        # Lets the app check a scan against the IF before it syncs.
        "expected_serial": room.expected_serial,
        "serial": room.serial,
        "height_ok": room.height_ok,
        "wall": room.wall,
        # Relative, so it works whichever address the phone uses to reach the server.
        "photo_url": room.photo.url if room.photo else None,
        "photo_taken_at": room.photo_taken_at.isoformat() if room.photo_taken_at else None,
        "packed": room.packed,
        "done": room.done,
        "missing": room.missing(),
    }


@require_GET
@api_login_required
def rooms(request):
    return JsonResponse({
        "scope": data.SCOPE,
        "walls": Room.WALLS,
        "rooms": [room_json(r) for r in Room.objects.all()],
    })


@csrf_exempt
@require_POST
@api_login_required
@idempotent
def update_room(request, body, room_id):
    """Partial update: send only the steps that changed."""
    room = Room.objects.filter(id=room_id).first()
    if room is None:
        return JsonResponse({"error": "No such room on this job."}, status=404)
    if "serial" in body:
        serial = (body["serial"] or "").strip()
        # J2: the scan must match an ItemInstance on this IF.
        if serial and not Room.objects.filter(expected_serial=serial).exists():
            return JsonResponse({"error": f"{serial} is not on this IF."}, status=400)
        room.serial = serial
    if "height_ok" in body:
        room.height_ok = bool(body["height_ok"])
    if "wall" in body:
        if body["wall"] not in Room.WALLS:
            return JsonResponse({"error": "Unknown wall type."}, status=400)
        room.wall = body["wall"]
    if "packed" in body:
        room.packed = bool(body["packed"])
    if body.get("done"):
        if room.missing():
            return JsonResponse({"error": f"{room.name} still needs: {', '.join(room.missing())}."}, status=400)
        room.done = True
    elif "done" in body:
        room.done = False
    room.save()
    return JsonResponse(room_json(room))


@csrf_exempt
@require_POST
@api_login_required
@idempotent
def room_photo(request, body, room_id):
    """Photo arrives as a JPEG data URL with the stamp already burned in on the phone."""
    room = Room.objects.filter(id=room_id).first()
    if room is None:
        return JsonResponse({"error": "No such room on this job."}, status=404)
    header, _, encoded = (body.get("image") or "").partition(",")
    if not header.startswith("data:image/jpeg;base64"):
        return JsonResponse({"error": "Photo must be a JPEG."}, status=400)
    try:
        raw = base64.b64decode(encoded, validate=True)
    except binascii.Error:
        return JsonResponse({"error": "Photo data is damaged."}, status=400)
    if room.photo:
        room.photo.delete(save=False)
    room.photo.save(f"{data.WEEK['job_code']}-{room.id}.jpg", ContentFile(raw), save=False)
    room.photo_taken_at = parse_datetime(body.get("taken_at") or "") or timezone.now()
    room.save()
    return JsonResponse(room_json(room))


def report_json():
    report = DailyReport.current()
    shipped = report.sent_at and report.ship_on_if
    return {
        **data.FULFILLMENT,
        "if_status": "partially_shipped" if shipped else "open",
        # NetSuite push waits on RESTlet contracts (NetSuiteOutboundEvent awaiting_contract).
        "netsuite_sync": "awaiting_contract" if shipped else None,
        "sent_at": report.sent_at.isoformat() if report.sent_at else None,
        "notes": report.notes,
        "return_to": report.return_to,
        "ship_on_if": report.ship_on_if,
    }


@require_GET
@api_login_required
def report(request):
    return JsonResponse(report_json())


@csrf_exempt
@require_POST
@api_login_required
@idempotent
def send_report(request, body):
    if body.get("return_to") not in ("hotel", "pcci"):
        return JsonResponse({"error": "return_to must be hotel or pcci."}, status=400)
    report = DailyReport.current()
    report.notes = body.get("notes") or ""
    report.return_to = body["return_to"]
    report.ship_on_if = bool(body.get("ship_on_if"))
    report.sent_at = parse_datetime(body.get("at") or "") or timezone.now()
    report.save()
    run = RunState.current()
    run.returned = report.return_to == "pcci"
    run.save()
    return JsonResponse(report_json())


@csrf_exempt
@require_POST
@api_login_required
def reset(request):
    """Test helper: put the day back to the start."""
    LicensePlate.objects.update(state="staged")
    for room in Room.objects.all():
        if room.photo:
            room.photo.delete(save=False)
    Room.objects.update(serial="", height_ok=False, wall="", photo="", photo_taken_at=None, packed=False, done=False)
    RunState.objects.all().delete()
    DailyReport.objects.all().delete()
    ProcessedRequest.objects.all().delete()
    return JsonResponse({"ok": True})
