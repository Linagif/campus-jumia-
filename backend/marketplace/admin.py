from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import (
    Campus,
    Category,
    Conversation,
    Favorite,
    Listing,
    ListingImage,
    Message,
    Report,
    SeasonalBanner,
    University,
    User,
    WantedPost,
)


@admin.register(User)
class MarketplaceUserAdmin(UserAdmin):
    ordering = ["email"]
    list_display = ["email", "full_name", "university", "campus", "is_staff", "is_active"]
    search_fields = ["email", "full_name"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Student profile", {"fields": ("full_name", "university", "campus", "student_id_hash")}),
        ("Permissions", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Dates", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "full_name", "password1", "password2")}),)
    filter_horizontal = ["groups", "user_permissions"]


@admin.register(Listing)
class ListingAdmin(admin.ModelAdmin):
    list_display = ["title", "seller", "category", "campus", "price", "status", "is_boosted", "boost_expires_at", "created_at"]
    list_filter = ["status", "category", "campus", "listing_type"]
    search_fields = ["title", "description", "seller__email"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(WantedPost)
class WantedPostAdmin(admin.ModelAdmin):
    list_display = ["title", "buyer", "category", "campus", "budget", "urgency", "status", "created_at"]
    list_filter = ["status", "urgency", "category", "campus"]
    search_fields = ["title", "description", "buyer__email", "buyer__full_name"]
    readonly_fields = ["created_at", "updated_at"]


@admin.register(SeasonalBanner)
class SeasonalBannerAdmin(admin.ModelAdmin):
    list_display = ["title", "season_type", "badge_text", "start_date", "end_date", "is_active", "created_at"]
    list_filter = ["is_active", "season_type"]
    search_fields = ["title", "subtitle", "badge_text"]
    filter_horizontal = ["featured_categories"]


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ["listing", "reporter", "reason", "status", "created_at"]
    list_filter = ["status", "reason"]
    search_fields = ["listing__title", "reporter__email", "details"]
    readonly_fields = ["reporter", "listing", "reason", "details", "created_at"]


admin.site.register([University, Campus, Category, ListingImage, Favorite, Conversation, Message])
