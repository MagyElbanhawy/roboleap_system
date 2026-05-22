from rest_framework import viewsets, status, permissions
from rest_framework.authtoken.models import Token
from rest_framework.authtoken.views import ObtainAuthToken
from .permissions import IsFinancialOrAdministrator
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from django.db.models import Sum, Count, Q, F, ExpressionWrapper, DecimalField
from django.utils import timezone
from .models import (
    User, Instructor, Course, Student,
    Enrollment, Session, Attendance, Payment,
    AcademyTransaction,
)
from .serializers import (
    UserSerializer, InstructorSerializer,
    CourseListSerializer, CourseDetailSerializer,
    StudentSerializer, EnrollmentSerializer, EnrollmentListSerializer,
    SessionSerializer, AttendanceSerializer, PaymentSerializer,
    CourseFinancialSummarySerializer, AcademyTransactionSerializer,
)
from .permissions import IsAdmin, IsFinance, IsSecretary, IsInstructor, IsFinanceExceptMawada, IsFinanceOrMawadaTransactionCreate, IsFinanceOrMawadaRead


# ─── Helpers ──────────────────────────────────────────────────────────────────

def paginate_or_all(viewset, queryset, serializer_class):
    """Return paginated or full list depending on ?page param."""
    page = viewset.paginate_queryset(queryset)
    if page is not None:
        s = serializer_class(page, many=True)
        return viewset.get_paginated_response(s.data)
    s = serializer_class(queryset, many=True)
    return Response(s.data)


# ─── Users ────────────────────────────────────────────────────────────────────

class LoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({
            "token": token.key,
            "user": UserSerializer(user).data,
        })


class CurrentUserView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all().order_by("id")
    serializer_class = UserSerializer
    permission_classes = [IsAdmin]

    @action(detail=False, methods=["post"], url_path="change-password", permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request):
        """POST /api/users/change-password/ — allow current user to change their password."""
        from .serializers import ChangePasswordSerializer

        serializer = ChangePasswordSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)

        new_password = serializer.validated_data["new_password"]
        user = request.user
        user.set_password(new_password)
        user.save()
        return Response({"detail": "Password changed successfully."})


# ─── Instructors ──────────────────────────────────────────────────────────────

class InstructorViewSet(viewsets.ModelViewSet):
    queryset = Instructor.objects.select_related("user").all()
    serializer_class = InstructorSerializer
    permission_classes = [IsSecretary]


# ─── Courses ──────────────────────────────────────────────────────────────────

class CourseViewSet(viewsets.ModelViewSet):
    queryset = Course.objects.select_related("instructor__user").all()
    permission_classes = [IsSecretary]

    def get_serializer_class(self):
        if self.action in ("retrieve", "create", "update", "partial_update"):
            return CourseDetailSerializer
        return CourseListSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=["get"], url_path="students")
    def students(self, request, pk=None):
        """GET /api/courses/{id}/students/ — all enrollments for this course."""
        course = self.get_object()
        enrollments = course.enrollments.filter(is_active=True).select_related("student").prefetch_related("payments")
        serializer = EnrollmentListSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="sessions")
    def sessions(self, request, pk=None):
        """GET /api/courses/{id}/sessions/ — all sessions."""
        course = self.get_object()
        serializer = SessionSerializer(course.sessions.all(), many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="attendance-summary")
    def attendance_summary(self, request, pk=None):
        """GET /api/courses/{id}/attendance-summary/ — per-student attendance."""
        course = self.get_object()
        total_sessions = course.sessions.count()
        enrollments = course.enrollments.filter(is_active=True).select_related("student")
        data = []
        for e in enrollments:
            present = e.attendance_records.filter(status=Attendance.Status.PRESENT).count()
            data.append({
                "enrollment_id": e.id,
                "student_id":    e.student.id,
                "student_name":  e.student.full_name,
                "present":       present,
                "absent":        e.attendance_records.filter(status=Attendance.Status.ABSENT).count(),
                "total_sessions": total_sessions,
                "attendance_rate": round(present / total_sessions * 100, 1) if total_sessions else 0,
            })
        return Response(data)


# ─── Students ─────────────────────────────────────────────────────────────────

class StudentViewSet(viewsets.ModelViewSet):
    queryset = Student.objects.all()
    serializer_class = StudentSerializer
    permission_classes = [IsSecretary]

    def get_queryset(self):
        qs = super().get_queryset()
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(
                Q(first_name__icontains=q) |
                Q(last_name__icontains=q)  |
                Q(email__icontains=q)
            )
        return qs

    @action(detail=True, methods=["get"], url_path="enrollments")
    def enrollments(self, request, pk=None):
        student = self.get_object()
        enrollments = student.enrollments.select_related("course").prefetch_related("payments")
        serializer = EnrollmentSerializer(enrollments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["get"], url_path="payment-history")
    def payment_history(self, request, pk=None):
        student = self.get_object()
        payments = Payment.objects.filter(
            enrollment__student=student,
            status=Payment.Status.CONFIRMED,
        ).select_related("enrollment__course", "recorded_by").order_by("-paid_at")
        serializer = PaymentSerializer(payments, many=True)
        return Response(serializer.data)


# ─── Enrollments ──────────────────────────────────────────────────────────────

class EnrollmentViewSet(viewsets.ModelViewSet):
    queryset = Enrollment.objects.select_related("student", "course").prefetch_related("payments")
    permission_classes = [IsSecretary]

    def get_serializer_class(self):
        if self.action == "list":
            return EnrollmentListSerializer
        return EnrollmentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        course_id = self.request.query_params.get("course")
        student_id = self.request.query_params.get("student")
        payment_status = self.request.query_params.get("payment_status")
        if course_id:
            qs = qs.filter(course_id=course_id)
        if student_id:
            qs = qs.filter(student_id=student_id)
        if payment_status:
            # Filter after fetch since payment_status is a computed property
            qs = [e for e in qs if e.payment_status == payment_status]
        return qs


# ─── Sessions ─────────────────────────────────────────────────────────────────

class SessionViewSet(viewsets.ModelViewSet):
    queryset = Session.objects.select_related("course").all()
    serializer_class = SessionSerializer
    permission_classes = [IsInstructor]

    def get_queryset(self):
        qs = super().get_queryset()
        course_id = self.request.query_params.get("course")
        if course_id:
            qs = qs.filter(course_id=course_id)
        return qs


# ─── Attendance ───────────────────────────────────────────────────────────────

class AttendanceViewSet(viewsets.ModelViewSet):
    queryset = Attendance.objects.select_related("enrollment__student", "session").all()
    serializer_class = AttendanceSerializer
    permission_classes = [IsInstructor]

    def get_queryset(self):
        qs = super().get_queryset()
        session_id = self.request.query_params.get("session")
        course_id = self.request.query_params.get("course")
        if session_id:
            qs = qs.filter(session_id=session_id)
        if course_id:
            qs = qs.filter(session__course_id=course_id)
        return qs

    @action(detail=False, methods=["post"], url_path="bulk")
    def bulk_record(self, request):
        """
        POST /api/attendance/bulk/
        Body: { session_id, records: [{enrollment_id, status, note}] }
        """
        session_id = request.data.get("session_id")
        records    = request.data.get("records", [])
        if not session_id:
            return Response({"error": "session_id required"}, status=400)

        created = []
        errors  = []
        for rec in records:
            obj, _ = Attendance.objects.update_or_create(
                enrollment_id=rec["enrollment_id"],
                session_id=session_id,
                defaults={"status": rec.get("status", "present"), "note": rec.get("note", "")},
            )
            created.append(AttendanceSerializer(obj).data)
        return Response({"recorded": len(created), "errors": errors})


# ─── Payments ─────────────────────────────────────────────────────────────────

class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related("enrollment__student", "enrollment__course", "recorded_by").all()
    serializer_class = PaymentSerializer
    # Mawada should be blocked entirely from viewing/managing payments here
    permission_classes = [IsFinanceExceptMawada]

    def get_queryset(self):
        qs = super().get_queryset()
        enrollment_id = self.request.query_params.get("enrollment")
        course_id     = self.request.query_params.get("course")
        student_id    = self.request.query_params.get("student")
        status_filter = self.request.query_params.get("status")
        if enrollment_id:  qs = qs.filter(enrollment_id=enrollment_id)
        if course_id:      qs = qs.filter(enrollment__course_id=course_id)
        if student_id:     qs = qs.filter(enrollment__student_id=student_id)
        if status_filter:  qs = qs.filter(status=status_filter)
        return qs


class TransactionViewSet(viewsets.ModelViewSet):
    queryset = AcademyTransaction.objects.select_related("recorded_by").all().order_by("-date", "-created_at")
    serializer_class = AcademyTransactionSerializer
    # Finance users can manage transactions; Mawada may only create transactions (POST)
    permission_classes = [IsFinanceOrMawadaTransactionCreate]


# ─── Financial Dashboard ──────────────────────────────────────────────────────

class CourseFinancialSummaryView(APIView):
    """
    GET /api/financial/courses/{course_id}/summary/
    Full financial snapshot: metrics + per-student balance table.
    """
    # block Mawada from viewing course financial summaries
    permission_classes = [IsFinanceExceptMawada]

    def get(self, request, course_id):
        try:
            course = Course.objects.get(pk=course_id)
        except Course.DoesNotExist:
            return Response({"error": "Course not found"}, status=404)

        serializer = CourseFinancialSummarySerializer(course)
        return Response(serializer.data)


class FinancialOverviewView(APIView):
    """
    GET /api/financial/overview/
    Academy-wide financial snapshot for the admin dashboard.
    """
    # block Mawada from seeing academy-wide finance overview
    permission_classes = [IsFinanceExceptMawada]

    def get(self, request):
        total_collected = Payment.objects.filter(
            status=Payment.Status.CONFIRMED
        ).aggregate(total=Sum("amount"))["total"] or 0

        active_enrollments = Enrollment.objects.filter(is_active=True)
        total_due = sum(e.total_due for e in active_enrollments)
        total_outstanding = float(total_due) - float(total_collected)

        courses = Course.objects.filter(status=Course.Status.ACTIVE)
        course_breakdown = []
        for c in courses:
            collected = Payment.objects.filter(
                enrollment__course=c,
                enrollment__is_active=True,
                status=Payment.Status.CONFIRMED,
            ).aggregate(total=Sum("amount"))["total"] or 0
            enrolled = c.enrollments.filter(is_active=True).count()
            due = float(c.fee) * enrolled
            course_breakdown.append({
                "course_id":   c.id,
                "course_name": str(c),
                "fee":         float(c.fee),
                "enrolled":    enrolled,
                "total_due":   due,
                "collected":   float(collected),
                "outstanding": round(due - float(collected), 2),
                "collection_rate": round(float(collected) / due * 100, 1) if due else 0,
            })

        active_sessions = Session.objects.filter(course__status=Course.Status.ACTIVE).count()
        tx_expr = ExpressionWrapper(F("quantity") * F("unit_amount"), output_field=DecimalField(max_digits=14, decimal_places=2))
        payment_income = Payment.objects.filter(
            status=Payment.Status.CONFIRMED
        ).aggregate(total=Sum("amount"))["total"] or 0
        academy_income = AcademyTransaction.objects.filter(
            transaction_type=AcademyTransaction.TransactionType.INCOME
        ).aggregate(total=Sum(tx_expr))["total"] or 0
        income_total = float(payment_income) + float(academy_income)
        outcome_total = AcademyTransaction.objects.filter(
            transaction_type=AcademyTransaction.TransactionType.OUTCOME
        ).aggregate(total=Sum(tx_expr))["total"] or 0
        net_profit = float(income_total) - float(outcome_total)

        recent_transactions = AcademyTransactionSerializer(
            AcademyTransaction.objects.order_by("-date", "-created_at")[:6],
            many=True
        ).data

        unpaid_students = [
            {
                "enrollment_id": e.id,
                "student_name":  e.student.full_name,
                "course":        str(e.course),
                "balance":       float(e.balance),
                "payment_status": e.payment_status,
            }
            for e in active_enrollments.select_related("student", "course")
            if e.balance > 0
        ]
        unpaid_students.sort(key=lambda x: x["balance"], reverse=True)

        return Response({
            "total_collected":   float(total_collected),
            "total_due":         float(total_due),
            "total_outstanding": round(total_outstanding, 2),
            "collection_rate":   round(float(total_collected) / float(total_due) * 100, 1) if total_due else 0,
            "active_courses":    courses.count(),
            "total_students":    active_enrollments.values("student").distinct().count(),
            "total_sessions":    active_sessions,
            "student_payments":  float(payment_income),
            "academy_income":   float(academy_income),
            "total_income":      round(income_total, 2),
            "total_outcome":     float(outcome_total),
            "net_profit":        round(net_profit, 2),
            "course_breakdown":  course_breakdown,
            "unpaid_students":   unpaid_students[:20],
            "recent_transactions": recent_transactions,
        })


class StudentFinancialDetailView(APIView):
    """
    GET /api/financial/students/{student_id}/
    Full payment history and balance summary per student.
    """
    # Allow finance users and allow Mawada read-only access to student financial detail
    permission_classes = [IsFinanceOrMawadaRead]

    def get(self, request, student_id):
        try:
            student = Student.objects.get(pk=student_id)
        except Student.DoesNotExist:
            return Response({"error": "Student not found"}, status=404)

        enrollments = student.enrollments.select_related("course").prefetch_related(
            "payments"
        ).filter(is_active=True)

        courses = []
        grand_due = grand_paid = 0
        for e in enrollments:
            due  = float(e.total_due)
            paid = float(e.total_paid)
            grand_due  += due
            grand_paid += paid
            courses.append({
                "enrollment_id": e.id,
                "course":        str(e.course),
                "course_id":     e.course.id,
                "enrolled_at":   e.enrolled_at,
                "total_due":     due,
                "total_paid":    paid,
                "balance":       round(due - paid, 2),
                "payment_status": e.payment_status,
                "sessions_attended": e.sessions_attended,
                "payments": PaymentSerializer(
                    e.payments.filter(status=Payment.Status.CONFIRMED).order_by("-paid_at"),
                    many=True
                ).data,
            })

        return Response({
            "student":         StudentSerializer(student).data,
            "grand_total_due": grand_due,
            "grand_total_paid": grand_paid,
            "grand_balance":   round(grand_due - grand_paid, 2),
            "courses":         courses,
        })
