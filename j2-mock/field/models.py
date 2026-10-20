from django.db import models


class LicensePlate(models.Model):
    """Stands in for J2's Bin + ShipmentAllocation.state for one stop."""

    STATES = [("staged", "Staged"), ("loaded", "Loaded"), ("accepted", "Accepted")]

    code = models.CharField(max_length=32, primary_key=True)
    description = models.CharField(max_length=200)
    state = models.CharField(max_length=16, choices=STATES, default="staged")
    sort = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ["sort"]


class RunState(models.Model):
    """One row: the crew's progress on today's stop. Stands in for VehicleRun."""

    on_site_at = models.DateTimeField(null=True, blank=True)
    arrival_window_sent = models.BooleanField(default=False)
    returned = models.BooleanField(default=False)

    @classmethod
    def current(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ProcessedRequest(models.Model):
    """Remembers each request_key so offline retries are applied once, like DeliveryReceipt.request_key."""

    request_key = models.CharField(max_length=64, unique=True)
    response = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)


class Room(models.Model):
    """Per-room install record. Not in J2 yet (see the handoff's deferred list)."""

    WALLS = ["Block (CMU)", "Drywall", "Brick", "Plaster"]

    id = models.CharField(max_length=32, primary_key=True)
    name = models.CharField(max_length=100)
    sort = models.PositiveIntegerField(default=0)
    # The serial J2 expects in this room. Stands in for ItemInstance on the IF.
    expected_serial = models.CharField(max_length=64)
    serial = models.CharField(max_length=64, blank=True)
    height_ok = models.BooleanField(default=False)
    wall = models.CharField(max_length=32, blank=True)
    photo = models.FileField(upload_to="photos/", blank=True)
    photo_taken_at = models.DateTimeField(null=True, blank=True)
    packed = models.BooleanField(default=False)
    done = models.BooleanField(default=False)

    class Meta:
        ordering = ["sort"]

    def missing(self):
        steps = [("serial", self.serial), ("mount check", self.height_ok), ("photo", self.photo), ("packaging", self.packed)]
        return [name for name, ok in steps if not ok]


class DailyReport(models.Model):
    """One row: today's end-of-day report."""

    sent_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    return_to = models.CharField(max_length=8, default="hotel")
    ship_on_if = models.BooleanField(default=True)

    @classmethod
    def current(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
