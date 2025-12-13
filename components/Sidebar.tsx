import React from 'react';
import { 
  LayoutDashboard, 
  UserPlus, 
  TestTube2, 
  Microscope, 
  FileText, 
  Activity,
  ShieldCheck
} from 'lucide-react';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, setView }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'registration', label: 'Registration', icon: UserPlus },
    { id: 'phlebotomy', label: 'Phlebotomy', icon: TestTube2 },
    { id: 'laboratory', label: 'Technical Area', icon: Microscope },
    { id: 'verification', label: 'Verification', icon: ShieldCheck },
    { id: 'reports', label: 'Reports', icon: FileText },
  ];

  return (
    <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 no-print">
      <div className="p-6 border-b border-slate-800 flex items-center space-x-3">
        <Activity className="text-blue-400 h-8 w-8" />
        <span className="text-xl font-bold tracking-tight">MediLab Pro</span>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200
                ${isActive ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <Icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>
      <div className="p-4 border-t border-slate-800 text-xs text-slate-500 text-center">
        v1.0.0 &copy; 2025 MediLab
      </div>
    </div>
  );
};