import os
import logging
import time
import google.generativeai as genai
from django.conf import settings
from functools import wraps

logger = logging.getLogger(__name__)

# Timeout for API calls (seconds)
API_TIMEOUT = getattr(settings, 'GEMINI_API_TIMEOUT', 30)


def timeout_handler(timeout_seconds):
    """Decorator to handle timeouts for API calls"""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            import signal
            
            def timeout_signal_handler(signum, frame):
                raise TimeoutError(f"Function {func.__name__} timed out after {timeout_seconds} seconds")
            
            # Set up signal handler for timeout (Unix only)
            if hasattr(signal, 'SIGALRM'):
                old_handler = signal.signal(signal.SIGALRM, timeout_signal_handler)
                signal.alarm(timeout_seconds)
                try:
                    result = func(*args, **kwargs)
                finally:
                    signal.alarm(0)
                    signal.signal(signal.SIGALRM, old_handler)
                return result
            else:
                # Windows doesn't support SIGALRM, so we'll use a simpler approach
                # by logging timeout warnings and relying on the library's own timeout
                return func(*args, **kwargs)
        return wrapper
    return decorator


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
            try:
                # Try to use gemini-1.5-flash for faster responses, fallback to gemini-pro
                self.model = genai.GenerativeModel('gemini-1.5-flash')
            except Exception:
                self.model = genai.GenerativeModel('gemini-pro')
    
    def analyze_lab_results(self, patient_data, test_results, request_id=None):
        """
        Analyze lab results and generate medical interpretation
        
        Args:
            patient_data: Dict with patient info (name, age, gender)
            test_results: Dict with test results {test_name: [{param_name, value, unit, ref_range, flag}]}
            request_id: Optional request ID for logging
        
        Returns:
            str: AI-generated interpretation or error message
        """
        if not self.model:
            logger.warning("AI service not available - GEMINI_API_KEY not configured")
            return "AI interpretation is not available. Please configure GEMINI_API_KEY."
        
        start_time = time.time()
        patient_name = patient_data.get('name', 'Unknown')
        
        logger.info(
            f"AI interpretation request started",
            extra={
                'request_id': request_id,
                'patient_name': patient_name,
                'test_count': len(test_results),
            }
        )
        
        try:
            # Format the prompt
            prompt = self._create_prompt(patient_data, test_results)
            
            # Generate interpretation with timeout handling
            logger.debug(f"Sending request to Gemini API (request_id={request_id})")
            
            # Use a try-except to handle potential timeout errors
            try:
                response = self.model.generate_content(
                    prompt,
                    request_options={'timeout': API_TIMEOUT * 1000}  # Convert to milliseconds if supported
                )
            except Exception as api_error:
                # Check if it's a timeout-related error
                if 'timeout' in str(api_error).lower() or 'timed out' in str(api_error).lower():
                    raise TimeoutError(f"Gemini API call timed out after {API_TIMEOUT} seconds")
                raise
            
            interpretation = response.text
            
            elapsed_time = time.time() - start_time
            logger.info(
                f"AI interpretation completed successfully",
                extra={
                    'request_id': request_id,
                    'patient_name': patient_name,
                    'latency_seconds': round(elapsed_time, 2),
                    'response_length': len(interpretation),
                }
            )
            
            return interpretation
        
        except TimeoutError as e:
            elapsed_time = time.time() - start_time
            logger.error(
                f"AI interpretation timed out: {str(e)}",
                extra={
                    'request_id': request_id,
                    'patient_name': patient_name,
                    'latency_seconds': round(elapsed_time, 2),
                    'error_type': 'timeout',
                }
            )
            return "The AI interpretation request timed out. Please try again later."
        
        except Exception as e:
            elapsed_time = time.time() - start_time
            logger.error(
                f"Error generating AI interpretation: {str(e)}",
                extra={
                    'request_id': request_id,
                    'patient_name': patient_name,
                    'latency_seconds': round(elapsed_time, 2),
                    'error_type': type(e).__name__,
                },
                exc_info=True
            )
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
