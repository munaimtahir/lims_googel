from rest_framework import serializers
from django.core.exceptions import ValidationError
from .models import Patient, LabTest, LabRequest, SampleType, TestParameter


class SampleTypeSerializer(serializers.ModelSerializer):
    """Serializer for SampleType model"""
    tubeColor = serializers.CharField(source='tube_color', read_only=True)
    
    class Meta:
        model = SampleType
        fields = ['id', 'name', 'tubeColor']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend compatibility"""
        data = super().to_representation(instance)
        return {
            'id': data['id'],
            'name': data['name'],
            'tubeColor': data['tubeColor'],
        }


class TestParameterSerializer(serializers.ModelSerializer):
    """Serializer for TestParameter model"""
    referenceRange = serializers.CharField(source='reference_range', read_only=True)
    
    class Meta:
        model = TestParameter
        fields = ['id', 'name', 'unit', 'referenceRange']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend compatibility"""
        data = super().to_representation(instance)
        return {
            'id': data['id'],
            'name': data['name'],
            'unit': data['unit'],
            'referenceRange': data['referenceRange'],
        }


class LabTestSerializer(serializers.ModelSerializer):
    """Serializer for LabTest model"""
    sampleTypeId = serializers.CharField(source='sample_type.id', read_only=True)
    parameters = TestParameterSerializer(many=True, read_only=True)
    
    class Meta:
        model = LabTest
        fields = ['id', 'name', 'price', 'category', 'sampleTypeId', 'parameters']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend compatibility"""
        data = super().to_representation(instance)
        return {
            'id': data['id'],
            'name': data['name'],
            'price': float(data['price']),
            'category': data['category'],
            'sampleTypeId': data['sampleTypeId'],
            'parameters': data['parameters'],
        }


class PatientSerializer(serializers.ModelSerializer):
    """Serializer for Patient model"""
    
    class Meta:
        model = Patient
        fields = ['id', 'name', 'age', 'gender', 'phone', 'email', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, data):
        """Ensure patient_id uniqueness if provided"""
        if self.instance is None and 'id' in self.initial_data:
            if Patient.objects.filter(id=self.initial_data['id']).exists():
                raise ValidationError({'id': 'A patient with this ID already exists.'})
        return data


class LabRequestSerializer(serializers.ModelSerializer):
    """Serializer for LabRequest model"""
    tests = LabTestSerializer(many=True, read_only=True)
    patient_name = serializers.CharField(read_only=True)
    lab_no = serializers.CharField(read_only=True)
    labNo = serializers.CharField(source='lab_no', read_only=True)
    referredBy = serializers.CharField(source='referred_by', required=False, allow_blank=True)
    aiInterpretation = serializers.CharField(source='ai_interpretation', read_only=True)
    collectedSamples = serializers.ListField(source='collected_samples', required=False)
    phlebotomyComments = serializers.CharField(source='phlebotomy_comments', required=False, allow_blank=True)
    
    class Meta:
        model = LabRequest
        fields = [
            'id', 'lab_no', 'labNo', 'patient', 'patient_name', 'date', 'tests', 'status',
            'results', 'payment', 'referred_by', 'referredBy', 'comments', 'ai_interpretation',
            'aiInterpretation', 'collected_samples', 'collectedSamples', 'phlebotomy_comments',
            'phlebotomyComments', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'lab_no', 'labNo', 'patient_name', 'date', 'ai_interpretation',
                           'aiInterpretation', 'created_at', 'updated_at']
    
    def to_representation(self, instance):
        """Convert to camelCase for frontend compatibility"""
        data = super().to_representation(instance)
        # Convert snake_case to camelCase
        camel_case_data = {
            'id': str(data['id']),  # UUID to string
            'labNo': data.get('labNo', data.get('lab_no', '')),
            'patient': data['patient'],
            'patientName': data['patient_name'],
            'date': data['date'],
            'tests': data['tests'],
            'status': data['status'],
            'results': data['results'],
            'payment': data['payment'],
            'referredBy': data.get('referredBy', data.get('referred_by', '')),
            'comments': data.get('comments', ''),
            'aiInterpretation': data.get('aiInterpretation', data.get('ai_interpretation', '')),
            'collectedSamples': data.get('collectedSamples', data.get('collected_samples', [])),
            'phlebotomyComments': data.get('phlebotomyComments', data.get('phlebotomy_comments', '')),
        }
        return camel_case_data


class LabRequestCreateSerializer(serializers.Serializer):
    """Serializer for creating a lab request"""
    patient = serializers.CharField()
    test_ids = serializers.ListField(child=serializers.CharField())
    payment = serializers.JSONField()
    referred_by = serializers.CharField(required=False, allow_blank=True)
    
    def validate_test_ids(self, value):
        """Require at least one test"""
        if not value or len(value) == 0:
            raise ValidationError('At least one test must be selected.')
        return value
    
    def validate_payment(self, value):
        """Validate and recalculate payment totals server-side"""
        if not isinstance(value, dict):
            raise ValidationError('Payment must be a JSON object.')
        
        payment = value.copy()
        total_amount = payment.get('totalAmount', 0)
        discount_amount = payment.get('discountAmount', 0)
        paid_amount = payment.get('paidAmount', 0)
        
        # Validate numeric values
        try:
            total_amount = float(total_amount)
            discount_amount = float(discount_amount)
            paid_amount = float(paid_amount)
        except (ValueError, TypeError):
            raise ValidationError('Payment amounts must be valid numbers.')
        
        # Calculate net payable
        net_payable = max(0, total_amount - discount_amount)
        payment['netPayable'] = net_payable
        
        # Calculate balance due (clamp to zero)
        balance_due = max(0, net_payable - paid_amount)
        payment['balanceDue'] = balance_due
        
        # Calculate discount percent
        if total_amount > 0:
            payment['discountPercent'] = (discount_amount / total_amount) * 100
        else:
            payment['discountPercent'] = 0
        
        return payment
    
    def validate(self, data):
        """Validate sample types match chosen tests"""
        test_ids = data.get('test_ids', [])
        if test_ids:
            tests = LabTest.objects.filter(id__in=test_ids)
            if tests.count() != len(test_ids):
                raise ValidationError('One or more test IDs are invalid.')
        
        return data
    
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
    
    def validate_collected_samples(self, value):
        """Ensure collected_samples is a list"""
        if not isinstance(value, list):
            raise ValidationError('collected_samples must be a list.')
        return value


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
    
    def validate_results(self, value):
        """Ensure results is a dictionary"""
        if not isinstance(value, dict):
            raise ValidationError('results must be a JSON object.')
        return value
