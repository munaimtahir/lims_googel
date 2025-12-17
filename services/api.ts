import { Patient, LabRequest, RequestStatus, PaymentDetails, TestResult } from '../types';

// Use environment variable for API URL, fallback to VPS IP in production or localhost for dev
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     (import.meta.env.PROD ? 'http://139.162.9.224/api' : 'http://localhost:8000/api');

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: response.statusText }));
    throw new Error(errorData.detail || 'An unknown API error occurred');
  }
  // For 204 No Content, return a success indicator
  if (response.status === 204) {
      return { success: true };
  }
  return response.json();
};

export const getPatients = async (): Promise<Patient[]> => {
  const response = await fetch(`${API_BASE_URL}/patients/`);
  return handleResponse(response);
};

export const addOrUpdatePatient = async (patientData: Omit<Patient, 'id'> & { id?: string | null }): Promise<Patient> => {
  const isUpdate = !!patientData.id;
  const url = isUpdate ? `${API_BASE_URL}/patients/${patientData.id}/` : `${API_BASE_URL}/patients/`;
  const method = isUpdate ? 'PUT' : 'POST';
  
  const response = await fetch(url, {
    method: method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  return handleResponse(response);
};

export const getRequests = async (): Promise<LabRequest[]> => {
  const response = await fetch(`${API_BASE_URL}/requests/`);
  return handleResponse(response);
};

export const createRequest = async (patientId: string, testIds: string[], payment: PaymentDetails, referredBy: string): Promise<LabRequest> => {
  const response = await fetch(`${API_BASE_URL}/requests/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient: patientId, test_ids: testIds, payment, referred_by: referredBy }),
  });
  return handleResponse(response);
};

export const collectSamples = async (requestId: string, collectedSampleIds: string[], comments: string): Promise<LabRequest> => {
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/collect/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collected_samples: collectedSampleIds, phlebotomy_comments: comments }),
  });
  return handleResponse(response);
};

export const updateResults = async (requestId: string, testId: string, results: TestResult[]): Promise<LabRequest> => {
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/update_results/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ test_id: testId, results }),
  });
  return handleResponse(response);
};

export const updateAllResults = async (requestId: string, allResults: Record<string, TestResult[]>): Promise<LabRequest> => {
    const response = await fetch(`${API_BASE_URL}/requests/${requestId}/update_all_results/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results: allResults }),
    });
    return handleResponse(response);
};

export const verifyAndFinalizeRequest = async (requestId: string, allResults: Record<string, TestResult[]>): Promise<LabRequest> => {
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/verify/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ results: allResults }),
  });
  return handleResponse(response);
};

export const updateComment = async (requestId: string, comment: string): Promise<LabRequest> => {
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/update_comment/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comments: comment }),
  });
  return handleResponse(response);
};

export const triggerAiInterpretation = async (requestId: string): Promise<LabRequest> => {
  const response = await fetch(`${API_BASE_URL}/requests/${requestId}/interpret/`, {
    method: 'POST',
  });
  return handleResponse(response);
};
