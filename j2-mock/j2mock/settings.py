"""Settings for the J2 stand-in. Test use only: never point real data at this."""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get("J2MOCK_SECRET_KEY", "j2-mock-local-only")
DEBUG = os.environ.get("J2MOCK_DEBUG", "1") == "1"
# The phone reaches the laptop by LAN or Tailscale address, which we can't know ahead of time.
ALLOWED_HOSTS = ["*"]

INSTALLED_APPS = [
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "field",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
]

ROOT_URLCONF = "j2mock.urls"
WSGI_APPLICATION = "j2mock.wsgi.application"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    }
]

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": BASE_DIR / "db.sqlite3",
    }
}

# Open question in the handoff: how long a phone stays signed in. 14 days until decided.
SESSION_COOKIE_AGE = 14 * 24 * 60 * 60

LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/Chicago"
USE_I18N = False
USE_TZ = True

DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
