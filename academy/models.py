from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator
from django.utils import timezone


# ─── Users & Roles ───────────────────────────────────────────────────────────

class User(AbstractUser):
    class Role(models.TextChoices):
        ADMIN       = "admin",       "Administrator"
        SECRETARY   = "secretary",   "Secretary"
        INSTRUCTOR  = "instructor",  "Instructor"
        FINANCE     = "finance",     "Financial Department"
        TOOLS       = "tools",       "Tools & Resources"

    role  = models.CharField(max_length=20, choices=Role.choices, default=Role.SECRETARY)
    phone = models.CharField(max_length=20, blank=True)

    def is_admin(self):      return self.role == self.Role.ADMIN
    def is_finance(self):    return self.is_superuser or self.role in (self.Role.ADMIN, self.Role.FINANCE)
    def is_secretary(self):  return self.is_superuser or self.role in (self.Role.ADMIN, self.Role.SECRETARY)

    def __str__(self):
        return f"{self.get_full_name()} ({self.get_role_display()})"


# ─── Instructors ─────────────────────────────────────────────────────────────

class Instructor(models.Model):
    user        = models.OneToOneField(User, on_delete=models.CASCADE, related_name="instructor_profile")
    speciality  = models.CharField(max_length=120, blank=True)
    bio         = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return str(self.user)


# ─── Courses ──────────────────────────────────────────────────────────────────

class Course(models.Model):
    class Status(models.TextChoices):
        UPCOMING = "upcoming", "Upcoming"
        ACTIVE   = "active",   "Active"
        ENDED    = "ended",    "Ended"

    name        = models.CharField(max_length=200)
    batch       = models.CharField(max_length=50, blank=True, help_text="e.g. Batch A")
    description = models.TextField(blank=True)
    instructor  = models.ForeignKey(Instructor, on_delete=models.SET_NULL, null=True, related_name="courses")
    fee         = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0)])
    start_date  = models.DateField()
    end_date    = models.DateField(null=True, blank=True)
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.UPCOMING)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-start_date"]

    def __str__(self):
        return f"{self.name} — {self.batch}" if self.batch else self.name

    @property
    def total_sessions(self):
        return self.sessions.count()

    @property
    def enrolled_count(self):
        return self.enrollments.filter(is_active=True).count()


# ─── Students ─────────────────────────────────────────────────────────────────

class Student(models.Model):
    first_name  = models.CharField(max_length=80)
    last_name   = models.CharField(max_length=80)
    email       = models.EmailField(unique=True)
    phone       = models.CharField(max_length=20, blank=True)
    parent_name = models.CharField(max_length=160, blank=True)
    parent_phone= models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["last_name", "first_name"]

    def __str__(self):
        return f"{self.first_name} {self.last_name}"

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


# ─── Enrollments ──────────────────────────────────────────────────────────────

class Enrollment(models.Model):
    student    = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="enrollments")
    course     = models.ForeignKey(Course,  on_delete=models.CASCADE, related_name="enrollments")
    enrolled_at = models.DateTimeField(auto_now_add=True)
    is_active  = models.BooleanField(default=True)
    notes      = models.TextField(blank=True)

    class Meta:
        unique_together = ("student", "course")
        ordering = ["-enrolled_at"]

    def __str__(self):
        return f"{self.student} → {self.course}"

    @property
    def total_due(self):
        return self.course.fee

    @property
    def total_paid(self):
        return sum(p.amount for p in self.payments.filter(status=Payment.Status.CONFIRMED))

    @property
    def balance(self):
        return self.total_due - self.total_paid

    @property
    def payment_status(self):
        paid = self.total_paid
        if paid <= 0:
            return "unpaid"
        if paid >= self.total_due:
            return "paid"
        return "partial"

    @property
    def sessions_attended(self):
        return self.attendance_records.filter(status=Attendance.Status.PRESENT).count()


# ─── Sessions ─────────────────────────────────────────────────────────────────

class Session(models.Model):
    course      = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="sessions")
    title       = models.CharField(max_length=200)
    session_date = models.DateField()
    start_time  = models.TimeField()
    end_time    = models.TimeField(null=True, blank=True)
    notes       = models.TextField(blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["session_date", "start_time"]

    def __str__(self):
        return f"{self.course} — {self.title} ({self.session_date})"


# ─── Attendance ───────────────────────────────────────────────────────────────

class Attendance(models.Model):
    class Status(models.TextChoices):
        PRESENT = "present", "Present"
        ABSENT  = "absent",  "Absent"
        LATE    = "late",    "Late"
        EXCUSED = "excused", "Excused"

    enrollment  = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="attendance_records")
    session     = models.ForeignKey(Session,    on_delete=models.CASCADE, related_name="attendance_records")
    status      = models.CharField(max_length=10, choices=Status.choices, default=Status.PRESENT)
    recorded_at = models.DateTimeField(auto_now_add=True)
    note        = models.CharField(max_length=255, blank=True)

    class Meta:
        unique_together = ("enrollment", "session")

    def __str__(self):
        return f"{self.enrollment.student} — {self.session} — {self.status}"


# ─── Payments ─────────────────────────────────────────────────────────────────

class Payment(models.Model):
    class Status(models.TextChoices):
        PENDING   = "pending",   "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        CANCELLED = "cancelled", "Cancelled"

    class Method(models.TextChoices):
        CASH     = "cash",     "Cash"
        TRANSFER = "transfer", "Bank Transfer"
        ONLINE   = "online",   "Online"

    enrollment  = models.ForeignKey(Enrollment, on_delete=models.CASCADE, related_name="payments")
    amount      = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(0.01)])
    method      = models.CharField(max_length=20, choices=Method.choices, default=Method.CASH)
    status      = models.CharField(max_length=20, choices=Status.choices, default=Status.CONFIRMED)
    paid_at     = models.DateTimeField(default=timezone.now)
    receipt_number = models.CharField(max_length=50, blank=True, unique=True, null=True)
    note        = models.TextField(blank=True)
    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="recorded_payments")
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-paid_at"]

    def __str__(self):
        return f"{self.enrollment.student} — EGP {self.amount} ({self.paid_at.date()})"

    def save(self, *args, **kwargs):
        if not self.receipt_number:
            import uuid
            self.receipt_number = f"RCP-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)


class AcademyTransaction(models.Model):
    
    class TransactionType(models.TextChoices):
        INCOME = "income", "Income"
        OUTCOME = "outcome", "Outcome"

    class Category(models.TextChoices):
        SPONSORSHIP = "sponsorship", "Sponsorship"
        COMPETITION_PRIZE = "competition_prize", "Competition Prize"
        WORKSHOP_INCOME = "workshop_income", "Workshop Income"
        STUDENT_PAYMENT_SUMMARY = "student_payment_summary", "Student Payment Summary"

        TOOLS = "tools", "Tools"
        TRAVEL = "travel", "Travel"
        COMPETITION_FEES = "competition_fees", "Competition Fees"
        RENT = "rent", "Rent"
        SALARY = "salary", "Salary"
        MAINTENANCE = "maintenance", "Maintenance"

        OTHER = "other", "Other"

    transaction_type = models.CharField(
        max_length=20,
        choices=TransactionType.choices,
    )

    category = models.CharField(
        max_length=50,
        choices=Category.choices,
    )

    custom_category = models.CharField(
        max_length=120,
        blank=True,
        help_text="Use this only when category is Other",
    )

    related_student = models.ForeignKey(
        Student,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="academy_transactions",
    )
    event_name = models.CharField(max_length=200, blank=True)
    event_location = models.CharField(max_length=200, blank=True)
    event_date = models.DateField(null=True, blank=True)

    title = models.CharField(max_length=200)
    date = models.DateField(default=timezone.now)

    quantity = models.PositiveIntegerField(default=1)
    unit_amount = models.DecimalField(max_digits=10, decimal_places=2)

    note = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="academy_transactions",
    )

    created_at = models.DateTimeField(auto_now_add=True)


    @property
    def subtotal(self):
        if self.quantity is None or self.unit_amount is None:
            return 0
        return self.quantity * self.unit_amount

    @property
    def event_month(self):
        return self.event_date.strftime("%B") if self.event_date else None

    @property
    def event_year(self):
        return self.event_date.year if self.event_date else None

    def __str__(self):
        category = self.custom_category if self.category == "other" else self.get_category_display()
        event_info = f" — {self.event_name}" if self.event_name else ""
        student_info = f" ({self.related_student})" if self.related_student else ""
        return f"{self.get_transaction_type_display()} - {category}{event_info}{student_info} - EGP {self.subtotal}"

class IncomeTransaction(AcademyTransaction):
    class Meta:
        proxy = True
        verbose_name = "Income"
        verbose_name_plural = "Income"


class OutcomeTransaction(AcademyTransaction):
    class Meta:
        proxy = True
        verbose_name = "Outcome"
        verbose_name_plural = "Outcome"