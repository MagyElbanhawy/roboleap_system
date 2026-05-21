import csv
from datetime import datetime

from django.core.management.base import BaseCommand

from academy.models import Student


class Command(BaseCommand):
    help = "Import students from a CSV file"

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

    def handle(self, *args, **options):
        csv_file = options["csv_file"]

        with open(csv_file, newline="", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            reader.fieldnames = [name.strip() for name in reader.fieldnames]

            for raw_row in reader:
                row = self.clean_row(raw_row)

                student, created = Student.objects.update_or_create(
                    email=row["email"],
                    defaults={
                        "first_name": row["first_name"],
                        "last_name": row["last_name"],
                        "phone": row.get("phone", ""),
                        "parent_name": row.get("parent_name", ""),
                        "parent_phone": row.get("parent_phone", ""),
                        "date_of_birth": self.parse_date(row.get("date_of_birth")),
                    },
                )

                status = "Created" if created else "Updated"
                self.stdout.write(f"{status}: {student.full_name}")
