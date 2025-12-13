import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useLab } from '../context/LabContext';
import { RequestStatus, TestResult, LabRequest } from '../types';
import { Microscope, Save, BrainCircuit, Loader2, Info, Search, Check } from 'lucide-react';

export const Laboratory: React.FC = () => {
  const { requests, updateResults, updateComment, triggerAiInterpretation, verifyRequest } = useLab();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<LabRequest | null>(null);
  const [localResults, setLocalResults] = useState<Record<string, TestResult[]>>({});
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map());
  const paramOrder = useRef<string[]>([]);

  // Effect to populate local state when a request is selected
  useEffect(() => {
    if (selectedRequest) {
      setLocalResults(JSON.parse(JSON.stringify(selectedRequest.results))); // Deep copy
      
      const newParamOrder: string[] = [];
      inputRefs.current.clear();
      selectedRequest.tests.forEach(test => {
        if (selectedRequest.collectedSamples?.includes(test.sampleTypeId)) {
          test.parameters.forEach(param => {
            newParamOrder.push(`${test.id}-${param.id}`);
          });
        }
      });
      paramOrder.current = newParamOrder;
    } else {
      setLocalResults({});
    }
  }, [selectedRequest]);

  // Effect to keep local selectedRequest in sync with master list from context
  useEffect(() => {
    if (selectedRequest) {
      const freshRequest = requests.find(r => r.id === selectedRequest.id);
      
      // If the request's status is no longer pending analysis/review, remove it from this view.
      const isStillPending = freshRequest && (freshRequest.status === RequestStatus.COLLECTED || freshRequest.status === RequestStatus.ANALYZED);

      if (!isStillPending) {
        setSelectedRequest(null);
        return;
      }
      
      if (JSON.stringify(freshRequest) !== JSON.stringify(selectedRequest)) {
        setSelectedRequest(freshRequest);
      }
    }
  }, [requests, selectedRequest]);

  const pendingWork = useMemo(() => {
    const pending = requests.filter(r => 
      r.status === RequestStatus.COLLECTED || r.status === RequestStatus.ANALYZED
    );
    if (!searchQuery) return pending;
    const query = searchQuery.toLowerCase();
    return pending.filter(req => 
      req.patientName.toLowerCase().includes(query) ||
      req.labNo.toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  const handleResultChange = (testId: string, paramId: string, value: string) => {
    const testDef = selectedRequest?.tests.find(t => t.id === testId);
    const paramDef = testDef?.parameters.find(p => p.id === paramId);
    let flag: 'H' | 'L' | 'N' = 'N';

    if (paramDef && value) {
        const numVal = parseFloat(value);
        if (!isNaN(numVal)) {
             const rangeString = paramDef.referenceRange.replace(/,/g, '');
             const parts = rangeString.split('-').map(s => parseFloat(s.trim()));
             if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                 if (numVal < parts[0]) flag = 'L';
                 if (numVal > parts[1]) flag = 'H';
             } else if (rangeString.startsWith('<')) {
                 const max = parseFloat(rangeString.replace('<', '').trim());
                 if (!isNaN(max) && numVal >= max) flag = 'H';
             } else if (rangeString.startsWith('>')) {
                 const min = parseFloat(rangeString.replace('>', '').trim());
                 if (!isNaN(min) && numVal <= min) flag = 'L';
             }
        }
    }

    setLocalResults(prev => {
        const testResults = prev[testId] || [];
        const existingResultIndex = testResults.findIndex(r => r.parameterId === paramId);
        const newResult: TestResult = { parameterId: paramId, value, flag };
        if (existingResultIndex > -1) {
            testResults[existingResultIndex] = newResult;
        } else {
            testResults.push(newResult);
        }
        return { ...prev, [testId]: [...testResults] };
    });
  };

  const handleSaveTest = (testId: string) => {
    if (!selectedRequest) return;
    updateResults(selectedRequest.id, testId, localResults[testId] || []);
    alert(`Results for test ${testId.toUpperCase()} saved. Request is now ready for verification.`);
  };

  const handleAiInterpret = async () => {
    if (!selectedRequest) return;
    setIsAiLoading(true);
    try {
        await triggerAiInterpretation(selectedRequest.id);
    } catch(e) {
        alert("Failed to generate AI Interpretation. Check server logs.");
    } finally {
        setIsAiLoading(false);
    }
  };

  const handleVerifyFromLab = async () => {
    if (!selectedRequest || isVerifying || selectedRequest.status !== RequestStatus.ANALYZED) return;

    let allResultsEntered = true;
    for (const test of selectedRequest.tests) {
        if (!selectedRequest.collectedSamples?.includes(test.sampleTypeId)) continue;
        for (const param of test.parameters) {
            const result = localResults[test.id]?.find(r => r.parameterId === param.id);
            if (!result || result.value.trim() === '') {
                allResultsEntered = false;
                break;
            }
        }
        if (!allResultsEntered) break;
    }

    if (!allResultsEntered) {
        alert("Verification Failed: Please enter and save results for all test parameters before verifying.");
        return;
    }

    const hasCriticals = Object.values(localResults).flat().some(r => r.flag === 'H' || r.flag === 'L');
    const confirmationMessage = hasCriticals 
      ? "This report contains CRITICAL values. Are you sure you want to verify and finalize?"
      : "Verify results? This will lock the report and move it to the final stage.";

    if (window.confirm(confirmationMessage)) {
        setIsVerifying(true);
        try {
            await verifyRequest(selectedRequest.id, localResults);
            alert(`Report for ${selectedRequest.patientName} (Lab No: ${selectedRequest.labNo}) has been verified and finalized.`);
            setSelectedRequest(null);
        } catch (error) {
            console.error("Verification failed:", error);
            alert("An error occurred during verification. Please try again.");
        } finally {
            setIsVerifying(false);
        }
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, currentKey: string) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        const currentIndex = paramOrder.current.indexOf(currentKey);
        if (currentIndex > -1 && currentIndex < paramOrder.current.length - 1) {
            const nextKey = paramOrder.current[currentIndex + 1];
            const nextInput = inputRefs.current.get(nextKey);
            nextInput?.focus();
        }
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
      <div className="w-1/3 bg-white border-r border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-700">Technical Worklist ({pendingWork.length})</h2>
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
            {pendingWork.map(req => (
                <div key={req.id} onClick={() => setSelectedRequest(req)} className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedRequest?.id === req.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}>
                    <div className="flex justify-between mb-1"><span className="font-medium text-slate-800">{req.patientName}</span><span className={`text-xs px-2 py-0.5 rounded-full ${req.status === RequestStatus.ANALYZED ? 'bg-purple-100 text-purple-700' : 'bg-amber-100 text-amber-700'}`}>{req.status}</span></div>
                    <p className="text-xs text-slate-500 mb-2">Lab No: {req.labNo}</p>
                    <div className="flex gap-1 flex-wrap">{req.tests.map(t => (<span key={t.id} className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{t.name}</span>))}</div>
                </div>
            ))}
            {pendingWork.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No requests awaiting analysis or verification.</div>
            )}
        </div>
      </div>
      <div className="flex-1 bg-slate-50 p-8 overflow-y-auto">
        {selectedRequest ? (
            <div className="max-w-3xl mx-auto space-y-6">
                <div className="flex justify-between items-center">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800">{selectedRequest.patientName}</h2>
                        <p className="text-slate-500">Result Entry & Review • Lab No: {selectedRequest.labNo}</p>
                    </div>
                    {selectedRequest.status === RequestStatus.ANALYZED && (
                        <button 
                          onClick={handleVerifyFromLab} 
                          disabled={isVerifying}
                          className="flex items-center space-x-2 px-4 py-2 bg-green-600 rounded-lg hover:bg-green-700 text-white shadow-sm disabled:bg-slate-400 disabled:cursor-wait"
                        >
                          {isVerifying ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                          <span>{isVerifying ? 'Verifying...' : 'Verify & Finalize'}</span>
                        </button>
                    )}
                </div>

                {selectedRequest.tests.map(test => {
                    const isSampleCollected = selectedRequest.collectedSamples?.includes(test.sampleTypeId);
                    return (
                    <div key={test.id} className={`bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden ${!isSampleCollected ? 'opacity-50 bg-slate-100' : ''}`}>
                        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-semibold text-slate-800">{test.name}</h3>
                            {isSampleCollected && <button onClick={() => handleSaveTest(test.id)} className="flex items-center text-xs space-x-1 px-3 py-1 bg-white border border-slate-300 rounded-md hover:bg-slate-50 text-slate-600"><Save size={12} /><span>Save</span></button>}
                        </div>
                        <div className="p-6">
                           {!isSampleCollected ? (
                             <div className="flex items-center justify-center text-sm text-slate-500 gap-2 py-8">
                               <Info size={16} /> Required sample not collected. Result entry disabled.
                             </div>
                           ) : (
                            <table className="w-full">
                                <thead><tr className="text-left text-xs font-semibold text-slate-500 uppercase tracking-wider"><th className="pb-3">Parameter</th><th className="pb-3 w-32">Result</th><th className="pb-3">Unit</th><th className="pb-3">Ref. Range</th><th className="pb-3">Flag</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {test.parameters.map(param => {
                                        const result = localResults[test.id]?.find(r => r.parameterId === param.id);
                                        const key = `${test.id}-${param.id}`;
                                        return (
                                            <tr key={param.id}>
                                                <td className="py-3 text-sm font-medium text-slate-700">{param.name}</td>
                                                <td className="py-3">
                                                  <input 
                                                    ref={(el) => { if (el) inputRefs.current.set(key, el); else inputRefs.current.delete(key); }}
                                                    type="text" 
                                                    value={result?.value || ''} 
                                                    onKeyDown={(e) => handleInputKeyDown(e, key)}
                                                    onChange={(e) => handleResultChange(test.id, param.id, e.target.value)} 
                                                    className="w-full px-3 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm" 
                                                    placeholder="Value"/>
                                                </td>
                                                <td className="py-3 text-sm text-slate-500">{param.unit}</td>
                                                <td className="py-3 text-sm text-slate-500">{param.referenceRange}</td>
                                                <td className="py-3">{result?.flag && result.flag !== 'N' && (<span className={`text-xs font-bold px-2 py-1 rounded ${result.flag === 'H' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>{result.flag}</span>)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                           )}
                        </div>
                    </div>
                )})}

                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold text-slate-800 flex items-center gap-2"><BrainCircuit className="text-purple-600" /><span>AI Clinical Interpretation</span></h3>
                        <button onClick={handleAiInterpret} disabled={isAiLoading} className="text-sm text-purple-600 hover:text-purple-800 font-medium disabled:opacity-50 flex items-center gap-2">{isAiLoading && <Loader2 size={14} className="animate-spin" />}{isAiLoading ? 'Analyzing...' : 'Generate Analysis'}</button>
                    </div>
                    {selectedRequest.aiInterpretation ? (<div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-sm text-slate-700 leading-relaxed">{selectedRequest.aiInterpretation}</div>) : (<div className="text-sm text-slate-400 italic">Save results, then click "Generate Analysis" to get AI-powered insights.</div>)}
                </div>

                 <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <h3 className="font-semibold text-slate-800 mb-3">Lab Comments</h3>
                    <textarea className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none" rows={3} placeholder="Add internal notes or clinical comments..." value={selectedRequest.comments || ''} onChange={(e) => updateComment(selectedRequest.id, e.target.value)}></textarea>
                </div>

            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400"><Microscope size={64} className="mb-4 opacity-50" /><p className="text-lg font-medium">Select a request to begin analysis</p></div>
        )}
      </div>
    </div>
  );
};