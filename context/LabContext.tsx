import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { LabRequest, Patient, RequestStatus, PaymentDetails, TestResult } from '../types';
import * as api from '../services/api';

interface LabContextType {
  patients: Patient[];
  requests: LabRequest[];
  isLoading: boolean;
  error: string | null;
  addPatient: (patient: Omit<Patient, 'id'> & { id?: string | null }) => Promise<Patient>;
  createRequest: (patientId: string, testIds: string[], payment: PaymentDetails, referredBy: string) => Promise<string>;
  collectSamples: (requestId: string, collectedSampleIds: string[], comments: string) => Promise<void>;
  updateResults: (requestId: string, testId: string, results: TestResult[]) => Promise<void>;
  updateAllResults: (requestId: string, results: Record<string, TestResult[]>) => Promise<void>;
  verifyRequest: (requestId: string, results: Record<string, TestResult[]>) => Promise<void>;
  updateComment: (requestId: string, comment: string, aiInterpretation?: string) => Promise<void>;
  getRequestById: (id: string) => LabRequest | undefined;
  triggerAiInterpretation: (requestId: string) => Promise<void>;
}

const LabContext = createContext<LabContextType | undefined>(undefined);

export const LabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [requests, setRequests] = useState<LabRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [patientsData, requestsData] = await Promise.all([
        api.getPatients(),
        api.getRequests(),
      ]);
      setPatients(patientsData);
      setRequests(requestsData);
    } catch (err) {
      const e = err as Error;
      console.error("Failed to fetch initial data:", e);
      setError(`An unexpected error occurred while loading data: ${e.message}.`);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const updateStateHelper = (updatedRequest: LabRequest) => {
      setRequests(prev => prev.map(req => req.id === updatedRequest.id ? updatedRequest : req));
  };

  const addPatient = async (patientData: Omit<Patient, 'id'> & { id?: string | null }): Promise<Patient> => {
      const savedPatient = await api.addOrUpdatePatient(patientData);
      setPatients(prev => {
          const index = prev.findIndex(p => p.id === savedPatient.id);
          if (index > -1) {
              const newPatients = [...prev];
              newPatients[index] = savedPatient;
              return newPatients;
          }
          return [...prev, savedPatient];
      });
      return savedPatient;
  };
  
  const createRequest = async (patientId: string, testIds: string[], payment: PaymentDetails, referredBy: string): Promise<string> => {
      const newRequest = await api.createRequest(patientId, testIds, payment, referredBy);
      setRequests(prev => [newRequest, ...prev]);
      return newRequest.labNo;
  };

  // FIX: Removed unused `updateRequestStatus` function that was causing a compilation error.
  // Status is updated via more specific actions like `collectSamples` or `verifyRequest`.
  
  const collectSamples = async (requestId: string, collectedSampleIds: string[], comments: string) => {
    const updatedRequest = await api.collectSamples(requestId, collectedSampleIds, comments);
    updateStateHelper(updatedRequest);
  };

  const updateResults = async (requestId: string, testId: string, resultData: TestResult[]) => {
    const updatedRequest = await api.updateResults(requestId, testId, resultData);
    updateStateHelper(updatedRequest);
  };

  const updateAllResults = async (requestId: string, resultData: Record<string, TestResult[]>) => {
    const updatedRequest = await api.updateAllResults(requestId, resultData);
    updateStateHelper(updatedRequest);
  };
  
  const verifyRequest = async (requestId: string, resultData: Record<string, TestResult[]>) => {
    const updatedRequest = await api.verifyAndFinalizeRequest(requestId, resultData);
    updateStateHelper(updatedRequest);
  };

  const updateComment = async (requestId: string, comment: string, aiInterpretation?: string) => {
      // AI part is now handled server-side, this just updates comments.
      const updatedRequest = await api.updateComment(requestId, comment);
      updateStateHelper(updatedRequest);
  }

  const triggerAiInterpretation = async (requestId: string) => {
    const updatedRequest = await api.triggerAiInterpretation(requestId);
    updateStateHelper(updatedRequest);
  };

  const getRequestById = (id: string) => requests.find(r => r.id === id);

  return (
    <LabContext.Provider value={{ 
      patients, 
      requests, 
      isLoading,
      error,
      addPatient, 
      createRequest, 
      collectSamples,
      updateResults,
      updateAllResults,
      verifyRequest,
      updateComment,
      getRequestById,
      triggerAiInterpretation
    }}>
      {error ? <div className="p-8 text-center text-red-600 bg-red-50">{error}</div> : children}
    </LabContext.Provider>
  );
};

export const useLab = () => {
  const context = useContext(LabContext);
  if (!context) throw new Error('useLab must be used within a LabProvider');
  return context;
};