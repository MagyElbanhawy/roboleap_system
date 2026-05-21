from django.contrib import admin
from django.urls import path, include
from academy.views import CurrentUserView, LoginView
from django.http import HttpResponse

def home(request):
    return HttpResponse("Roboleap API is running 🚀")

urlpatterns = [
    path('', home),  # ✅ homepage works now

    path("admin/", admin.site.urls),

    path("api/auth/login/", LoginView.as_view(), name="api-token-auth"),
    path("api/auth/me/", CurrentUserView.as_view(), name="api-current-user"),

    path("api/", include("academy.urls")),  # 🔥 better practice
]