from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.hashers import make_password
from rest_framework import serializers

from .models import Campus, Category, Conversation, Favorite, Listing, ListingImage, Message, Report, University, User


class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model = University
        fields = ["id", "name"]


class CampusSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source="university.name", read_only=True)

    class Meta:
        model = Campus
        fields = ["id", "name", "university", "university_name"]


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ["id", "name", "slug"]


class UserSerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source="university.name", read_only=True)
    campus_name = serializers.CharField(source="campus.name", read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "university", "university_name", "campus", "campus_name", "date_joined"]
        read_only_fields = ["id", "email", "date_joined"]


class RegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, trim_whitespace=False)
    confirm_password = serializers.CharField(write_only=True, trim_whitespace=False)
    student_id = serializers.CharField(write_only=True, max_length=80)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "password", "confirm_password", "university", "campus", "student_id"]
        read_only_fields = ["id"]

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        validate_password(attrs["password"])
        campus = attrs.get("campus")
        university = attrs.get("university")
        if campus and university and campus.university_id != university.id:
            raise serializers.ValidationError({"campus": "Choose a campus within the selected university."})
        return attrs

    def create(self, validated_data):
        raw_student_id = validated_data.pop("student_id")
        password = validated_data.pop("password")
        validated_data["student_id_hash"] = make_password(raw_student_id.strip())
        return User.objects.create_user(password=password, **validated_data)


class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ["id", "image", "created_at"]
        read_only_fields = fields


class SellerSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "full_name", "university", "campus", "date_joined"]
        read_only_fields = fields


class ListingSerializer(serializers.ModelSerializer):
    seller = SellerSerializer(read_only=True)
    category_name = serializers.CharField(source="category.name", read_only=True)
    campus_name = serializers.CharField(source="campus.name", read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)

    class Meta:
        model = Listing
        fields = [
            "id", "seller", "category", "category_name", "campus", "campus_name",
            "listing_type", "title", "description", "price", "condition", "status",
            "location", "availability", "images", "created_at", "updated_at",
        ]
        read_only_fields = ["id", "seller", "created_at", "updated_at"]

    def validate(self, attrs):
        listing_type = attrs.get("listing_type", getattr(self.instance, "listing_type", Listing.ListingType.ITEM))
        if listing_type == Listing.ListingType.SERVICE and not attrs.get("availability", getattr(self.instance, "availability", "")):
            raise serializers.ValidationError({"availability": "Add the service availability."})
        campus = attrs.get("campus")
        user = self.context["request"].user
        if campus and user.is_authenticated and user.university_id and campus.university_id != user.university_id:
            raise serializers.ValidationError({"campus": "Choose a campus within your university."})
        return attrs


class FavoriteSerializer(serializers.ModelSerializer):
    listing_info = ListingSerializer(source="listing", read_only=True)

    class Meta:
        model = Favorite
        fields = ["id", "listing", "listing_info", "created_at"]
        read_only_fields = ["id", "listing_info", "created_at"]


class ReportSerializer(serializers.ModelSerializer):
    reporter = serializers.PrimaryKeyRelatedField(read_only=True)

    class Meta:
        model = Report
        fields = ["id", "listing", "reporter", "reason", "details", "status", "created_at"]
        read_only_fields = ["id", "reporter", "status", "created_at"]


class MessageSerializer(serializers.ModelSerializer):
    sender = SellerSerializer(read_only=True)

    class Meta:
        model = Message
        fields = ["id", "sender", "body", "created_at", "read_at"]
        read_only_fields = ["id", "sender", "created_at", "read_at"]


class ConversationSerializer(serializers.ModelSerializer):
    listing_info = ListingSerializer(source="listing", read_only=True)
    buyer_info = SellerSerializer(source="buyer", read_only=True)
    seller_info = SellerSerializer(source="seller", read_only=True)
    latest_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ["id", "listing", "listing_info", "buyer_info", "seller_info", "latest_message", "unread_count", "created_at", "updated_at"]
        read_only_fields = fields

    def get_latest_message(self, obj):
        message = obj.messages.order_by("-created_at").first()
        return MessageSerializer(message).data if message else None

    def get_unread_count(self, obj):
        user = self.context["request"].user
        return obj.messages.filter(read_at__isnull=True).exclude(sender=user).count()
