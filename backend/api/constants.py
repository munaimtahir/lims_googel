# Lab test definitions and mock data

AVAILABLE_TESTS = [
    {
        'id': 'cbc',
        'name': 'Complete Blood Count (CBC)',
        'category': 'Hematology',
        'price': 750,
        'sampleTypeId': 'edta',
        'parameters': [
            {'id': 'hb', 'name': 'Hemoglobin', 'unit': 'g/dL', 'referenceRange': '13.5 - 17.5'},
            {'id': 'wbc', 'name': 'WBC Count', 'unit': 'x10^9/L', 'referenceRange': '4.5 - 11.0'},
            {'id': 'rbc', 'name': 'RBC Count', 'unit': 'x10^12/L', 'referenceRange': '4.5 - 5.9'},
            {'id': 'plt', 'name': 'Platelets', 'unit': 'x10^9/L', 'referenceRange': '150 - 450'},
        ]
    },
    {
        'id': 'lipid',
        'name': 'Lipid Profile',
        'category': 'Biochemistry',
        'price': 1500,
        'sampleTypeId': 'serum',
        'parameters': [
            {'id': 'chol', 'name': 'Total Cholesterol', 'unit': 'mg/dL', 'referenceRange': '< 200'},
            {'id': 'tg', 'name': 'Triglycerides', 'unit': 'mg/dL', 'referenceRange': '< 150'},
            {'id': 'hdl', 'name': 'HDL Cholesterol', 'unit': 'mg/dL', 'referenceRange': '> 40'},
            {'id': 'ldl', 'name': 'LDL Cholesterol', 'unit': 'mg/dL', 'referenceRange': '< 100'},
        ]
    },
    {
        'id': 'lft',
        'name': 'Liver Function Test',
        'category': 'Biochemistry',
        'price': 1200,
        'sampleTypeId': 'serum',
        'parameters': [
            {'id': 'alt', 'name': 'ALT (SGPT)', 'unit': 'U/L', 'referenceRange': '7 - 56'},
            {'id': 'ast', 'name': 'AST (SGOT)', 'unit': 'U/L', 'referenceRange': '10 - 40'},
            {'id': 'alp', 'name': 'Alkaline Phosphatase', 'unit': 'U/L', 'referenceRange': '44 - 147'},
            {'id': 'bili', 'name': 'Total Bilirubin', 'unit': 'mg/dL', 'referenceRange': '0.1 - 1.2'},
        ]
    },
    {
        'id': 'tsh',
        'name': 'Thyroid Stimulating Hormone',
        'category': 'Hormones',
        'price': 900,
        'sampleTypeId': 'serum',
        'parameters': [
            {'id': 'tsh_val', 'name': 'TSH', 'unit': 'mIU/L', 'referenceRange': '0.4 - 4.0'},
        ]
    },
    {
        'id': 'hba1c',
        'name': 'HbA1c Glycated Hemoglobin',
        'category': 'Biochemistry',
        'price': 1100,
        'sampleTypeId': 'edta',
        'parameters': [
            {'id': 'hba1c_val', 'name': 'HbA1c Level', 'unit': '%', 'referenceRange': '< 5.7'}
        ]
    },
    {
        'id': 'urine_rm',
        'name': 'Urine R/M',
        'category': 'Clinical Pathology',
        'price': 400,
        'sampleTypeId': 'urine',
        'parameters': [
            {'id': 'color', 'name': 'Color', 'unit': '', 'referenceRange': 'Pale Yellow'},
            {'id': 'ph', 'name': 'pH', 'unit': '', 'referenceRange': '4.5 - 8.0'},
            {'id': 'protein', 'name': 'Protein', 'unit': '', 'referenceRange': 'Negative'}
        ]
    },
    {
        'id': 'electrolytes',
        'name': 'Serum Electrolytes',
        'category': 'Biochemistry',
        'price': 1000,
        'sampleTypeId': 'serum',
        'parameters': [
            {'id': 'na', 'name': 'Sodium (Na+)', 'unit': 'mEq/L', 'referenceRange': '135 - 145'},
            {'id': 'k', 'name': 'Potassium (K+)', 'unit': 'mEq/L', 'referenceRange': '3.5 - 5.1'},
            {'id': 'cl', 'name': 'Chloride (Cl-)', 'unit': 'mEq/L', 'referenceRange': '96 - 106'}
        ]
    },
    {
        'id': 'vit_d',
        'name': '25-OH Vitamin D',
        'category': 'Special Chemistry',
        'price': 3500,
        'sampleTypeId': 'serum',
        'parameters': [
            {'id': 'vit_d_val', 'name': 'Vitamin D Total', 'unit': 'ng/mL', 'referenceRange': '30 - 100'}
        ]
    },
    {
        'id': 'vit_b12',
        'name': 'Vitamin B12',
        'category': 'Special Chemistry',
        'price': 2800,
        'sampleTypeId': 'serum',
        'parameters': [
            {'id': 'b12_val', 'name': 'Vitamin B12', 'unit': 'pg/mL', 'referenceRange': '200 - 900'}
        ]
    }
]

MOCK_PATIENTS = [
    {'id': 'P001', 'name': 'John Doe', 'age': 34, 'gender': 'Male', 'phone': '0300-1234567'},
    {'id': 'P002', 'name': 'Jane Smith', 'age': 29, 'gender': 'Female', 'phone': '0333-9876543'},
    {'id': 'P003', 'name': 'Robert Brown', 'age': 55, 'gender': 'Male', 'phone': '0345-1122334'},
]
