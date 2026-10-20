from django.conf import settings
from django.conf.urls.static import static
from django.urls import path

from field import auth_views, views

urlpatterns = [
    # Same paths as J2 (J2_app/entra_sso.py, views.py) so the app needs no changes later.
    path("auth/microsoft/", auth_views.microsoft_start),
    path("api/auth/session/", auth_views.session),
    path("api/auth/login/", auth_views.login_view),
    path("api/auth/logout/", auth_views.logout_view),
    # Field API: proposed additions to J2. See docs/api.md.
    path("api/field/week/", views.week),
    path("api/field/truck/", views.truck),
    path("api/field/arrive/", views.arrive),
    path("api/field/arrival-window/", views.arrival_window),
    path("api/field/lps/<str:code>/scan/", views.scan_lp),
    path("api/field/rooms/", views.rooms),
    path("api/field/rooms/<str:room_id>/", views.update_room),
    path("api/field/rooms/<str:room_id>/photo/", views.room_photo),
    path("api/field/report/", views.report),
    path("api/field/report/send/", views.send_report),
    path("api/field/reset/", views.reset),
]

# Test server only: Django serves the room photos itself.
urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
