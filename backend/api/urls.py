from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PatientViewSet, LabTestViewSet, LabRequestViewSet

router = DefaultRouter()
router.register(r'patients', PatientViewSet, basename='patient')
router.register(r'tests', LabTestViewSet, basename='labtest')
router.register(r'requests', LabRequestViewSet, basename='labrequest')

urlpatterns = [
    path('', include(router.urls)),
]
