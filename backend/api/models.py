from django.db import models
from django.utils import timezone
import uuid


class Patient(models.Model):
    """Patient model for storing patient information"""
    GENDER_CHOICES = [
        ('Male', 'Male'),
        ('Female', 'Female'),
        ('Other', 'Other'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True, editable=False)
    name = models.CharField(max_length=200)
    age = models.IntegerField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.id:
            # Generate patient ID
            # NOTE: This has a potential race condition. For production use,
            # consider using database sequences or UUID-based IDs.
            last_patient = Patient.objects.order_by('-id').first()
            if last_patient:
                try:
                    last_num = int(last_patient.id[1:])  # Remove 'P' prefix
                    new_num = last_num + 1
                except (ValueError, IndexError):
                    new_num = 1
            else:
                new_num = 1
            self.id = f'P{new_num:03d}'
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.id} - {self.name}"


class LabTest(models.Model):
    """Lab test model for storing test definitions"""
    id = models.CharField(max_length=50, primary_key=True)
    name = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=100)
    sample_type_id = models.CharField(max_length=50)
    parameters = models.JSONField(default=list)  # Array of test parameters
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class LabRequest(models.Model):
    """Lab request model for storing patient test requests"""
    STATUS_CHOICES = [
        ('REGISTERED', 'Registered'),
        ('COLLECTED', 'Collected'),
        ('ANALYZED', 'Analyzed'),
        ('VERIFIED', 'Verified'),
    ]
    
    id = models.CharField(max_length=20, primary_key=True, editable=False)
    lab_no = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='requests')
    date = models.DateTimeField(auto_now_add=True)
    tests = models.ManyToManyField(LabTest, related_name='requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='REGISTERED')
    results = models.JSONField(default=dict)  # {test_id: [{parameterId, value, flag}]}
    payment = models.JSONField(default=dict)  # PaymentDetails object
    referred_by = models.CharField(max_length=200, blank=True)
    comments = models.TextField(blank=True)
    ai_interpretation = models.TextField(blank=True)
    collected_samples = models.JSONField(default=list)  # Array of sample type IDs
    phlebotomy_comments = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def save(self, *args, **kwargs):
        if not self.id:
            # Generate request ID using UUID for uniqueness
            self.id = f'REQ{uuid.uuid4().hex[:8].upper()}'
        
        if not self.lab_no:
            # Generate lab number with date
            # NOTE: This has a potential race condition for concurrent requests.
            # For production, consider using database-level sequences or atomic counters.
            today = timezone.now().strftime('%Y%m%d')
            # Get count of requests created today
            today_start = timezone.now().replace(hour=0, minute=0, second=0, microsecond=0)
            count = LabRequest.objects.filter(created_at__gte=today_start).count() + 1
            self.lab_no = f'LAB-{today}-{count:03d}'
        
        super().save(*args, **kwargs)
    
    class Meta:
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.lab_no} - {self.patient.name}"
