import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ShieldCheck, Building2, UserCheck, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const AcceptInvitePage: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { user, currentOrg, setCurrentOrg, refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [inviteData, setInviteData] = useState<{
    id: string;
    email: string;
    role: string;
    organization: { id: string; name: string; slug: string };
    inviterName: string;
    expiresAt: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de convite não informado.');
      setLoading(false);
      return;
    }

    const fetchPreview = async () => {
      try {
        const { data } = await api.get(`/organizations/invitations/preview/${token}`);
        setInviteData(data);
      } catch (err: any) {
        console.error('Failed to load invitation preview:', err);
        setError(
          err.response?.data?.error?.message ||
          'Este convite é inválido, expirou ou já foi utilizado.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPreview();
  }, [token]);

  const handleAccept = async () => {
    if (!token) return;
    setAccepting(true);
    try {
      const { data } = await api.post('/organizations/invitations/accept', { token });
      setAccepted(true);
      toast.success('Você ingressou na agência com sucesso!');
      if (refreshProfile) {
        await refreshProfile();
      }
      if (data?.organization) {
        setCurrentOrg(data.organization);
      }
      setTimeout(() => {
        navigate('/dashboard');
      }, 1200);
    } catch (err: any) {
      console.error('Failed to accept invitation:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao aceitar convite.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-canvas)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--text-tertiary)' }}>
          CARREGANDO CONVITE...
        </div>
      </div>
    );
  }

  if (error || !inviteData) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-canvas)', padding: '1rem' }}>
        <div className="card" style={{ maxWidth: '440px', width: '100%', textAlign: 'center', padding: '2.5rem 1.75rem' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <AlertCircle size={24} />
          </div>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Convite Inválido ou Expirado
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.5rem', lineHeight: '1.5' }}>
            {error || 'Não foi possível localizar as informações deste convite.'}
          </p>
          <Link to="/login" className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-canvas)', padding: '1.5rem' }}>
      <div className="card" style={{ maxWidth: '480px', width: '100%', padding: '2.25rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div
            style={{
              width: '52px',
              height: '52px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-subtle)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem',
            }}
          >
            <Building2 size={26} />
          </div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
            Convite para Agência
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Você foi convidado para colaborar em <strong>{inviteData.organization.name}</strong>
          </p>
        </div>

        <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)', padding: '1rem 1.25rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', fontSize: '13px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Agência:</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inviteData.organization.name}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Convidado por:</span>
              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{inviteData.inviterName}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>Papel atribuído:</span>
              <span
                style={{
                  fontWeight: 600,
                  fontSize: '11px',
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '0.04em',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  backgroundColor: 'var(--accent-subtle)',
                  color: 'var(--accent-primary)',
                }}
              >
                {inviteData.role === 'ADMIN' ? 'ADMINISTRADOR' : 'COLABORADOR'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-tertiary)' }}>E-mail de destino:</span>
              <span style={{ color: 'var(--text-secondary)' }}>{inviteData.email}</span>
            </div>
          </div>
        </div>

        {accepted ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--accent-primary)' }}>
            <CheckCircle2 size={32} style={{ margin: '0 auto 0.5rem' }} />
            <p style={{ fontWeight: 600, fontSize: '14px' }}>Entrando na agência...</p>
          </div>
        ) : user ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              {accepting ? 'Ingressando...' : 'Aceitar Convite & Entrar'}
            </button>
            <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              Logado como <strong>{user.email}</strong>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <Link
              to={`/register?token=${token}&email=${encodeURIComponent(inviteData.email)}&redirect=/dashboard`}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem' }}
            >
              Criar Conta para Aceitar Convite
            </Link>
            <Link
              to={`/login?redirect=/invite/${token}`}
              className="btn btn-secondary"
              style={{ width: '100%', justifyContent: 'center' }}
            >
              Já tenho uma conta (Fazer Login)
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
export default AcceptInvitePage;
