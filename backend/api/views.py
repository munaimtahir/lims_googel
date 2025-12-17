from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.core.exceptions import ValidationError
import logging

from .models import Patient, LabTest, LabRequest, SampleType, TestParameter
from .serializers import (
    PatientSerializer, LabTestSerializer, LabRequestSerializer,
    LabRequestCreateSerializer, CollectSamplesSerializer,
    UpdateResultsSerializer, UpdateAllResultsSerializer,
    UpdateCommentSerializer, VerifyRequestSerializer,
    SampleTypeSerializer, TestParameterSerializer
)
from .services.ai_service import ai_service

logger = logging.getLogger(__name__)


class PatientViewSet(viewsets.ModelViewSet):
    """ViewSet for Patient CRUD operations"""
    queryset = Patient.objects.all()
    serializer_class = PatientSerializer
    
    def create(self, request):
        """
        Create or update a patient
        NOTE: This handles both create and update for frontend compatibility.
        The frontend sends patient data with or without an ID.
        For strict REST compliance, use separate endpoints.
        """
        patient_id = request.data.get('id')
        
        if patient_id:
            # Update existing patient
            try:
                patient = Patient.objects.get(id=patient_id)
                serializer = self.get_serializer(patient, data=request.data, partial=True)
            except Patient.DoesNotExist:
                return Response(
                    {'detail': f'Patient with id {patient_id} not found'},
                    status=status.HTTP_404_NOT_FOUND
                )
        else:
            # Create new patient
            serializer = self.get_serializer(data=request.data)
        
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    def update(self, request, pk=None):
        """Update an existing patient"""
        patient = get_object_or_404(Patient, pk=pk)
        serializer = self.get_serializer(patient, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class SampleTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for SampleType (read-only)"""
    queryset = SampleType.objects.all()
    serializer_class = SampleTypeSerializer


class LabTestViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for LabTest (read-only)"""
    queryset = LabTest.objects.all().prefetch_related('parameters', 'sample_type')
    serializer_class = LabTestSerializer
    
    @action(detail=True, methods=['get'])
    def parameters(self, request, pk=None):
        """Get parameters for a specific test"""
        lab_test = self.get_object()
        parameters = lab_test.parameters.all()
        serializer = TestParameterSerializer(parameters, many=True)
        return Response(serializer.data)


class LabRequestViewSet(viewsets.ModelViewSet):
    """ViewSet for LabRequest CRUD and custom actions"""
    queryset = LabRequest.objects.all().prefetch_related('tests', 'patient')
    serializer_class = LabRequestSerializer
    
    def create(self, request):
        """Create a new lab request"""
        serializer = LabRequestCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        lab_request = serializer.save()
        
        # Return the full lab request data
        response_serializer = LabRequestSerializer(lab_request)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def collect(self, request, pk=None):
        """Collect samples for a lab request"""
        lab_request = self.get_object()
        
        # Prevent status regression
        if lab_request.status not in ['REGISTERED']:
            return Response(
                {'detail': f'Cannot collect samples. Current status is {lab_request.status}.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = CollectSamplesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        collected_samples = serializer.validated_data['collected_samples']
        
        # Validate that all required sample types are collected
        required_sample_types = set()
        for test in lab_request.tests.all():
            required_sample_types.add(test.sample_type.id)
        
        collected_set = set(collected_samples)
        missing_samples = required_sample_types - collected_set
        
        if missing_samples:
            return Response(
                {'detail': f'Missing required samples: {", ".join(missing_samples)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update collected samples and status
        lab_request.collected_samples = collected_samples
        lab_request.phlebotomy_comments = serializer.validated_data.get('phlebotomy_comments', '')
        lab_request.status = 'COLLECTED'
        lab_request.save()
        
        response_serializer = LabRequestSerializer(lab_request)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_results(self, request, pk=None):
        """Update results for a specific test"""
        lab_request = self.get_object()
        
        # Block edits if status is VERIFIED
        if lab_request.status == 'VERIFIED':
            return Response(
                {'detail': 'Cannot update results after verification.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = UpdateResultsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        test_id = serializer.validated_data['test_id']
        results = serializer.validated_data['results']
        
        # Validate that the test is part of this request
        test_ids = [t.id for t in lab_request.tests.all()]
        if test_id not in test_ids:
            return Response(
                {'detail': f'Test {test_id} is not part of this lab request.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update results for the specific test
        current_results = lab_request.results or {}
        current_results[test_id] = results
        lab_request.results = current_results
        
        # Only advance to ANALYZED if we're not already past it
        if lab_request.status in ['REGISTERED', 'COLLECTED']:
            lab_request.status = 'ANALYZED'
        
        lab_request.save()
        
        response_serializer = LabRequestSerializer(lab_request)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_all_results(self, request, pk=None):
        """Update all results at once"""
        lab_request = self.get_object()
        
        # Block edits if status is VERIFIED
        if lab_request.status == 'VERIFIED':
            return Response(
                {'detail': 'Cannot update results after verification.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = UpdateAllResultsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        results = serializer.validated_data['results']
        
        # Validate that all tests in results are part of this request
        test_ids = set(t.id for t in lab_request.tests.all())
        result_test_ids = set(results.keys())
        
        if not result_test_ids.issubset(test_ids):
            invalid_tests = result_test_ids - test_ids
            return Response(
                {'detail': f'Invalid tests in results: {", ".join(invalid_tests)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update all results
        lab_request.results = results
        
        # Only advance to ANALYZED if we're not already past it
        if lab_request.status in ['REGISTERED', 'COLLECTED']:
            lab_request.status = 'ANALYZED'
        
        lab_request.save()
        
        response_serializer = LabRequestSerializer(lab_request)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_comment(self, request, pk=None):
        """Update comments for a lab request"""
        lab_request = self.get_object()
        serializer = UpdateCommentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        lab_request.comments = serializer.validated_data['comments']
        lab_request.save()
        
        response_serializer = LabRequestSerializer(lab_request)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def verify(self, request, pk=None):
        """Verify and finalize a lab request"""
        lab_request = self.get_object()
        
        # Prevent status regression
        if lab_request.status == 'VERIFIED':
            return Response(
                {'detail': 'Lab request is already verified.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = VerifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        results = serializer.validated_data['results']
        
        # Ensure all selected tests have results
        test_ids = set(t.id for t in lab_request.tests.all())
        result_test_ids = set(results.keys())
        
        if test_ids != result_test_ids:
            missing_tests = test_ids - result_test_ids
            return Response(
                {'detail': f'Missing results for tests: {", ".join(missing_tests)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate that each test has at least one result entry
        for test_id in test_ids:
            if not results.get(test_id) or len(results[test_id]) == 0:
                return Response(
                    {'detail': f'Test {test_id} has no results.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Update results and status
        lab_request.results = results
        lab_request.status = 'VERIFIED'
        lab_request.save()
        
        response_serializer = LabRequestSerializer(lab_request)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def interpret(self, request, pk=None):
        """Trigger AI interpretation of lab results"""
        lab_request = self.get_object()
        
        try:
            # Prepare patient data
            patient_data = {
                'name': lab_request.patient.name,
                'age': lab_request.patient.age,
                'gender': lab_request.patient.gender,
            }
            
            # Prepare test results with parameter details
            test_results = {}
            for test in lab_request.tests.all().prefetch_related('parameters'):
                test_id = test.id
                if test_id in lab_request.results:
                    # Get parameter details from TestParameter model
                    param_details = {p.id: p for p in test.parameters.all()}
                    
                    # Enrich results with parameter metadata
                    enriched_results = []
                    for result in lab_request.results[test_id]:
                        param_id = result.get('parameterId')
                        if param_id in param_details:
                            param = param_details[param_id]
                            enriched_results.append({
                                'name': param.name,
                                'value': result.get('value', ''),
                                'unit': param.unit or '',
                                'referenceRange': param.reference_range or '',
                                'flag': result.get('flag', 'N'),
                            })
                    
                    test_results[test.name] = enriched_results
            
            # Generate AI interpretation
            logger.info(f"Generating AI interpretation for lab request {lab_request.lab_no}")
            interpretation = ai_service.analyze_lab_results(
                patient_data, 
                test_results, 
                request_id=str(lab_request.id)
            )
            
            # Save interpretation
            lab_request.ai_interpretation = interpretation
            lab_request.save()
            
            response_serializer = LabRequestSerializer(lab_request)
            return Response(response_serializer.data)
        
        except Exception as e:
            logger.error(f"Error in AI interpretation: {str(e)}")
            return Response(
                {'detail': 'An error occurred while generating AI interpretation. Please try again later.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
