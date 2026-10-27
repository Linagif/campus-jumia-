import django_filters
from django.db.models import Q
from django.utils import timezone

from .models import Listing, WantedPost


class ListingFilter(django_filters.FilterSet):
    min_price = django_filters.NumberFilter(field_name="price", lookup_expr="gte")
    max_price = django_filters.NumberFilter(field_name="price", lookup_expr="lte")
    is_boosted = django_filters.BooleanFilter(method="filter_is_boosted")

    class Meta:
        model = Listing
        fields = ["category", "campus", "condition", "status", "listing_type"]

    def filter_is_boosted(self, queryset, name, value):
        now = timezone.now()
        if value is True:
            return queryset.filter(boost_expires_at__gt=now)
        if value is False:
            return queryset.filter(Q(boost_expires_at__isnull=True) | Q(boost_expires_at__lte=now))
        return queryset


class WantedPostFilter(django_filters.FilterSet):
    min_budget = django_filters.NumberFilter(field_name="budget", lookup_expr="gte")
    max_budget = django_filters.NumberFilter(field_name="budget", lookup_expr="lte")

    class Meta:
        model = WantedPost
        fields = ["category", "campus", "urgency", "status"]

