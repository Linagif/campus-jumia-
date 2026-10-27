from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from marketplace.models import Campus, Category, Listing, SeasonalBanner, University, User, WantedPost


class EngagementFeaturesTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.university = University.objects.create(name="University of Nairobi")
        self.campus = Campus.objects.create(university=self.university, name="Main Campus")
        self.category = Category.objects.create(name="Electronics", slug="electronics")
        self.books = Category.objects.create(name="Books", slug="books")

        self.seller = User.objects.create_user(
            email="seller@uonbi.ac.ke",
            password="SecurePassword!2026",
            full_name="Faith Seller",
            university=self.university,
            campus=self.campus,
        )
        self.buyer = User.objects.create_user(
            email="buyer@uonbi.ac.ke",
            password="SecurePassword!2027",
            full_name="John Buyer",
            university=self.university,
            campus=self.campus,
        )

        self.listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            campus=self.campus,
            title="Scientific Calculator fx-82MS",
            description="Used calculator in perfect working condition.",
            price=Decimal("950.00"),
            status=Listing.Status.ACTIVE,
        )

    def test_seller_can_boost_listing_for_7_days(self):
        self.client.force_authenticate(self.seller)
        response = self.client.post(f"/api/listings/{self.listing.id}/boost/")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["message"], "Listing boosted successfully for 7 days!")
        self.listing.refresh_from_db()
        self.assertTrue(self.listing.is_boosted)
        self.assertIsNotNone(self.listing.boost_expires_at)
        # Check expiry is roughly 7 days ahead
        expected_expiry = timezone.now() + timedelta(days=7)
        delta = abs((self.listing.boost_expires_at - expected_expiry).total_seconds())
        self.assertLess(delta, 120)

    def test_non_seller_cannot_boost_listing(self):
        self.client.force_authenticate(self.buyer)
        response = self.client.post(f"/api/listings/{self.listing.id}/boost/")

        self.assertEqual(response.status_code, 403)
        self.listing.refresh_from_db()
        self.assertFalse(self.listing.is_boosted)

    def test_boost_expires_automatically(self):
        # Set boost_expires_at in past
        self.listing.boosted_at = timezone.now() - timedelta(days=8)
        self.listing.boost_expires_at = timezone.now() - timedelta(days=1)
        self.listing.save()

        self.assertFalse(self.listing.is_boosted)

        # In list query, it should not be active boost
        response = self.client.get("/api/listings/")
        self.assertEqual(response.status_code, 200)
        results = response.data["results"] if "results" in response.data else response.data
        listing_data = next((x for x in results if x["id"] == self.listing.id), None)
        self.assertIsNotNone(listing_data)
        self.assertFalse(listing_data["is_boosted"])

    def test_boosted_listings_appear_first(self):
        # Create an older listing boosted, and a newer listing not boosted
        older_boosted = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            campus=self.campus,
            title="Older Boosted Laptop",
            description="Good laptop",
            price=Decimal("25000.00"),
            status=Listing.Status.ACTIVE,
            boosted_at=timezone.now(),
            boost_expires_at=timezone.now() + timedelta(days=7),
        )
        newer_unboosted = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            campus=self.campus,
            title="Newer Unboosted Item",
            description="Regular item",
            price=Decimal("1500.00"),
            status=Listing.Status.ACTIVE,
        )

        response = self.client.get("/api/listings/")
        self.assertEqual(response.status_code, 200)
        results = response.data["results"] if "results" in response.data else response.data
        first_item = results[0]
        # Boosted listing should appear at top
        self.assertEqual(first_item["id"], older_boosted.id)
        self.assertTrue(first_item["is_boosted"])

    def test_create_and_list_wanted_post(self):
        self.client.force_authenticate(self.buyer)
        payload = {
            "title": "Need second-hand Microwave for Hall 5",
            "description": "Looking for a clean 20L microwave in good condition.",
            "category": self.category.id,
            "campus": self.campus.id,
            "budget": "4500.00",
            "urgency": "soon",
            "contact_preference": "Meet at hall reception",
        }
        create_res = self.client.post("/api/wanted-posts/", payload)
        self.assertEqual(create_res.status_code, 201)
        post_id = create_res.data["id"]

        # Public listing
        self.client.logout()
        list_res = self.client.get("/api/wanted-posts/")
        self.assertEqual(list_res.status_code, 200)
        results = list_res.data["results"] if "results" in list_res.data else list_res.data
        self.assertTrue(any(item["id"] == post_id for item in results))

    def test_buyer_can_fulfill_own_wanted_post(self):
        post = WantedPost.objects.create(
            buyer=self.buyer,
            title="Wanted Lab Coat Size M",
            description="White lab coat needed for chemistry practicals.",
            category=self.category,
            campus=self.campus,
            budget=Decimal("800.00"),
            urgency=WantedPost.Urgency.URGENT,
        )

        self.client.force_authenticate(self.buyer)
        response = self.client.post(f"/api/wanted-posts/{post.id}/fulfill/")
        self.assertEqual(response.status_code, 200)
        post.refresh_from_db()
        self.assertEqual(post.status, WantedPost.Status.FULFILLED)

    def test_seasonal_banner_active_endpoint(self):
        today = timezone.now().date()
        banner = SeasonalBanner.objects.create(
            title="Semester 1 Kickoff Essentials",
            subtitle="Hostel and study gear from students",
            season_type=SeasonalBanner.SeasonType.SEMESTER_START,
            badge_text="Back to Campus",
            call_to_action="Browse Essentials",
            start_date=today - timedelta(days=2),
            end_date=today + timedelta(days=20),
            is_active=True,
        )
        banner.featured_categories.add(self.category, self.books)

        response = self.client.get("/api/seasonal-banners/active/")
        self.assertEqual(response.status_code, 200)
        self.assertGreaterEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["title"], "Semester 1 Kickoff Essentials")
        self.assertEqual(len(response.data[0]["featured_categories"]), 2)

    def test_share_data_and_open_graph_preview(self):
        # 1. Share data API
        share_res = self.client.get(f"/api/listings/{self.listing.id}/share_data/")
        self.assertEqual(share_res.status_code, 200)
        self.assertIn("share_url", share_res.data)
        self.assertIn("whatsapp_url", share_res.data)
        self.assertIn("og_title", share_res.data)
        self.assertIn("KSh 950", share_res.data["whatsapp_text"])

        # 2. HTML Share preview endpoint with Open Graph tags
        og_html_res = self.client.get(f"/share/listing/{self.listing.id}/")
        self.assertEqual(og_html_res.status_code, 200)
        content = og_html_res.content.decode("utf-8")
        self.assertIn('<meta property="og:title"', content)
        self.assertIn('<meta property="og:description"', content)
        self.assertIn('<meta property="og:image"', content)
        self.assertIn('<meta property="og:url"', content)
        self.assertIn("Scientific Calculator fx-82MS", content)
        self.assertIn("Campus Jumia", content)
