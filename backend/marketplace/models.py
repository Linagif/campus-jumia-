from decimal import Decimal

from django.conf import settings
from django.contrib.auth.base_user import BaseUserManager
from django.contrib.auth.models import AbstractUser
from django.core.validators import FileExtensionValidator, MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone


class UserManager(BaseUserManager):
    use_in_migrations = True

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("An email address is required.")
        user = self.model(email=self.normalize_email(email), **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("is_active", True)
        if extra_fields.get("is_staff") is not True or extra_fields.get("is_superuser") is not True:
            raise ValueError("A superuser must have staff and superuser permissions.")
        return self.create_user(email, password, **extra_fields)


class University(models.Model):
    name = models.CharField(max_length=160, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["name"]

    def __str__(self):
        return self.name


class Campus(models.Model):
    university = models.ForeignKey(University, on_delete=models.CASCADE, related_name="campuses")
    name = models.CharField(max_length=120)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["university", "name"], name="unique_campus_per_university")]

    def __str__(self):
        return f"{self.name} ({self.university.name})"


class User(AbstractUser):
    username = None
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=160)
    university = models.ForeignKey(University, null=True, blank=True, on_delete=models.SET_NULL, related_name="students")
    campus = models.ForeignKey(Campus, null=True, blank=True, on_delete=models.SET_NULL, related_name="students")
    student_id_hash = models.CharField(max_length=128, blank=True)
    date_joined = models.DateTimeField(default=timezone.now)

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []
    objects = UserManager()

    def __str__(self):
        return self.full_name or self.email


class Category(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    is_active = models.BooleanField(default=True)
    sort_order = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ["sort_order", "name"]
        verbose_name_plural = "categories"

    def __str__(self):
        return self.name


class Listing(models.Model):
    class Condition(models.TextChoices):
        NEW = "new", "New"
        LIKE_NEW = "like_new", "Like New"
        USED_GOOD = "used_good", "Used - Good"
        USED_FAIR = "used_fair", "Used - Fair"

    class Status(models.TextChoices):
        ACTIVE = "active", "Available"
        SOLD = "sold", "Sold"

    class ListingType(models.TextChoices):
        ITEM = "item", "Item"
        SERVICE = "service", "Service"

    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="listings")
    category = models.ForeignKey(Category, on_delete=models.PROTECT, related_name="listings")
    campus = models.ForeignKey(Campus, on_delete=models.PROTECT, related_name="listings")
    listing_type = models.CharField(max_length=12, choices=ListingType.choices, default=ListingType.ITEM)
    title = models.CharField(max_length=120)
    description = models.TextField(max_length=3000)
    price = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal("0.01"))])
    condition = models.CharField(max_length=12, choices=Condition.choices, default=Condition.USED_GOOD)
    status = models.CharField(max_length=8, choices=Status.choices, default=Status.ACTIVE)
    location = models.CharField(max_length=180, blank=True)
    availability = models.CharField(max_length=180, blank=True)
    boosted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    boost_expires_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="listing_status_created_idx"),
            models.Index(fields=["category", "status"], name="listing_category_status_idx"),
            models.Index(fields=["campus", "status"], name="listing_campus_status_idx"),
            models.Index(fields=["price"], name="listing_price_idx"),
            models.Index(fields=["boost_expires_at", "status"], name="listing_boost_status_idx"),
        ]

    @property
    def is_boosted(self):
        if not self.boost_expires_at:
            return False
        return self.boost_expires_at > timezone.now()

    def __str__(self):
        return self.title


class ListingImage(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(
        upload_to="listings/%Y/%m/",
        validators=[FileExtensionValidator(["jpg", "jpeg", "png", "webp"])],
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]


class Favorite(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="favorites")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="favorites")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["user", "listing"], name="unique_user_favorite")]


class Report(models.Model):
    class Reason(models.TextChoices):
        SCAM = "scam", "Scam"
        FAKE = "fake_product", "Fake product"
        INCORRECT = "incorrect_information", "Incorrect information"
        INAPPROPRIATE = "inappropriate_content", "Inappropriate content"
        DUPLICATE = "duplicate_listing", "Duplicate listing"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        REVIEWING = "reviewing", "Reviewing"
        RESOLVED = "resolved", "Resolved"

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports")
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="reports")
    reason = models.CharField(max_length=32, choices=Reason.choices)
    details = models.TextField(max_length=1000, blank=True)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["reporter", "listing"], name="unique_reporter_listing")]


class Conversation(models.Model):
    listing = models.ForeignKey(Listing, on_delete=models.CASCADE, related_name="conversations")
    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="buyer_conversations")
    seller = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="seller_conversations")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at"]
        constraints = [
            models.UniqueConstraint(fields=["listing", "buyer", "seller"], name="unique_listing_conversation"),
            models.CheckConstraint(condition=~Q(buyer=models.F("seller")), name="conversation_participants_differ"),
        ]


class Message(models.Model):
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages")
    body = models.TextField(max_length=2000)
    created_at = models.DateTimeField(auto_now_add=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["created_at"]
        indexes = [models.Index(fields=["conversation", "created_at"], name="msg_conv_created_idx")]


class WantedPost(models.Model):
    class Urgency(models.TextChoices):
        FLEXIBLE = "flexible", "Flexible"
        SOON = "soon", "Needed this week"
        URGENT = "urgent", "Urgent / Needed today"

    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        FULFILLED = "fulfilled", "Fulfilled"
        CLOSED = "closed", "Closed"

    buyer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="wanted_posts")
    title = models.CharField(max_length=120)
    description = models.TextField(max_length=2000)
    category = models.ForeignKey(Category, null=True, blank=True, on_delete=models.SET_NULL, related_name="wanted_posts")
    campus = models.ForeignKey(Campus, on_delete=models.CASCADE, related_name="wanted_posts")
    budget = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(Decimal("0.01"))])
    urgency = models.CharField(max_length=12, choices=Urgency.choices, default=Urgency.FLEXIBLE)
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.ACTIVE)
    contact_preference = models.CharField(max_length=60, blank=True, default="Chat on Campus Market")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"], name="wanted_status_created_idx"),
            models.Index(fields=["campus", "status"], name="wanted_campus_status_idx"),
            models.Index(fields=["category", "status"], name="wanted_category_status_idx"),
        ]

    def __str__(self):
        return f"Wanted: {self.title} by {self.buyer}"


class SeasonalBanner(models.Model):
    class SeasonType(models.TextChoices):
        SEMESTER_START = "semester_start", "Semester Start / Back to Campus"
        EXAM_SEASON = "exam_season", "Exam Season & Revisions"
        SEMESTER_END = "semester_end", "Semester End / Move-out Deals"
        GRADUATION = "graduation", "Graduation & Career Prep"
        GENERAL = "general", "Campus Special"

    title = models.CharField(max_length=120)
    subtitle = models.CharField(max_length=255, blank=True)
    season_type = models.CharField(max_length=32, choices=SeasonType.choices, default=SeasonType.SEMESTER_START)
    badge_text = models.CharField(max_length=50, default="Semester Highlight")
    call_to_action = models.CharField(max_length=60, default="Explore Essentials")
    target_url = models.CharField(max_length=200, default="/browse")
    featured_categories = models.ManyToManyField(Category, blank=True, related_name="seasonal_campaigns")
    accent_theme = models.CharField(max_length=40, default="emerald")
    banner_image = models.URLField(max_length=500, blank=True)
    start_date = models.DateField(default=timezone.now)
    end_date = models.DateField()
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-is_active", "-start_date", "-created_at"]

    def __str__(self):
        return self.title
