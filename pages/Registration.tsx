import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useLab } from '../context/LabContext';
import { AVAILABLE_TESTS } from '../constants';
import { Gender, Patient, PaymentDetails } from '../types';
import { Search, UserPlus, Stethoscope, ChevronRight, FlaskConical, Banknote, X, Check, Printer, Loader2 } from 'lucide-react';

export const Registration: React.FC = () => {
  const { patients, requests, addPatient, createRequest } = useLab();
  
  // Refs for keyboard navigation
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const ageRef = useRef<HTMLInputElement>(null);
  const genderRef = useRef<HTMLSelectElement>(null);
  const referredByRef = useRef<HTMLInputElement>(null);
  const testSearchRef = useRef<HTMLInputElement>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mainSearchQuery, setMainSearchQuery] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '', age: '', gender: Gender.MALE, phone: '', email: '', referredBy: ''
  });
  const [selectedTests, setSelectedTests] = useState<string[]>([]);
  const [testSearchQuery, setTestSearchQuery] = useState('');
  const [discountAmount, setDiscountAmount] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<string>('');
  const [paidAmount, setPaidAmount] = useState<string>('');
  const [lastOrderDetails, setLastOrderDetails] = useState<any | null>(null);

  const searchResults = useMemo(() => {
    if (!mainSearchQuery || mainSearchQuery.length < 2) return [];
    const query = mainSearchQuery.toLowerCase();
    return patients.filter(p => 
      p.name.toLowerCase().includes(query) || 
      p.phone.includes(query) ||
      p.id.toLowerCase().includes(query)
    );
  }, [mainSearchQuery, patients]);

  const handlePatientSelect = (patient: Patient) => {
    setSelectedPatientId(patient.id);
    setFormData({
        name: patient.name, age: patient.age.toString(), gender: patient.gender,
        phone: patient.phone, email: patient.email || '', referredBy: '' 
    });
    setMainSearchQuery('');
    setShowSearchResults(false);
  };

  const handleClearPatient = () => {
    setSelectedPatientId(null);
    setFormData({ name: '', age: '', gender: Gender.MALE, phone: '', email: '', referredBy: '' });
    setLastOrderDetails(null);
    setSelectedTests([]);
    setDiscountAmount('');
    setDiscountPercent('');
    setPaidAmount('');
  };

  const totalCost = useMemo(() => selectedTests.reduce((sum, id) => {
    const test = AVAILABLE_TESTS.find(t => t.id === id);
    return sum + (test ? test.price : 0);
  }, 0), [selectedTests]);

  const { netPayable, balanceDue, calculatedDiscountAmount, calculatedDiscountPercent } = useMemo(() => {
    const dAmount = parseFloat(discountAmount) || 0;
    const net = Math.max(0, totalCost - dAmount);
    const paid = parseFloat(paidAmount) || 0;
    const due = Math.max(0, net - paid);
    return { netPayable: net, balanceDue: due, calculatedDiscountAmount: dAmount, calculatedDiscountPercent: parseFloat(discountPercent) || 0 };
  }, [totalCost, discountAmount, discountPercent, paidAmount]);

  useEffect(() => {
    if (netPayable >= 0) setPaidAmount(netPayable.toString());
  }, [netPayable]);

  const handleDiscountAmountChange = (val: string) => {
    setDiscountAmount(val);
    const amount = parseFloat(val);
    if (!isNaN(amount) && totalCost > 0) {
      setDiscountPercent(((amount / totalCost) * 100).toFixed(1));
    } else setDiscountPercent('');
  };

  const handleDiscountPercentChange = (val: string) => {
    setDiscountPercent(val);
    const percent = parseFloat(val);
    if (!isNaN(percent) && totalCost > 0) {
      setDiscountAmount(Math.round((totalCost * percent) / 100).toString());
    } else setDiscountAmount('');
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); // Remove all non-digit characters
    let formatted = '';
    if (input.length > 0) {
        formatted = input.substring(0, 4);
    }
    if (input.length > 4) {
        formatted += '-' + input.substring(4, 11);
    }
    setFormData({...formData, phone: formatted });
  };


  const handleTestToggle = (testId: string) => {
    setSelectedTests(prev => prev.includes(testId) ? prev.filter(id => id !== testId) : [...prev, testId]);
    setTestSearchQuery(''); 
    testSearchRef.current?.focus(); 
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedTests.length === 0 || isSubmitting) return;

    const phoneRegex = /^03\d{2}-\d{7}$/;
    if (!phoneRegex.test(formData.phone)) {
      alert("Invalid Phone Number. Use format: 03xx-xxxxxxx");
      return;
    }
    
    setIsSubmitting(true);
    try {
      const patientData = {
        id: selectedPatientId, // Can be null for new patients
        name: formData.name, age: parseInt(formData.age), gender: formData.gender,
        phone: formData.phone, email: formData.email
      };
      
      const savedPatient = await addPatient(patientData);

      const paymentDetails: PaymentDetails = {
        totalAmount: totalCost, discountAmount: calculatedDiscountAmount,
        discountPercent: calculatedDiscountPercent, netPayable: netPayable,
        paidAmount: parseFloat(paidAmount) || 0, balanceDue: balanceDue
      };

      const labNo = await createRequest(savedPatient.id, selectedTests, paymentDetails, formData.referredBy);
      
      setLastOrderDetails({
        labNo, patient: savedPatient, date: new Date().toISOString(),
        tests: selectedTests.map(id => AVAILABLE_TESTS.find(t => t.id === id)!),
        payment: paymentDetails, referredBy: formData.referredBy || 'Self'
      });

    } catch (error) {
      const err = error as Error;
      alert(`Registration failed: ${err.message}`);
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTests = useMemo(() => {
    if (!testSearchQuery) return [];
    return AVAILABLE_TESTS.filter(t => 
      t.name.toLowerCase().includes(testSearchQuery.toLowerCase()) ||
      t.id.toLowerCase().includes(testSearchQuery.toLowerCase())
    );
  }, [testSearchQuery]);

  const frequentTests = useMemo(() => {
    const counts: Record<string, number> = {};
    requests.forEach(req => req.tests.forEach(t => { counts[t.id] = (counts[t.id] || 0) + 1; }));
    return [...AVAILABLE_TESTS].sort((a, b) => (counts[b.id] || 0) - (counts[a.id] || 0)).slice(0, 8);
  }, [requests]);

  const handleTestSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && filteredTests.length > 0) {
      e.preventDefault();
      handleTestToggle(filteredTests[0].id);
    }
  };

  const handlePrintReceipt = () => window.print();

  const handleFormKeyDown = (e: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>, nextFieldRef: React.RefObject<HTMLElement>) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        nextFieldRef.current?.focus();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-slate-50 relative">
      <div className={`flex-1 p-8 space-y-6 overflow-y-auto ${lastOrderDetails ? 'hidden print:hidden' : ''}`}>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><UserPlus className="text-blue-600" />Patient Registration</h2>
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input type="text" placeholder="Search Name, Phone, or ID" className="w-full pl-10 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm" value={mainSearchQuery} onChange={(e) => { setMainSearchQuery(e.target.value); setShowSearchResults(true); }} onFocus={() => setShowSearchResults(true)} />
                    {mainSearchQuery && <button onClick={() => setMainSearchQuery('')} className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"><X size={16} /></button>}
                    {showSearchResults && searchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                            {searchResults.map(p => (
                                <div key={p.id} onClick={() => handlePatientSelect(p)} className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-none flex justify-between items-center">
                                    <div><div className="font-semibold text-slate-800">{p.name}</div><div className="text-xs text-slate-500">{p.phone} • {p.gender}, {p.age}y</div></div>
                                    <div className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-600">{p.id}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <form id="reg-form" onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
                <div className="md:col-span-1"><label className="block text-xs font-bold text-slate-500 uppercase mb-1">Registration ID</label><input type="text" disabled className="w-full px-3 py-2 bg-slate-100 border border-slate-300 rounded-lg text-slate-500 font-mono text-center" value={selectedPatientId || 'New Patient'} /></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Full Name <span className="text-red-500">*</span></label><input ref={nameRef} onKeyDown={(e) => handleFormKeyDown(e, phoneRef)} required type="text" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Enter patient name" /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Phone <span className="text-red-500">*</span></label><input ref={phoneRef} onKeyDown={(e) => handleFormKeyDown(e, ageRef)} required type="tel" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phone} onChange={handlePhoneChange} placeholder="03xx-xxxxxxx" /><p className="text-[10px] text-slate-400 mt-0.5">Format: 0300-1234567</p></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Age <span className="text-red-500">*</span></label><input ref={ageRef} onKeyDown={(e) => handleFormKeyDown(e, genderRef)} required type="number" className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.age} onChange={e => setFormData({...formData, age: e.target.value})} /></div>
                <div><label className="block text-sm font-medium text-slate-700 mb-1">Gender <span className="text-red-500">*</span></label><select ref={genderRef} onKeyDown={(e) => handleFormKeyDown(e, referredByRef)} className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.gender} onChange={(e) => setFormData({...formData, gender: e.target.value as Gender})}>{Object.values(Gender).map(g => <option key={g} value={g}>{g}</option>)}</select></div>
                <div className="md:col-span-2"><label className="block text-sm font-medium text-slate-700 mb-1">Referred By</label><div className="relative"><Stethoscope className="absolute left-3 top-2.5 text-slate-400" size={16} /><input ref={referredByRef} onKeyDown={(e) => handleFormKeyDown(e, testSearchRef)} type="text" className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" value={formData.referredBy} onChange={e => setFormData({...formData, referredBy: e.target.value})} placeholder="Doctor Name (Optional)" /></div></div>
            </form>
            {selectedPatientId && <div className="mt-4 flex justify-end"><button onClick={handleClearPatient} className="text-sm text-red-500 hover:text-red-700 font-medium">Clear Selection</button></div>}
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-2 mb-4"><FlaskConical className="text-purple-600" /><h2 className="text-lg font-bold text-slate-800">Select Investigations</h2></div>
            <div className="relative mb-6"><Search className="absolute left-4 top-3.5 text-slate-400" size={20} /><input ref={testSearchRef} type="text" placeholder="Search Tests... Press Enter to add" className="w-full pl-12 pr-4 py-3 text-lg border border-slate-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none shadow-sm" value={testSearchQuery} onChange={(e) => setTestSearchQuery(e.target.value)} onKeyDown={handleTestSearchKeyDown} />
                 {testSearchQuery && filteredTests.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                        {filteredTests.map((test, idx) => (<div key={test.id} onClick={() => handleTestToggle(test.id)} className={`flex items-center justify-between p-3 cursor-pointer transition-colors border-b border-slate-50 last:border-none ${idx === 0 ? 'bg-purple-50' : 'hover:bg-slate-50'}`}><div><span className="font-semibold text-slate-800">{test.name}</span>{idx === 0 && <span className="ml-2 text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded">Hit Enter</span>}</div><div className="flex items-center gap-3"><span className="text-sm font-medium text-slate-600">PKR {test.price}</span>{selectedTests.includes(test.id) && <Check size={16} className="text-green-600" />}</div></div>))}
                    </div>
                 )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Frequently Ordered</h3><div className="grid grid-cols-2 sm:grid-cols-3 gap-3">{frequentTests.map(test => { const isSelected = selectedTests.includes(test.id); return (<button key={test.id} type="button" onClick={() => handleTestToggle(test.id)} className={`p-3 rounded-lg border text-left transition-all relative overflow-hidden group ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-sm text-slate-700'}`}><div className="font-semibold text-sm leading-tight mb-1">{test.name}</div><div className={`text-xs ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>PKR {test.price}</div>{isSelected && <div className="absolute top-1 right-1 opacity-20"><Check size={32}/></div>}</button>); })}</div></div>
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col h-full"><h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3 flex justify-between"><span>Selected Tests</span><span className="bg-blue-100 text-blue-700 px-2 rounded-full">{selectedTests.length}</span></h3>{selectedTests.length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center text-slate-400 italic text-sm py-8"><FlaskConical size={32} className="mb-2 opacity-30" />No tests selected</div>) : (<div className="space-y-2 flex-1 overflow-y-auto max-h-[300px]">{selectedTests.map(testId => { const test = AVAILABLE_TESTS.find(t => t.id === testId); if(!test) return null; return (<div key={testId} className="flex justify-between items-center bg-white p-3 rounded-lg border border-slate-200 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300"><div className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div><span className="font-medium text-slate-700 text-sm">{test.name}</span></div><div className="flex items-center gap-3"><span className="text-sm font-semibold text-slate-900">{test.price}</span><button onClick={() => handleTestToggle(testId)} className="text-slate-400 hover:text-red-500 p-1"><X size={16} /></button></div></div>);})}</div>)}</div>
            </div>
        </div>
      </div>
      <div className={`w-full lg:w-80 bg-white border-l border-slate-200 shadow-xl flex flex-col h-auto lg:h-screen sticky top-0 ${lastOrderDetails ? 'hidden print:hidden' : ''}`}>
        <div className="p-6 bg-slate-900 text-white"><h2 className="text-lg font-bold flex items-center gap-2"><Banknote size={20} className="text-green-400" />Payment Summary</h2></div>
        <div className="p-6 flex-1 flex flex-col space-y-6 overflow-y-auto">
            <div className="space-y-4"><div className="flex justify-between items-center pb-4 border-b border-slate-100"><span className="text-slate-500 font-medium">Total Charges</span><span className="text-xl font-bold text-slate-800">{totalCost}</span></div><div className="grid grid-cols-2 gap-3"><div><label className="text-[10px] uppercase font-bold text-slate-400">Discount (PKR)</label><input type="number" min="0" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="0" value={discountAmount} onChange={(e) => handleDiscountAmountChange(e.target.value)} /></div><div><label className="text-[10px] uppercase font-bold text-slate-400">Discount (%)</label><input type="number" min="0" max="100" className="w-full p-2 border border-slate-300 rounded text-sm focus:ring-1 focus:ring-blue-500 outline-none" placeholder="0%" value={discountPercent} onChange={(e) => handleDiscountPercentChange(e.target.value)} /></div></div><div className="bg-blue-50 p-4 rounded-lg flex justify-between items-center border border-blue-100"><span className="text-sm font-bold text-blue-800 uppercase">Net Payable</span><span className="text-xl font-bold text-blue-900">{Math.round(netPayable)}</span></div></div>
            <div className="space-y-2"><label className="text-xs uppercase font-bold text-slate-500">Amount Received</label><div className="relative"><span className="absolute left-3 top-2.5 text-slate-400 font-bold">PKR</span><input type="number" className="w-full pl-12 pr-4 py-3 border-2 border-green-400 rounded-lg text-lg font-bold text-slate-800 focus:ring-2 focus:ring-green-200 outline-none" placeholder="0" value={paidAmount} onChange={(e) => setPaidAmount(e.target.value)} /></div></div>
            <div className={`mt-auto p-4 rounded-lg border-2 text-center transition-colors ${balanceDue > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}><div className={`text-xs font-bold uppercase ${balanceDue > 0 ? 'text-red-500' : 'text-green-600'}`}>{balanceDue > 0 ? 'Balance Due' : 'Fully Paid'}</div><div className={`text-2xl font-bold ${balanceDue > 0 ? 'text-red-700' : 'text-green-700'}`}>{Math.round(balanceDue)}</div></div>
        </div>
        <div className="p-6 border-t border-slate-200 bg-slate-50"><button onClick={handleRegister} disabled={selectedTests.length === 0 || isSubmitting} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2">{isSubmitting ? <><Loader2 size={20} className="animate-spin" /><span>Processing...</span></> : <><span>Generate Order</span><ChevronRight size={20} /></>}</button></div>
      </div>
      {lastOrderDetails && (<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm print:bg-white print:static print:block"><div className="bg-white w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] print:shadow-none print:w-full print:max-w-none print:max-h-none"><div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 print:hidden"><h3 className="font-bold text-lg text-slate-800 flex items-center gap-2"><Check className="text-green-600" />Order Generated</h3><button onClick={handleClearPatient} className="text-slate-400 hover:text-slate-600"><X size={20} /></button></div><div className="flex-1 p-8 overflow-y-auto print:p-0"><div className="text-center mb-6 border-b-2 border-slate-800 pb-4"><h1 className="text-2xl font-bold text-slate-900 tracking-tight">MEDI LAB PRO</h1><p className="text-xs text-slate-500 mt-1">123 Health Avenue, Medical District</p><p className="text-xs text-slate-500">Receipt / Patient Copy</p></div><div className="flex justify-between items-center mb-6"><div className="text-left"><p className="text-xs text-slate-500 uppercase">Lab No</p><p className="text-xl font-mono font-bold text-slate-900">{lastOrderDetails.labNo}</p></div><div className="text-right"><p className="text-xs text-slate-500 uppercase">Date</p><p className="text-sm font-medium">{new Date(lastOrderDetails.date).toLocaleDateString()}</p></div></div><div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-4 rounded-lg print:bg-transparent print:p-0 print:mb-4"><div><p className="text-xs text-slate-500">Patient Name</p><p className="font-bold text-slate-800">{lastOrderDetails.patient.name}</p></div><div><p className="text-xs text-slate-500">Phone</p><p className="font-mono text-sm">{lastOrderDetails.patient.phone}</p></div><div><p className="text-xs text-slate-500">Age / Gender</p><p className="text-sm">{lastOrderDetails.patient.age} Y / {lastOrderDetails.patient.gender}</p></div><div><p className="text-xs text-slate-500">Referred By</p><p className="text-sm">{lastOrderDetails.referredBy}</p></div></div><div className="mb-6"><h4 className="text-xs font-bold text-slate-900 uppercase border-b border-slate-200 pb-2 mb-2">Tests Requested</h4><table className="w-full text-sm"><tbody>{lastOrderDetails.tests.map((t: any) => (<tr key={t.id}><td className="py-1 text-slate-700">{t.name}</td><td className="py-1 text-right font-medium">{t.price}</td></tr>))}</tbody></table></div><div className="border-t-2 border-slate-800 pt-4 space-y-2"><div className="flex justify-between text-sm"><span className="text-slate-500">Total Amount</span><span className="font-bold">{lastOrderDetails.payment.totalAmount}</span></div>{lastOrderDetails.payment.discountAmount > 0 && (<div className="flex justify-between text-sm"><span className="text-slate-500">Discount</span><span className="text-slate-700">-{lastOrderDetails.payment.discountAmount}</span></div>)}<div className="flex justify-between text-base font-bold text-slate-900 pt-2 border-t border-slate-100"><span>Net Payable</span><span>{lastOrderDetails.payment.netPayable}</span></div><div className="flex justify-between text-sm pt-1"><span className="text-slate-500">Paid Amount</span><span className="font-mono">{lastOrderDetails.payment.paidAmount}</span></div><div className="flex justify-between text-sm pt-1"><span className="text-slate-500">Balance Due</span><span className={`${lastOrderDetails.payment.balanceDue > 0 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>{lastOrderDetails.payment.balanceDue}</span></div></div><div className="mt-8 text-center text-[10px] text-slate-400 print:mt-12"><p>Thank you for choosing MediLab Pro.</p><p>Please bring this receipt for report collection.</p></div></div><div className="p-4 bg-slate-50 border-t border-slate-200 flex gap-3 print:hidden"><button onClick={handleClearPatient} className="flex-1 py-3 px-4 bg-white border border-slate-300 rounded-lg text-slate-700 font-medium hover:bg-slate-50 transition-colors">New Registration</button><button onClick={handlePrintReceipt} className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 shadow-md transition-colors flex items-center justify-center gap-2"><Printer size={18} />Print Receipt</button></div></div></div>)}
    </div>
  );
};