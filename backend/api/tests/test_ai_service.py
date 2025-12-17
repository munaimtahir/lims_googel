import pytest
from unittest.mock import Mock, patch, MagicMock
from api.services.ai_service import AIService


class TestAIService:
    """Test AI Service"""
    
    def test_ai_service_init_no_key(self, settings):
        """Test AI service initialization without API key"""
        settings.GEMINI_API_KEY = ''
        service = AIService()
        assert service.model is None
    
    @patch('api.services.ai_service.genai')
    def test_ai_service_init_with_key(self, mock_genai, settings):
        """Test AI service initialization with API key"""
        settings.GEMINI_API_KEY = 'test-key'
        mock_model = MagicMock()
        mock_genai.GenerativeModel.return_value = mock_model
        
        service = AIService()
        assert service.model is not None
        mock_genai.configure.assert_called_once_with(api_key='test-key')
    
    @patch('api.services.ai_service.genai')
    def test_analyze_lab_results_success(self, mock_genai, settings):
        """Test successful AI interpretation"""
        settings.GEMINI_API_KEY = 'test-key'
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = 'This is a test interpretation.'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        service = AIService()
        patient_data = {'name': 'John Doe', 'age': 34, 'gender': 'Male'}
        test_results = {
            'CBC': [
                {'name': 'Hemoglobin', 'value': '15.5', 'unit': 'g/dL', 'referenceRange': '13.5 - 17.5', 'flag': 'N'}
            ]
        }
        
        result = service.analyze_lab_results(patient_data, test_results)
        assert result == 'This is a test interpretation.'
        mock_model.generate_content.assert_called_once()
    
    @patch('api.services.ai_service.genai')
    def test_analyze_lab_results_no_model(self, mock_genai, settings):
        """Test AI interpretation when model is not available"""
        settings.GEMINI_API_KEY = ''
        service = AIService()
        
        patient_data = {'name': 'John Doe', 'age': 34, 'gender': 'Male'}
        test_results = {}
        
        result = service.analyze_lab_results(patient_data, test_results)
        assert 'not available' in result.lower()
    
    @patch('api.services.ai_service.genai')
    def test_analyze_lab_results_error_handling(self, mock_genai, settings):
        """Test error handling in AI interpretation"""
        settings.GEMINI_API_KEY = 'test-key'
        mock_model = MagicMock()
        mock_model.generate_content.side_effect = Exception('API Error')
        mock_genai.GenerativeModel.return_value = mock_model
        
        service = AIService()
        patient_data = {'name': 'John Doe', 'age': 34, 'gender': 'Male'}
        test_results = {}
        
        result = service.analyze_lab_results(patient_data, test_results, request_id='test-123')
        assert 'unable' in result.lower() or 'error' in result.lower()
    
    @patch('api.services.ai_service.genai')
    def test_prompt_creation(self, mock_genai, settings):
        """Test that prompt is created correctly"""
        settings.GEMINI_API_KEY = 'test-key'
        mock_model = MagicMock()
        mock_response = MagicMock()
        mock_response.text = 'Test response'
        mock_model.generate_content.return_value = mock_response
        mock_genai.GenerativeModel.return_value = mock_model
        
        service = AIService()
        patient_data = {'name': 'John Doe', 'age': 34, 'gender': 'Male'}
        test_results = {
            'CBC': [
                {'name': 'Hemoglobin', 'value': '15.5', 'unit': 'g/dL', 'referenceRange': '13.5 - 17.5', 'flag': 'N'}
            ]
        }
        
        service.analyze_lab_results(patient_data, test_results)
        
        # Check that generate_content was called with a prompt containing patient info
        call_args = mock_model.generate_content.call_args[0][0]
        assert 'John Doe' in call_args
        assert '34' in call_args
        assert 'Hemoglobin' in call_args
