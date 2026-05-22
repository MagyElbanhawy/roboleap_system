from django.contrib import admin
from django.urls import path, include
from academy.views import CurrentUserView, LoginView

urlpatterns = [
    path("admin/",       admin.site.urls),
    path("api/auth/login/", LoginView.as_view(), name="api-token-auth"),
    path("api/auth/me/", CurrentUserView.as_view(), name="api-current-user"),
    path("",             include("academy.urls")),
]
