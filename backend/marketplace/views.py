from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from rest_framework import filters, mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.generics import CreateAPIView, RetrieveUpdateAPIView
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated, IsAuthenticatedOrReadOnly
from rest_framework.response import Response

from .filters import ListingFilter
from .models import Campus, Category, Conversation, Favorite, Listing, ListingImage, Message, Report, University
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
    UserSerializer,
    UniversitySerializer,
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
    ordering_fields = ["created_at", "price"]
    ordering = ["-created_at"]

    def get_queryset(self):
        queryset = Listing.objects.select_related("seller", "category", "campus").prefetch_related("images")
        user = self.request.user
        if user.is_authenticated:
            return queryset.filter(Q(status=Listing.Status.ACTIVE) | Q(seller=user))
        return queryset.filter(status=Listing.Status.ACTIVE)

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
