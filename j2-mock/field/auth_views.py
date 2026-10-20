"""Fake versions of J2's sign-in endpoints.

Real J2 sends /auth/microsoft/ to Entra (authorization code + PKCE). Here a plain
page stands in for login.microsoftonline.com so the app's flow can be tested
without an Entra redirect URI.
"""

import json

from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST

from . import data


def user_json(user):
    initials = (user.first_name[:1] + user.last_name[:1]).upper() or user.username[:2].upper()
    return {
        "name": user.get_full_name() or user.username,
        "email": user.email,
        "initials": initials,
        "role": data.USER["role"],
    }


def session(request):
    if not request.user.is_authenticated:
        return JsonResponse({"authenticated": False})
    return JsonResponse({
        "authenticated": True,
        "user": user_json(request.user),
        "method": request.session.get("auth_method", "password"),
        "expires_in_days": request.session.get_expiry_age() // 86400,
    })


@csrf_exempt
def microsoft_start(request):
    next_url = request.GET.get("next") or request.POST.get("next") or "/"
    if request.method == "POST":
        user = User.objects.get(username=data.USER["username"])
        login(request, user)
        request.session["auth_method"] = "microsoft"
        # Hand back to the app with a page, not a 302: Android's WebView doesn't let the app
        # serve a redirect to https://localhost, so the phone shows "connection refused".
        # Real J2 must do the same for app sign-ins, and only for allowed app URLs. The mock trusts any.
        return render(request, "field/return_to_app.html", {"next": next_url})
    return render(request, "field/mock_microsoft.html", {"next": next_url, "user": data.USER})


@csrf_exempt
@require_POST
def login_view(request):
    try:
        body = json.loads(request.body or b"{}")
    except json.JSONDecodeError:
        body = {}
    user = authenticate(request, username=body.get("username", ""), password=body.get("password", ""))
    if user is None:
        return JsonResponse({"error": "Wrong username or password."}, status=400)
    login(request, user)
    request.session["auth_method"] = "password"
    return JsonResponse({"authenticated": True, "user": user_json(user), "method": "password"})


@csrf_exempt
@require_POST
def logout_view(request):
    logout(request)
    return JsonResponse({"authenticated": False})
