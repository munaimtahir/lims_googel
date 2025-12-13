import React, { useState } from 'react';
import { LabProvider } from './context/LabContext';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';
import { Registration } from './pages/Registration';
import { Phlebotomy } from './pages/Phlebotomy';
import { Laboratory } from './pages/Laboratory';
import { Reports } from './pages/Reports';
import { Dashboard } from './pages/Dashboard';
import { Verification } from './pages/Verification';

const AppContent: React.FC = () => {
  const [currentView, setCurrentView] = useState('dashboard');

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'registration': return <Registration />;
      case 'phlebotomy': return <Phlebotomy />;
      case 'laboratory': return <Laboratory />;
      case 'verification': return <Verification />;
      case 'reports': return <Reports />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="flex bg-slate-50 min-h-screen">
      <Sidebar currentView={currentView} setView={setCurrentView} />
      <div className="flex-1 ml-64">
        <Header title={currentView.replace('-', ' ')} />
        <main className="p-0">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LabProvider>
      <AppContent />
    </LabProvider>
  );
};

export default App;