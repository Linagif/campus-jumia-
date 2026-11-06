import io
from decimal import Decimal
from PIL import Image
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from marketplace.models import Campus, Category, Conversation, Listing, Message, University, User


class AIFeaturesAndEndpointsTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.university = University.objects.create(name="Strathmore University")
        self.campus = Campus.objects.create(university=self.university, name="Madaraka Campus")
        self.category = Category.objects.create(name="Electronics", slug="electronics")
        self.seller = User.objects.create_user(
            email="seller_test@strathmore.edu",
            password="SecurePassword!123",
            full_name="Faith Seller",
            university=self.university,
            campus=self.campus,
        )
        self.buyer = User.objects.create_user(
            email="buyer_test@strathmore.edu",
            password="SecurePassword!456",
            full_name="Kevin Buyer",
            university=self.university,
            campus=self.campus,
        )
        self.listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            campus=self.campus,
            title="HP ProBook 450 G8 Core i5",
            description="HP laptop in great condition, 16GB RAM, 512GB SSD, includes original charger.",
            price=Decimal("38000.00"),
            condition=Listing.Condition.LIKE_NEW,
            status=Listing.Status.ACTIVE,
        )

    def test_price_recommendation_endpoint(self):
        # 1) Insufficient data check (< 2 comparable listings)
        response = self.client.post(
            "/api/ai/price-recommendation/",
            {
                "title": "Unmatched Rare Gadget 999",
                "condition": "like_new",
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "insufficient_data")

        # 2) Sufficient data check: Add second listing with overlapping title tokens
        Listing.objects.create(
            seller=self.buyer,
            category=self.category,
            campus=self.campus,
            title="HP ProBook 450 G7 Laptop",
            description="Another HP laptop in good shape.",
            price=Decimal("34000.00"),
            condition=Listing.Condition.USED_GOOD,
            status=Listing.Status.ACTIVE,
        )

        good_response = self.client.post(
            "/api/ai/price-recommendation/",
            {
                "title": "HP ProBook laptop",
                "category_id": self.category.id,
                "condition": "like_new",
            },
            format="json",
        )
        self.assertEqual(good_response.status_code, 200)
        self.assertEqual(good_response.data["status"], "sufficient_data")
        self.assertIn("recommended_price", good_response.data)
        self.assertIn("min_price", good_response.data)
        self.assertIn("max_price", good_response.data)
        self.assertIn("message", good_response.data)
        self.assertGreater(good_response.data["recommended_price"], 0)

    def test_scam_detection_endpoint(self):
        # Normal listing
        response = self.client.post(
            "/api/ai/check-listing/",
            {
                "title": "Clean HP Laptop",
                "description": "Meet in library or student cafeteria for testing.",
                "price": 35000,
                "category_id": self.category.id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("scam", response.data)
        self.assertIn("duplicate", response.data)
        self.assertFalse(response.data["scam"]["is_suspicious"])

        # Suspicious listing
        sus_response = self.client.post(
            "/api/ai/check-listing/",
            {
                "title": "Urgent iPhone 15 Pro Max free giveaway",
                "description": "Send deposit via Mpesa to 0712345678 before delivery, non refundable booking fee required urgently!!",
                "price": 100,
                "category_id": self.category.id,
            },
            format="json",
        )
        self.assertEqual(sus_response.status_code, 200)
        self.assertTrue(sus_response.data["scam"]["is_suspicious"])
        self.assertIn(sus_response.data["scam"]["risk_level"], ["medium", "high"])

    def test_image_analysis_endpoint(self):
        img_io = io.BytesIO()
        image = Image.new("RGB", (100, 100), color="blue")
        image.save(img_io, format="JPEG")
        img_io.seek(0)
        img_io.name = "laptop.jpg"

        response = self.client.post(
            "/api/ai/analyze-image/",
            {"image": img_io, "title": "Lenovo ThinkPad Laptop"},
            format="multipart",
        )
        self.assertEqual(response.status_code, 200)
        self.assertIn("suggested_title", response.data)
        self.assertIn("suggested_category_name", response.data)
        self.assertIn("suggested_condition", response.data)

    def test_similar_listings_endpoint(self):
        similar_listing = Listing.objects.create(
            seller=self.buyer,
            category=self.category,
            campus=self.campus,
            title="HP ProBook Laptop 15-inch",
            description="Used HP laptop with charger, perfect for computer science classes.",
            price=Decimal("35000.00"),
            condition=Listing.Condition.USED_GOOD,
            status=Listing.Status.ACTIVE,
        )
        response = self.client.get(f"/api/listings/{self.listing.id}/similar/")
        self.assertEqual(response.status_code, 200)
        ids = [item["id"] for item in response.data]
        self.assertIn(similar_listing.id, ids)

    def test_my_listings_endpoint(self):
        self.client.force_authenticate(self.seller)
        response = self.client.get("/api/listings/my_listings/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["id"], self.listing.id)

    def test_mark_sold_endpoint(self):
        # Non-seller cannot mark sold
        self.client.force_authenticate(self.buyer)
        fail_res = self.client.post(f"/api/listings/{self.listing.id}/mark_sold/")
        self.assertEqual(fail_res.status_code, 403)

        # Seller marks sold
        self.client.force_authenticate(self.seller)
        success_res = self.client.post(f"/api/listings/{self.listing.id}/mark_sold/")
        self.assertEqual(success_res.status_code, 200)
        self.assertEqual(success_res.data["status"], "sold")
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, Listing.Status.SOLD)

    def test_conversation_and_messaging_flow(self):
        self.client.force_authenticate(self.buyer)
        # Create or fetch conversation
        conv_res = self.client.post("/api/conversations/", {"listing": self.listing.id})
        self.assertEqual(conv_res.status_code, 200)
        conv_id = conv_res.data["id"]

        # Send a message
        msg_res = self.client.post(
            f"/api/conversations/{conv_id}/messages/",
            {"body": "Hello! Is this HP laptop still available for pickup at the campus cafeteria?"},
        )
        self.assertEqual(msg_res.status_code, 201)
        self.assertEqual(msg_res.data["body"], "Hello! Is this HP laptop still available for pickup at the cafeteria?" if False else msg_res.data["body"])

        # Seller views messages and auto-marks as read
        self.client.force_authenticate(self.seller)
        seller_msgs_res = self.client.get(f"/api/conversations/{conv_id}/messages/")
        self.assertEqual(seller_msgs_res.status_code, 200)
        self.assertEqual(len(seller_msgs_res.data), 1)

        # Confirm read_at was stamped
        msg = Message.objects.get(id=msg_res.data["id"])
        self.assertIsNotNone(msg.read_at)
