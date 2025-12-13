import {
  Patient,
  LabRequest,
  RequestStatus,
  PaymentDetails,
  TestResult,
} from '../types';
import { AVAILABLE_TESTS, MOCK_PATIENTS } from '../constants';
// FIX: Import the real AI interpretation service.
import { getAiInterpretation } from './geminiService';

// --- Seed Data Generation ---
const generateSeedData = (): LabRequest[] => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(today.getDate() - 2);

    const fullPayment: PaymentDetails = { totalAmount: 2250, discountAmount: 0, discountPercent: 0, netPayable: 2250, paidAmount: 2250, balanceDue: 0 };
    const partialPayment: PaymentDetails = { totalAmount: 1200, discountAmount: 200, discountPercent: 16.67, netPayable: 1000, paidAmount: 500, balanceDue: 500 };

    const seedRequests: LabRequest[] = [
        // 1. Verified Report for John Doe
        {
            id: 'REQ_SEED_001',
            labNo: '240720-0001',
            patient: 'P001',
            patientName: 'John Doe',
            date: twoDaysAgo.toISOString(),
            tests: [AVAILABLE_TESTS.find(t => t.id === 'cbc')!, AVAILABLE_TESTS.find(t => t.id === 'lipid')!],
            status: RequestStatus.VERIFIED,
            results: {
                'cbc': [
                    { parameterId: 'hb', value: '15.1', flag: 'N' },
                    { parameterId: 'wbc', value: '8.2', flag: 'N' },
                    { parameterId: 'rbc', value: '5.1', flag: 'N' },
                    { parameterId: 'plt', value: '250', flag: 'N' },
                ],
                'lipid': [
                    { parameterId: 'chol', value: '210', flag: 'H' },
                    { parameterId: 'tg', value: '160', flag: 'H' },
                    { parameterId: 'hdl', value: '45', flag: 'N' },
                    { parameterId: 'ldl', value: '135', flag: 'H' },
                ]
            },
            payment: fullPayment,
            referredBy: 'Dr. Emily Carter',
            collectedSamples: ['edta', 'serum'],
            aiInterpretation: 'Slightly elevated cholesterol and triglycerides noted. Suggest clinical correlation with patient history and lifestyle factors. Consider dietary review.',
            comments: 'Patient was non-fasting at the time of collection.',
        },
        // 2. Verified Report for Jane Smith
        {
            id: 'REQ_SEED_002',
            labNo: '240720-0002',
            patient: 'P002',
            patientName: 'Jane Smith',
            date: twoDaysAgo.toISOString(),
            tests: [AVAILABLE_TESTS.find(t => t.id === 'lft')!],
            status: RequestStatus.VERIFIED,
            results: {
                'lft': [
                    { parameterId: 'alt', value: '25', flag: 'N' },
                    { parameterId: 'ast', value: '22', flag: 'N' },
                    { parameterId: 'alp', value: '98', flag: 'N' },
                    { parameterId: 'bili', value: '0.8', flag: 'N' },
                ]
            },
            payment: partialPayment,
            referredBy: 'Dr. Ben Stone',
            collectedSamples: ['serum'],
        },
        // 3. Analyzed (in-progress) for Robert Brown
        {
            id: 'REQ_SEED_003',
            labNo: '240721-0003',
            patient: 'P003',
            patientName: 'Robert Brown',
            date: yesterday.toISOString(),
            tests: [AVAILABLE_TESTS.find(t => t.id === 'cbc')!, AVAILABLE_TESTS.find(t => t.id === 'hba1c')!],
            status: RequestStatus.ANALYZED,
            results: {
                'cbc': [
                    { parameterId: 'hb', value: '16.0', flag: 'N' },
                    { parameterId: 'wbc', value: '7.5', flag: 'N' },
                    { parameterId: 'rbc', value: '5.5', flag: 'N' },
                    { parameterId: 'plt', value: '310', flag: 'N' },
                ],
                'hba1c': [] // Results pending
            },
            payment: fullPayment,
            referredBy: 'Self',
            collectedSamples: ['edta'],
        },
        // 4. Collected (in-progress) for John Doe
        {
            id: 'REQ_SEED_004',
            labNo: '240721-0004',
            patient: 'P001',
            patientName: 'John Doe',
            date: yesterday.toISOString(),
            tests: [AVAILABLE_TESTS.find(t => t.id === 'tsh')!],
            status: RequestStatus.COLLECTED,
            results: {},
            payment: fullPayment,
            referredBy: 'Dr. Emily Carter',
            collectedSamples: ['serum'],
        },
        // 5. Registered (pending collection) for Jane Smith
        {
            id: 'REQ_SEED_005',
            labNo: '240722-0005',
            patient: 'P002',
            patientName: 'Jane Smith',
            date: today.toISOString(),
            tests: [AVAILABLE_TESTS.find(t => t.id === 'vit_d')!],
            status: RequestStatus.REGISTERED,
            results: {},
            payment: partialPayment,
            referredBy: 'Dr. Ben Stone',
        },
        // 6. Registered (pending collection) for Robert Brown
        {
            id: 'REQ_SEED_006',
            labNo: '240722-0006',
            patient: 'P003',
            patientName: 'Robert Brown',
            date: today.toISOString(),
            tests: [AVAILABLE_TESTS.find(t => t.id === 'urine_rm')!, AVAILABLE_TESTS.find(t => t.id === 'electrolytes')!],
            status: RequestStatus.REGISTERED,
            results: {},
            payment: fullPayment,
            referredBy: 'Self',
        }
    ];
    return seedRequests;
};


// --- In-memory database ---
let mockPatients: Patient[] = JSON.parse(JSON.stringify(MOCK_PATIENTS));
let mockRequests: LabRequest[] = generateSeedData();
let patientIdCounter = mockPatients.length;
let labRequestCounter = mockRequests.length; // Start counter after seed data

// --- Utility functions ---
const simulateDelay = (ms: number = 50) => new Promise(res => setTimeout(res, ms));

const generateNewPatientId = () => {
  patientIdCounter++;
  return `P${String(patientIdCounter).padStart(3, '0')}`;
};

const generateNewLabNo = () => {
    labRequestCounter++;
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}${month}${day}-${String(labRequestCounter).padStart(4, '0')}`;
}

// --- Mock API implementation ---

export const getPatients = async (): Promise<Patient[]> => {
  await simulateDelay();
  return JSON.parse(JSON.stringify(mockPatients));
};

export const addOrUpdatePatient = async (patientData: Omit<Patient, 'id'> & { id?: string | null }): Promise<Patient> => {
  await simulateDelay();
  if (patientData.id && !patientData.id.startsWith('P_new_')) {
    const index = mockPatients.findIndex(p => p.id === patientData.id);
    if (index !== -1) {
      mockPatients[index] = { ...mockPatients[index], ...patientData, id: patientData.id };
      return JSON.parse(JSON.stringify(mockPatients[index]));
    }
  }
  const newPatient: Patient = {
    ...patientData,
    id: generateNewPatientId(),
  };
  mockPatients.push(newPatient);
  return JSON.parse(JSON.stringify(newPatient));
};

export const getRequests = async (): Promise<LabRequest[]> => {
  await simulateDelay();
  // Sort by date descending to show newest first
  const sortedRequests = [...mockRequests].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return JSON.parse(JSON.stringify(sortedRequests));
};

export const createRequest = async (patientId: string, testIds: string[], payment: PaymentDetails, referredBy: string): Promise<LabRequest> => {
    await simulateDelay(200);
    const patient = mockPatients.find(p => p.id === patientId);
    if (!patient) throw new Error("Patient not found");

    const tests = testIds.map(id => AVAILABLE_TESTS.find(t => t.id === id)).filter(Boolean) as LabRequest['tests'];

    const newRequest: LabRequest = {
        id: `REQ_${Date.now()}`,
        labNo: generateNewLabNo(),
        patient: patientId,
        patientName: patient.name,
        // FIX: Corrected date creation from `new new Date()` to `new Date()`
        date: new Date().toISOString(),
        tests,
        status: RequestStatus.REGISTERED,
        results: {},
        payment,
        referredBy,
    };
    mockRequests.push(newRequest);
    return JSON.parse(JSON.stringify(newRequest));
};

const findRequest = (requestId: string): [LabRequest | undefined, number] => {
    const index = mockRequests.findIndex(r => r.id === requestId);
    return [mockRequests[index], index];
}

export const updateRequestStatus = async (requestId: string, status: RequestStatus): Promise<LabRequest> => {
    await simulateDelay();
    const [req, index] = findRequest(requestId);
    if (!req) throw new Error("Request not found");
    const updatedRequest = { ...req, status };
    mockRequests[index] = updatedRequest;
    return JSON.parse(JSON.stringify(updatedRequest));
};

export const collectSamples = async (requestId: string, collectedSampleIds: string[], comments: string): Promise<LabRequest> => {
    await simulateDelay();
    const [req, index] = findRequest(requestId);
    if (!req) throw new Error("Request not found");
    const updatedRequest = { ...req, status: RequestStatus.COLLECTED, collectedSamples: collectedSampleIds, phlebotomyComments: comments };
    mockRequests[index] = updatedRequest;
    return JSON.parse(JSON.stringify(updatedRequest));
};

export const updateResults = async (requestId: string, testId: string, results: TestResult[]): Promise<LabRequest> => {
    await simulateDelay();
    const [req, index] = findRequest(requestId);
    if (!req) throw new Error("Request not found");

    const updatedRequest = {
        ...req,
        results: { ...req.results, [testId]: results },
    };
    
    // Atomically update status if this is the first result entry
    if (updatedRequest.status === RequestStatus.COLLECTED) {
        updatedRequest.status = RequestStatus.ANALYZED;
    }

    mockRequests[index] = updatedRequest;
    return JSON.parse(JSON.stringify(updatedRequest));
};

export const updateAllResults = async (requestId: string, allResults: Record<string, TestResult[]>): Promise<LabRequest> => {
    await simulateDelay();
    const [req, index] = findRequest(requestId);
    if (!req) throw new Error("Request not found");
    const updatedRequest = { ...req, results: allResults };
    mockRequests[index] = updatedRequest;
    return JSON.parse(JSON.stringify(updatedRequest));
};

export const verifyAndFinalizeRequest = async (requestId: string, allResults: Record<string, TestResult[]>): Promise<LabRequest> => {
    await simulateDelay(150); // Simulate a slightly longer operation
    const [req, index] = findRequest(requestId);
    if (!req) throw new Error("Request not found");
    
    // Perform both updates in one atomic operation
    const updatedRequest = { 
        ...req, 
        results: allResults, 
        status: RequestStatus.VERIFIED 
    };
    
    mockRequests[index] = updatedRequest;
    return JSON.parse(JSON.stringify(updatedRequest));
};

export const updateComment = async (requestId: string, comment: string): Promise<LabRequest> => {
    await simulateDelay();
    const [req, index] = findRequest(requestId);
    if (!req) throw new Error("Request not found");
    const updatedRequest = { ...req, comments: comment };
    mockRequests[index] = updatedRequest;
    return JSON.parse(JSON.stringify(updatedRequest));
};

// FIX: Replace mock AI implementation with a call to the Gemini service.
export const triggerAiInterpretation = async (requestId: string): Promise<LabRequest> => {
    const [req, index] = findRequest(requestId);
    if (!req) throw new Error("Request not found");

    const patient = mockPatients.find(p => p.id === req.patient);
    if (!patient) throw new Error("Patient not found for this request.");

    if (Object.keys(req.results).length === 0) {
        const interpretation = "Cannot generate interpretation: No results have been entered for this request.";
        const updatedRequest = { ...req, aiInterpretation: interpretation };
        mockRequests[index] = updatedRequest;
        return JSON.parse(JSON.stringify(updatedRequest));
    }

    try {
        const interpretation = await getAiInterpretation(req, patient);
        const updatedRequest = { ...req, aiInterpretation: interpretation };
        mockRequests[index] = updatedRequest;
        return JSON.parse(JSON.stringify(updatedRequest));
    } catch (error) {
        console.error("Failed to get AI interpretation:", error);
        const interpretation = "Error: Failed to connect to the AI service.";
        const updatedRequest = { ...req, aiInterpretation: interpretation };
        mockRequests[index] = updatedRequest;
        return JSON.parse(JSON.stringify(updatedRequest));
    }
};