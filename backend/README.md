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
    -   Copy the example environment file:
        ```bash
        cp .env.example .env
        ```
    -   Edit the `.env` file and update the following variables:
        ```
        GEMINI_API_KEY=YOUR_GEMINI_API_KEY_HERE
        SECRET_KEY=your-secret-key-here
        DEBUG=True
        ```

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

### Documentation
- `GET /api/schema/` - OpenAPI 3.0 schema (JSON)
- `GET /api/docs/` - Swagger UI interactive documentation
- `GET /api/redoc/` - ReDoc documentation

### Sample Types
- `GET /api/sample-types/` - List all sample types
- `GET /api/sample-types/{id}/` - Get sample type details

### Patients
- `GET /api/patients/` - List all patients
- `POST /api/patients/` - Create a new patient
- `PUT /api/patients/{id}/` - Update a patient
- `GET /api/patients/{id}/` - Get patient details

### Lab Tests
- `GET /api/tests/` - List all available tests
- `GET /api/tests/{id}/` - Get test details
- `GET /api/tests/{id}/parameters/` - Get test parameters

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
   ```bash
   pytest
   # Or with Django test runner
   python manage.py test
   ```

6. **View API schema:**
   ```bash
   # Start the server and visit:
   # http://localhost:8000/api/docs/     (Swagger UI)
   # http://localhost:8000/api/redoc/    (ReDoc)
   # http://localhost:8000/api/schema/   (OpenAPI JSON)
   ```

## Testing

The backend includes comprehensive test coverage for all critical flows:

- **Model validation**: Status transitions, immutability after verification
- **Patient API**: CRUD operations
- **Sample Type API**: Catalog endpoints
- **Lab Test API**: Test listings and parameters
- **Lab Request API**: Complete workflow from registration to verification
- **AI Interpretation**: Mocked Gemini API calls

Run tests with:
```bash
pytest                    # Run all tests
pytest -v                 # Verbose output
pytest api/tests.py -k test_workflow  # Run specific test
```

## Troubleshooting

- **CORS errors:** Make sure `CORS_ALLOWED_ORIGINS` in `.env` includes your frontend URL
- **Database errors:** Delete `db.sqlite3` and run migrations again
- **AI interpretation not working:** Check that `GEMINI_API_KEY` is set in `.env`
