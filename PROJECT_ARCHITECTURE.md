# MediLab Pro LIMS - Project Architecture

## System Overview

MediLab Pro is a comprehensive Laboratory Information Management System (LIMS) built with a modern React frontend and Django REST Framework backend. The system handles the complete laboratory workflow from patient registration to report generation with AI-powered result interpretation.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │              React Application (Port 3000)                │   │
│  │                                                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ Dashboard   │  │Registration │  │ Phlebotomy  │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │   │
│  │  │ Laboratory  │  │Verification │  │  Reports    │      │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │          LabContext (State Management)             │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  │                         ↓                                │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │         API Service Layer (services/api.ts)        │  │   │
│  │  └────────────────────────────────────────────────────┘  │   │
│  └───────────────────────────────┬──────────────────────────┘   │
└────────────────────────────────┬─┴──────────────────────────────┘
                                 │
                            HTTP/REST API
                         (http://localhost:8000/api)
                                 │
┌────────────────────────────────┴────────────────────────────────┐
│                         SERVER LAYER                             │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │        Django REST Framework (Port 8000)                 │   │
│  │                                                           │   │
│  │  ┌────────────────────────────────────────────────────┐  │   │
│  │  │                  API ViewSets                      │  │   │
│  │  │  ┌──────────────┐  ┌──────────────┐              │  │   │
│  │  │  │PatientViewSet│  │LabTestViewSet│              │  │   │
│  │  │  └──────────────┘  └──────────────┘              │  │   │
│  │  │  ┌────────────────────────────────────┐          │  │   │
│  │  │  │    LabRequestViewSet               │          │  │   │
│  │  │  │  - create()                         │          │  │   │
│  │  │  │  - collect()                        │          │  │   │
│  │  │  │  - update_results()                 │          │  │   │
│  │  │  │  - verify()                         │          │  │   │
│  │  │  │  - interpret() ───────┐             │          │  │   │
│  │  │  └───────────────────────┼─────────────┘          │  │   │
│  │  └──────────────────────────┼────────────────────────┘  │   │
│  │                             │                           │   │
│  │  ┌──────────────────────────┼────────────────────────┐  │   │
│  │  │         Serializers      │                        │  │   │
│  │  │  - PatientSerializer     │                        │  │   │
│  │  │  - LabTestSerializer     │                        │  │   │
│  │  │  - LabRequestSerializer  │                        │  │   │
│  │  └──────────────────────────┼────────────────────────┘  │   │
│  │                             │                           │   │
│  │  ┌──────────────────────────┼────────────────────────┐  │   │
│  │  │     Business Logic       │                        │  │   │
│  │  │                          ↓                        │  │   │
│  │  │  ┌───────────────────────────────────────┐       │  │   │
│  │  │  │   AI Service (ai_service.py)          │       │  │   │
│  │  │  │   - analyze_lab_results()             │       │  │   │
│  │  │  │   - generate_interpretation()         │       │  │   │
│  │  │  └───────────────────────┬───────────────┘       │  │   │
│  │  └──────────────────────────┼────────────────────────┘  │   │
│  │                             │                           │   │
│  └─────────────────────────────┼───────────────────────────┘   │
│                                │                               │
│  ┌─────────────────────────────┼───────────────────────────┐   │
│  │          Django ORM         │                           │   │
│  │                             ↓                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌──────────────┐   │   │
│  │  │   Patient   │  │   LabTest   │  │ LabRequest   │   │   │
│  │  │   Model     │  │    Model    │  │    Model     │   │   │
│  │  └─────────────┘  └─────────────┘  └──────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 │
┌────────────────────────────────┴────────────────────────────────┐
│                      PERSISTENCE LAYER                           │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │         SQLite/PostgreSQL Database                       │   │
│  │                                                           │   │
│  │  Tables:                                                  │   │
│  │  - api_patient                                            │   │
│  │  - api_labtest                                            │   │
│  │  - api_labrequest                                         │   │
│  │  - api_labrequest_tests (M2M)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                      EXTERNAL SERVICES                            │
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │        Google Gemini API (AI Interpretation)             │    │
│  │                                                           │    │
│  │  - Receives lab test results                             │    │
│  │  - Analyzes against reference ranges                     │    │
│  │  - Generates medical interpretation                      │    │
│  │  - Returns insights and recommendations                  │    │
│  └──────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

## Component Interaction Flow

### 1. Patient Registration and Order Creation

```
User → Registration Page
  ↓
  1. Search/Create Patient
     Frontend: Registration.tsx → api.addOrUpdatePatient()
     Backend: POST /api/patients/
     Process: PatientViewSet.create() → Save to DB
     Response: Patient object with ID
  
  2. Select Tests & Enter Payment
     Frontend: Select from AVAILABLE_TESTS constant
     Calculate: totalAmount, discount, netPayable
  
  3. Create Lab Request
     Frontend: api.createRequest()
     Backend: POST /api/requests/
     Process: LabRequestViewSet.create()
       - Generate unique Lab Number
       - Link patient and tests (M2M)
       - Save payment details (JSON)
       - Set status = 'REGISTERED'
     Response: LabRequest with labNo
  
  4. Display Lab Number
     Frontend: Show confirmation with Lab Number
```

### 2. Sample Collection (Phlebotomy)

```
User → Phlebotomy Page
  ↓
  1. Load Registered Requests
     Frontend: Context loads from api.getRequests()
     Backend: GET /api/requests/?status=REGISTERED
     Response: Array of registered requests
  
  2. Select Request & Samples
     Frontend: Display tests and required samples
     User: Select collected sample types
     Enter: Phlebotomy comments
  
  3. Submit Collection
     Frontend: api.collectSamples()
     Backend: POST /api/requests/{id}/collect/
     Process: LabRequestViewSet.collect()
       - Update collected_samples (JSON array)
       - Update phlebotomy_comments
       - Set status = 'COLLECTED'
     Response: Updated LabRequest
```

### 3. Result Entry (Laboratory)

```
User → Laboratory Page
  ↓
  1. Load Collected Requests
     Frontend: Filter requests by status='COLLECTED'
  
  2. Enter Test Results
     For each test parameter:
       - Enter value
       - Auto-calculate flag (H/L/N) based on reference range
  
  3. Submit Results
     Option A: Single test
       Frontend: api.updateResults(requestId, testId, results)
       Backend: POST /api/requests/{id}/update_results/
     
     Option B: All tests
       Frontend: api.updateAllResults(requestId, allResults)
       Backend: POST /api/requests/{id}/update_all_results/
     
     Process: LabRequestViewSet.update_results()
       - Merge results into JSON field
       - Set status = 'ANALYZED'
     Response: Updated LabRequest
```

### 4. AI Interpretation

```
User → Verification Page → Click "Get AI Interpretation"
  ↓
  Frontend: api.triggerAiInterpretation(requestId)
  Backend: POST /api/requests/{id}/interpret/
  
  Process: LabRequestViewSet.interpret()
    1. Retrieve LabRequest with all results
    2. Call ai_service.analyze_lab_results()
       ↓
       3. Format results for Gemini API
       4. Send to Google Gemini:
          - Patient demographics
          - Test results with reference ranges
          - Abnormal flags
       5. Receive AI interpretation
    6. Save interpretation to LabRequest
    7. Return updated LabRequest
  
  Frontend: Display AI interpretation to user
```

### 5. Result Verification

```
User → Verification Page
  ↓
  1. Review Results
     - Check all parameter values
     - Review AI interpretation
     - Add manual comments if needed
  
  2. Finalize Request
     Frontend: api.verifyAndFinalizeRequest()
     Backend: POST /api/requests/{id}/verify/
     Process: LabRequestViewSet.verify()
       - Save final results
       - Set status = 'VERIFIED'
     Response: Verified LabRequest
```

## Technology Stack

### Frontend
- **Framework:** React 19.2.3
- **Language:** TypeScript 5.8.2
- **Build Tool:** Vite 6.2.0
- **State Management:** React Context API
- **UI Components:** Custom components with Lucide icons
- **Charts:** Recharts 3.5.1
- **HTTP Client:** Fetch API

### Backend
- **Framework:** Django 5.0.7
- **API Framework:** Django REST Framework 3.15.2
- **Language:** Python 3.9+
- **CORS:** django-cors-headers 4.4.0
- **Database ORM:** Django ORM
- **AI Integration:** google-generativeai 0.7.2
- **Environment:** python-dotenv 1.0.1

### Database
- **Development:** SQLite
- **Production:** PostgreSQL (recommended)

### External APIs
- **Google Gemini API:** AI-powered result interpretation

## Data Models in Detail

### Patient Model
```python
{
  "id": "P001",                    # Auto-generated
  "name": "John Doe",
  "age": 34,
  "gender": "Male",                # Male/Female/Other
  "phone": "0300-1234567",
  "email": "john@example.com",     # Optional
  "created_at": "2024-12-17T...",
  "updated_at": "2024-12-17T..."
}
```

### LabTest Model
```python
{
  "id": "cbc",
  "name": "Complete Blood Count (CBC)",
  "price": 750.00,
  "category": "Hematology",
  "sample_type_id": "edta",
  "parameters": [
    {
      "id": "hb",
      "name": "Hemoglobin",
      "unit": "g/dL",
      "referenceRange": "13.5 - 17.5"
    },
    // ... more parameters
  ]
}
```

### LabRequest Model
```python
{
  "id": "REQ001",
  "lab_no": "LAB-20241217-001",    # Unique identifier
  "patient": "P001",                # Foreign Key
  "patient_name": "John Doe",       # Denormalized
  "date": "2024-12-17T10:30:00Z",
  "tests": [                        # M2M relationship
    { /* full LabTest object */ },
    // ...
  ],
  "status": "VERIFIED",             # REGISTERED/COLLECTED/ANALYZED/VERIFIED
  "results": {                      # JSON field
    "cbc": [
      {
        "parameterId": "hb",
        "value": "14.5",
        "flag": "N"                  # N/H/L
      },
      // ... more parameters
    ],
    // ... more tests
  },
  "payment": {                      # JSON field
    "totalAmount": 3400,
    "discountAmount": 400,
    "discountPercent": 11.8,
    "netPayable": 3000,
    "paidAmount": 3000,
    "balanceDue": 0
  },
  "referred_by": "Dr. Smith",
  "comments": "Patient fasting confirmed",
  "ai_interpretation": "The CBC results show...",
  "collected_samples": ["edta", "serum"],
  "phlebotomy_comments": "Samples collected at 8:00 AM",
  "created_at": "2024-12-17T...",
  "updated_at": "2024-12-17T..."
}
```

## API Response Format

All API responses follow REST conventions:

### Success Response
```json
{
  "id": "...",
  "field1": "value1",
  // ... other fields
}
```

### Error Response
```json
{
  "detail": "Error message",
  "field_errors": {
    "field_name": ["Error for this field"]
  }
}
```

### List Response (with pagination)
```json
{
  "count": 100,
  "next": "http://localhost:8000/api/patients/?page=2",
  "previous": null,
  "results": [
    { /* object 1 */ },
    { /* object 2 */ },
    // ...
  ]
}
```

## Security Architecture

### Authentication & Authorization
```
┌─────────────────┐
│   Frontend      │
│   (React App)   │
└────────┬────────┘
         │
         │ 1. Login Request
         ↓
┌─────────────────────────┐
│   Django Backend        │
│                         │
│  Authentication Layer   │
│  - Django Session Auth  │
│  - OR JWT Tokens        │
└────────┬────────────────┘
         │
         │ 2. Return Token/Session
         ↓
┌─────────────────┐
│   Frontend      │
│   Store Token   │
└────────┬────────┘
         │
         │ 3. Subsequent Requests
         │    Include: Authorization Header
         ↓
┌─────────────────────────┐
│   Django Middleware     │
│   - Verify Token        │
│   - Check Permissions   │
└────────┬────────────────┘
         │
         │ 4. Allow/Deny
         ↓
┌─────────────────────────┐
│   API ViewSet           │
│   Process Request       │
└─────────────────────────┘
```

### Data Protection
- HTTPS in production (TLS/SSL)
- Password hashing (Django's built-in)
- SQL injection prevention (ORM)
- XSS protection (React's built-in escaping)
- CSRF protection (Django middleware)
- API rate limiting (DRF throttling)

## Deployment Architecture

### Development Environment
```
┌────────────────────────────────┐
│  Developer Machine             │
│                                │
│  ┌──────────────────────────┐  │
│  │  Frontend (Vite Dev)     │  │
│  │  Port: 3000              │  │
│  └──────────────────────────┘  │
│                                │
│  ┌──────────────────────────┐  │
│  │  Backend (Django Dev)    │  │
│  │  Port: 8000              │  │
│  │  DB: SQLite              │  │
│  └──────────────────────────┘  │
└────────────────────────────────┘
```

### Production Environment (Recommended)
```
┌─────────────────────────────────────────┐
│           Load Balancer / CDN            │
└───────────────┬─────────────────────────┘
                │
┌───────────────┴─────────────────────────┐
│            Nginx (Reverse Proxy)         │
│  - Serve static files                    │
│  - SSL/TLS termination                   │
│  - Load balancing                        │
└───────┬──────────────────┬───────────────┘
        │                  │
        │ Frontend         │ Backend
        ↓                  ↓
┌───────────────┐   ┌──────────────────┐
│  React Build  │   │  Gunicorn/       │
│  (Static)     │   │  Uvicorn         │
│               │   │  + Django        │
└───────────────┘   └────────┬─────────┘
                             │
                    ┌────────┴─────────┐
                    │   PostgreSQL     │
                    │   Database       │
                    └──────────────────┘
```

## Performance Considerations

### Frontend Optimization
- Code splitting by route
- Lazy loading of components
- Memoization of expensive computations
- Debounced search inputs
- Optimistic UI updates

### Backend Optimization
- Database indexing on foreign keys
- Query optimization (select_related, prefetch_related)
- Caching with Redis (future enhancement)
- Connection pooling
- Async views for I/O operations

### Database Optimization
- Indexes on frequently queried fields
- JSON field indexing (PostgreSQL GIN index)
- Regular VACUUM (PostgreSQL)
- Query plan analysis

## Error Handling Strategy

### Frontend
```typescript
try {
  const result = await api.createRequest(...);
  // Success handling
} catch (error) {
  // Error handling
  setError(error.message);
  // Show toast/notification
}
```

### Backend
```python
try:
    # Business logic
    pass
except ValidationError as e:
    return Response(
        {'detail': str(e)},
        status=status.HTTP_400_BAD_REQUEST
    )
except Exception as e:
    logger.error(f"Unexpected error: {e}")
    return Response(
        {'detail': 'An unexpected error occurred'},
        status=status.HTTP_500_INTERNAL_SERVER_ERROR
    )
```

## Monitoring and Logging

### Application Logs
- Django logging to file and console
- Log levels: DEBUG, INFO, WARNING, ERROR, CRITICAL
- Structured logging for API requests
- Error tracking with Sentry (optional)

### Performance Metrics
- API response times
- Database query times
- AI API latency
- Request volume

## Future Enhancements

1. **Authentication & User Management**
   - User roles (Admin, Technician, Doctor)
   - Permission-based access control
   - Audit trail for all changes

2. **Reporting**
   - PDF generation for lab reports
   - Email/SMS notifications
   - Batch report generation

3. **Analytics**
   - Test volume analytics
   - Revenue analytics
   - Turnaround time tracking

4. **Integration**
   - Equipment integration (LIS)
   - Billing system integration
   - Insurance verification

5. **Mobile App**
   - Patient mobile app for results
   - Technician mobile app

---

**Document Version:** 1.0  
**Last Updated:** December 17, 2024
