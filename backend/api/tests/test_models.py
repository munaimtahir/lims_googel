import pytest
from django.core.exceptions import ValidationError
from django.utils import timezone
from api.models import Patient, LabRequest, LabTest, SampleType, TestParameter


@pytest.mark.django_db
class TestPatient:
    """Test Patient model"""
    
    def test_patient_creation(self):
        """Test patient creation with auto-generated ID"""
        patient = Patient.objects.create(
            name='John Doe',
            age=34,
            gender='Male',
            phone='0300-1234567'
        )
        assert patient.id.startswith('P')
        assert patient.name == 'John Doe'
        assert patient.age == 34
    
    def test_patient_id_generation(self):
        """Test sequential patient ID generation"""
        patient1 = Patient.objects.create(
            name='Patient 1',
            age=30,
            gender='Male',
            phone='1111-1111111'
        )
        patient2 = Patient.objects.create(
            name='Patient 2',
            age=31,
            gender='Female',
            phone='2222-2222222'
        )
        
        # IDs should be sequential
        id1_num = int(patient1.id[1:])
        id2_num = int(patient2.id[1:])
        assert id2_num == id1_num + 1


@pytest.mark.django_db
class TestLabRequest:
    """Test LabRequest model"""
    
    def test_lab_request_uuid_primary_key(self):
        """Test that LabRequest uses UUID primary key"""
        patient = Patient.objects.create(
            name='Test Patient',
            age=30,
            gender='Male',
            phone='0300-1234567'
        )
        
        lab_request = LabRequest.objects.create(patient=patient)
        
        # ID should be a UUID (36 characters with hyphens)
        assert len(str(lab_request.id)) == 36
        assert str(lab_request.id).count('-') == 4
    
    def test_lab_no_generation(self):
        """Test lab number generation"""
        patient = Patient.objects.create(
            name='Test Patient',
            age=30,
            gender='Male',
            phone='0300-1234567'
        )
        
        lab_request = LabRequest.objects.create(patient=patient)
        
        assert lab_request.lab_no.startswith('LAB-')
        assert len(lab_request.lab_no) > 10
    
    def test_patient_name_denormalization(self):
        """Test that patient_name is populated from Patient"""
        patient = Patient.objects.create(
            name='Test Patient',
            age=30,
            gender='Male',
            phone='0300-1234567'
        )
        
        lab_request = LabRequest.objects.create(patient=patient)
        
        # patient_name should be populated by signal
        assert lab_request.patient_name == patient.name
    
    def test_payment_calculation(self):
        """Test payment field calculation via signal"""
        patient = Patient.objects.create(
            name='Test Patient',
            age=30,
            gender='Male',
            phone='0300-1234567'
        )
        
        payment_data = {
            'totalAmount': 1000,
            'discountAmount': 100,
            'paidAmount': 800,
        }
        
        lab_request = LabRequest.objects.create(
            patient=patient,
            payment=payment_data
        )
        
        # Payment should be recalculated by signal
        assert lab_request.payment['netPayable'] == 900
        assert lab_request.payment['balanceDue'] == 100
    
    def test_payment_negative_balance_clamped(self):
        """Test that negative balance is clamped to zero"""
        patient = Patient.objects.create(
            name='Test Patient',
            age=30,
            gender='Male',
            phone='0300-1234567'
        )
        
        payment_data = {
            'totalAmount': 1000,
            'discountAmount': 100,
            'paidAmount': 1000,  # Overpaid
        }
        
        lab_request = LabRequest.objects.create(
            patient=patient,
            payment=payment_data
        )
        
        # Balance should be clamped to zero
        assert lab_request.payment['balanceDue'] == 0
    
    def test_status_transition_validation(self):
        """Test that status transitions are validated"""
        patient = Patient.objects.create(
            name='Test Patient',
            age=30,
            gender='Male',
            phone='0300-1234567'
        )
        
        lab_request = LabRequest.objects.create(patient=patient, status='REGISTERED')
        lab_request.status = 'COLLECTED'
        lab_request.save()  # Should work
        
        # Try invalid transition (regression)
        lab_request.status = 'REGISTERED'
        with pytest.raises(ValidationError):
            lab_request.full_clean()
    
    def test_lab_request_str(self):
        """Test LabRequest string representation"""
        patient = Patient.objects.create(
            name='Test Patient',
            age=30,
            gender='Male',
            phone='0300-1234567'
        )
        
        lab_request = LabRequest.objects.create(patient=patient)
        assert 'LAB-' in str(lab_request)
        assert patient.name in str(lab_request)


@pytest.mark.django_db
class TestSampleType:
    """Test SampleType model"""
    
    def test_sample_type_creation(self):
        """Test sample type creation"""
        sample_type = SampleType.objects.create(
            id='edta',
            name='EDTA (Purple)',
            tube_color='#a855f7'
        )
        assert sample_type.id == 'edta'
        assert sample_type.name == 'EDTA (Purple)'
        assert sample_type.tube_color == '#a855f7'


@pytest.mark.django_db
class TestTestParameter:
    """Test TestParameter model"""
    
    def test_test_parameter_creation(self):
        """Test test parameter creation"""
        sample_type = SampleType.objects.create(
            id='edta',
            name='EDTA',
            tube_color='#a855f7'
        )
        
        lab_test = LabTest.objects.create(
            id='cbc',
            name='Complete Blood Count',
            price=750,
            category='Hematology',
            sample_type=sample_type
        )
        
        parameter = TestParameter.objects.create(
            id='hb',
            test=lab_test,
            name='Hemoglobin',
            unit='g/dL',
            reference_range='13.5 - 17.5'
        )
        
        assert parameter.id == 'hb'
        assert parameter.test == lab_test
        assert parameter.name == 'Hemoglobin'

