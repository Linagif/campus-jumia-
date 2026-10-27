from django.contrib.auth.hashers import check_password
from django.test import TestCase
from rest_framework.test import APIClient

from marketplace.models import Campus, Category, Favorite, Listing, Report, University, User


class MarketplaceAPITests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.university = University.objects.create(name="University of Nairobi")
        self.campus = Campus.objects.create(university=self.university, name="Main Campus")
        self.category = Category.objects.create(name="Books", slug="books")
        self.seller = User.objects.create_user(
            email="seller@example.ac.ke",
            password="SafePassword!2040",
            full_name="Amina Seller",
            university=self.university,
            campus=self.campus,
        )
        self.buyer = User.objects.create_user(
            email="buyer@example.ac.ke",
            password="SafePassword!2041",
            full_name="Brian Buyer",
            university=self.university,
            campus=self.campus,
        )
        self.listing = Listing.objects.create(
            seller=self.seller,
            category=self.category,
            campus=self.campus,
            title="Database Systems textbook",
            description="A clean copy for second-year students.",
            price="1200.00",
        )

    def test_public_search_returns_matching_listings(self):
        response = self.client.get("/api/listings/?search=database")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 1)
        self.assertEqual(response.data["results"][0]["id"], self.listing.id)

    def test_search_and_price_filters_can_be_combined(self):
        response = self.client.get("/api/listings/?search=database&max_price=1000")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["count"], 0)

    def test_only_seller_can_edit_listing(self):
        self.client.force_authenticate(self.buyer)
        response = self.client.patch(f"/api/listings/{self.listing.id}/", {"title": "Changed title"})

        self.assertEqual(response.status_code, 403)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.title, "Database Systems textbook")

    def test_seller_can_mark_own_listing_sold(self):
        self.client.force_authenticate(self.seller)
        response = self.client.patch(f"/api/listings/{self.listing.id}/", {"status": "sold"})

        self.assertEqual(response.status_code, 200)
        self.listing.refresh_from_db()
        self.assertEqual(self.listing.status, Listing.Status.SOLD)

    def test_user_can_save_and_remove_favorite(self):
        self.client.force_authenticate(self.buyer)
        response = self.client.post("/api/favorites/", {"listing": self.listing.id})

        self.assertEqual(response.status_code, 201)
        favorite_id = response.data["id"]
        self.assertTrue(Favorite.objects.filter(user=self.buyer, listing=self.listing).exists())
        delete_response = self.client.delete(f"/api/favorites/{favorite_id}/")
        self.assertEqual(delete_response.status_code, 204)
        self.assertFalse(Favorite.objects.filter(user=self.buyer, listing=self.listing).exists())

    def test_report_is_stored_for_review(self):
        self.client.force_authenticate(self.buyer)
        response = self.client.post("/api/reports/", {"listing": self.listing.id, "reason": "scam"})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(Report.objects.get().reporter, self.buyer)

    def test_registration_hashes_password_and_student_id(self):
        response = self.client.post("/api/auth/register/", {
            "email": "new-student@example.ac.ke",
            "full_name": "New Student",
            "password": "LongSecurePassword!2042",
            "confirm_password": "LongSecurePassword!2042",
            "university": self.university.id,
            "campus": self.campus.id,
            "student_id": "UON-12345",
        })

        self.assertEqual(response.status_code, 201, response.data)
        new_user = User.objects.get(email="new-student@example.ac.ke")
        self.assertNotEqual(new_user.password, "LongSecurePassword!2042")
        self.assertTrue(new_user.check_password("LongSecurePassword!2042"))
        self.assertTrue(check_password("UON-12345", new_user.student_id_hash))
