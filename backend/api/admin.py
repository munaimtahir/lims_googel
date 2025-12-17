from django.contrib import admin
from .models import Patient, LabTest, LabRequest, SampleType, TestParameter


@admin.register(SampleType)
class SampleTypeAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'tube_color']
    search_fields = ['id', 'name']


class TestParameterInline(admin.TabularInline):
    """Inline admin for TestParameter"""
    model = TestParameter
    extra = 0
    fields = ['id', 'name', 'unit', 'reference_range']


@admin.register(Patient)
class PatientAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'age', 'gender', 'phone', 'created_at']
    list_filter = ['gender', 'created_at']
    search_fields = ['id', 'name', 'phone', 'email']
    readonly_fields = ['id', 'created_at', 'updated_at']


@admin.register(LabTest)
class LabTestAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'category', 'price', 'sample_type']
    list_filter = ['category', 'sample_type']
    search_fields = ['name', 'category']
    inlines = [TestParameterInline]


@admin.register(LabRequest)
class LabRequestAdmin(admin.ModelAdmin):
    list_display = ['id', 'lab_no', 'patient', 'patient_name', 'status', 'date', 'created_at']
    list_filter = ['status', 'created_at']
    search_fields = ['id', 'lab_no', 'patient__name', 'patient_name']
    readonly_fields = ['id', 'lab_no', 'patient_name', 'created_at', 'updated_at']
    filter_horizontal = ['tests']
    
    fieldsets = (
        ('Basic Information', {
            'fields': ('id', 'lab_no', 'patient', 'patient_name', 'status', 'tests')
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
