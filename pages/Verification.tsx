import React, { useState, useMemo, useEffect } from 'react';
import { useLab } from '../context/LabContext';
import { RequestStatus, LabRequest } from '../types';
import { ShieldCheck, BrainCircuit, Check, X, Loader2, Search } from 'lucide-react';

export const Verification: React.FC = () => {
  const { requests, verifyRequest } = useLab();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (selectedRequest) {
      const freshRequest = requests.find(r => r.id === selectedRequest.id);
      if (!freshRequest || freshRequest.status !== RequestStatus.ANALYZED) {
        setSelectedRequest(null);
      }
    }
  }, [requests, selectedRequest]);

  const pendingVerification = useMemo(() => {
    const pending = requests.filter(r => r.status === RequestStatus.ANALYZED);
    if (!searchQuery) return pending;
    const query = searchQuery.toLowerCase();
    return pending.filter(req => 
      req.patientName.toLowerCase().includes(query) ||
      req.labNo.toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  const handleVerifyClick = () => {
    if (!selectedRequest) return;
    setIsModalOpen(true);
  };

  const handleConfirmVerification = async () => {
    if (!selectedRequest) return;
    
    setIsVerifying(true);
    try {
      await verifyRequest(selectedRequest.id, selectedRequest.results);
      alert(`Report for ${selectedRequest.patientName} (Lab No: ${selectedRequest.labNo}) has been verified and finalized.`);
      setSelectedRequest(null);
    } catch (error) {
      console.error("Verification failed:", error);
      alert("An error occurred during verification.");
    } finally {
      setIsVerifying(false);
      setIsModalOpen(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Pending Verification ({pendingVerification.length})</h2>
        </div>
         <div className="p-4">
          <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search Patient or Lab No..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-1 focus:ring-blue-500 outline-none shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
          </div>
        </div>
        <div className="overflow-y-auto">
          {pendingVerification.map(req => (
            <div key={req.id} onClick={() => setSelectedRequest(req)} className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedRequest?.id === req.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-800">{req.patientName}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">{req.status}</span>
              </div>
              <p className="text-xs text-slate-500 mb-2">Lab No: {req.labNo}</p>
              <div className="flex gap-1 flex-wrap">{req.tests.map(t => (<span key={t.id} className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{t.name}</span>))}</div>
            </div>
          ))}
          {pendingVerification.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-sm">No reports awaiting verification.</div>
          )}
        </div>
      </div>

      <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
        {selectedRequest ? (
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">{selectedRequest.patientName}</h2>
                <p className="text-slate-500">Final Review • Lab No: {selectedRequest.labNo}</p>
              </div>
              <button onClick={handleVerifyClick} className="flex items-center space-x-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 text-white shadow-sm">
                <ShieldCheck size={16} />
                <span>Verify Report</span>
              </button>
            </div>

            {selectedRequest.tests.map(test => (
              <div key={test.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="bg-slate-50 px-6 py-3 border-b border-slate-200">
                  <h3 className="font-semibold text-slate-800">{test.name}</h3>
                </div>
                <div className="p-6">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        <th className="pb-3">Parameter</th>
                        <th className="pb-3 w-32">Result</th>
                        <th className="pb-3">Unit</th>
                        <th className="pb-3">Ref. Range</th>
                        <th className="pb-3">Flag</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {test.parameters.map(param => {
                        const result = selectedRequest.results[test.id]?.find(r => r.parameterId === param.id);
                        return (
                          <tr key={param.id}>
                            <td className="py-3 text-sm font-medium text-slate-700">{param.name}</td>
                            <td className="py-3 font-semibold text-slate-900">{result?.value || 'N/A'}</td>
                            <td className="py-3 text-sm text-slate-500">{param.unit}</td>
                            <td className="py-3 text-sm text-slate-500">{param.referenceRange}</td>
                            <td className="py-3">
                              {result?.flag && result.flag !== 'N' && (
                                <span className={`text-xs font-bold px-2 py-1 rounded ${result.flag === 'H' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                  {result.flag}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 flex items-center gap-2 mb-4">
                <BrainCircuit className="text-purple-600" />
                <span>AI Clinical Interpretation</span>
              </h3>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-sm text-slate-700 leading-relaxed">
                {selectedRequest.aiInterpretation || <span className="italic text-slate-500">No AI interpretation was generated for this report.</span>}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="font-semibold text-slate-800 mb-3">Lab Comments</h3>
              <p className="w-full text-sm text-slate-600">
                {selectedRequest.comments || <span className="italic text-slate-500">No comments were added.</span>}
              </p>
            </div>

          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <ShieldCheck size={64} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">Select a report to verify</p>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
            <div className="p-4 border-b border-slate-200">
              <h3 className="font-semibold text-slate-800">Confirm Verification</h3>
            </div>
            <div className="p-6">
              <p className="text-slate-600">
                Are you sure you want to verify and finalize the report for <span className="font-bold">{selectedRequest?.patientName}</span> (Lab No: {selectedRequest?.labNo})?
              </p>
              <p className="text-sm text-slate-500 mt-2">This action cannot be undone and will move the report to the final printing stage.</p>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">
                <X size={16} className="inline mr-1" />Cancel
              </button>
              <button onClick={handleConfirmVerification} disabled={isVerifying} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 shadow-sm flex items-center gap-2 disabled:bg-slate-400">
                {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                {isVerifying ? 'Finalizing...' : 'Confirm & Verify'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};