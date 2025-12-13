import React, { useState, useMemo } from 'react';
import { useLab } from '../context/LabContext';
import { RequestStatus } from '../types';
import { FileText, Printer, CheckCircle, Search } from 'lucide-react';

export const Reports: React.FC = () => {
  const { requests } = useLab();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);

  const verifiedRequests = useMemo(() => {
    const verified = requests.filter(r => r.status === RequestStatus.VERIFIED);
    if (!searchQuery) return verified;
    const query = searchQuery.toLowerCase();
    return verified.filter(req => 
      req.patientName.toLowerCase().includes(query) ||
      req.labNo.toLowerCase().includes(query)
    );
  }, [requests, searchQuery]);

  const selectedReport = requests.find(r => r.id === selectedReportId);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex h-[calc(100vh-64px)] overflow-hidden">
       {/* Sidebar List */}
       <div className="w-80 bg-white border-r border-slate-200 flex flex-col no-print">
        <div className="p-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-700">Verified Reports ({verifiedRequests.length})</h2>
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
        {verifiedRequests.length === 0 ? (
             <div className="p-8 text-center text-slate-400 text-sm">No matching reports found.</div>
        ) : (
            verifiedRequests.map(req => (
                <div 
                    key={req.id} 
                    onClick={() => setSelectedReportId(req.id)}
                    className={`p-4 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${selectedReportId === req.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                >
                    <div className="flex justify-between items-center mb-1">
                        <span className="font-medium text-slate-800">{req.patientName}</span>
                        <CheckCircle size={14} className="text-green-500" />
                    </div>
                    <p className="text-xs text-slate-500">{new Date(req.date).toLocaleDateString()} • {req.labNo}</p>
                </div>
            ))
        )}
        </div>
      </div>

      {/* Report Preview Area */}
      <div className="flex-1 bg-slate-100 p-8 overflow-y-auto">
        {selectedReport ? (
            <div className="max-w-4xl mx-auto">
                <div className="mb-4 flex justify-end no-print">
                    <button onClick={handlePrint} className="bg-slate-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 shadow-lg">
                        <Printer size={18} />
                        <span>Print Report</span>
                    </button>
                </div>
                
                {/* A4 Paper Simulation */}
                <div className="bg-white shadow-xl p-12 min-h-[1000px] print:shadow-none print:p-0 print:w-full">
                    
                    {/* Header */}
                    <div className="border-b-2 border-slate-800 pb-6 mb-8 flex justify-between items-end">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">MEDI LAB PRO</h1>
                            <p className="text-slate-500 text-sm mt-1">123 Health Avenue, Medical District, NY</p>
                            <p className="text-slate-500 text-sm">Phone: (555) 123-4567 • Email: lab@medilabpro.com</p>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-semibold text-slate-800">LABORATORY REPORT</p>
                            <p className="text-xs text-slate-500 mt-1">Generated: {new Date().toLocaleString()}</p>
                        </div>
                    </div>

                    {/* Patient Info */}
                    <div className="grid grid-cols-2 gap-8 mb-8 bg-slate-50 p-6 rounded-lg print:bg-transparent print:p-0 print:mb-6">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Patient Name</p>
                            <p className="font-semibold text-slate-800 text-lg">{selectedReport.patientName}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Lab No</p>
                            <p className="font-semibold text-slate-800">{selectedReport.labNo}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Date Collected</p>
                            <p className="font-medium text-slate-700">{new Date(selectedReport.date).toLocaleDateString()}</p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Referred By</p>
                            <p className="font-medium text-slate-700">{selectedReport.referredBy || 'Self'}</p>
                        </div>
                    </div>

                    {/* Results Table */}
                    <div className="space-y-8">
                        {selectedReport.tests.map(test => (
                            <div key={test.id}>
                                <h3 className="font-bold text-slate-800 border-b border-slate-300 pb-2 mb-4">{test.name}</h3>
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="text-left text-slate-500 border-b border-slate-200">
                                            <th className="pb-2 font-medium w-1/3">Investigation</th>
                                            <th className="pb-2 font-medium w-1/4">Result</th>
                                            <th className="pb-2 font-medium w-1/6">Unit</th>
                                            <th className="pb-2 font-medium w-1/4">Ref. Range</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {test.parameters.map(param => {
                                            const result = selectedReport.results[test.id]?.find(r => r.parameterId === param.id);
                                            return (
                                                <tr key={param.id}>
                                                    <td className="py-2.5">{param.name}</td>
                                                    <td className="py-2.5 font-semibold">
                                                        {result?.value} 
                                                        {result?.flag && result.flag !== 'N' && (
                                                            <span className="ml-2 text-xs font-bold text-red-600">({result.flag})</span>
                                                        )}
                                                    </td>
                                                    <td className="py-2.5 text-slate-500">{param.unit}</td>
                                                    <td className="py-2.5 text-slate-500">{param.referenceRange}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ))}
                    </div>

                    {/* Interpretation */}
                    {(selectedReport.aiInterpretation || selectedReport.comments) && (
                        <div className="mt-12 p-6 border border-slate-200 rounded-lg print:border-slate-300">
                            <h4 className="font-bold text-slate-800 text-sm uppercase tracking-wide mb-3">Pathologist Comments</h4>
                            {selectedReport.aiInterpretation && (
                                <div className="mb-4">
                                    <p className="text-xs text-slate-500 mb-1">AI Analysis:</p>
                                    <p className="text-sm text-slate-700 italic">{selectedReport.aiInterpretation}</p>
                                </div>
                            )}
                            {selectedReport.comments && (
                                <div>
                                    <p className="text-xs text-slate-500 mb-1">Notes:</p>
                                    <p className="text-sm text-slate-700">{selectedReport.comments}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Signature */}
                    <div className="mt-20 pt-8 border-t border-slate-200 flex justify-between items-end print:mt-12">
                        <div className="text-xs text-slate-400">
                            <p>This is a computer generated report.</p>
                            <p>Approved for release.</p>
                        </div>
                        <div className="text-center">
                             <div className="h-12 mb-2 w-32 mx-auto border-b border-slate-800">
                                {/* Signature placeholder */}
                                <span style={{ fontFamily: '"Brush Script MT", cursive' }} className="text-2xl text-blue-900 opacity-70">Dr. A. Doe</span>
                             </div>
                             <p className="font-bold text-slate-800 text-sm">Dr. A. Doe, MD</p>
                             <p className="text-xs text-slate-500">Chief Pathologist</p>
                        </div>
                    </div>

                </div>
            </div>
        ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 no-print">
                <FileText size={64} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a verified report to preview</p>
            </div>
        )}
      </div>
    </div>
  );
};