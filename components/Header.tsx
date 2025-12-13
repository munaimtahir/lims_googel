import React from 'react';
import { Bell, User } from 'lucide-react';

interface HeaderProps {
  title: string;
}

export const Header: React.FC<HeaderProps> = ({ title }) => {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 no-print">
      <h1 className="text-2xl font-semibold text-slate-800 capitalize">{title}</h1>
      <div className="flex items-center space-x-4">
        <button className="p-2 text-slate-400 hover:text-blue-600 transition-colors">
          <Bell size={20} />
        </button>
        <div className="flex items-center space-x-3 pl-4 border-l border-slate-200">
          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold">
            <User size={16} />
          </div>
          <div className="text-sm">
            <p className="font-medium text-slate-700">Lab Staff</p>
            <p className="text-xs text-slate-500">Admin Access</p>
          </div>
        </div>
      </div>
    </header>
  );
};
