from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    UserViewSet, InstructorViewSet, CourseViewSet, StudentViewSet,
    EnrollmentViewSet, SessionViewSet, AttendanceViewSet, PaymentViewSet,
    TransactionViewSet,
    CourseFinancialSummaryView, FinancialOverviewView, StudentFinancialDetailView,
)

router = DefaultRouter()
router.register(r"users",        UserViewSet,        basename="user")
router.register(r"instructors",  InstructorViewSet,  basename="instructor")
router.register(r"courses",      CourseViewSet,      basename="course")
router.register(r"students",     StudentViewSet,     basename="student")
router.register(r"enrollments",  EnrollmentViewSet,  basename="enrollment")
router.register(r"sessions",     SessionViewSet,     basename="session")
router.register(r"attendance",   AttendanceViewSet,  basename="attendance")
router.register(r"payments",     PaymentViewSet,     basename="payment")
router.register(r"transactions", TransactionViewSet, basename="transaction")

financial_urlpatterns = [
    path("overview/",
         FinancialOverviewView.as_view(),
         name="financial-overview"),

    path("courses/<int:course_id>/summary/",
         CourseFinancialSummaryView.as_view(),
         name="course-financial-summary"),

    path("students/<int:student_id>/",
         StudentFinancialDetailView.as_view(),
         name="student-financial-detail"),
]

urlpatterns = [
    path("api/",          include(router.urls)),
    path("api/financial/", include(financial_urlpatterns)),
]
