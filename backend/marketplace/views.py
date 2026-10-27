from datetime import timedelta
from urllib.parse import quote_plus

from django.db import transaction
from django.db.models import BooleanField, Case, Q, Value, When
from django.http import HttpResponse, HttpResponseNotFound
from django.utils import timezone
from django.views import View
from PIL import Image, UnidentifiedImageError
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .filters import ListingFilter, WantedPostFilter
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
    WantedPost,
)
from .permissions import IsOwnerOrReadOnly
from .serializers import (
    CampusSerializer,
    CategorySerializer,
    ConversationSerializer,
    FavoriteSerializer,
    ListingSerializer,
    MessageSerializer,
    RegistrationSerializer,
    ReportSerializer,
    SeasonalBannerSerializer,
    UserSerializer,
    UniversitySerializer,
    WantedPostSerializer,
)


class UniversityViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = University.objects.all()
    serializer_class = UniversitySerializer
    permission_classes = [AllowAny]


class CampusViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = CampusSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = Campus.objects.select_related("university")
        university_id = self.request.query_params.get("university")
        return queryset.filter(university_id=university_id) if university_id else queryset


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.filter(is_active=True)
    serializer_class = CategorySerializer
    permission_classes = [AllowAny]


class ListingViewSet(viewsets.ModelViewSet):
    serializer_class = ListingSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    parser_classes = [JSONParser, MultiPartParser, FormParser]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    filterset_class = ListingFilter
    search_fields = ["title", "description", "category__name", "campus__name"]
    ordering_fields = ["created_at", "price", "is_active_boost"]
    ordering = ["-is_active_boost", "-created_at"]

    def get_queryset(self):
        now = timezone.now()
        queryset = Listing.objects.select_related("seller", "category", "campus").prefetch_related("images")
        user = self.request.user
        if user.is_authenticated:
            queryset = queryset.filter(Q(status=Listing.Status.ACTIVE) | Q(seller=user))
        else:
            queryset = queryset.filter(status=Listing.Status.ACTIVE)
        return queryset.annotate(
            is_active_boost=Case(
                When(boost_expires_at__gt=now, then=Value(True)),
                default=Value(False),
                output_field=BooleanField(),
            )
        )

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        filterset = self.filterset_class(request.query_params, queryset=queryset)
        if not filterset.is_valid():
            raise ValidationError(filterset.errors)
        page = self.paginate_queryset(filterset.qs)
        serializer = self.get_serializer(page if page is not None else filterset.qs, many=True)
        return self.get_paginated_response(serializer.data) if page is not None else Response(serializer.data)

    def _save_images(self, listing, uploaded_files):
        if len(uploaded_files) > 5:
            raise ValidationError({"images": "You can upload up to five images."})
        allowed_types = {"image/jpeg", "image/png", "image/webp"}
        for image in uploaded_files:
            if image.size > 5 * 1024 * 1024:
                raise ValidationError({"images": "Each image must be 5MB or smaller."})
            if image.content_type not in allowed_types:
                raise ValidationError({"images": "Use JPG, PNG, or WebP images."})
            try:
                image.seek(0)
                decoded_image = Image.open(image)
                decoded_image.verify()
            except (UnidentifiedImageError, OSError):
                raise ValidationError({"images": "One of the uploaded files is not a valid image."})
            finally:
                image.seek(0)
            if decoded_image.format not in {"JPEG", "PNG", "WEBP"}:
                raise ValidationError({"images": "Use JPG, PNG, or WebP images."})
        for image in uploaded_files:
            ListingImage.objects.create(listing=listing, image=image)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        uploaded_files = request.FILES.getlist("images")
        with transaction.atomic():
            listing = serializer.save(seller=request.user)
            self._save_images(listing, uploaded_files)
        headers = self.get_success_headers(serializer.data)
        return Response(self.get_serializer(listing).data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        uploaded_files = request.FILES.getlist("images")
        with transaction.atomic():
            listing = serializer.save()
            if uploaded_files:
                self._save_images(listing, uploaded_files)
        return Response(self.get_serializer(listing).data)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def boost(self, request, pk=None):
        listing = self.get_object()
        if listing.seller != request.user:
            raise PermissionDenied("You can only boost your own listings.")
        if listing.status != Listing.Status.ACTIVE:
            raise ValidationError({"detail": "Only active listings can be boosted."})

        now = timezone.now()
        listing.boosted_at = now
        listing.boost_expires_at = now + timedelta(days=7)
        listing.save(update_fields=["boosted_at", "boost_expires_at"])
        return Response({
            "message": "Listing boosted successfully for 7 days!",
            "boost_expires_at": listing.boost_expires_at,
            "listing": self.get_serializer(listing).data,
        }, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get"], permission_classes=[AllowAny])
    def share_data(self, request, pk=None):
        listing = self.get_object()
        share_url = request.build_absolute_uri(f"/share/listing/{listing.id}/")
        app_url = f"http://localhost:5173/listing/{listing.id}"
        first_image = listing.images.first()
        image_url = request.build_absolute_uri(first_image.image.url) if first_image else ""
        whatsapp_text = (
            f"Check out '{listing.title}' on Campus Jumia for KSh {listing.price:,.0f} "
            f"({listing.campus.name}): {share_url}"
        )
        return Response({
            "id": listing.id,
            "title": listing.title,
            "price": str(listing.price),
            "campus": listing.campus.name,
            "category": listing.category.name,
            "condition": listing.condition,
            "description": listing.description,
            "share_url": share_url,
            "app_url": app_url,
            "image_url": image_url,
            "whatsapp_text": whatsapp_text,
            "whatsapp_url": f"https://api.whatsapp.com/send?text={quote_plus(whatsapp_text)}",
            "twitter_url": f"https://twitter.com/intent/tweet?text={quote_plus(whatsapp_text)}",
            "og_title": f"{listing.title} - KSh {listing.price:,.0f} | Campus Jumia",
            "og_description": f"{listing.campus.name} • {listing.category.name} • {listing.description[:140]}",
        })


class FavoriteViewSet(mixins.ListModelMixin, mixins.CreateModelMixin, mixins.DestroyModelMixin, viewsets.GenericViewSet):
    serializer_class = FavoriteSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Favorite.objects.filter(user=self.request.user).select_related("listing", "listing__seller", "listing__category", "listing__campus").prefetch_related("listing__images")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class ReportViewSet(mixins.CreateModelMixin, mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = ReportSerializer
    queryset = Report.objects.select_related("listing", "reporter")

    def get_permissions(self):
        return [IsAuthenticated() if self.action == "create" else IsAdminUser()]

    def perform_create(self, serializer):
        serializer.save(reporter=self.request.user)


class RegisterView(CreateAPIView):
    serializer_class = RegistrationSerializer
    permission_classes = [AllowAny]


class MeView(RetrieveUpdateAPIView):
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class ConversationViewSet(viewsets.ModelViewSet):
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        return Conversation.objects.filter(Q(buyer=user) | Q(seller=user)).select_related("listing", "listing__seller", "listing__category", "listing__campus", "buyer", "seller").prefetch_related("messages")

    def create(self, request, *args, **kwargs):
        listing_id = request.data.get("listing")
        try:
            listing = Listing.objects.select_related("seller").get(pk=listing_id, status=Listing.Status.ACTIVE)
        except (Listing.DoesNotExist, ValueError, TypeError):
            raise ValidationError({"listing": "Choose an available listing."})
        if listing.seller_id == request.user.id:
            raise ValidationError({"listing": "You cannot message yourself about your listing."})
        conversation, _ = Conversation.objects.get_or_create(listing=listing, buyer=request.user, seller=listing.seller)
        serializer = self.get_serializer(conversation)
        return Response(serializer.data, status=status.HTTP_200_OK)

    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        conversation = self.get_object()
        if request.method == "GET":
            conversation.messages.filter(read_at__isnull=True).exclude(sender=request.user).update(read_at=timezone.now())
            return Response(MessageSerializer(conversation.messages.select_related("sender"), many=True).data)
        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = serializer.save(conversation=conversation, sender=request.user)
        conversation.updated_at = timezone.now()
        conversation.save(update_fields=["updated_at"])
        return Response(MessageSerializer(message).data, status=status.HTTP_201_CREATED)


class WantedPostViewSet(viewsets.ModelViewSet):
    serializer_class = WantedPostSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    filterset_class = WantedPostFilter
    search_fields = ["title", "description", "category__name", "campus__name"]
    ordering_fields = ["created_at", "budget"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = WantedPost.objects.select_related("buyer", "category", "campus")
        campus_id = self.request.query_params.get("campus")
        category_id = self.request.query_params.get("category")
        urgency = self.request.query_params.get("urgency")
        post_status = self.request.query_params.get("status")
        if campus_id:
            queryset = queryset.filter(campus_id=campus_id)
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        if urgency:
            queryset = queryset.filter(urgency=urgency)
        if post_status:
            queryset = queryset.filter(status=post_status)
        return queryset

    def perform_create(self, serializer):
        serializer.save(buyer=self.request.user)

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.buyer != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only edit your own wanted posts.")
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        if instance.buyer != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only delete your own wanted posts.")
        return super().destroy(request, *args, **kwargs)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def fulfill(self, request, pk=None):
        instance = self.get_object()
        if instance.buyer != request.user and not request.user.is_staff:
            raise PermissionDenied("You can only update your own wanted posts.")
        instance.status = WantedPost.Status.FULFILLED
        instance.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(instance).data)


class SeasonalBannerViewSet(viewsets.ModelViewSet):
    serializer_class = SeasonalBannerSerializer
    permission_classes = [AllowAny]
    ordering = ["-is_active", "-start_date", "-created_at"]

    def get_queryset(self):
        queryset = SeasonalBanner.objects.prefetch_related("featured_categories")
        if self.request.user.is_staff:
            return queryset
        return queryset.filter(is_active=True)

    def get_permissions(self):
        if self.action in ["list", "retrieve", "active"]:
            return [AllowAny()]
        return [IsAdminUser()]

    @action(detail=False, methods=["get"], permission_classes=[AllowAny])
    def active(self, request):
        today = timezone.now().date()
        campaigns = SeasonalBanner.objects.filter(
            is_active=True,
            start_date__lte=today,
            end_date__gte=today,
        ).prefetch_related("featured_categories")

        if not campaigns.exists():
            campaigns = SeasonalBanner.objects.filter(is_active=True).prefetch_related("featured_categories")[:2]

        serializer = self.get_serializer(campaigns, many=True)
        return Response(serializer.data)


class ListingShareView(View):
    def get(self, request, pk):
        try:
            listing = Listing.objects.select_related("seller", "category", "campus").prefetch_related("images").get(pk=pk)
        except (Listing.DoesNotExist, ValueError):
            return HttpResponseNotFound("<h1>Listing not found</h1>")

        first_image = listing.images.first()
        image_url = request.build_absolute_uri(first_image.image.url) if first_image else "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=90"
        canonical_url = request.build_absolute_uri(f"/share/listing/{listing.id}/")
        frontend_url = f"http://localhost:5173/listing/{listing.id}"
        price_text = f"KSh {listing.price:,.0f}" if listing.price else ""
        og_title = f"{listing.title} • {price_text} | Campus Jumia"
        og_description = f"{listing.campus.name} • {listing.category.name} • Condition: {listing.get_condition_display()} • {listing.description[:180]}"

        html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{og_title}</title>

    <!-- Open Graph / WhatsApp / Facebook / Telegram -->
    <meta property="og:type" content="product">
    <meta property="og:site_name" content="Campus Jumia">
    <meta property="og:title" content="{og_title}">
    <meta property="og:description" content="{og_description}">
    <meta property="og:image" content="{image_url}">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:url" content="{canonical_url}">
    <meta property="product:price:amount" content="{listing.price}">
    <meta property="product:price:currency" content="KES">

    <!-- Twitter / X -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="{og_title}">
    <meta name="twitter:description" content="{og_description}">
    <meta name="twitter:image" content="{image_url}">

    <style>
        * {{ margin: 0; padding: 0; box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
        body {{ background: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }}
        .card {{ background: #1e293b; border-radius: 1.25rem; max-width: 480px; width: 100%; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); border: 1px solid #334155; }}
        .card img {{ width: 100%; height: 260px; object-fit: cover; display: block; }}
        .body {{ padding: 1.5rem; }}
        .brand {{ color: #10b981; font-weight: 800; font-size: 0.85rem; letter-spacing: 0.05em; text-transform: uppercase; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem; }}
        .brand span {{ width: 8px; height: 8px; background: #10b981; border-radius: 50%; display: inline-block; }}
        h1 {{ font-size: 1.4rem; font-weight: 700; margin-bottom: 0.5rem; line-height: 1.3; }}
        .price {{ font-size: 1.5rem; font-weight: 800; color: #34d399; margin-bottom: 0.75rem; }}
        .meta {{ display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem; font-size: 0.85rem; color: #94a3b8; }}
        .meta span {{ background: #334155; padding: 0.25rem 0.6rem; border-radius: 999px; }}
        p {{ color: #cbd5e1; font-size: 0.95rem; line-height: 1.5; margin-bottom: 1.5rem; }}
        .btn {{ display: block; text-align: center; background: #059669; color: white; padding: 0.85rem; border-radius: 0.75rem; font-weight: 600; text-decoration: none; transition: background 0.2s; }}
        .btn:hover {{ background: #047857; }}
    </style>
</head>
<body>
    <div class="card">
        <img src="{image_url}" alt="{listing.title}">
        <div class="body">
            <div class="brand"><span></span> Campus Jumia • Verified Student Listing</div>
            <h1>{listing.title}</h1>
            <div class="price">{price_text}</div>
            <div class="meta">
                <span>📍 {listing.campus.name}</span>
                <span>🏷️ {listing.category.name}</span>
                <span>✨ {listing.get_condition_display()}</span>
            </div>
            <p>{listing.description[:220]}...</p>
            <a class="btn" href="{frontend_url}">Open Listing in Campus Jumia &rarr;</a>
        </div>
    </div>
</body>
</html>"""
        return HttpResponse(html, content_type="text/html")

