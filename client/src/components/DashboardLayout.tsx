import React, { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { Building2, Sparkles, Check, X } from 'lucide-react';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated, isLoading, pendingInvitations, acceptUserInvitation, declineUserInvitation } = useAuth();
  const [processingId, setProcessingId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          height: '100vh',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-main)',
          color: 'var(--text-secondary)',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            border: '3px solid rgba(99, 102, 241, 0.2)',
            borderTopColor: 'var(--accent-primary)',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: '0.9rem' }}>Carregando Marketiv.io...</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const handleAcceptInvite = async (id: string) => {
    setProcessingId(id);
    try {
      await acceptUserInvitation(id);
    } catch {
      // Handled in context
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeclineInvite = async (id: string) => {
    setProcessingId(id);
    try {
      await declineUserInvitation(id);
    } catch {
      // Handled in context
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-main)' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflowX: 'hidden' }}>
        {/* Pending Invitation Alert Banner */}
        {pendingInvitations.length > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              borderBottom: '1px solid rgba(99, 102, 241, 0.25)',
              padding: '0.75rem 2rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div
                style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '6px',
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Building2 size={16} />
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                Você foi convidado por <strong>{pendingInvitations[0].createdBy.name || 'um administrador'}</strong> para ingressar na equipe da agência{' '}
                <strong style={{ color: 'var(--accent-primary)' }}>{pendingInvitations[0].organization.name}</strong> como{' '}
                <strong>{pendingInvitations[0].role === 'ADMIN' ? 'Administrador' : 'Membro'}</strong>!
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button
                type="button"
                onClick={() => handleDeclineInvite(pendingInvitations[0].id)}
                disabled={processingId === pendingInvitations[0].id}
                className="btn btn-ghost btn-sm"
                style={{ fontSize: '12px', padding: '0.35rem 0.65rem', color: 'var(--text-tertiary)' }}
              >
                Recusar
              </button>
              <button
                type="button"
                onClick={() => handleAcceptInvite(pendingInvitations[0].id)}
                disabled={processingId === pendingInvitations[0].id}
                className="btn btn-primary btn-sm"
                style={{
                  fontSize: '12px',
                  padding: '0.35rem 0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                }}
              >
                <Check size={14} />
                <span>{processingId === pendingInvitations[0].id ? 'Ingressando...' : 'Aceitar Convite'}</span>
              </button>
            </div>
          </div>
        )}

        <Outlet />
      </main>
    </div>
  );
};
