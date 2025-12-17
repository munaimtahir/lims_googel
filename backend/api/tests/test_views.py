import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from api.models import Patient, LabRequest, LabTest, SampleType, TestParameter


@pytest.fixture
def api_client():
    """Create API client"""
    return APIClient()


@pytest.fixture
def sample_type():
    """Create sample type"""
    return SampleType.objects.create(
        id='edta',
        name='EDTA (Purple)',
        tube_color='#a855f7'
    )


@pytest.fixture
def lab_test(sample_type):
    """Create lab test"""
    test = LabTest.objects.create(
        id='cbc',
        name='Complete Blood Count',
        price=750,
        category='Hematology',
        sample_type=sample_type
    )
    TestParameter.objects.create(
        id='hb',
        test=test,
        name='Hemoglobin',
        unit='g/dL',
        reference_range='13.5 - 17.5'
    )
    return test


@pytest.fixture
def patient():
    """Create patient"""
    return Patient.objects.create(
        name='John Doe',
        age=34,
        gender='Male',
        phone='0300-1234567'
    )


@pytest.mark.django_db
class TestPatientViewSet:
    """Test PatientViewSet"""
    
    def test_list_patients(self, api_client, patient):
        """Test listing patients"""
        url = reverse('patient-list')
        response = api_client.get(url)
        assert response.status_code == 200
        assert len(response.data['results']) == 1
    
    def test_create_patient(self, api_client):
        """Test creating a patient"""
        url = reverse('patient-list')
        data = {
            'name': 'Jane Smith',
            'age': 29,
            'gender': 'Female',
            'phone': '0333-9876543'
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 201
        assert response.data['name'] == 'Jane Smith'
    
    def test_get_patient(self, api_client, patient):
        """Test getting a patient"""
        url = reverse('patient-detail', kwargs={'pk': patient.id})
        response = api_client.get(url)
        assert response.status_code == 200
        assert response.data['name'] == patient.name
    
    def test_update_patient(self, api_client, patient):
        """Test updating a patient"""
        url = reverse('patient-detail', kwargs={'pk': patient.id})
        data = {'name': 'Updated Name'}
        response = api_client.patch(url, data, format='json')
        assert response.status_code == 200
        assert response.data['name'] == 'Updated Name'


@pytest.mark.django_db
class TestSampleTypeViewSet:
    """Test SampleTypeViewSet"""
    
    def test_list_sample_types(self, api_client, sample_type):
        """Test listing sample types"""
        url = reverse('sampletype-list')
        response = api_client.get(url)
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == 'edta'


@pytest.mark.django_db
class TestLabTestViewSet:
    """Test LabTestViewSet"""
    
    def test_list_lab_tests(self, api_client, lab_test):
        """Test listing lab tests"""
        url = reverse('labtest-list')
        response = api_client.get(url)
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['id'] == 'cbc'
    
    def test_get_test_parameters(self, api_client, lab_test):
        """Test getting test parameters"""
        url = reverse('labtest-parameters', kwargs={'pk': lab_test.id})
        response = api_client.get(url)
        assert response.status_code == 200
        assert len(response.data) == 1
        assert response.data[0]['id'] == 'hb'


@pytest.mark.django_db
class TestLabRequestViewSet:
    """Test LabRequestViewSet"""
    
    def test_create_lab_request(self, api_client, patient, lab_test):
        """Test creating a lab request"""
        url = reverse('labrequest-list')
        data = {
            'patient': str(patient.id),
            'test_ids': [lab_test.id],
            'payment': {
                'totalAmount': 750,
                'discountAmount': 0,
                'paidAmount': 750,
            }
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 201
        assert response.data['status'] == 'REGISTERED'
        assert 'labNo' in response.data
    
    def test_collect_samples(self, api_client, patient, lab_test, sample_type):
        """Test collecting samples"""
        lab_request = LabRequest.objects.create(
            patient=patient,
            payment={'totalAmount': 750, 'discountAmount': 0, 'paidAmount': 750}
        )
        lab_request.tests.add(lab_test)
        
        url = reverse('labrequest-collect', kwargs={'pk': lab_request.id})
        data = {
            'collected_samples': ['edta'],
            'phlebotomy_comments': 'Sample collected successfully'
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 200
        assert response.data['status'] == 'COLLECTED'
    
    def test_collect_samples_missing_required(self, api_client, patient, lab_test):
        """Test that collecting samples requires all sample types"""
        lab_request = LabRequest.objects.create(
            patient=patient,
            payment={'totalAmount': 750, 'discountAmount': 0, 'paidAmount': 750}
        )
        lab_request.tests.add(lab_test)
        
        url = reverse('labrequest-collect', kwargs={'pk': lab_request.id})
        data = {
            'collected_samples': [],  # Missing required sample
            'phlebotomy_comments': ''
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 400
    
    def test_update_results(self, api_client, patient, lab_test):
        """Test updating results"""
        lab_request = LabRequest.objects.create(
            patient=patient,
            status='COLLECTED',
            payment={'totalAmount': 750, 'discountAmount': 0, 'paidAmount': 750}
        )
        lab_request.tests.add(lab_test)
        
        url = reverse('labrequest-update-results', kwargs={'pk': lab_request.id})
        data = {
            'test_id': lab_test.id,
            'results': [
                {'parameterId': 'hb', 'value': '15.5', 'flag': 'N'}
            ]
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 200
        assert response.data['status'] == 'ANALYZED'
    
    def test_update_results_blocked_after_verification(self, api_client, patient, lab_test):
        """Test that results cannot be updated after verification"""
        lab_request = LabRequest.objects.create(
            patient=patient,
            status='VERIFIED',
            payment={'totalAmount': 750, 'discountAmount': 0, 'paidAmount': 750},
            results={lab_test.id: [{'parameterId': 'hb', 'value': '15.5', 'flag': 'N'}]}
        )
        lab_request.tests.add(lab_test)
        
        url = reverse('labrequest-update-results', kwargs={'pk': lab_request.id})
        data = {
            'test_id': lab_test.id,
            'results': [
                {'parameterId': 'hb', 'value': '16.0', 'flag': 'N'}
            ]
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 400
    
    def test_verify_request(self, api_client, patient, lab_test):
        """Test verifying a request"""
        lab_request = LabRequest.objects.create(
            patient=patient,
            status='ANALYZED',
            payment={'totalAmount': 750, 'discountAmount': 0, 'paidAmount': 750}
        )
        lab_request.tests.add(lab_test)
        
        url = reverse('labrequest-verify', kwargs={'pk': lab_request.id})
        data = {
            'results': {
                lab_test.id: [
                    {'parameterId': 'hb', 'value': '15.5', 'flag': 'N'}
                ]
            }
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 200
        assert response.data['status'] == 'VERIFIED'
    
    def test_verify_request_missing_results(self, api_client, patient, lab_test):
        """Test that verification requires all test results"""
        lab_request = LabRequest.objects.create(
            patient=patient,
            status='ANALYZED',
            payment={'totalAmount': 750, 'discountAmount': 0, 'paidAmount': 750}
        )
        lab_request.tests.add(lab_test)
        
        url = reverse('labrequest-verify', kwargs={'pk': lab_request.id})
        data = {
            'results': {}  # Missing results
        }
        response = api_client.post(url, data, format='json')
        assert response.status_code == 400
