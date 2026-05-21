# Roboleap Academy — Django Backend

## Setup

```bash
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data        # creates demo users, courses, students, payments
python manage.py runserver
```


---

## Authentication

All endpoints require a token. Get one:


Returns `{ "token": "abc123..." }`. Use in all requests:

```
Authorization: Token abc123...
```

---

## Permissions per Role

| Endpoint group     | Admin | Finance | Secretary | Instructor |
|--------------------|:-----:|:-------:|:---------:|:----------:|
| Users              | ✅    | ❌      | ❌        | ❌         |
| Courses            | ✅    | ❌      | ✅        | ❌         |
| Students           | ✅    | ❌      | ✅        | ❌         |
| Enrollments        | ✅    | ❌      | ✅        | ❌         |
| Sessions           | ✅    | ❌      | ✅        | ✅         |
| Attendance         | ✅    | ❌      | ✅        | ✅         |
| Payments           | ✅    | ✅      | ❌        | ❌         |
| Financial views    | ✅    | ✅      | ❌        | ❌         |

---

## API Endpoints

### Courses

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/courses/` | List all courses (`?status=active`) |
| POST   | `/api/courses/` | Create course |
| GET    | `/api/courses/{id}/` | Course detail |
| PATCH  | `/api/courses/{id}/` | Update course |
| DELETE | `/api/courses/{id}/` | Delete course |
| GET    | `/api/courses/{id}/students/` | All enrolled students |
| GET    | `/api/courses/{id}/sessions/` | All sessions |
| GET    | `/api/courses/{id}/attendance-summary/` | Attendance % per student |

### Students

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/students/` | List students (`?q=search`) |
| POST   | `/api/students/` | Create student |
| GET    | `/api/students/{id}/` | Student detail |
| PATCH  | `/api/students/{id}/` | Update student |
| GET    | `/api/students/{id}/enrollments/` | All enrollments |
| GET    | `/api/students/{id}/payment-history/` | All confirmed payments |

### Enrollments

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/enrollments/` | List (`?course=1&student=2&payment_status=unpaid`) |
| POST   | `/api/enrollments/` | Enroll student into course |
| GET    | `/api/enrollments/{id}/` | Detail with full payment list |
| PATCH  | `/api/enrollments/{id}/` | Update (e.g. deactivate) |

### Sessions & Attendance

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/sessions/` | List (`?course=1`) |
| POST   | `/api/sessions/` | Create session |
| GET    | `/api/attendance/` | List (`?session=1&course=1`) |
| POST   | `/api/attendance/` | Record single attendance |
| POST   | `/api/attendance/bulk/` | Bulk record for a session |

**Bulk attendance body:**
```json
{
  "session_id": 3,
  "records": [
    { "enrollment_id": 1, "status": "present" },
    { "enrollment_id": 2, "status": "absent",  "note": "sick" },
    { "enrollment_id": 3, "status": "late" }
  ]
}
```

### Payments

| Method | URL | Description |
|--------|-----|-------------|
| GET    | `/api/payments/` | List (`?course=1&student=2&status=confirmed`) |
| POST   | `/api/payments/` | Record payment |
| PATCH  | `/api/payments/{id}/` | Update status (e.g. cancel) |

**Record payment body:**
```json
{
  "enrollment": 5,
  "amount": 600.00,
  "method": "cash",
  "status": "confirmed",
  "note": "First installment"
}
```

---

## Financial Dashboard Endpoints

### Academy-wide Overview
```
GET /api/financial/overview/
```
Returns:
```json
{
  "total_collected": 15200.00,
  "total_due": 20000.00,
  "total_outstanding": 4800.00,
  "collection_rate": 76.0,
  "active_courses": 3,
  "total_students": 18,
  "course_breakdown": [...],
  "unpaid_students": [...]
}
```

### Course Financial Summary ⭐ (powers the dashboard)
```
GET /api/financial/courses/{course_id}/summary/
```
Returns:
```json
{
  "id": 1,
  "name": "Robotics Fundamentals",
  "batch": "Batch A",
  "fee": "1200.00",
  "total_students": 6,
  "total_due": 7200.00,
  "total_collected": 4800.00,
  "total_outstanding": 2400.00,
  "collection_rate": 66.7,
  "paid_count": 3,
  "partial_count": 2,
  "unpaid_count": 1,
  "students": [
    {
      "id": 1,
      "student_name": "Ahmed Youssef",
      "total_due": "1200.00",
      "total_paid": "1200.00",
      "balance": "0.00",
      "payment_status": "paid",
      "sessions_attended": 7
    }
  ]
}
```

### Student Financial Detail
```
GET /api/financial/students/{student_id}/
```
Returns full payment history across all courses.

---

## File Structure

```
roboleap/
├── manage.py
├── requirements.txt
├── roboleap/
│   ├── settings.py
│   └── urls.py
└── academy/
    ├── models.py        ← User, Course, Student, Enrollment, Session, Attendance, Payment
    ├── serializers.py   ← All DRF serializers + CourseFinancialSummarySerializer
    ├── views.py         ← ViewSets + 3 financial APIViews
    ├── permissions.py   ← IsAdmin, IsFinance, IsSecretary, IsInstructor
    ├── urls.py          ← Router + financial URL patterns
    ├── admin.py         ← Django admin registration
    └── management/
        └── commands/
            └── seed_data.py
```
