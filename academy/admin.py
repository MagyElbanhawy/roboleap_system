from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User, Instructor, Course, Student, Enrollment, Session, Attendance, Payment
from .models import AcademyTransaction
from .models import IncomeTransaction, OutcomeTransaction
from django.urls import path
from django.template.response import TemplateResponse
from django.db.models import Sum, F, DecimalField, ExpressionWrapper
from django.db.models.functions import Coalesce
from decimal import Decimal
@admin.register(User)
class UserAdmin(BaseUserAdmin):
    fieldsets = BaseUserAdmin.fieldsets + (
        ("Roboleap", {"fields": ("role", "phone")}),
    )
    list_display  = ["username", "email", "role", "is_active"]
    list_filter   = ["role", "is_active"]


@admin.register(IncomeTransaction)
class IncomeTransactionAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "date", "quantity", "unit_amount", "subtotal")
    list_filter = ("category", "date")
    search_fields = ("title", "custom_category", "note")

    def get_queryset(self, request):
        return super().get_queryset(request).filter(transaction_type="income")

    def save_model(self, request, obj, form, change):
        obj.transaction_type = "income"
        obj.recorded_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(OutcomeTransaction)
class OutcomeTransactionAdmin(admin.ModelAdmin):
    list_display = ("title", "category", "date", "quantity", "unit_amount", "subtotal")
    list_filter = ("category", "date")
    search_fields = ("title", "custom_category", "note")

    def get_queryset(self, request):
        return super().get_queryset(request).filter(transaction_type="outcome")

    def save_model(self, request, obj, form, change):
        obj.transaction_type = "outcome"
        obj.recorded_by = request.user
        super().save_model(request, obj, form, change)

def get_urls(self):
    urls = super().get_urls()
    custom_urls = [
        path(
            "net-profit/",
            self.admin_site.admin_view(self.net_profit_view),
            name="academy_net_profit",
        ),
    ]
    return custom_urls + urls

def net_profit_view(self, request):
    subtotal_expr = ExpressionWrapper(
        F("quantity") * F("unit_amount"),
        output_field=DecimalField(max_digits=12, decimal_places=2),
    )

    income_total = AcademyTransaction.objects.filter(
        transaction_type="income"
    ).aggregate(
        total=Coalesce(Sum(subtotal_expr), Decimal("0.00"))
    )["total"]

    outcome_total = AcademyTransaction.objects.filter(
        transaction_type="outcome"
    ).aggregate(
        total=Coalesce(Sum(subtotal_expr), Decimal("0.00"))
    )["total"]

    context = {
        **self.admin_site.each_context(request),
        "title": "Net Profit",
        "income_total": income_total,
        "outcome_total": outcome_total,
        "net_profit": income_total - outcome_total,
    }

    return TemplateResponse(
        request,
        "admin/academy/net_profit.html",
        context,
    )

@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display  = ["name", "batch", "instructor", "fee", "status", "start_date", "enrolled_count"]
    list_filter   = ["status"]
    search_fields = ["name", "batch"]


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display  = ["full_name", "email", "phone", "created_at"]
    search_fields = ["first_name", "last_name", "email"]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display  = ["student", "course", "is_active", "enrolled_at"]
    list_filter   = ["is_active", "course"]
    search_fields = ["student__first_name", "student__last_name"]


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display  = ["enrollment", "amount", "method", "status", "paid_at", "receipt_number"]
    list_filter   = ["status", "method"]
    search_fields = ["enrollment__student__first_name", "receipt_number"]
    readonly_fields = ["receipt_number", "created_at"]


@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display  = ["course", "title", "session_date", "start_time"]
    list_filter   = ["course"]


@admin.register(Attendance)
class AttendanceAdmin(admin.ModelAdmin):
    list_display  = ["enrollment", "session", "status", "recorded_at"]
    list_filter   = ["status", "session__course"]


admin.site.register(Instructor)
