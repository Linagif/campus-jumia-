from django.core.management.base import BaseCommand
from django.utils.text import slugify

from marketplace.models import Campus, Category, University


class Command(BaseCommand):
    help = "Create starter Kenyan universities, campuses, and marketplace categories."

    def handle(self, *args, **options):
        universities = {
            "University of Nairobi": ["Main Campus", "Kikuyu Campus", "Chiromo Campus"],
            "Kenyatta University": ["Main Campus"],
            "Jomo Kenyatta University of Agriculture and Technology": ["Main Campus"],
        }
        for university_name, campus_names in universities.items():
            university, _ = University.objects.get_or_create(name=university_name)
            for campus_name in campus_names:
                Campus.objects.get_or_create(university=university, name=campus_name)

        for order, category_name in enumerate(["Clothes", "Electronics", "Books", "Furniture", "Shoes", "Services"]):
            Category.objects.get_or_create(
                slug=slugify(category_name),
                defaults={"name": category_name, "sort_order": order},
            )
        self.stdout.write(self.style.SUCCESS("Starter campuses and categories are ready."))
