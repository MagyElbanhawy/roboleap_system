from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from django.db.models import Sum, Count
from django.utils import timezone
from .models import (
    User, Instructor, Course, Student,
    Enrollment, Session, Attendance, Payment,
    AcademyTransaction,
)


# ─── Auth / Users ─────────────────────────────────────────────────────────────

class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = ["id", "username", "email", "full_name", "role", "phone", "is_superuser", "is_staff"]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


# ─── Instructors ──────────────────────────────────────────────────────────────

class InstructorSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    courses_count = serializers.SerializerMethodField()
    sessions_taught = serializers.SerializerMethodField()
    current_month_sessions = serializers.SerializerMethodField()

    class Meta:
        model  = Instructor
        fields = [
            "id", "user", "speciality", "bio", "created_at",
            "courses_count", "sessions_taught", "current_month_sessions",
        ]

    def get_courses_count(self, obj):
        return obj.courses.count()

    def get_sessions_taught(self, obj):
        return obj.courses.aggregate(total=Count("sessions", distinct=True))["total"] or 0

    def get_current_month_sessions(self, obj):
        now = timezone.now().date()
        return obj.courses.filter(
            sessions__session_date__year=now.year,
            sessions__session_date__month=now.month,
        ).count()


# ─── Courses ──────────────────────────────────────────────────────────────────

class CourseListSerializer(serializers.ModelSerializer):
    instructor_name  = serializers.SerializerMethodField()
    enrolled_count   = serializers.IntegerField(read_only=True)
    total_sessions   = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Course
        fields = [
            "id", "name", "batch", "fee", "status",
            "start_date", "end_date",
            "instructor_name", "enrolled_count", "total_sessions",
        ]

    def get_instructor_name(self, obj):
        return str(obj.instructor.user) if obj.instructor else None


class CourseDetailSerializer(CourseListSerializer):
    class Meta(CourseListSerializer.Meta):
        fields = CourseListSerializer.Meta.fields + ["description", "created_at"]


# ─── Students ─────────────────────────────────────────────────────────────────

class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Student
        fields = [
            "id", "first_name", "last_name", "full_name",
            "email", "phone", "parent_name", "parent_phone",
            "date_of_birth", "created_at",
        ]
        read_only_fields = ["full_name", "created_at"]


# ─── Payments ─────────────────────────────────────────────────────────────────

class PaymentSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()
    student_name = serializers.SerializerMethodField()
    course_name = serializers.SerializerMethodField()

    class Meta:
        model  = Payment
        fields = [
            "id", "enrollment", "student_name", "course_name",
            "amount", "method", "status",
            "paid_at", "receipt_number", "note",
            "recorded_by", "recorded_by_name", "created_at",
        ]
        read_only_fields = ["receipt_number", "created_at", "recorded_by_name", "student_name", "course_name"]

    def get_recorded_by_name(self, obj):
        return str(obj.recorded_by) if obj.recorded_by else None

    def get_student_name(self, obj):
        return obj.enrollment.student.full_name if obj.enrollment and obj.enrollment.student else None

    def get_course_name(self, obj):
        return str(obj.enrollment.course) if obj.enrollment and obj.enrollment.course else None

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["recorded_by"] = request.user
        return super().create(validated_data)


class AcademyTransactionSerializer(serializers.ModelSerializer):
    related_student = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(), required=False, allow_null=True
    )
    enrollment_id = serializers.PrimaryKeyRelatedField(
        queryset=Enrollment.objects.all(), write_only=True, required=False, allow_null=True
    )
    event_date = serializers.DateField(required=False, allow_null=True)
    recorded_by_name = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    transaction_type_label = serializers.SerializerMethodField()
    related_student_name = serializers.SerializerMethodField()

    class Meta:
        model = AcademyTransaction
        fields = [
            "id", "transaction_type", "transaction_type_label",
            "category", "category_label", "custom_category",
            "title", "date", "quantity", "unit_amount",
            "subtotal", "note", "recorded_by",
            "recorded_by_name", "created_at",
            "related_student", "related_student_name",
            "enrollment_id",
            "event_name", "event_location", "event_date",
        ]
        read_only_fields = ["recorded_by_name", "created_at", "subtotal", "transaction_type_label", "category_label", "related_student_name"]

    def get_recorded_by_name(self, obj):
        return str(obj.recorded_by) if obj.recorded_by else None

    def get_subtotal(self, obj):
        return float(obj.subtotal)

    def get_category_label(self, obj):
        return obj.custom_category if obj.category == "other" else obj.get_category_display()

    def get_transaction_type_label(self, obj):
        return obj.get_transaction_type_display()

    def get_related_student_name(self, obj):
        return str(obj.related_student) if obj.related_student else None

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user and user.is_authenticated and user.username == "mawada":
            if attrs.get("transaction_type") != AcademyTransaction.TransactionType.INCOME:
                raise ValidationError("Mawada can only record income transactions for student payments.")
            if attrs.get("category") != AcademyTransaction.Category.STUDENT_PAYMENT_SUMMARY:
                raise ValidationError({
                    "category": "Mawada may only use the Student Payment Summary category.",
                })
            if not attrs.get("related_student"):
                raise ValidationError({
                    "related_student": "A student must be selected for Mawada's payment records.",
                })
            if not attrs.get("enrollment_id"):
                raise ValidationError({
                    "enrollment_id": "Please select the course or competition for the payment.",
                })
            if attrs.get("enrollment_id") and attrs.get("related_student") and attrs["enrollment_id"].student_id != attrs["related_student"].id:
                raise ValidationError({
                    "enrollment_id": "Selected enrollment does not belong to the chosen student.",
                })
        return attrs

    def create(self, validated_data):
        enrollment = validated_data.pop("enrollment_id", None)
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["recorded_by"] = request.user

        transaction = super().create(validated_data)

        if (
            enrollment
            and transaction.transaction_type == AcademyTransaction.TransactionType.INCOME
            and transaction.category == AcademyTransaction.Category.STUDENT_PAYMENT_SUMMARY
        ):
            Payment.objects.create(
                enrollment=enrollment,
                amount=transaction.subtotal,
                method=Payment.Method.CASH,
                status=Payment.Status.CONFIRMED,
                note=transaction.note,
                recorded_by=request.user if request and request.user.is_authenticated else None,
            )

        return transaction


# ─── Attendance ───────────────────────────────────────────────────────────────

class AttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.SerializerMethodField()
    session_title = serializers.SerializerMethodField()

    class Meta:
        model  = Attendance
        fields = [
            "id", "enrollment", "session",
            "status", "note", "recorded_at",
            "student_name", "session_title",
        ]
        read_only_fields = ["recorded_at"]

    def get_student_name(self, obj):
        return obj.enrollment.student.full_name

    def get_session_title(self, obj):
        return obj.session.title


# ─── Enrollments ──────────────────────────────────────────────────────────────

class EnrollmentSerializer(serializers.ModelSerializer):
    student      = StudentSerializer(read_only=True)
    student_id   = serializers.PrimaryKeyRelatedField(
        queryset=Student.objects.all(), source="student", write_only=True
    )
    total_due    = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_paid   = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance      = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payment_status   = serializers.CharField(read_only=True)
    sessions_attended = serializers.IntegerField(read_only=True)
    payments     = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model  = Enrollment
        fields = [
            "id", "student", "student_id", "course",
            "enrolled_at", "is_active", "notes",
            "total_due", "total_paid", "balance", "payment_status",
            "sessions_attended", "payments",
        ]
        read_only_fields = ["enrolled_at"]


class EnrollmentListSerializer(serializers.ModelSerializer):
    """Lightweight version for list views — no nested payments."""
    student_name      = serializers.SerializerMethodField()
    total_due         = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    total_paid        = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance           = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payment_status    = serializers.CharField(read_only=True)
    sessions_attended = serializers.IntegerField(read_only=True)

    class Meta:
        model  = Enrollment
        fields = [
            "id", "student", "student_name", "course",
            "enrolled_at", "is_active",
            "total_due", "total_paid", "balance",
            "payment_status", "sessions_attended",
        ]

    def get_student_name(self, obj):
        return obj.student.full_name


# ─── Financial Dashboard ──────────────────────────────────────────────────────

class CourseFinancialSummarySerializer(serializers.ModelSerializer):
    """
    Full financial picture for a single course.
    Used by the /api/financial/courses/{id}/summary/ endpoint.
    """
    instructor_name = serializers.SerializerMethodField()
    total_students  = serializers.SerializerMethodField()
    total_due       = serializers.SerializerMethodField()
    total_collected = serializers.SerializerMethodField()
    total_outstanding = serializers.SerializerMethodField()
    collection_rate = serializers.SerializerMethodField()
    paid_count      = serializers.SerializerMethodField()
    partial_count   = serializers.SerializerMethodField()
    unpaid_count    = serializers.SerializerMethodField()
    students        = serializers.SerializerMethodField()

    class Meta:
        model  = Course
        fields = [
            "id", "name", "batch", "fee", "status",
            "start_date", "end_date", "instructor_name",
            "total_students", "total_due", "total_collected",
            "total_outstanding", "collection_rate",
            "paid_count", "partial_count", "unpaid_count",
            "students",
        ]

    def _active_enrollments(self, obj):
        return obj.enrollments.filter(is_active=True).select_related("student").prefetch_related("payments")

    def get_instructor_name(self, obj):
        return str(obj.instructor.user) if obj.instructor else None

    def get_total_students(self, obj):
        return self._active_enrollments(obj).count()

    def get_total_due(self, obj):
        count = self._active_enrollments(obj).count()
        return float(obj.fee) * count

    def get_total_collected(self, obj):
        result = Payment.objects.filter(
            enrollment__course=obj,
            enrollment__is_active=True,
            status=Payment.Status.CONFIRMED,
        ).aggregate(total=Sum("amount"))["total"]
        return float(result or 0)

    def get_total_outstanding(self, obj):
        return round(self.get_total_due(obj) - self.get_total_collected(obj), 2)

    def get_collection_rate(self, obj):
        due = self.get_total_due(obj)
        if due == 0:
            return 0
        return round(self.get_total_collected(obj) / due * 100, 1)

    def _payment_status_counts(self, obj):
        paid = partial = unpaid = 0
        for e in self._active_enrollments(obj):
            s = e.payment_status
            if s == "paid":    paid += 1
            elif s == "partial": partial += 1
            else:              unpaid += 1
        return paid, partial, unpaid

    def get_paid_count(self, obj):
        return self._payment_status_counts(obj)[0]

    def get_partial_count(self, obj):
        return self._payment_status_counts(obj)[1]

    def get_unpaid_count(self, obj):
        return self._payment_status_counts(obj)[2]

    def get_students(self, obj):
        enrollments = self._active_enrollments(obj)
        return EnrollmentListSerializer(enrollments, many=True).data


# ─── Sessions ─────────────────────────────────────────────────────────────────

class SessionSerializer(serializers.ModelSerializer):
    attendance_count = serializers.SerializerMethodField()

    class Meta:
        model  = Session
        fields = [
            "id", "course", "title", "session_date",
            "start_time", "end_time", "notes",
            "attendance_count", "created_at",
        ]
        read_only_fields = ["created_at"]

    def get_attendance_count(self, obj):
        return obj.attendance_records.filter(status=Attendance.Status.PRESENT).count()
