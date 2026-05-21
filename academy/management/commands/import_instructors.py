import csv

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from academy.models import Instructor


class Command(BaseCommand):
    help = "Import instructors from a CSV file"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str)

    def handle(self, *args, **options):
        csv_file = options["csv_file"]
        User = get_user_model()

        with open(csv_file, newline="", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            reader.fieldnames = [name.strip() for name in reader.fieldnames]

            for row in reader:
                row = {key.strip(): value.strip() for key, value in row.items()}

                username = row["username"]
                password = row.get("password") or "12345678"

                user, user_created = User.objects.update_or_create(
                    username=username,
                    defaults={
                        "first_name": row.get("first_name", ""),
                        "last_name": row.get("last_name", ""),
                        "email": row.get("email", ""),
                        "role": "instructor",
                    },
                )

                if user_created or row.get("password"):
                    user.set_password(password)
                    user.save()

                instructor, instructor_created = Instructor.objects.update_or_create(
                    user=user,
                    defaults={
                        "speciality": row.get("speciality", ""),
                        "bio": row.get("bio", ""),
                    },
                )

                status = "Created" if instructor_created else "Updated"
                self.stdout.write(f"{status}: {user.get_full_name() or username}")

