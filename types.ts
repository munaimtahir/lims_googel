export enum RequestStatus {
  REGISTERED = 'REGISTERED',
  COLLECTED = 'COLLECTED',
  ANALYZED = 'ANALYZED',
  VERIFIED = 'VERIFIED'
}

export enum Gender {
  MALE = 'Male',
  FEMALE = 'Female',
  OTHER = 'Other'
}

export interface SampleType {
  id: string;
  name: string;
  tubeColor: string; // Hex color for UI
}

export interface TestParameter {
  id: string;
  name: string;
  unit: string;
  referenceRange: string;
}

export interface LabTest {
  id: string;
  name: string;
  price: number;
  category: string;
  sampleTypeId: string; // Link to SampleType
  parameters: TestParameter[];
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: Gender;
  phone: string;
  email?: string;
}

export interface TestResult {
  parameterId: string;
  value: string;
  flag?: 'H' | 'L' | 'N'; // High, Low, Normal
}

export interface PaymentDetails {
  totalAmount: number;
  discountAmount: number;
  discountPercent: number;
  netPayable: number;
  paidAmount: number;
  balanceDue: number;
}

// Aligned with Django REST Framework API response
export interface LabRequest {
  id: string;
  labNo: string;
  patient: string; // Patient ID (Foreign Key)
  patientName: string; // Denormalized for display
  date: string;
  tests: LabTest[]; // Nested serializer data
  status: RequestStatus;
  results: Record<string, TestResult[]>; // JSONField
  payment: PaymentDetails; // JSONField
  referredBy?: string;
  comments?: string;
  aiInterpretation?: string;
  collectedSamples?: string[]; // JSONField (array of sampleType IDs)
  phlebotomyComments?: string;
}