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

    @classmethod
    def current(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj


class ProcessedRequest(models.Model):
    """Remembers each request_key so offline retries are applied once, like DeliveryReceipt.request_key."""

    request_key = models.CharField(max_length=64, unique=True)
    response = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
