# Django Backend Implementation Plan for MediLab Pro LIMS

## Executive Summary
This document provides a comprehensive plan for implementing a Django-based backend for the MediLab Pro Laboratory Information Management System (LIMS), connecting it to the existing React frontend via a RESTful API layer.

## Current Project Structure

### Frontend (React/TypeScript)
```
/
├── App.tsx                 # Main application component with routing
├── index.tsx              # React entry point
├── vite.config.ts         # Vite build configuration
├── package.json           # Frontend dependencies
├── types.ts               # TypeScript type definitions
├── constants.ts           # Lab tests, sample types, mock data
│
├── components/
│   ├── Header.tsx         # Application header
│   └── Sidebar.tsx        # Navigation sidebar
│
├── pages/
│   ├── Dashboard.tsx      # Main dashboard with statistics
│   ├── Registration.tsx   # Patient registration & order creation
│   ├── Phlebotomy.tsx     # Sample collection workflow
│   ├── Laboratory.tsx     # Test result entry
│   ├── Verification.tsx   # Result verification
│   └── Reports.tsx        # Report generation
│
├── context/
│   └── LabContext.tsx     # React Context for state management
│
└── services/
    └── api.ts             # API service layer (axios/fetch calls)
```

### Backend Structure (To Be Implemented)
```
backend/
├── manage.py              # Django management script
├── requirements.txt       # Python dependencies
├── .env                   # Environment variables (GEMINI_API_KEY, etc.)
│
├── medilab_proj/          # Django project configuration
│   ├── __init__.py
│   ├── settings.py        # Project settings
│   ├── urls.py            # Root URL configuration
│   ├── wsgi.py            # WSGI application
│   └── asgi.py            # ASGI application
│
└── api/                   # Main Django app
    ├── __init__.py
    ├── models.py          # Database models
    ├── serializers.py     # DRF serializers
    ├── views.py           # API views
    ├── urls.py            # App URL patterns
    ├── admin.py           # Django admin configuration
    ├── apps.py            # App configuration
    │
    ├── migrations/        # Database migrations
    │   ├── __init__.py
    │   ├── 0001_initial.py
    │   └── 0002_load_initial_data.py
    │
    ├── management/
    │   └── commands/
    │       └── seed_data.py  # Seed initial data
    │
    └── services/
        ├── __init__.py
        └── ai_service.py  # Google Gemini AI integration
```

## Data Model Design

### 1. Patient Model
```python
class Patient(models.Model):
    id = models.CharField(max_length=20, primary_key=True)
    name = models.CharField(max_length=200)
    age = models.IntegerField()
    gender = models.CharField(max_length=10, choices=[
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other')
    ])
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 2. LabTest Model (Pre-populated from constants.ts)
```python
class LabTest(models.Model):
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100)
    sample_type_id = models.CharField(max_length=50)
    parameters = models.JSONField()  # Array of test parameters
```

### 3. LabRequest Model
```python
class LabRequest(models.Model):
    STATUS_CHOICES = [
        ('REGISTERED', 'Registered'),
        ('COLLECTED', 'Collected'),
        ('ANALYZED', 'Analyzed'),
        ('VERIFIED', 'Verified'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True)
    lab_no = models.CharField(max_length=20, unique=True)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE)
    date = models.DateTimeField(auto_now_add=True)
    tests = models.ManyToManyField(LabTest)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REGISTERED')
    results = models.JSONField(default=dict)  # {test_id: [{parameterId, value, flag}]}
    payment = models.JSONField()  # PaymentDetails object
    referred_by = models.CharField(max_length=200, blank=True)
    comments = models.TextField(blank=True)
    ai_interpretation = models.TextField(blank=True)
    collected_samples = models.JSONField(default=list)  # Array of sample type IDs
    phlebotomy_comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## API Endpoints Specification

### Patient Endpoints
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/patients/` | List all patients | - | Array of Patient objects |
| POST | `/api/patients/` | Create new patient | Patient data (without id) | Created Patient object |
| PUT | `/api/patients/{id}/` | Update patient | Patient data | Updated Patient object |
| GET | `/api/patients/{id}/` | Get patient details | - | Patient object |

### LabRequest Endpoints
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/requests/` | List all requests | - | Array of LabRequest objects |
| POST | `/api/requests/` | Create new request | `{patient, test_ids[], payment, referred_by}` | Created LabRequest |
| GET | `/api/requests/{id}/` | Get request details | - | LabRequest object |
| POST | `/api/requests/{id}/collect/` | Collect samples | `{collected_samples[], phlebotomy_comments}` | Updated LabRequest |
| POST | `/api/requests/{id}/update_results/` | Update test results | `{test_id, results[]}` | Updated LabRequest |
| POST | `/api/requests/{id}/update_all_results/` | Update all results | `{results: {}}` | Updated LabRequest |
| POST | `/api/requests/{id}/verify/` | Verify and finalize | `{results: {}}` | Updated LabRequest |
| POST | `/api/requests/{id}/update_comment/` | Update comments | `{comments}` | Updated LabRequest |
| POST | `/api/requests/{id}/interpret/` | Trigger AI interpretation | - | LabRequest with AI interpretation |

### Test Endpoints
| Method | Endpoint | Description | Request Body | Response |
|--------|----------|-------------|--------------|----------|
| GET | `/api/tests/` | List all available tests | - | Array of LabTest objects |
| GET | `/api/tests/{id}/` | Get test details | - | LabTest object |

## Implementation Steps

### Phase 1: Core Django Setup
1. **Configure Django Settings** (`medilab_proj/settings.py`)
   - Set up database (SQLite for development, PostgreSQL for production)
   - Configure INSTALLED_APPS (add 'rest_framework', 'corsheaders', 'api')
   - Configure CORS headers for frontend connection
   - Set up static files and media files
   - Load environment variables (GEMINI_API_KEY)

2. **Configure URL Routing** (`medilab_proj/urls.py`)
   - Include API app URLs
   - Set up admin URLs
   - Configure static file serving

### Phase 2: Models and Database
3. **Implement Data Models** (`api/models.py`)
   - Create Patient model
   - Create LabTest model
   - Create LabRequest model
   - Add appropriate indexes and constraints

4. **Create Migrations**
   ```bash
   python manage.py makemigrations
   python manage.py migrate
   ```

5. **Create Seed Data Command** (`api/management/commands/seed_data.py`)
   - Populate LabTest table with data from constants.ts
   - Create sample types lookup data
   - Optionally create mock patients and requests

### Phase 3: API Layer
6. **Implement Serializers** (`api/serializers.py`)
   - PatientSerializer
   - LabTestSerializer
   - LabRequestSerializer (with nested test serialization)
   - Custom serializer methods for denormalized fields

7. **Implement Views** (`api/views.py`)
   - Use Django REST Framework ViewSets
   - PatientViewSet (CRUD operations)
   - LabTestViewSet (Read-only)
   - LabRequestViewSet (CRUD + custom actions)
   - Implement custom actions: collect, update_results, verify, interpret

8. **Configure API URLs** (`api/urls.py`)
   - Register ViewSets with DRF Router
   - Set up URL patterns

### Phase 4: AI Integration
9. **Implement AI Service** (`api/services/ai_service.py`)
   - Initialize Google Gemini client
   - Create function to analyze lab results
   - Generate medical interpretation
   - Handle API errors gracefully

10. **Integrate AI with Views**
    - Add AI interpretation endpoint
    - Update LabRequest with AI results

### Phase 5: Admin and Testing
11. **Configure Django Admin** (`api/admin.py`)
    - Register models
    - Customize admin interface
    - Add search and filter capabilities

12. **Testing**
    - Test all API endpoints with Postman/curl
    - Verify CORS configuration
    - Test AI interpretation
    - Validate data persistence

### Phase 6: Frontend Integration
13. **Verify API Compatibility**
    - Ensure API responses match TypeScript types
    - Test all frontend workflows end-to-end
    - Fix any serialization mismatches

14. **Update Documentation**
    - Update README.md with setup instructions
    - Document environment variables
    - Add API endpoint documentation

## Configuration Files

### requirements.txt
```txt
Django==5.0.7
djangorestframework==3.15.2
django-cors-headers==4.4.0
python-dotenv==1.0.1
google-generativeai==0.7.2
```

### .env (Template)
```env
GEMINI_API_KEY=your_api_key_here
DEBUG=True
SECRET_KEY=your_secret_key_here
DATABASE_URL=sqlite:///db.sqlite3
ALLOWED_HOSTS=localhost,127.0.0.1
CORS_ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### settings.py Key Configurations
```python
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ... other middleware
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

REST_FRAMEWORK = {
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 100,
}
```

## Data Flow Architecture

### 1. Patient Registration Flow
```
Frontend (Registration.tsx)
    ↓ POST /api/patients/
Backend (PatientViewSet.create())
    ↓ Save to database
    ↓ Response with created patient
Frontend updates Context
    ↓ POST /api/requests/
Backend (LabRequestViewSet.create())
    ↓ Create LabRequest, link tests
    ↓ Response with created request
Frontend displays Lab Number
```

### 2. Sample Collection Flow
```
Frontend (Phlebotomy.tsx)
    ↓ POST /api/requests/{id}/collect/
Backend (LabRequestViewSet.collect())
    ↓ Update collected_samples, status
    ↓ Response with updated request
Frontend updates Context
```

### 3. Result Entry Flow
```
Frontend (Laboratory.tsx)
    ↓ POST /api/requests/{id}/update_results/
Backend (LabRequestViewSet.update_results())
    ↓ Update results JSON field
    ↓ Response with updated request
Frontend updates Context
```

### 4. AI Interpretation Flow
```
Frontend (Verification.tsx)
    ↓ POST /api/requests/{id}/interpret/
Backend (LabRequestViewSet.interpret())
    ↓ Call ai_service.py
    ↓ Google Gemini API
    ↓ Save AI interpretation
    ↓ Response with interpretation
Frontend displays AI result
```

## Security Considerations

1. **API Security**
   - Add authentication (JWT or session-based)
   - Implement permission classes
   - Rate limiting for AI endpoints
   - Input validation on all endpoints

2. **Data Protection**
   - HTTPS in production
   - Encrypt sensitive patient data
   - HIPAA compliance considerations
   - Audit logging for data changes

3. **Environment Variables**
   - Never commit .env file
   - Use different keys for dev/prod
   - Rotate API keys regularly

## Deployment Considerations

### Development
```bash
# Backend
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py runserver

# Frontend
npm install
npm run dev
```

### Production
- Use PostgreSQL instead of SQLite
- Configure gunicorn/uvicorn for ASGI
- Set up Nginx as reverse proxy
- Enable Django's production settings
- Use environment-specific .env files
- Set up logging and monitoring

## Migration Strategy

Since the backend files appear corrupted or empty, we need to:

1. **Backup Current State**
   - Archive existing backend directory
   - Document what was working

2. **Fresh Implementation**
   - Recreate all Django files from scratch
   - Follow Django best practices
   - Use the frontend as the source of truth for API contracts

3. **Testing Strategy**
   - Test each endpoint as it's created
   - Use the existing frontend to validate
   - Create automated API tests

## Success Criteria

✓ All API endpoints respond correctly
✓ Frontend can perform all CRUD operations
✓ Sample collection workflow works end-to-end
✓ Result entry and verification work
✓ AI interpretation generates meaningful insights
✓ Data persists correctly in database
✓ CORS is properly configured
✓ Error handling works gracefully

## Timeline Estimate

- Phase 1 (Django Setup): 2-3 hours
- Phase 2 (Models/Database): 2-3 hours
- Phase 3 (API Layer): 4-5 hours
- Phase 4 (AI Integration): 2-3 hours
- Phase 5 (Admin/Testing): 2-3 hours
- Phase 6 (Integration): 2-3 hours

**Total: 14-20 hours** for complete implementation

## Appendix: Key Files to Create/Update

1. `backend/medilab_proj/settings.py` - Complete Django settings
2. `backend/medilab_proj/urls.py` - Root URL configuration
3. `backend/api/models.py` - All data models
4. `backend/api/serializers.py` - DRF serializers
5. `backend/api/views.py` - API views and viewsets
6. `backend/api/urls.py` - API URL patterns
7. `backend/api/services/ai_service.py` - AI integration
8. `backend/api/management/commands/seed_data.py` - Data seeding
9. `backend/api/admin.py` - Admin configuration
10. `backend/requirements.txt` - Python dependencies
11. `backend/.env.example` - Environment variable template
12. `backend/README.md` - Setup documentation

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2024  
**Author:** GitHub Copilot Agent
