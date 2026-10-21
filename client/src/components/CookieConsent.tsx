import React, { useState, useEffect } from 'react';
import { Cookie, ShieldCheck, Lock, CheckCircle2, Sparkles } from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    // Verifica se o usuário já consentiu anteriormente
    const consent = localStorage.getItem('cookie_consent_accepted');
    if (consent !== 'true') {
      // Delay sutil de 400ms para uma entrada suave e elegante na página
      const timer = setTimeout(() => {
        setIsVisible(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = async () => {
    setIsSubmitting(true);
    try {
      // 1. Grava no localStorage o consentimento formal
      localStorage.setItem('cookie_consent_accepted', 'true');

      // 2. Se houver token na sessão local, sincroniza com o backend para gravação imediata do cookie HttpOnly
      const token = localStorage.getItem('token');
      await api.post('/auth/consent-cookies', { token: token || undefined });

      // 3. Notifica o usuário de forma amigável
      toast.success('Cookies aceitos com sucesso. Sessão e segurança protegidas!', {
        icon: '🍪',
        duration: 4000,
      });

      // 4. Animação de saída
      setIsVisible(false);
    } catch {
      // Em caso de falha de rede temporária, ainda garante consentimento local ativo
      localStorage.setItem('cookie_consent_accepted', 'true');
      setIsVisible(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isVisible) return null;

  return (
    <aside
      aria-label="Aviso de Cookies e Privacidade"
      style={{
        position: 'fixed',
        bottom: '1.5rem',
        left: '1.5rem',
        right: '1.5rem',
        maxWidth: '860px',
        margin: '0 auto',
        zIndex: 99999,
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(19, 29, 51, 0.96) 100%)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(99, 102, 241, 0.35)',
        boxShadow: '0 20px 45px -10px rgba(0, 0, 0, 0.7), 0 0 35px -5px rgba(99, 102, 241, 0.25)',
        borderRadius: '18px',
        padding: '1.5rem 1.75rem',
        color: '#f8fafc',
        animation: 'cookieBannerSlideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '1rem',
          }}
        >
          {/* Ícone com gradiente e aura brilhante */}
          <div
            style={{
              width: '46px',
              height: '46px',
              minWidth: '46px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 20px rgba(99, 102, 241, 0.45)',
            }}
          >
            <Cookie size={26} color="#ffffff" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <h2
                style={{
                  fontSize: '1.08rem',
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  color: '#ffffff',
                }}
              >
                Autorização de Armazenamento de Cookies
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: '#34d399',
                  border: '1px solid rgba(52, 211, 153, 0.3)',
                }}
              >
                <Sparkles size={11} />
                Segurança Ativa
              </span>
            </div>

            <p
              style={{
                fontSize: '0.88rem',
                lineHeight: '1.5',
                color: '#cbd5e1',
                margin: 0,
              }}
            >
              Este sistema utiliza cookies estritamente necessários para manter sua sessão autenticada por 6 horas, garantir a segurança contra requisições forjadas (CSRF) e armazenar suas preferências de acesso.
              Em respeito à sua privacidade, <strong>os cookies só serão criados e armazenados após você confirmar o aceite abaixo</strong>.
            </p>
          </div>
        </div>

        {/* Badges de garantia de segurança */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            paddingTop: '0.75rem',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '0.6rem',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <Lock size={13} color="#818cf8" />
              <span>Sessão Protegida (6 Horas)</span>
            </div>

            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                fontSize: '0.78rem',
                color: '#94a3b8',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '0.35rem 0.75rem',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              <ShieldCheck size={13} color="#34d399" />
              <span>Criptografia HttpOnly & SameSite</span>
            </div>
          </div>

          {/* Botão de aceite exclusivo (sem opção de recusa) */}
          <button
            onClick={handleAccept}
            disabled={isSubmitting}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.7rem 1.6rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.92rem',
              color: '#ffffff',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 18px rgba(99, 102, 241, 0.45)',
              transition: 'all 0.2s ease',
              opacity: isSubmitting ? 0.75 : 1,
            }}
            onMouseEnter={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 24px rgba(99, 102, 241, 0.6)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isSubmitting) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(99, 102, 241, 0.45)';
              }
            }}
          >
            <CheckCircle2 size={18} />
            {isSubmitting ? 'Armazenando...' : 'Aceitar Cookies'}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cookieBannerSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </aside>
  );
};
