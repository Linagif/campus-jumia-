from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenBlacklistView, TokenObtainPairView, TokenRefreshView

from marketplace.views import (
    CampusViewSet,
    CategoryViewSet,
    ConversationViewSet,
    FavoriteViewSet,
    ListingShareView,
    ListingViewSet,
    MeView,
    RegisterView,
    ReportViewSet,
    SeasonalBannerViewSet,
    UniversityViewSet,
    WantedPostViewSet,
)

router = DefaultRouter()
router.register("universities", UniversityViewSet, basename="university")
router.register("campuses", CampusViewSet, basename="campus")
router.register("categories", CategoryViewSet, basename="category")
router.register("listings", ListingViewSet, basename="listing")
router.register("wanted-posts", WantedPostViewSet, basename="wanted-post")
router.register("seasonal-banners", SeasonalBannerViewSet, basename="seasonal-banner")
router.register("favorites", FavoriteViewSet, basename="favorite")
router.register("reports", ReportViewSet, basename="report")
router.register("conversations", ConversationViewSet, basename="conversation")

urlpatterns = [
    path("admin/", admin.site.urls),
    path("share/listing/<int:pk>/", ListingShareView.as_view(), name="listing_share_preview"),
    path("listings/<int:pk>/preview/", ListingShareView.as_view(), name="listing_preview"),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/logout/", TokenBlacklistView.as_view(), name="token_blacklist"),
    path("api/auth/me/", MeView.as_view(), name="me"),
    path("api/", include(router.urls)),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
