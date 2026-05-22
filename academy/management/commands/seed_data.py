"""
Usage: python manage.py seed_data
Creates demo users, courses, students, enrollments, sessions, attendance and payments.
"""
import random
from decimal import Decimal
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta, time
from academy.models import (
    User, Instructor, Course, Student,
    Enrollment, Session, Attendance, Payment
)


STUDENTS_DATA = [
    ("Ahmed",   "Youssef",  "ahmed@example.com"),
    ("Nour",    "El-Din",   "nour@example.com"),
    ("Sara",    "Mahmoud",  "sara@example.com"),
    ("Omar",    "Tarek",    "omar@example.com"),
    ("Layla",   "Hassan",   "layla@example.com"),
    ("Karim",   "Adel",     "karim@example.com"),
    ("Dina",    "Farouk",   "dina@example.com"),
    ("Yusuf",   "Nabil",    "yusuf@example.com"),
    ("Rania",   "Sami",     "rania@example.com"),
    ("Tamer",   "Galal",    "tamer@example.com"),
]


class Command(BaseCommand):
    help = "Seed the database with demo data"

    def handle(self, *args, **options):
        self.stdout.write("Seeding demo data...")

        # Admin
        admin, _ = User.objects.get_or_create(
            username="admin",
            defaults={"email": "admin@roboleap.com", "role": "admin", "is_staff": True, "is_superuser": True}
        )
        admin.set_password("admin123")
        admin.save()

        # Finance user
        finance, _ = User.objects.get_or_create(
            username="finance",
            defaults={"email": "finance@roboleap.com", "role": "finance"}
        )
        finance.set_password("finance123")
        finance.save()

        # Secretary
        secretary, _ = User.objects.get_or_create(
            username="secretary",
            defaults={"email": "secretary@roboleap.com", "role": "secretary"}
        )
        secretary.set_password("secretary123")
        secretary.save()

        # Instructor user
        instr_user, _ = User.objects.get_or_create(
            username="instructor1",
            defaults={
                "first_name": "Mohamed", "last_name": "Fathy",
                "email": "mfathy@roboleap.com", "role": "instructor"
            }
        )
        instr_user.set_password("instr123")
        instr_user.save()
        instructor, _ = Instructor.objects.get_or_create(
            user=instr_user,
            defaults={"speciality": "Robotics & AI"}
        )

        # Courses
        today = date.today()
        courses = []
        for name, batch, fee in [
            ("Robotics Fundamentals", "Batch A", Decimal("1200")),
            ("Python for Makers",     "Batch B", Decimal("950")),
            ("AI & Sensors",          "Batch C", Decimal("1500")),
        ]:
            c, _ = Course.objects.get_or_create(
                name=name, batch=batch,
                defaults={
                    "instructor": instructor,
                    "fee": fee,
                    "start_date": today - timedelta(days=30),
                    "status": "active",
                }
            )
            courses.append(c)

        # Students
        students = []
        for fn, ln, email in STUDENTS_DATA:
            s, _ = Student.objects.get_or_create(
                email=email,
                defaults={"first_name": fn, "last_name": ln, "phone": f"010{random.randint(10000000,99999999)}"}
            )
            students.append(s)

        # Enroll students into courses (3-6 per course)
        course_students = {
            courses[0]: students[:6],
            courses[1]: students[3:7],
            courses[2]: students[6:],
        }

        enrollments = {}
        for course, studs in course_students.items():
            # Create 8 sessions for this course
            sessions = []
            for i in range(8):
                sess, _ = Session.objects.get_or_create(
                    course=course,
                    title=f"Session {i+1}",
                    defaults={
                        "session_date": today - timedelta(days=28 - i*3),
                        "start_time": time(16, 0),
                        "end_time": time(18, 0),
                    }
                )
                sessions.append(sess)

            for student in studs:
                enroll, _ = Enrollment.objects.get_or_create(student=student, course=course)
                enrollments[(student.id, course.id)] = enroll

                # Attendance (randomised)
                for sess in sessions:
                    att_status = random.choices(
                        ["present", "absent", "late"],
                        weights=[75, 15, 10]
                    )[0]
                    Attendance.objects.get_or_create(
                        enrollment=enroll, session=sess,
                        defaults={"status": att_status}
                    )

                # Payments (randomised: 0%, 50%, or 100% paid)
                payment_scenario = random.choice(["full", "half", "none"])
                if payment_scenario == "full":
                    Payment.objects.get_or_create(
                        enrollment=enroll,
                        defaults={
                            "amount": course.fee,
                            "method": random.choice(["cash", "transfer"]),
                            "status": "confirmed",
                            "recorded_by": finance,
                        }
                    )
                elif payment_scenario == "half":
                    Payment.objects.get_or_create(
                        enrollment=enroll,
                        defaults={
                            "amount": course.fee / 2,
                            "method": "cash",
                            "status": "confirmed",
                            "recorded_by": finance,
                        }
                    )
                # "none" → no payment record

        self.stdout.write(self.style.SUCCESS(
            f"Done! Created {Course.objects.count()} courses, "
            f"{Student.objects.count()} students, "
            f"{Enrollment.objects.count()} enrollments, "
            f"{Payment.objects.count()} payments."
        ))
        self.stdout.write(self.style.SUCCESS(
            "\nDemo credentials:\n"
            "  admin / admin123\n"
            "  finance / finance123\n"
            "  secretary / secretary123\n"
            "  instructor1 / instr123"
        ))
