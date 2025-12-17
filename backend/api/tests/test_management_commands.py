import pytest
from io import StringIO
from django.core.management import call_command
from django.core.management.base import CommandError
from api.models import SampleType, LabTest, TestParameter, Patient


@pytest.mark.django_db
class TestSeedDataCommand:
    """Test seed_data management command"""
    
    def test_seed_data_creates_sample_types(self):
        """Test that seed_data creates sample types"""
        assert SampleType.objects.count() == 0
        
        out = StringIO()
        call_command('seed_data', stdout=out)
        
        assert SampleType.objects.count() > 0
        assert SampleType.objects.filter(id='edta').exists()
        assert SampleType.objects.filter(id='serum').exists()
    
    def test_seed_data_creates_lab_tests(self):
        """Test that seed_data creates lab tests"""
        assert LabTest.objects.count() == 0
        
        out = StringIO()
        call_command('seed_data', stdout=out)
        
        assert LabTest.objects.count() > 0
        assert LabTest.objects.filter(id='cbc').exists()
    
    def test_seed_data_creates_test_parameters(self):
        """Test that seed_data creates test parameters"""
        assert TestParameter.objects.count() == 0
        
        out = StringIO()
        call_command('seed_data', stdout=out)
        
        assert TestParameter.objects.count() > 0
        cbc = LabTest.objects.filter(id='cbc').first()
        if cbc:
            assert TestParameter.objects.filter(test=cbc, id='hb').exists()
    
    def test_seed_data_idempotent(self):
        """Test that seed_data can be run multiple times safely"""
        out = StringIO()
        
        # Run first time
        call_command('seed_data', stdout=out)
        first_count = LabTest.objects.count()
        
        # Run second time
        call_command('seed_data', stdout=out)
        second_count = LabTest.objects.count()
        
        # Should have same count (idempotent)
        assert first_count == second_count
    
    def test_seed_data_creates_mock_patients(self):
        """Test that seed_data creates mock patients"""
        # Clear existing patients (except ones created by seed)
        Patient.objects.filter(id__in=['P001', 'P002', 'P003']).delete()
        
        out = StringIO()
        call_command('seed_data', stdout=out)
        
        assert Patient.objects.filter(id='P001').exists()
        assert Patient.objects.filter(id='P002').exists()

