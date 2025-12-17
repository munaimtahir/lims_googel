import os
import logging
import google.generativeai as genai
from django.conf import settings

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI-powered lab result interpretation using Google Gemini"""
    
    def __init__(self):
        """Initialize the Gemini API client"""
        api_key = settings.GEMINI_API_KEY
        if not api_key:
            logger.warning("GEMINI_API_KEY not set. AI interpretation will not be available.")
            self.model = None
        else:
            genai.configure(api_key=api_key)
            self.model = genai.GenerativeModel('gemini-pro')
    
    def analyze_lab_results(self, patient_data, test_results):
        """
        Analyze lab results and generate medical interpretation
        
        Args:
            patient_data: Dict with patient info (name, age, gender)
            test_results: Dict with test results {test_name: [{param_name, value, unit, ref_range, flag}]}
        
        Returns:
            str: AI-generated interpretation or error message
        """
        if not self.model:
            return "AI interpretation is not available. Please configure GEMINI_API_KEY."
        
        try:
            # Format the prompt
            prompt = self._create_prompt(patient_data, test_results)
            
            # Generate interpretation
            logger.info("Sending request to Gemini API for lab result interpretation")
            response = self.model.generate_content(prompt)
            
            interpretation = response.text
            logger.info("Successfully received AI interpretation")
            
            return interpretation
        
        except Exception as e:
            logger.error(f"Error generating AI interpretation: {str(e)}")
            return "Unable to generate AI interpretation at this time. Please try again later."
    
    def _create_prompt(self, patient_data, test_results):
        """Create a structured prompt for the AI model"""
        
        prompt = f"""You are a medical professional assistant analyzing laboratory test results.

Patient Information:
- Name: {patient_data.get('name', 'N/A')}
- Age: {patient_data.get('age', 'N/A')} years
- Gender: {patient_data.get('gender', 'N/A')}

Laboratory Test Results:

"""
        
        # Add each test and its parameters
        for test_name, parameters in test_results.items():
            prompt += f"\n{test_name}:\n"
            for param in parameters:
                param_name = param.get('name', 'Unknown')
                value = param.get('value', 'N/A')
                unit = param.get('unit', '')
                ref_range = param.get('referenceRange', '')
                flag = param.get('flag', 'N')
                
                flag_indicator = ''
                if flag == 'H':
                    flag_indicator = ' [HIGH]'
                elif flag == 'L':
                    flag_indicator = ' [LOW]'
                
                prompt += f"  - {param_name}: {value} {unit}{flag_indicator}"
                if ref_range:
                    prompt += f" (Reference: {ref_range})"
                prompt += "\n"
        
        prompt += """
Please provide a professional medical interpretation of these results including:
1. Summary of abnormal findings (if any)
2. Clinical significance of the results
3. Possible conditions indicated by the abnormalities
4. Recommendations for follow-up (if needed)

Keep the interpretation clear, concise, and professional. Focus on clinically significant findings.
"""
        
        return prompt


# Singleton instance
ai_service = AIService()
