from datetime import timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.utils import timezone

from marketplace.models import Campus, Category, Listing, SeasonalBanner, University, User, WantedPost


class Command(BaseCommand):
    help = "Seed seasonal banners, wanted posts, and boost sample listings for Campus Jumia."

    def handle(self, *args, **options):
        now = timezone.now()
        today = now.date()

        # Ensure University & Campus exist
        university, _ = University.objects.get_or_create(name="University of Nairobi")
        main_campus, _ = Campus.objects.get_or_create(university=university, name="Main Campus")
        chiromo_campus, _ = Campus.objects.get_or_create(university=university, name="Chiromo Campus")
        kikuyu_campus, _ = Campus.objects.get_or_create(university=university, name="Kikuyu Campus")

        # Get or create categories
        books, _ = Category.objects.get_or_create(name="Books", defaults={"slug": "books", "sort_order": 1})
        electronics, _ = Category.objects.get_or_create(name="Electronics", defaults={"slug": "electronics", "sort_order": 2})
        furniture, _ = Category.objects.get_or_create(name="Furniture", defaults={"slug": "furniture", "sort_order": 3})
        clothes, _ = Category.objects.get_or_create(name="Clothes", defaults={"slug": "clothes", "sort_order": 4})
        services, _ = Category.objects.get_or_create(name="Services", defaults={"slug": "services", "sort_order": 5})

        # Ensure a student buyer exists
        buyer, _ = User.objects.get_or_create(
            email="faith.buyer@students.uonbi.ac.ke",
            defaults={
                "full_name": "Faith Makena",
                "university": university,
                "campus": main_campus,
            },
        )
        if not buyer.has_usable_password():
            buyer.set_password("StudentPass!2026")
            buyer.save()

        buyer2, _ = User.objects.get_or_create(
            email="kelvin.student@students.uonbi.ac.ke",
            defaults={
                "full_name": "Kelvin Kiprop",
                "university": university,
                "campus": chiromo_campus,
            },
        )
        if not buyer2.has_usable_password():
            buyer2.set_password("StudentPass!2026")
            buyer2.save()

        # Seed Seasonal Banners
        banner1, _ = SeasonalBanner.objects.get_or_create(
            title="Semester 1 Kickoff: Campus & Hostel Essentials",
            defaults={
                "subtitle": "Furnish your hostel room, grab required textbooks, and upgrade your tech for the semester.",
                "season_type": SeasonalBanner.SeasonType.SEMESTER_START,
                "badge_text": "Semester 1 Live",
                "call_to_action": "Shop Semester Essentials",
                "target_url": "/browse",
                "accent_theme": "emerald",
                "banner_image": "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85",
                "start_date": today - timedelta(days=5),
                "end_date": today + timedelta(days=25),
                "is_active": True,
            },
        )
        banner1.featured_categories.set([electronics, books, furniture])

        banner2, _ = SeasonalBanner.objects.get_or_create(
            title="Exam Season Prep: Study Guides & Revision Tutoring",
            defaults={
                "subtitle": "Score your best grades with peer revision notes, calculators, and one-on-one study sessions.",
                "season_type": SeasonalBanner.SeasonType.EXAM_SEASON,
                "badge_text": "Exam Season Special",
                "call_to_action": "Browse Study Guides",
                "target_url": "/browse?category=Books",
                "accent_theme": "amber",
                "banner_image": "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85",
                "start_date": today + timedelta(days=30),
                "end_date": today + timedelta(days=60),
                "is_active": True,
            },
        )
        banner2.featured_categories.set([books, services, electronics])

        # Seed Wanted Posts
        wanted_samples = [
            {
                "buyer": buyer,
                "title": "Wanted: Casio FX-991EX ClassWiz Calculator",
                "description": "Urgent! Need an original fx-991EX calculator for Engineering Maths exam next week. Willing to pick up immediately around Jomo Kenyatta Memorial Library.",
                "category": electronics,
                "campus": main_campus,
                "budget": Decimal("2200.00"),
                "urgency": WantedPost.Urgency.URGENT,
                "contact_preference": "Meet at JKML or chat on Campus Market",
            },
            {
                "buyer": buyer2,
                "title": "Looking for Database Systems 7th Edition (Elmasri & Navathe)",
                "description": "Clean textbook wanted for 2nd Year Computer Science. Photocopy or original is fine as long as pages are legible.",
                "category": books,
                "campus": chiromo_campus,
                "budget": Decimal("1400.00"),
                "urgency": WantedPost.Urgency.SOON,
                "contact_preference": "Chat on Campus Market",
            },
            {
                "buyer": buyer,
                "title": "Need compact hostel study desk & chair",
                "description": "Moving into Hall 8. Need a sturdy study table that fits into a twin room. Can pay KSh 3,000 to 3,800 depending on condition.",
                "category": furniture,
                "campus": main_campus,
                "budget": Decimal("3500.00"),
                "urgency": WantedPost.Urgency.FLEXIBLE,
                "contact_preference": "Pick up at hostel",
            },
            {
                "buyer": buyer2,
                "title": "Looking for Graphic Design / UI tutor",
                "description": "Want to learn Figma basics for a campus startup project. Need 2 to 3 sessions on weekends.",
                "category": services,
                "campus": chiromo_campus,
                "budget": Decimal("600.00"),
                "urgency": WantedPost.Urgency.FLEXIBLE,
                "contact_preference": "Chat on Campus Market",
            },
        ]

        for item in wanted_samples:
            WantedPost.objects.get_or_create(
                buyer=item["buyer"],
                title=item["title"],
                defaults=item,
            )

        # Seed sample listings if none exist
        if not Listing.objects.exists():
            l1 = Listing.objects.create(
                seller=buyer,
                category=electronics,
                campus=main_campus,
                title="HP EliteBook 840 G5 (Core i5, 8GB RAM, 256GB SSD)",
                description="Reliable and fast laptop for campus coursework. Charger included, battery holds 5+ hours. Meet at main library.",
                price=Decimal("28500.00"),
                condition=Listing.Condition.USED_GOOD,
                status=Listing.Status.ACTIVE,
                boosted_at=now,
                boost_expires_at=now + timedelta(days=7),
            )
            l2 = Listing.objects.create(
                seller=buyer2,
                category=books,
                campus=chiromo_campus,
                title="Database System Concepts 7th Edition (Silberschatz)",
                description="Clean hardcover copy, no markings or torn pages. Essential for Computer Science and Information Systems.",
                price=Decimal("1800.00"),
                condition=Listing.Condition.LIKE_NEW,
                status=Listing.Status.ACTIVE,
            )
            l3 = Listing.objects.create(
                seller=buyer,
                category=furniture,
                campus=main_campus,
                title="Compact Study Desk with Drawer",
                description="Sturdy wooden hostel desk, fits nicely between beds. Selling because moving to unfurnished apartment.",
                price=Decimal("2500.00"),
                condition=Listing.Condition.USED_GOOD,
                status=Listing.Status.ACTIVE,
            )
            l4 = Listing.objects.create(
                seller=buyer2,
                category=electronics,
                campus=chiromo_campus,
                title="Casio fx-82MS Scientific Calculator",
                description="Original Casio calculator, all buttons and solar cell working. Perfect for engineering and physics units.",
                price=Decimal("950.00"),
                condition=Listing.Condition.USED_GOOD,
                status=Listing.Status.ACTIVE,
            )
            self.stdout.write(self.style.SUCCESS(f"Seeded 4 sample listings. Boosted '{l1.title}' for 7 days."))
        else:
            first_listing = Listing.objects.filter(status=Listing.Status.ACTIVE).first()
            if first_listing:
                first_listing.boosted_at = now
                first_listing.boost_expires_at = now + timedelta(days=7)
                first_listing.save(update_fields=["boosted_at", "boost_expires_at"])
                self.stdout.write(self.style.SUCCESS(f"Boosted listing '{first_listing.title}' for 7 days."))

        self.stdout.write(self.style.SUCCESS("Seasonal banners, wanted posts, and boosted listing seeded successfully."))
