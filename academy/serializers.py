from rest_framework import serializers
from django.db.models import Sum, Count
from django.utils import timezone
from django.utils.dateparse import parse_date
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


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True, required=True)
    new_password = serializers.CharField(write_only=True, required=True)
    new_password_confirm = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if user is None or not user.is_authenticated:
            raise serializers.ValidationError("Authentication required")

        old = attrs.get("old_password")
        if not user.check_password(old):
            raise serializers.ValidationError({"old_password": "Old password is incorrect."})

        npw = attrs.get("new_password")
        npw2 = attrs.get("new_password_confirm")
        if npw != npw2:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})

        # Add any password policy checks here if desired
        return attrs


class AcademyTransactionSerializer(serializers.ModelSerializer):
    recorded_by_name = serializers.SerializerMethodField()
    subtotal = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    transaction_type_label = serializers.SerializerMethodField()
    related_student_name = serializers.SerializerMethodField()
    # make related_student optional and accept null
    related_student = serializers.PrimaryKeyRelatedField(queryset=Student.objects.all(), required=False, allow_null=True)
    # helper field used only on write to link a Payment via Enrollment
    enrollment_id = serializers.PrimaryKeyRelatedField(queryset=Enrollment.objects.all(), write_only=True, required=False, allow_null=True)
    # accept empty string from frontend and parse into a date in validate()
    event_date = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = AcademyTransaction
        fields = [
            "id", "transaction_type", "transaction_type_label",
            "category", "category_label", "custom_category",
            "title", "date", "quantity", "unit_amount",
            "subtotal", "note", "recorded_by",
            "recorded_by_name", "created_at",
            "related_student", "related_student_name",
            # write-only helper for linking this transaction to an enrollment
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

    def create(self, validated_data):
        request = self.context.get("request")
        if request and request.user.is_authenticated:
            validated_data["recorded_by"] = request.user
        # pop enrollment_id if present — it's not a model field on AcademyTransaction
        enrollment = validated_data.pop("enrollment_id", None)
        tx = super().create(validated_data)

        # If this transaction represents a student payment summary, create a confirmed Payment
        try:
            from .models import Payment
        except Exception:
            Payment = None

        if (tx.category == AcademyTransaction.Category.STUDENT_PAYMENT_SUMMARY) and enrollment and Payment:
            # create a confirmed Payment record for the enrollment matching the subtotal
            try:
                Payment.objects.create(
                    enrollment=enrollment,
                    amount=tx.subtotal,
                    status=Payment.Status.CONFIRMED,
                    recorded_by=tx.recorded_by,
                )
            except Exception:
                # don't interrupt transaction creation if payment creation fails
                pass

        return tx

    def validate(self, attrs):
        # Allow optional related_student and enrollment_id and accept empty event_date
        enrollment = attrs.get("enrollment_id")
        related_student = attrs.get("related_student")

        # Ensure student + enrollment match when category indicates a student payment
        if attrs.get("category") == AcademyTransaction.Category.STUDENT_PAYMENT_SUMMARY:
            if not enrollment:
                raise serializers.ValidationError({"enrollment_id": "This field is required for student payment summary."})
            # enrollment is a model instance (PrimaryKeyRelatedField should provide it)
            if related_student and enrollment.student != related_student:
                raise serializers.ValidationError({"related_student": "Does not match the enrollment's student."})

        # Accept empty event_date strings from frontend
        event_date = attrs.get("event_date")
        if isinstance(event_date, str) and event_date.strip() == "":
            attrs["event_date"] = None

        # Parse non-empty event_date strings into date objects
        if isinstance(event_date, str) and event_date.strip() != "":
            parsed = parse_date(event_date)
            if not parsed:
                raise serializers.ValidationError({"event_date": "Invalid date format."})
            attrs["event_date"] = parsed

        return attrs


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
