# MediLab Pro Django Backend

This directory contains the Django + Django REST Framework backend for the MediLab Pro application.

## Prerequisites

- Python (v3.9 or newer recommended)
- pip

## Setup & Running

1.  **Navigate to this directory:**
    ```bash
    cd backend
    ```

2.  **Create and activate a virtual environment (Recommended):**
    ```bash
    # For macOS/Linux
    python3 -m venv venv
    source venv/bin/activate

    # For Windows
    python -m venv venv
    .\venv\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements.txt
    ```

4.  **Set up your environment variables:**
    -   Create a `.env` file in the `backend` directory with the following variables:
        ```bash
        # Required for production, optional for development
        SECRET_KEY=your-secret-key-here-min-50-characters-long
        DEBUG=True
        
        # Required for AI interpretation feature
        GEMINI_API_KEY=your-gemini-api-key-here
        
        # Optional: CORS settings (defaults to localhost:3000)
        CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
        
        # Optional: Allowed hosts (defaults to localhost,127.0.0.1)
        ALLOWED_HOSTS=localhost,127.0.0.1
        
        # Optional: Logging level (defaults to INFO)
        DJANGO_LOG_LEVEL=INFO
        ```
    
    **Note:** If `SECRET_KEY` is not set in production, Django will raise an error. For development, a default insecure key is used when `DEBUG=True`.

5.  **Set up the database:**
    -   Run the following commands to create the database schema:
    ```bash
    python manage.py migrate
    ```

6.  **Seed the database with initial data:**
    ```bash
    python manage.py seed_data
    ```
    This will populate the database with:
    - All available lab tests (CBC, Lipid Profile, LFT, etc.)
    - Sample patients for testing

7.  **Run the development server:**
    ```bash
    python manage.py runserver
    ```

The server will start on `http://localhost:8000`. The frontend application is configured to communicate with this address.

## API Endpoints

### Patients
- `GET /api/patients/` - List all patients
- `POST /api/patients/` - Create a new patient
- `PUT /api/patients/{id}/` - Update a patient
- `GET /api/patients/{id}/` - Get patient details

### Sample Types
- `GET /api/sample-types/` - List all available sample types
- `GET /api/sample-types/{id}/` - Get sample type details

### Lab Tests
- `GET /api/tests/` - List all available tests
- `GET /api/tests/{id}/` - Get test details
- `GET /api/tests/{id}/parameters/` - Get parameters for a specific test

### Lab Requests
- `GET /api/requests/` - List all requests
- `POST /api/requests/` - Create a new request
- `GET /api/requests/{id}/` - Get request details
- `POST /api/requests/{id}/collect/` - Collect samples
- `POST /api/requests/{id}/update_results/` - Update test results
- `POST /api/requests/{id}/update_all_results/` - Update all results
- `POST /api/requests/{id}/verify/` - Verify and finalize
- `POST /api/requests/{id}/update_comment/` - Update comments
- `POST /api/requests/{id}/interpret/` - Trigger AI interpretation

## API Documentation

### OpenAPI Schema

The API schema is available at:
- **OpenAPI JSON Schema:** `http://localhost:8000/api/schema/`
- **Swagger UI:** `http://localhost:8000/api/schema/swagger-ui/`
- **ReDoc:** `http://localhost:8000/api/schema/redoc/`

These endpoints provide interactive API documentation generated from the code.

### Sample API Calls

#### Create a Patient
```bash
curl -X POST http://localhost:8000/api/patients/ \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "age": 34,
    "gender": "Male",
    "phone": "0300-1234567",
    "email": "john.doe@example.com"
  }'
```

#### List Lab Tests
```bash
curl http://localhost:8000/api/tests/
```

#### Create a Lab Request
```bash
curl -X POST http://localhost:8000/api/requests/ \
  -H "Content-Type: application/json" \
  -d '{
    "patient": "P001",
    "test_ids": ["cbc", "lipid"],
    "payment": {
      "totalAmount": 2250,
      "discountAmount": 100,
      "paidAmount": 2150
    },
    "referred_by": "Dr. Smith"
  }'
```

#### Collect Samples
```bash
curl -X POST http://localhost:8000/api/requests/{request_id}/collect/ \
  -H "Content-Type: application/json" \
  -d '{
    "collected_samples": ["edta", "serum"],
    "phlebotomy_comments": "Samples collected successfully"
  }'
```

#### Update Results
```bash
curl -X POST http://localhost:8000/api/requests/{request_id}/update_results/ \
  -H "Content-Type: application/json" \
  -d '{
    "test_id": "cbc",
    "results": [
      {"parameterId": "hb", "value": "15.5", "flag": "N"},
      {"parameterId": "wbc", "value": "7.2", "flag": "N"}
    ]
  }'
```

#### Verify Request
```bash
curl -X POST http://localhost:8000/api/requests/{request_id}/verify/ \
  -H "Content-Type: application/json" \
  -d '{
    "results": {
      "cbc": [
        {"parameterId": "hb", "value": "15.5", "flag": "N"}
      ]
    }
  }'
```

#### Get AI Interpretation
```bash
curl -X POST http://localhost:8000/api/requests/{request_id}/interpret/
```

## Django Admin

Access the Django admin interface at `http://localhost:8000/admin/`

To create a superuser:
```bash
python manage.py createsuperuser
```

## Project Structure

```
backend/
├── manage.py              # Django management script
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (not in git)
├── .env.example          # Environment template
│
├── medilab_proj/          # Django project configuration
│   ├── settings.py        # Project settings
│   ├── urls.py            # Root URL configuration
│   ├── wsgi.py            # WSGI application
│   └── asgi.py            # ASGI application
│
└── api/                   # Main Django app
    ├── models.py          # Database models
    ├── serializers.py     # DRF serializers
    ├── views.py           # API views
    ├── urls.py            # App URL patterns
    ├── admin.py           # Django admin configuration
    ├── constants.py       # Lab test definitions
    │
    ├── migrations/        # Database migrations
    │
    ├── management/
    │   └── commands/
    │       └── seed_data.py  # Seed initial data
    │
    └── services/
        └── ai_service.py  # Google Gemini AI integration
```

## Development Tips

1. **Check for issues:**
   ```bash
   python manage.py check
   ```

2. **Create new migrations after model changes:**
   ```bash
   python manage.py makemigrations
   ```

3. **View SQL for migrations:**
   ```bash
   python manage.py sqlmigrate api 0001
   ```

4. **Open Django shell:**
   ```bash
   python manage.py shell
   ```

5. **Run tests:**
   
   Using pytest (recommended):
   ```bash
   pytest
   ```
   
   Or using Django's test runner:
   ```bash
   python manage.py test
   ```
   
   To run with coverage:
   ```bash
   pytest --cov=api --cov-report=html
   ```
   
   Test files are located in `api/tests/`:
   - `test_models.py` - Model tests
   - `test_serializers.py` - Serializer validation tests
   - `test_views.py` - API endpoint tests
   - `test_ai_service.py` - AI service tests (mocked)
   - `test_management_commands.py` - Management command tests

## Troubleshooting

- **CORS errors:** Make sure `CORS_ALLOWED_ORIGINS` in `.env` includes your frontend URL
- **Database errors:** Delete `db.sqlite3` and run migrations again
- **AI interpretation not working:** Check that `GEMINI_API_KEY` is set in `.env`
