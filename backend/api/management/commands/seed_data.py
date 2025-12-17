from django.core.management.base import BaseCommand
from api.models import LabTest, Patient, LabRequest, SampleType
from api.constants import AVAILABLE_TESTS, MOCK_PATIENTS, SAMPLE_TYPES


class Command(BaseCommand):
    help = 'Seed the database with initial data'
    
    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        
        # Seed sample types
        self.stdout.write('Creating sample types...')
        for sample_type_data in SAMPLE_TYPES:
            sample_type, created = SampleType.objects.get_or_create(
                id=sample_type_data['id'],
                defaults={
                    'name': sample_type_data['name'],
                    'tube_color': sample_type_data['tube_color'],
                }
            )
            if created:
                self.stdout.write(f'  Created sample type: {sample_type.name}')
            else:
                self.stdout.write(f'  Sample type already exists: {sample_type.name}')
        
        # Seed lab tests
        self.stdout.write('Creating lab tests...')
        for test_data in AVAILABLE_TESTS:
            test, created = LabTest.objects.get_or_create(
                id=test_data['id'],
                defaults={
                    'name': test_data['name'],
                    'price': test_data['price'],
                    'category': test_data['category'],
                    'sample_type_id': test_data['sampleTypeId'],
                    'parameters': test_data['parameters'],
                }
            )
            if created:
                self.stdout.write(f'  Created test: {test.name}')
            else:
                self.stdout.write(f'  Test already exists: {test.name}')
        
        # Seed mock patients (optional)
        self.stdout.write('Creating mock patients...')
        for patient_data in MOCK_PATIENTS:
            patient, created = Patient.objects.get_or_create(
                id=patient_data['id'],
                defaults={
                    'name': patient_data['name'],
                    'age': patient_data['age'],
                    'gender': patient_data['gender'],
                    'phone': patient_data['phone'],
                }
            )
            if created:
                self.stdout.write(f'  Created patient: {patient.name}')
            else:
                self.stdout.write(f'  Patient already exists: {patient.name}')
        
        self.stdout.write(self.style.SUCCESS('Database seeding completed successfully!'))
