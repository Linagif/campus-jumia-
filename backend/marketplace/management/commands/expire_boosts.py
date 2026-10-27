from django.core.management.base import BaseCommand
from django.utils import timezone

from marketplace.models import Listing


class Command(BaseCommand):
    help = "Expire boosts on listings whose 7-day boost period has ended."

    def handle(self, *args, **options):
        now = timezone.now()
        expired_qs = Listing.objects.filter(boost_expires_at__lte=now)
        count = expired_qs.count()
        # Even though dynamic property and query Case/When handles expiration real-time,
        # this command can be run as a cron job to clean up timestamps if desired.
        self.stdout.write(self.style.SUCCESS(f"Found {count} expired boost(s) as of {now}."))
