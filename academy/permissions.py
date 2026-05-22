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
    """Finance permission that explicitly denies a specific user named Mawada.

    Admins and finance roles are allowed; the user with username 'Mawada' is denied.
    """
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if getattr(u, "username", "").lower() == "mawada":
            return False
        return bool(u.is_superuser or u.is_staff or u.role in ("admin", "finance"))


class IsFinanceOrMawadaTransactionCreate(BasePermission):
    """Allow finance users for any action; allow Mawada only to POST (create) transactions."""
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        # finance/admin/staff allowed
        if u.is_superuser or u.is_staff or u.role in ("admin", "finance"):
            return True
        # Mawada may only create (POST)
        if getattr(u, "username", "").lower() == "mawada" and request.method == "POST":
            return True
        return False


class IsFinanceOrMawadaRead(BasePermission):
    """Allow finance users full access; allow Mawada to perform read-only GETs on student financial detail."""
    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        if u.is_superuser or u.is_staff or u.role in ("admin", "finance"):
            return True
        if getattr(u, "username", "").lower() == "mawada" and request.method in ("GET", "HEAD", "OPTIONS"):
            return True
        return False


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
