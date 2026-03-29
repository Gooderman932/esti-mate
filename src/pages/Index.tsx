import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { SubscriptionProvider } from '@/contexts/SubscriptionContext';
import AppLayout from '@/components/AppLayout';
import LoginPage from '@/components/LoginPage';
import ErrorBoundary from '@/components/ErrorBoundary';
import { Loader2, Ruler } from 'lucide-react';

const LoadingScreen: React.FC = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center mb-4 shadow-lg shadow-orange-500/25">
      <Ruler size={32} className="text-white" />
    </div>
    <Loader2 size={24} className="text-orange-400 animate-spin mb-3" />
    <p className="text-slate-400 text-sm">Loading Esti-Mate...</p>
  </div>
);

const Index: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginPage />;

  return (
    <ErrorBoundary>
      <AppProvider>
        <SubscriptionProvider>
          <AppLayout />
        </SubscriptionProvider>
      </AppProvider>
    </ErrorBoundary>
  );
};

export default Index;
