from rest_framework.permissions import BasePermission, IsAuthenticated
class IsFinancialOrAdministrator(BasePermission):
    def has_permission(self, request, view):
        user = request.user

        return (
            user.is_authenticated
            and (
                user.is_superuser
                or user.is_staff
                or getattr(user, "role", "").lower() in [
                    "administrator",
                    "admin",
                    "financial",
                ]
            )
        )


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or request.user.is_staff or request.user.role == "admin")
        )


class IsFinance(BasePermission):
    """Finance team, secretary, or admin."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or request.user.is_staff or request.user.role in ("admin", "finance", "secretary"))
        )


class IsFinanceExceptMawada(BasePermission):
    """Finance access for all finance roles except the restricted mawada account."""
    def has_permission(self, request, view):
        user = request.user
        return bool(
            user and
            user.is_authenticated and
            user.username != "mawada" and
            (user.is_superuser or user.is_staff or user.role in ("admin", "finance", "secretary"))
        )


class IsFinanceOrMawadaTransactionCreate(BasePermission):
    """Allow mawada to create payment transaction entries, but not access other finance views."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method == "POST" and user.username == "mawada":
            return True
        return bool(
            user.is_superuser or user.is_staff or user.role in ("admin", "finance", "secretary")
        )


class IsFinanceOrMawadaRead(BasePermission):
    """Allow finance users or mawada to read student payment detail."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if request.method in ("GET", "HEAD", "OPTIONS") and user.username == "mawada":
            return True
        return bool(
            user.is_superuser or user.is_staff or user.role in ("admin", "finance", "secretary")
        )


class IsSecretary(BasePermission):
    """Secretary OR admin (read: any authenticated)."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or request.user.is_staff or request.user.role in ("admin", "secretary"))
        )


class IsInstructor(BasePermission):
    """Instructor OR secretary OR admin."""
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_superuser or request.user.is_staff or request.user.role in ("admin", "secretary", "instructor"))
        )


class ReadOnly(BasePermission):
    def has_permission(self, request, view):
        return request.method in ("GET", "HEAD", "OPTIONS")
