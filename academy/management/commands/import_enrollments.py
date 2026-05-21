import csv

from django.core.management.base import BaseCommand

from academy.models import Course, Enrollment, Student


class Command(BaseCommand):
    help = "Import enrollments from a CSV file"

    def add_arguments(self, parser):
        parser.add_argument("csv_file", type=str)

    def clean_row(self, row):
        return {
            key.strip(): value.strip()
            for key, value in row.items()
            if key is not None
        }

    def handle(self, *args, **options):
        csv_file = options["csv_file"]

        with open(csv_file, newline="", encoding="utf-8-sig") as file:
            reader = csv.DictReader(file)
            reader.fieldnames = [name.strip() for name in reader.fieldnames]

            for raw_row in reader:
                row = self.clean_row(raw_row)

                student_email = row["student_email"]
                course_name = row["course_name"]
                course_batch = row.get("course_batch", "")

                try:
                    student = Student.objects.get(email__iexact=student_email)
                except Student.DoesNotExist:
                    self.stdout.write(
                        self.style.ERROR(f"Student not found: {student_email}")
                    )
                    continue

                course_query = Course.objects.filter(name__iexact=course_name)

                if course_batch:
                    course_query = course_query.filter(batch__iexact=course_batch)

                course = course_query.first()

                if not course:
                    self.stdout.write(
                        self.style.ERROR(
                            f"Course not found: {course_name} {course_batch}"
                        )
                    )
                    continue

                enrollment, created = Enrollment.objects.update_or_create(
                    student=student,
                    course=course,
                    defaults={
                        "is_active": row.get("is_active", "true").lower()
                        in ["true", "1", "yes", "active"],
                        "notes": row.get("notes", ""),
                    },
                )

                status = "Created" if created else "Updated"
                self.stdout.write(
                    f"{status}: {student.full_name} -> {course}"
                )
