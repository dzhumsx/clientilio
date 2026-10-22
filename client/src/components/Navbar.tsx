import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon, Bell, Building2, Check, X, Shield, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ title, subtitle, actions }) => {
  const { currentOrg, pendingInvitations, acceptUserInvitation, declineUserInvitation } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  const planName = currentOrg?.planId ? currentOrg.planId.toUpperCase() : 'AGENCY';

  // Close notifications dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    if (isNotifOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isNotifOpen]);

  const handleAccept = async (id: string) => {
    setProcessingId(id);
    try {
      await acceptUserInvitation(id);
      setIsNotifOpen(false);
    } catch {
      // Handled in context
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (id: string) => {
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
    <header
      style={{
        height: '64px',
        borderBottom: '1px solid var(--border-hairline)',
        backgroundColor: 'var(--bg-canvas)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
      }}
    >
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <h1
            style={{
              fontSize: '1.15rem',
              fontWeight: 450,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            {title}
          </h1>
        </div>
        {subtitle && (
          <p
            style={{
              fontSize: '12px',
              color: 'var(--text-tertiary)',
              marginTop: '1px',
            }}
          >
            {subtitle}
          </p>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {/* Monospace Plan Badge */}
        <Link
          to="/dashboard/billing"
          className="badge badge-neutral"
          style={{
            textDecoration: 'none',
            fontSize: '11px',
            padding: '0.25rem 0.65rem',
            border: '1px solid var(--border-hairline)',
            background: 'var(--bg-subtle)',
            color: 'var(--text-secondary)',
          }}
          title="Ver plano e faturamento"
        >
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--color-success)', display: 'inline-block' }} />
          <span>PLANO {planName}</span>
        </Link>

        {/* Notifications Bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            onClick={() => setIsNotifOpen((prev) => !prev)}
            className="btn btn-ghost"
            style={{
              position: 'relative',
              padding: '0.45rem',
              borderRadius: 'var(--radius-button)',
              color: pendingInvitations.length > 0 ? 'var(--accent-primary)' : 'var(--text-secondary)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            title="Notificações e Convites"
            aria-label="Notificações"
          >
            <Bell size={17} />
            {pendingInvitations.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  minWidth: '16px',
                  height: '16px',
                  padding: '0 4px',
                  borderRadius: '10px',
                  backgroundColor: 'var(--color-danger)',
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 0 2px var(--bg-canvas)',
                }}
              >
                {pendingInvitations.length}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Popover */}
          {isNotifOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-dropdown)',
                zIndex: 100,
                overflow: 'hidden',
                animation: 'fadeIn 0.15s ease',
              }}
            >
              <div
                style={{
                  padding: '0.875rem 1rem',
                  borderBottom: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  backgroundColor: 'var(--bg-subtle)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Bell size={15} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Notificações
                  </span>
                </div>
                {pendingInvitations.length > 0 && (
                  <span
                    style={{
                      fontSize: '11px',
                      backgroundColor: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--accent-primary)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                    }}
                  >
                    {pendingInvitations.length} {pendingInvitations.length === 1 ? 'convite novo' : 'convites novos'}
                  </span>
                )}
              </div>

              <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                {pendingInvitations.length === 0 ? (
                  <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', color: 'var(--text-tertiary)' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: 'var(--bg-muted)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 0.75rem',
                      }}
                    >
                      <Bell size={18} />
                    </div>
                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                      Nenhum convite pendente
                    </p>
                    <p style={{ margin: '0.25rem 0 0', fontSize: '12px' }}>
                      Quando você for convidado para uma agência, o convite aparecerá aqui.
                    </p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {pendingInvitations.map((inv) => {
                      const isProcessing = processingId === inv.id;
                      return (
                        <div
                          key={inv.id}
                          style={{
                            padding: '1rem',
                            borderBottom: '1px solid var(--border-hairline)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.75rem',
                            backgroundColor: 'transparent',
                            transition: 'background var(--transition-fast)',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <div
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '8px',
                                backgroundColor: 'var(--accent-subtle)',
                                color: 'var(--accent-primary)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                                fontWeight: 700,
                                fontSize: '14px',
                              }}
                            >
                              <Building2 size={18} />
                            </div>

                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {inv.organization.name}
                                </span>
                                <span
                                  style={{
                                    fontSize: '10px',
                                    padding: '1px 6px',
                                    borderRadius: '10px',
                                    backgroundColor: inv.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-muted)',
                                    color: inv.role === 'ADMIN' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                    fontWeight: 600,
                                  }}
                                >
                                  {inv.role === 'ADMIN' ? 'Admin' : 'Membro'}
                                </span>
                              </div>

                              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.4 }}>
                                Convidado por <strong>{inv.createdBy.name || 'Um administrador'}</strong> para participar da equipe.
                              </p>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                            <button
                              type="button"
                              onClick={() => handleDecline(inv.id)}
                              disabled={isProcessing}
                              className="btn btn-ghost btn-sm"
                              style={{
                                fontSize: '11px',
                                padding: '0.35rem 0.65rem',
                                color: 'var(--color-danger)',
                              }}
                            >
                              Recusar
                            </button>

                            <button
                              type="button"
                              onClick={() => handleAccept(inv.id)}
                              disabled={isProcessing}
                              className="btn btn-primary btn-sm"
                              style={{
                                fontSize: '11px',
                                padding: '0.35rem 0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.35rem',
                              }}
                            >
                              <Check size={13} />
                              <span>{isProcessing ? 'Ingressando...' : 'Aceitar Convite'}</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Theme Toggle (Light / Dark) */}
        <button
          onClick={toggleTheme}
          className="btn btn-ghost"
          style={{
            padding: '0.45rem',
            borderRadius: 'var(--radius-button)',
            color: 'var(--text-secondary)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={theme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
          aria-label="Alternar tema"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {actions}
      </div>
    </header>
  );
};
