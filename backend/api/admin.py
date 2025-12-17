from django.contrib import admin
from .models import Patient, LabTest, LabRequest


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'age', 'gender', 'phone', 'created_at']
    list_filter = ['gender', 'created_at']
    search_fields = ['id', 'name', 'phone', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'category', 'price', 'sample_type_id']
    list_filter = ['category', 'sample_type_id']
    search_fields = ['name', 'category']


@admin.register(LabRequest)
class LabRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'lab_no', 'patient', 'status', 'date', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['id', 'lab_no', 'patient__name']
    readonly_fields = ['id', 'lab_no', 'created_at', 'updated_at']
    filter_horizontal = ['tests']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'lab_no', 'patient', 'status', 'tests')
        }),
        ('Payment Details', {
            'fields': ('payment',)
        }),
        ('Sample Collection', {
            'fields': ('collected_samples', 'phlebotomy_comments')
        }),
        ('Results', {
            'fields': ('results', 'comments', 'ai_interpretation')
        }),
        ('Metadata', {
            'fields': ('referred_by', 'created_at', 'updated_at')
        }),
    )
