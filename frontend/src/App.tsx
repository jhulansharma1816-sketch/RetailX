import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Navbar } from './components/layout/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { RecoveryAssistantPage } from './pages/RecoveryAssistantPage';
import { InvoicesPage } from './pages/InvoicesPage';
import { CustomersPage } from './pages/CustomersPage';
import { PaymentsPage } from './pages/PaymentsPage';
import { PaymentPromisesPage } from './pages/PaymentPromisesPage';
import { CommunicationCenterPage } from './pages/CommunicationCenterPage';
import { VoiceCallsPage } from './pages/VoiceCallsPage';
import { TasksPage } from './pages/TasksPage';
import { DisputesPage } from './pages/DisputesPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthPage } from './pages/AuthPage';
import { RecoveryChatbotModal } from './components/chatbot/RecoveryChatbotModal';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [initializing, setInitializing] = useState<boolean>(true);

  useEffect(() => {
    // Check session on startup
    const checkAuth = async () => {
      try {
        const user = await api.getMe();
        setCurrentUser(user);
      } catch (e) {
        // Fallback default demo user
        setCurrentUser({
          id: 'usr-rajesh-001',
          email: 'admin@apexindustrial.in',
          full_name: 'Rajesh Kumar',
          role: 'owner',
          business_name: 'Apex Industrial & Electrical Distribution Pvt Ltd',
        });
      } finally {
        setInitializing(false);
      }
    };
    checkAuth();
  }, []);

  if (initializing) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-brand-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <AuthPage onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenChatbot={() => setIsChatbotOpen(true)}
          />
        );
      case 'recovery':
        return <RecoveryAssistantPage />;
      case 'invoices':
        return <InvoicesPage />;
      case 'customers':
        return <CustomersPage />;
      case 'payments':
        return <PaymentsPage />;
      case 'promises':
        return <PaymentPromisesPage />;
      case 'communications':
        return <CommunicationCenterPage />;
      case 'voice-calls':
        return <VoiceCallsPage />;
      case 'tasks':
        return <TasksPage />;
      case 'disputes':
        return <DisputesPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <DashboardPage
            onNavigate={(tab) => setCurrentTab(tab)}
            onOpenChatbot={() => setIsChatbotOpen(true)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row antialiased text-slate-800 font-sans">
      {/* Desktop / Collapsible Sidebar */}
      <div className="hidden md:block flex-shrink-0">
        <Sidebar
          currentTab={currentTab}
          setCurrentTab={setCurrentTab}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
      </div>

      {/* Mobile Sidebar Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden bg-slate-900/40 backdrop-blur-xs">
          <div className="w-64 bg-white h-full shadow-2xl">
            <Sidebar
              currentTab={currentTab}
              setCurrentTab={(tab) => {
                setCurrentTab(tab);
                setMobileMenuOpen(false);
              }}
              collapsed={false}
              setCollapsed={() => setMobileMenuOpen(false)}
            />
          </div>
          <div className="flex-1" onClick={() => setMobileMenuOpen(false)}></div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <Navbar
          onOpenChatbot={() => setIsChatbotOpen(true)}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          businessName={currentUser?.business_name}
        />

        <main className="flex-1 p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {renderContent()}
        </main>
      </div>

      {/* Grounded Recovery Assistant Chatbot */}
      <RecoveryChatbotModal
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
      />
    </div>
  );
};
