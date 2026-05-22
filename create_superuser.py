import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "roboleap.settings")
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

if not User.objects.filter(username="admin").exists():
    User.objects.create_superuser(
        username="admin",
        email="admin@test.com",
        password="admin123"
    )
    print("Superuser created")
else:
    print("Superuser already exists")

# Create the requested demo users
def ensure_user(username, password, email=None, role=None, is_superuser=False):
    if not User.objects.filter(username=username).exists():
        user = User.objects.create_user(username=username, email=email or f"{username}@example.com", password=password)
        if role:
            user.role = role
        if is_superuser:
            user.is_superuser = True
            user.is_staff = True
        user.save()
        print(f"Created user {username}")
    else:
        print(f"User {username} already exists")

# two full admins: Magy, Tagrid
ensure_user("Magy", "123", email="magy@example.com", role=User.Role.ADMIN, is_superuser=True)
ensure_user("Tagrid", "123", email="tagrid@example.com", role=User.Role.ADMIN, is_superuser=True)
# Mawada: secretary role
ensure_user("Mawada", "123", email="mawada@example.com", role=User.Role.SECRETARY, is_superuser=False)