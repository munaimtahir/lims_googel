from rest_framework import serializers
from .models import Patient, LabTest, LabRequest


class PatientSerializer(serializers.ModelSerializer):
    """Serializer for Patient model"""
    
    class Meta:
        model = Patient
        fields = ['id', 'name', 'age', 'gender', 'phone', 'email', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class LabTestSerializer(serializers.ModelSerializer):
    """Serializer for LabTest model"""
    
    class Meta:
        model = LabTest
        fields = ['id', 'name', 'price', 'category', 'sample_type_id', 'parameters']


class LabRequestSerializer(serializers.ModelSerializer):
    """Serializer for LabRequest model"""
    tests = LabTestSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(source='patient.name', read_only=True)
    lab_no = serializers.CharField(read_only=True)
    
    class Meta:
        model = LabRequest
        fields = [
            'id', 'lab_no', 'patient', 'patient_name', 'date', 'tests', 'status',
            'results', 'payment', 'referred_by', 'comments', 'ai_interpretation',
            'collected_samples', 'phlebotomy_comments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'lab_no', 'patient_name', 'date', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend compatibility"""
        data = super().to_representation(instance)
        # Convert snake_case to camelCase
        camel_case_data = {
            'id': data['id'],
            'labNo': data['lab_no'],
            'patient': data['patient'],
            'patientName': data['patient_name'],
            'date': data['date'],
            'tests': data['tests'],
            'status': data['status'],
            'results': data['results'],
            'payment': data['payment'],
            'referredBy': data.get('referred_by', ''),
            'comments': data.get('comments', ''),
            'aiInterpretation': data.get('ai_interpretation', ''),
            'collectedSamples': data.get('collected_samples', []),
            'phlebotomyComments': data.get('phlebotomy_comments', ''),
        }
        return camel_case_data


class LabRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating a lab request"""
    patient = serializers.CharField()
    test_ids = serializers.ListField(child=serializers.CharField())
    payment = serializers.JSONField()
    referred_by = serializers.CharField(required=False, allow_blank=True)
    
    def create(self, validated_data):
        patient_id = validated_data['patient']
        test_ids = validated_data['test_ids']
        payment = validated_data['payment']
        referred_by = validated_data.get('referred_by', '')
        
        # Create the lab request
        patient = Patient.objects.get(id=patient_id)
        lab_request = LabRequest.objects.create(
            patient=patient,
            payment=payment,
            referred_by=referred_by
        )
        
        # Add tests
        tests = LabTest.objects.filter(id__in=test_ids)
        lab_request.tests.set(tests)
        
        return lab_request


class CollectSamplesSerializer(serializers.Serializer):
    """Serializer for collecting samples"""
    collected_samples = serializers.ListField(child=serializers.CharField())
    phlebotomy_comments = serializers.CharField(required=False, allow_blank=True)


class UpdateResultsSerializer(serializers.Serializer):
    """Serializer for updating test results"""
    test_id = serializers.CharField()
    results = serializers.ListField(child=serializers.JSONField())


class UpdateAllResultsSerializer(serializers.Serializer):
    """Serializer for updating all results"""
    results = serializers.JSONField()


class UpdateCommentSerializer(serializers.Serializer):
    """Serializer for updating comments"""
    comments = serializers.CharField(allow_blank=True)


class VerifyRequestSerializer(serializers.Serializer):
    """Serializer for verifying request"""
    results = serializers.JSONField()
