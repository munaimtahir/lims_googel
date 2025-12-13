import React, { useMemo } from 'react';
import { useLab } from '../context/LabContext';
import { RequestStatus } from '../types';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Users, TestTube, CheckSquare, Activity } from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { requests, patients } = useLab();

  // Stats
  const totalPatients = patients.length;
  const pendingCollection = requests.filter(r => r.status === RequestStatus.REGISTERED).length;
  const pendingResults = requests.filter(r => r.status === RequestStatus.COLLECTED).length;
  const verified = requests.filter(r => r.status === RequestStatus.VERIFIED).length;

  const statCards = [
    { label: 'Total Patients', value: totalPatients, icon: Users, color: 'bg-blue-500' },
    { label: 'Pending Collection', value: pendingCollection, icon: TestTube, color: 'bg-amber-500' },
    { label: 'In Analysis', value: pendingResults, icon: Activity, color: 'bg-purple-500' },
    { label: 'Reports Completed', value: verified, icon: CheckSquare, color: 'bg-green-500' },
  ];

  // Chart Data Preparation: Status Distribution
  const statusData = [
    { name: 'Registered', value: requests.filter(r => r.status === RequestStatus.REGISTERED).length },
    { name: 'Collected', value: requests.filter(r => r.status === RequestStatus.COLLECTED).length },
    { name: 'Analyzed', value: requests.filter(r => r.status === RequestStatus.ANALYZED).length },
    { name: 'Verified', value: requests.filter(r => r.status === RequestStatus.VERIFIED).length },
  ];

  const COLORS = ['#F59E0B', '#3B82F6', '#8B5CF6', '#10B981'];

  // Chart Data Preparation: Daily Throughput (Last 7 Days)
  const dailyData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
        
        // Count requests for this day
        const count = requests.filter(r => {
            const rDate = new Date(r.date);
            return rDate.getDate() === d.getDate() && 
                   rDate.getMonth() === d.getMonth() && 
                   rDate.getFullYear() === d.getFullYear();
        }).length;
        
        days.push({ name: dayName, count });
    }
    return days;
  }, [requests]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <div key={idx} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-slate-800">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.color} text-white bg-opacity-90`}>
                <Icon size={24} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-semibold text-slate-800 mb-6">Request Status Distribution</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={statusData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            fill="#8884d8"
                            paddingAngle={5}
                            dataKey="value"
                        >
                            {statusData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-4 mt-4">
                {statusData.map((entry, index) => (
                    <div key={index} className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }} />
                        <span className="text-xs text-slate-600">{entry.name} ({entry.value})</span>
                    </div>
                ))}
            </div>
        </div>

        {/* Activity Chart (Real Data) */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
             <h3 className="text-lg font-semibold text-slate-800 mb-6">Daily Throughput (Last 7 Days)</h3>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                        data={dailyData}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} allowDecimals={false} />
                        <Tooltip cursor={{fill: '#F1F5F9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                </ResponsiveContainer>
             </div>
        </div>
      </div>
    </div>
  );
};
