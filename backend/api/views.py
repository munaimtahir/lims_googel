from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
import logging

from .models import Patient, LabTest, LabRequest
from .serializers import (
    PatientSerializer, LabTestSerializer, LabRequestSerializer,
    LabRequestCreateSerializer, CollectSamplesSerializer,
    UpdateResultsSerializer, UpdateAllResultsSerializer,
    UpdateCommentSerializer, VerifyRequestSerializer
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


class LabTestViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for LabTest (read-only)"""
    queryset = LabTest.objects.all()
    serializer_class = LabTestSerializer


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
        serializer = CollectSamplesSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update collected samples and status
        lab_request.collected_samples = serializer.validated_data['collected_samples']
        lab_request.phlebotomy_comments = serializer.validated_data.get('phlebotomy_comments', '')
        lab_request.status = 'COLLECTED'
        lab_request.save()
        
        response_serializer = LabRequestSerializer(lab_request)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_results(self, request, pk=None):
        """Update results for a specific test"""
        lab_request = self.get_object()
        serializer = UpdateResultsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        test_id = serializer.validated_data['test_id']
        results = serializer.validated_data['results']
        
        # Update results for the specific test
        current_results = lab_request.results or {}
        current_results[test_id] = results
        lab_request.results = current_results
        lab_request.status = 'ANALYZED'
        lab_request.save()
        
        response_serializer = LabRequestSerializer(lab_request)
        return Response(response_serializer.data)
    
    @action(detail=True, methods=['post'])
    def update_all_results(self, request, pk=None):
        """Update all results at once"""
        lab_request = self.get_object()
        serializer = UpdateAllResultsSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update all results
        lab_request.results = serializer.validated_data['results']
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
        serializer = VerifyRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Update results and status
        lab_request.results = serializer.validated_data['results']
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
            for test in lab_request.tests.all():
                test_id = test.id
                if test_id in lab_request.results:
                    # Get parameter details from test definition
                    param_details = {p['id']: p for p in test.parameters}
                    
                    # Enrich results with parameter metadata
                    enriched_results = []
                    for result in lab_request.results[test_id]:
                        param_id = result.get('parameterId')
                        if param_id in param_details:
                            param = param_details[param_id]
                            enriched_results.append({
                                'name': param['name'],
                                'value': result.get('value', ''),
                                'unit': param.get('unit', ''),
                                'referenceRange': param.get('referenceRange', ''),
                                'flag': result.get('flag', 'N'),
                            })
                    
                    test_results[test.name] = enriched_results
            
            # Generate AI interpretation
            logger.info(f"Generating AI interpretation for lab request {lab_request.lab_no}")
            interpretation = ai_service.analyze_lab_results(patient_data, test_results)
            
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
