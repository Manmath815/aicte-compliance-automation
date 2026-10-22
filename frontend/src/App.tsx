import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { DemoWalkthroughBar } from './components/DemoWalkthroughBar';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { WorkflowView } from './components/WorkflowView';
import { DocumentsView } from './components/DocumentsView';
import { ComplianceView } from './components/ComplianceView';
import { RiskView } from './components/RiskView';
import { AlertsView } from './components/AlertsView';
import { AssistantView } from './components/AssistantView';
import { ReportsView } from './components/ReportsView';
import { AdminView } from './components/AdminView';
import { api } from './services/api';

const MainLayout: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [unreadAlerts, setUnreadAlerts] = useState<number>(3);

  const fetchUnreadCount = async () => {
    try {
      const alerts = await api.getAlerts();
      const unread = alerts.filter(a => a.status === 'UNREAD').length;
      setUnreadAlerts(unread);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000); // 30 sec polling
    return () => clearInterval(interval);
  }, []);

  const renderActiveView = () => {
    switch (currentTab) {
      case 'dashboard':
        return <DashboardView onNavigate={setCurrentTab} />;
      case 'workflows':
        return <WorkflowView />;
      case 'documents':
        return <DocumentsView />;
      case 'compliance':
        return <ComplianceView />;
      case 'risk':
        return <RiskView />;
      case 'alerts':
        return <AlertsView />;
      case 'assistant':
        return <AssistantView />;
      case 'reports':
        return <ReportsView />;
      case 'admin':
        return <AdminView />;
      default:
        return <DashboardView onNavigate={setCurrentTab} />;
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans selection:bg-sky-500/30 selection:text-white">
      {/* 1. Official AICTE Disclaimer Notice */}
      <DisclaimerBanner />

      {/* 2. Interactive Hackathon Demo Walkthrough Bar */}
      <DemoWalkthroughBar currentTab={currentTab} onNavigate={setCurrentTab} />

      {/* 3. Global Navbar */}
      <Navbar onNavigate={setCurrentTab} unreadAlertsCount={unreadAlerts} />

      {/* 4. Main Body with Sidebar & Content */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentTab={currentTab}
          onNavigate={setCurrentTab}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-background">
          <div className="max-w-7xl mx-auto">
            {renderActiveView()}
          </div>
        </main>
      </div>
    </div>
  );
};

export function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}

export default App;
