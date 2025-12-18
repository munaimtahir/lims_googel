from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.core.exceptions import ValidationError
from .models import LabRequest, Patient


@receiver(pre_save, sender=LabRequest)
def populate_patient_name(sender, instance, **kwargs):
    """Auto-populate patient_name from Patient.name if not already set"""
    if instance.patient_id and not instance.patient_name:
        try:
            patient = Patient.objects.get(pk=instance.patient_id)
            instance.patient_name = patient.name
        except Patient.DoesNotExist:
            pass  # Will be handled by FK constraint


@receiver(pre_save, sender=LabRequest)
def validate_and_recalculate_payment(sender, instance, **kwargs):
    """Validate and recalculate payment fields server-side"""
    if instance.payment:
        payment = instance.payment.copy()
        
        total_amount = payment.get('totalAmount', 0)
        discount_amount = payment.get('discountAmount', 0)
        paid_amount = payment.get('paidAmount', 0)
        
        # Calculate net payable
        net_payable = max(0, total_amount - discount_amount)
        payment['netPayable'] = net_payable
        
        # Calculate balance due (clamp to zero)
        balance_due = max(0, net_payable - paid_amount)
        payment['balanceDue'] = balance_due
        
        # Ensure discountPercent is set if not provided
        if 'discountPercent' not in payment:
            if total_amount > 0:
                payment['discountPercent'] = (discount_amount / total_amount) * 100
            else:
                payment['discountPercent'] = 0
        
        instance.payment = payment


@receiver(post_save, sender=Patient)
def update_related_lab_request_names(sender, instance, **kwargs):
    """Update patient_name in all related LabRequests when Patient name changes"""
    LabRequest.objects.filter(patient=instance).update(patient_name=instance.name)


