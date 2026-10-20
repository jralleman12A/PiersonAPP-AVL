"""Create the test user and today's LPs. Safe to run again."""

import os

from django.contrib.auth.models import User
from django.core.management.base import BaseCommand

from field import data
from field.models import LicensePlate, Room


class Command(BaseCommand):
    help = "Load the mock project week into the J2 stand-in."

    def handle(self, *args, **options):
        password = os.environ.get("J2MOCK_PASSWORD", "fieldtest")
        user, _ = User.objects.get_or_create(username=data.USER["username"])
        user.first_name = data.USER["first_name"]
        user.last_name = data.USER["last_name"]
        user.email = data.USER["email"]
        user.set_password(password)
        user.save()
        for i, (code, description) in enumerate(data.LPS):
            LicensePlate.objects.update_or_create(
                code=code, defaults={"description": description, "sort": i}
            )
        for i, (room_id, name, serial) in enumerate(data.ROOMS):
            Room.objects.update_or_create(
                id=room_id, defaults={"name": name, "expected_serial": serial, "sort": i}
            )
        self.stdout.write(f"Seeded. Password sign-in: {user.username} / {password}")
