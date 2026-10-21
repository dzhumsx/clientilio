import React, { useState, useEffect } from 'react';
import { Cookie, Lock, ShieldCheck, Check } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookie_consent_accepted');
    if (consent !== 'true') {
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      localStorage.setItem('cookie_consent_accepted', 'true');
      const token = localStorage.getItem('token');
      await api.post('/auth/consent-cookies', { token: token || undefined });

      toast.success('Cookies autorizados. Sessão protegida com sucesso.');
      setIsVisible(false);
    } catch {
      localStorage.setItem('cookie_consent_accepted', 'true');
      setIsVisible(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Controle de Privacidade e Cookies"
      style={{
        position: 'fixed',
        bottom: '1.25rem',
        left: '1.25rem',
        right: '1.25rem',
        maxWidth: '820px',
        margin: '0 auto',
        zIndex: 99999,
        backgroundColor: 'var(--bg-card)',
        border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-dropdown)',
        borderRadius: 'var(--radius-card)',
        padding: '1.25rem',
        color: 'var(--text-primary)',
        animation: 'cookieBannerSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.85rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              minWidth: '36px',
              borderRadius: 'var(--radius-card)',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--text-primary)',
            }}
          >
            <Cookie size={18} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
              <span className="eyebrow" style={{ fontSize: '11px', color: 'var(--text-primary)', fontWeight: 600 }}>
                PRIVACIDADE & SESSÃO
              </span>
              <span className="badge badge-success" style={{ fontSize: '10px', padding: '0.1rem 0.45rem' }}>
                ESSENCIAL
              </span>
            </div>

            <p style={{ fontSize: '13px', lineHeight: '1.5', color: 'var(--text-secondary)', margin: 0 }}>
              Utilizamos cookies estritamente necessários para autenticação contínua (sessão de 6 horas) e integridade dos serviços. Em conformidade com as diretrizes de segurança, <strong>nenhum cookie é gravado no seu navegador sem a sua autorização prévia</strong>.
            </p>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid var(--border-hairline)',
          }}
        >
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.25rem 0.55rem',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border-hairline)',
              }}
            >
              <Lock size={12} />
              <span>Sessão 6h HttpOnly</span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '11px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)',
                backgroundColor: 'var(--bg-subtle)',
                padding: '0.25rem 0.55rem',
                borderRadius: 'var(--radius-card)',
                border: '1px solid var(--border-hairline)',
              }}
            >
              <ShieldCheck size={12} />
              <span>Proteção Anti-CSRF</span>
            </div>
          </div>

          {/* Botão de aceite exclusivo (sem opção de recusa) */}
          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            className="btn btn-primary"
            style={{
              padding: '0.45rem 1.15rem',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Check size={14} />
            <span>{isSubmitting ? 'Salvando...' : 'Aceitar Cookies'}</span>
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cookieBannerSlideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </aside>
  );
};
