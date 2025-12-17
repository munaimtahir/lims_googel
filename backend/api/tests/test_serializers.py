import pytest
from rest_framework.exceptions import ValidationError
from api.models import Patient, LabRequest, LabTest, SampleType
from api.serializers import (
    PatientSerializer,
    LabRequestCreateSerializer,
)


@pytest.mark.django_db
class TestPatientSerializer:
    """Test PatientSerializer"""
    
    def test_patient_serializer_create(self):
        """Test patient creation via serializer"""
        data = {
            'name': 'John Doe',
            'age': 34,
            'gender': 'Male',
            'phone': '0300-1234567'
        }
        serializer = PatientSerializer(data=data)
        assert serializer.is_valid()
        patient = serializer.save()
        assert patient.name == 'John Doe'
        assert patient.id.startswith('P')
    
    def test_patient_serializer_uniqueness_validation(self):
        """Test that duplicate patient IDs are rejected"""
        patient = Patient.objects.create(
            name='Existing Patient',
            age=30,
            gender='Male',
            phone='0300-1234567'
        )
        
        data = {
            'id': patient.id,  # Duplicate ID
            'name': 'New Patient',
            'age': 31,
            'gender': 'Female',
            'phone': '0300-7654321'
        }
        serializer = PatientSerializer(data=data)
        # Should fail validation
        assert not serializer.is_valid()
        assert 'id' in serializer.errors


@pytest.mark.django_db
class TestLabRequestCreateSerializer:
    """Test LabRequestCreateSerializer"""
    
    def setUp(self):
        """Set up test data"""
        self.patient = Patient.objects.create(
            name='Test Patient',
            age=30,
            gender='Male',
            phone='0300-1234567'
        )
        
        self.sample_type = SampleType.objects.create(
            id='edta',
            name='EDTA',
            tube_color='#a855f7'
        )
        
        self.lab_test = LabTest.objects.create(
            id='cbc',
            name='Complete Blood Count',
            price=750,
            category='Hematology',
            sample_type=self.sample_type
        )
    
    def test_lab_request_create_requires_tests(self):
        """Test that at least one test is required"""
        data = {
            'patient': str(self.patient.id),
            'test_ids': [],  # No tests
            'payment': {
                'totalAmount': 1000,
                'discountAmount': 0,
                'paidAmount': 1000,
            }
        }
        serializer = LabRequestCreateSerializer(data=data)
        assert not serializer.is_valid()
        assert 'test_ids' in serializer.errors
    
    def test_lab_request_create_payment_validation(self):
        """Test payment calculation and validation"""
        data = {
            'patient': str(self.patient.id),
            'test_ids': [self.lab_test.id],
            'payment': {
                'totalAmount': 1000,
                'discountAmount': 100,
                'paidAmount': 800,
            }
        }
        serializer = LabRequestCreateSerializer(data=data)
        assert serializer.is_valid()
        
        validated_payment = serializer.validated_data['payment']
        assert validated_payment['netPayable'] == 900
        assert validated_payment['balanceDue'] == 100
        assert 'discountPercent' in validated_payment
    
    def test_lab_request_create_invalid_test_ids(self):
        """Test validation for invalid test IDs"""
        data = {
            'patient': str(self.patient.id),
            'test_ids': ['invalid_test_id'],
            'payment': {
                'totalAmount': 1000,
                'discountAmount': 0,
                'paidAmount': 1000,
            }
        }
        serializer = LabRequestCreateSerializer(data=data)
        # Should fail validation
        assert not serializer.is_valid()

