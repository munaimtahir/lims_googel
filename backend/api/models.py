from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
import uuid


class SampleType(models.Model):
    """Sample type model for storing sample type definitions"""
    id = models.CharField(max_length=50, primary_key=True)  # slug (e.g., 'edta', 'serum')
    name = models.CharField(max_length=200)
    tube_color = models.CharField(max_length=7)  # Hex color code
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name


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
    sample_type = models.ForeignKey(SampleType, on_delete=models.PROTECT, related_name='tests')
    
    class Meta:
        ordering = ['category', 'name']
    
    def __str__(self):
        return f"{self.name} ({self.category})"


class TestParameter(models.Model):
    """Test parameter model for storing individual test parameters"""
    id = models.CharField(max_length=50, primary_key=True)  # slug (e.g., 'hb', 'wbc')
    test = models.ForeignKey(LabTest, on_delete=models.CASCADE, related_name='parameters')
    name = models.CharField(max_length=200)
    unit = models.CharField(max_length=50, blank=True)
    reference_range = models.CharField(max_length=100, blank=True)
    
    class Meta:
        ordering = ['test', 'name']
        unique_together = [['test', 'id']]
    
    def __str__(self):
        return f"{self.test.name} - {self.name}"


class LabRequest(models.Model):
    """Lab request model for storing patient test requests"""
    STATUS_CHOICES = [
        ('REGISTERED', 'Registered'),
        ('COLLECTED', 'Collected'),
        ('ANALYZED', 'Analyzed'),
        ('VERIFIED', 'Verified'),
    ]
    
    STATUS_TRANSITIONS = {
        'REGISTERED': ['COLLECTED'],
        'COLLECTED': ['ANALYZED'],
        'ANALYZED': ['VERIFIED'],
        'VERIFIED': [],  # Terminal state
    }
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    lab_no = models.CharField(max_length=30, unique=True, editable=False)
    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='requests')
    patient_name = models.CharField(max_length=200)  # Denormalized from Patient.name
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
    
    def clean(self):
        """Validate status transitions"""
        if self.pk:
            try:
                old_instance = LabRequest.objects.get(pk=self.pk)
                old_status = old_instance.status
                new_status = self.status
                
                if old_status != new_status:
                    allowed_next = self.STATUS_TRANSITIONS.get(old_status, [])
                    if new_status not in allowed_next:
                        raise ValidationError({
                            'status': f'Cannot transition from {old_status} to {new_status}. '
                                     f'Allowed transitions: {allowed_next}'
                        })
            except LabRequest.DoesNotExist:
                pass  # New instance, no validation needed
        
        super().clean()
    
    def save(self, *args, **kwargs):
        """Save the lab request and generate lab_no if needed"""
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
        return f"{self.lab_no} - {self.patient_name}"
