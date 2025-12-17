from django.core.management.base import BaseCommand
from api.models import LabTest, Patient, LabRequest, SampleType, TestParameter
from api.constants import AVAILABLE_TESTS, MOCK_PATIENTS, SAMPLE_TYPES


class Command(BaseCommand):
    help = 'Seed the database with initial data'
    
    def handle(self, *args, **options):
        self.stdout.write('Seeding database...')
        
        # Seed sample types
        self.stdout.write('Creating sample types...')
        sample_type_map = {}
        for sample_data in SAMPLE_TYPES:
            sample_type, created = SampleType.objects.get_or_create(
                id=sample_data['id'],
                defaults={
                    'name': sample_data['name'],
                    'tube_color': sample_data['tubeColor'],
                }
            )
            sample_type_map[sample_data['id']] = sample_type
            if created:
                self.stdout.write(f'  Created sample type: {sample_type.name}')
            else:
                self.stdout.write(f'  Sample type already exists: {sample_type.name}')
        
        # Seed lab tests and their parameters
        self.stdout.write('Creating lab tests...')
        for test_data in AVAILABLE_TESTS:
            sample_type = sample_type_map.get(test_data['sampleTypeId'])
            if not sample_type:
                self.stdout.write(self.style.WARNING(
                    f'  Warning: Sample type {test_data["sampleTypeId"]} not found for test {test_data["id"]}'
                ))
                continue
            
            test, created = LabTest.objects.get_or_create(
                id=test_data['id'],
                defaults={
                    'name': test_data['name'],
                    'price': test_data['price'],
                    'category': test_data['category'],
                    'sample_type': sample_type,
                }
            )
            if created:
                self.stdout.write(f'  Created test: {test.name}')
            else:
                self.stdout.write(f'  Test already exists: {test.name}')
            
            # Seed test parameters
            for param_data in test_data.get('parameters', []):
                param, param_created = TestParameter.objects.get_or_create(
                    id=param_data['id'],
                    test=test,
                    defaults={
                        'name': param_data['name'],
                        'unit': param_data.get('unit', ''),
                        'reference_range': param_data.get('referenceRange', ''),
                    }
                )
                if param_created:
                    self.stdout.write(f'    Created parameter: {param.name}')
        
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
