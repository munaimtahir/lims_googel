import React, { useState, useMemo } from 'react';
import { useLab } from '../context/LabContext';
import { LabRequest, RequestStatus, SampleType } from '../types';
import { SAMPLE_TYPES } from '../constants';
import { Syringe, CheckCircle2, Clock, Beaker, X, AlertTriangle, Search } from 'lucide-react';

const getRequiredSamplesForRequest = (req: LabRequest): SampleType[] => {
    const sampleTypeIds = new Set(req.tests.map(t => t.sampleTypeId));
    return SAMPLE_TYPES.filter(st => sampleTypeIds.has(st.id));
};

export const Phlebotomy: React.FC = () => {
  const { requests, collectSamples } = useLab();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [modalSamples, setModalSamples] = useState<Record<string, boolean>>({});
  const [modalComments, setModalComments] = useState('');

  const pendingRequests = useMemo(() => {
    const pending = requests.filter(r => r.status === RequestStatus.REGISTERED);
    if (!searchQuery) return pending;
    const query = searchQuery.toLowerCase();
    return pending.filter(req => 
      req.patientName.toLowerCase().includes(query) ||
      req.labNo.toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  const collectedRequests = requests.filter(r => r.status !== RequestStatus.REGISTERED);

  const pendingRecollection = useMemo(() => requests.filter(req => {
    if (req.status !== RequestStatus.COLLECTED) return false;
    const requiredSampleIds = new Set(req.tests.map(t => t.sampleTypeId));
    return requiredSampleIds.size > (req.collectedSamples?.length || 0);
  }), [requests]);
  
  const requiredSamplesForModal = useMemo(() => {
    if (!selectedRequest) return [];
    return getRequiredSamplesForRequest(selectedRequest);
  }, [selectedRequest]);

  const hasMissingSamplesInModal = useMemo(() => {
    return Object.values(modalSamples).some(isChecked => !isChecked);
  }, [modalSamples]);

  const openCollectionModal = (req: LabRequest) => {
    setSelectedRequest(req);
    const requiredSamples = getRequiredSamplesForRequest(req);
    const initialCheckedState = requiredSamples.reduce((acc, sample) => {
        acc[sample.id] = true;
        return acc;
    }, {} as Record<string, boolean>);
    setModalSamples(initialCheckedState);
    setModalComments('');
    setIsModalOpen(true);
  };

  const handleConfirmCollection = () => {
    if (!selectedRequest) return;
    if (hasMissingSamplesInModal && !modalComments.trim()) {
        alert("Please provide a reason for the missing sample(s).");
        return;
    }
    const collectedSampleIds = Object.entries(modalSamples)
        .filter(([, isChecked]) => isChecked)
        .map(([id]) => id);
    
    collectSamples(selectedRequest.id, collectedSampleIds, modalComments);
    setIsModalOpen(false);
    setSelectedRequest(null);
  };
  
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <div className="space-y-4 lg:col-span-1">
            <h2 className="text-xl font-semibold text-slate-800 flex items-center space-x-2">
                <Clock className="text-amber-500" />
                <span>Pending Collection</span>
                <span className="bg-amber-100 text-amber-700 text-xs px-2 py-1 rounded-full">{pendingRequests.length}</span>
            </h2>
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
            {pendingRequests.length === 0 ? (
                <div className="p-8 bg-white rounded-xl border border-dashed border-slate-300 text-center text-slate-500">
                    No matching requests found.
                </div>
            ) : (
                <div className="space-y-4 max-h-[calc(100vh-250px)] overflow-y-auto pr-2">
                {pendingRequests.map(req => {
                    const requiredSamples = getRequiredSamplesForRequest(req);
                    return (
                        <div key={req.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-300 transition-colors animate-in fade-in duration-300">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h3 className="font-bold text-slate-800">{req.patientName}</h3>
                                    <p className="text-xs text-slate-500">Lab No: {req.labNo} • {new Date(req.date).toLocaleDateString()}</p>
                                </div>
                                <span className="text-xs font-medium px-2 py-1 bg-amber-100 text-amber-700 rounded">Pending</span>
                            </div>
                            <div className="mb-4">
                                <p className="text-sm font-medium text-slate-600 mb-2">Required Samples:</p>
                                <div className="flex flex-wrap gap-3 items-center">
                                    {requiredSamples.map(sample => (
                                        <div key={sample.id} className="flex items-center gap-1.5" title={sample.name}>
                                            <div className="w-4 h-4 rounded-full" style={{ backgroundColor: sample.tubeColor }}></div>
                                            <span className="text-xs font-medium text-slate-700">{sample.name.split(' ')[0]}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            <button 
                                onClick={() => openCollectionModal(req)}
                                className="w-full flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg transition-colors"
                            >
                                <Syringe size={16} />
                                <span>Collect Sample</span>
                            </button>
                        </div>
                    );
                })}
                </div>
            )}
        </div>

        <div className="space-y-4 lg:col-span-2">
             <div className="space-y-4">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center space-x-2">
                    <AlertTriangle className="text-red-500" />
                    <span>Pending Recollection / Missing Samples</span>
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-1 rounded-full">{pendingRecollection.length}</span>
                </h2>
                 {pendingRecollection.length === 0 ? (
                     <div className="p-8 bg-white rounded-xl border border-dashed border-slate-300 text-center text-slate-500">No missing samples to show.</div>
                 ) : (
                     <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                         <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Patient</th>
                                    <th className="px-4 py-3">Missing Samples</th>
                                    <th className="px-4 py-3">Comment</th>
                                </tr>
                            </thead>
                             <tbody className="divide-y divide-slate-100">
                                {pendingRecollection.map(req => {
                                    const requiredSamples = getRequiredSamplesForRequest(req);
                                    const collectedSampleIds = new Set(req.collectedSamples || []);
                                    const missingSamples = requiredSamples.filter(s => !collectedSampleIds.has(s.id));
                                    return (
                                        <tr key={req.id}>
                                            <td className="px-4 py-3"><div className="font-medium text-slate-800">{req.patientName}</div><div className="text-xs text-slate-500 font-mono">{req.labNo}</div></td>
                                            <td className="px-4 py-3"><div className="flex items-center gap-2">{missingSamples.map(s => <div key={s.id} title={s.name} className="flex items-center gap-1.5 p-1 bg-slate-100 rounded"><div className="w-3 h-3 rounded-full" style={{backgroundColor: s.tubeColor}}></div><span className="text-xs">{s.name}</span></div>)}</div></td>
                                            <td className="px-4 py-3 text-xs text-red-700 italic">{req.phlebotomyComments}</td>
                                        </tr>
                                    )
                                })}
                             </tbody>
                         </table>
                     </div>
                 )}
            </div>

            <div className="space-y-4 pt-4">
                <h2 className="text-xl font-semibold text-slate-800 flex items-center space-x-2">
                    <CheckCircle2 className="text-green-600" />
                    <span>Recently Collected Log</span>
                </h2>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    {collectedRequests.length === 0 ? (
                        <div className="p-8 text-center text-slate-500">No history yet.</div>
                    ) : (
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-medium">
                                <tr>
                                    <th className="px-4 py-3">Patient</th>
                                    <th className="px-4 py-3">Lab No</th>
                                    <th className="px-4 py-3">Collected Samples</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {collectedRequests.slice(0, 5).map(req => {
                                   const collectedSampleInfo = req.collectedSamples?.map(id => SAMPLE_TYPES.find(s => s.id === id)).filter(Boolean) as SampleType[] || [];
                                   return (
                                    <tr key={req.id} className="hover:bg-slate-50">
                                        <td className="px-4 py-3 font-medium text-slate-800">{req.patientName}</td>
                                        <td className="px-4 py-3 text-slate-500 font-mono">{req.labNo}</td>
                                        <td className="px-4 py-3">
                                           <div className="flex gap-2">
                                            {collectedSampleInfo.map(s => <div key={s.id} title={s.name} className="w-4 h-4 rounded-full" style={{backgroundColor: s.tubeColor}} />)}
                                           </div>
                                        </td>
                                    </tr>
                                   );
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
      </div>
      
      {isModalOpen && selectedRequest && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md m-4">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800">Confirm Sample Collection</h3>
                    <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600"><X size={20}/></button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <p className="text-sm text-slate-500">Patient: <span className="font-bold text-slate-700">{selectedRequest.patientName}</span></p>
                        <p className="text-sm text-slate-500">Lab No: <span className="font-mono text-slate-700">{selectedRequest.labNo}</span></p>
                    </div>
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-slate-700 block">Samples Collected (uncheck if missing):</label>
                        {requiredSamplesForModal.map(sample => (
                           <label key={sample.id} className="flex items-center gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                <input 
                                    type="checkbox" 
                                    className="h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                    checked={modalSamples[sample.id] || false}
                                    onChange={(e) => setModalSamples(prev => ({...prev, [sample.id]: e.target.checked}))}
                                />
                                <div className="w-5 h-5 rounded-full" style={{backgroundColor: sample.tubeColor}} />
                                <span className="font-medium text-slate-800">{sample.name}</span>
                           </label>
                        ))}
                    </div>
                    <div>
                         <label htmlFor="comments" className="text-sm font-medium text-slate-700 block mb-1">
                           Comments {hasMissingSamplesInModal && <span className="text-red-500">*</span>}
                         </label>
                         <textarea 
                            id="comments"
                            rows={3}
                            className={`w-full p-2 border rounded-lg text-sm focus:ring-2 outline-none ${hasMissingSamplesInModal ? 'border-red-300 focus:ring-red-500' : 'border-slate-300 focus:ring-blue-500'}`}
                            placeholder={hasMissingSamplesInModal ? "Reason for missing sample is required" : "e.g., Patient was non-fasting..."}
                            value={modalComments}
                            onChange={(e) => setModalComments(e.target.value)}
                            required={hasMissingSamplesInModal}
                        />
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Cancel</button>
                    <button 
                        onClick={handleConfirmCollection} 
                        disabled={hasMissingSamplesInModal && !modalComments.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 shadow-sm flex items-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
                    >
                        <CheckCircle2 size={16}/>
                        Confirm Collection
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};