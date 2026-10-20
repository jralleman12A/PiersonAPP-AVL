"""Proposed J2 field API, served from mock data. Contract in docs/api.md."""

import functools
import json

from django.http import JsonResponse
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from . import data
from .models import LicensePlate, ProcessedRequest, RunState


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
        "state": "in_transit" if run.on_site_at else "loading",
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


@csrf_exempt
@require_POST
@api_login_required
def reset(request):
    """Test helper: put the day back to the start."""
    LicensePlate.objects.update(state="staged")
    RunState.objects.all().delete()
    ProcessedRequest.objects.all().delete()
    return JsonResponse({"ok": True})
