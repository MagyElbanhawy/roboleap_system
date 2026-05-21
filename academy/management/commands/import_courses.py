import csv
from datetime import datetime

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from academy.models import Course, Instructor


class Command(BaseCommand):
    help = "Import courses from a CSV file"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str)

    def clean_row(self, row):
        return {
            key.strip(): value.strip()
            for key, value in row.items()
            if key is not None
        }

    def parse_date(self, value):
        if not value:
            return None
        return datetime.strptime(value.strip(), "%Y-%m-%d").date()

    def find_instructor(self, instructor_name):
        if not instructor_name:
            return None

        User = get_user_model()
        parts = instructor_name.strip().split()
        first_name = parts[0]
        last_name = " ".join(parts[1:])

        user = User.objects.filter(
            first_name__iexact=first_name,
            last_name__iexact=last_name,
            role="instructor",
        ).first()

        if not user:
            user = User.objects.filter(
                username__iexact=instructor_name.strip(),
                role="instructor",
            ).first()

        if not user:
            return None

        return Instructor.objects.filter(user=user).first()

    def handle(self, *args, **options):
        csv_file = options["csv_file"]

        with open(csv_file, newline="", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            reader.fieldnames = [name.strip() for name in reader.fieldnames]

            for raw_row in reader:
                row = self.clean_row(raw_row)

                instructor_name = row.get("instructor_name", "")
                instructor = self.find_instructor(instructor_name)

                if instructor_name and not instructor:
                    self.stdout.write(
                        self.style.WARNING(
                            f"Instructor not found: {instructor_name}"
                        )
                    )

                course, created = Course.objects.update_or_create(
                    name=row["name"],
                    defaults={
                        "description": row.get("description", ""),
                        "fee": row.get("fee") or 0,
                        "batch": row.get("batch", ""),
                        "start_date": self.parse_date(row.get("start_date")),
                        "end_date": self.parse_date(row.get("end_date")),
                        "instructor": instructor,
                    },
                )

                status = "Created" if created else "Updated"
                self.stdout.write(f"{status}: {course.name}")
