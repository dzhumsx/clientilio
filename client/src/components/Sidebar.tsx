import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckCircle2,
  CreditCard,
  LogOut,
  Building2,
  ChevronDown,
  Check,
  Plus,
  Settings,
  Sparkles,
  User as UserIcon,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './Modal';
import { Logo } from './Logo';
import toast from 'react-hot-toast';

export const Sidebar: React.FC = () => {
  const { user, currentOrg, organizations, switchOrganization, createOrganization, logout } = useAuth();
  const navigate = useNavigate();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Agency Switcher State
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [isCreatingAgency, setIsCreatingAgency] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOrgDropdownOpen(false);
      }
    };
    if (isOrgDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOrgDropdownOpen]);

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Logout error:', err);
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgencyName.trim()) {
      toast.error('Informe o nome da nova agência.');
      return;
    }
    setIsCreatingAgency(true);
    try {
      const created = await createOrganization(newAgencyName.trim());
      toast.success(`Agência ${created.name} criada com sucesso!`);
      setIsCreateOrgModalOpen(false);
      setNewAgencyName('');
      setIsOrgDropdownOpen(false);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Erro ao criar agência.');
    } finally {
      setIsCreatingAgency(false);
    }
  };

  const navItems = [
    { label: 'Visão Geral', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Clientes', path: '/dashboard/clients', icon: Building2 },
    { label: 'Projetos', path: '/dashboard/projects', icon: Briefcase },
    { label: 'Entregáveis', path: '/dashboard/deliverables', icon: CheckCircle2 },
    { label: 'Equipe da Agência', path: '/dashboard/team', icon: Users },
    { label: 'Planos & Faturamento', path: '/dashboard/billing', icon: CreditCard },
  ];

  return (
    <aside
      style={{
        width: '240px',
        backgroundColor: 'var(--bg-card)',
        borderRight: '1px solid var(--border-hairline)',
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        userSelect: 'none',
      }}
    >
      {/* Brand Header */}
      <div
        style={{
          height: '64px',
          padding: '0 1.25rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.65rem',
          borderBottom: '1px solid var(--border-hairline)',
        }}
      >
        <Logo size={24} textSize="15px" />
      </div>

      {/* Interactive Agency Switcher */}
      <div style={{ padding: '0.75rem 0.75rem 0.35rem', position: 'relative' }} ref={dropdownRef}>
        <button
          type="button"
          onClick={() => setIsOrgDropdownOpen((prev) => !prev)}
          style={{
            width: '100%',
            backgroundColor: isOrgDropdownOpen ? 'var(--bg-muted)' : 'var(--bg-subtle)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '0.55rem 0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.5rem',
            cursor: 'pointer',
            textAlign: 'left',
            transition: 'all var(--transition-fast)',
            boxShadow: isOrgDropdownOpen ? 'var(--shadow-dropdown)' : 'none',
          }}
          title="Alternar de agência ou criar nova agência"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden', flex: 1 }}>
            <div
              style={{
                width: '24px',
                height: '24px',
                borderRadius: '5px',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={13} />
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  display: 'block',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  lineHeight: 1.2,
                }}
              >
                {currentOrg?.name || 'Agência'}
              </span>
              <span
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  display: 'block',
                  lineHeight: 1.1,
                  marginTop: '1px',
                }}
              >
                {currentOrg?.role === 'OWNER'
                  ? 'PROPRIETÁRIO'
                  : currentOrg?.role === 'ADMIN'
                  ? 'ADMIN'
                  : 'MEMBRO'}
              </span>
            </div>
          </div>

          <ChevronDown
            size={13}
            style={{
              color: 'var(--text-tertiary)',
              flexShrink: 0,
              transform: isOrgDropdownOpen ? 'rotate(180deg)' : 'none',
              transition: 'transform 0.15s ease',
            }}
          />
        </button>

        {/* Agency Dropdown Menu */}
        {isOrgDropdownOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% - 2px)',
              left: '0.75rem',
              right: '0.75rem',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-hairline)',
              borderRadius: 'var(--radius-md)',
              boxShadow: 'var(--shadow-modal)',
              zIndex: 100,
              padding: '0.35rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              animation: 'fadeIn 0.15s ease-out',
            }}
          >
            <div
              style={{
                padding: '0.35rem 0.5rem',
                fontSize: '9px',
                fontFamily: 'var(--font-mono)',
                color: 'var(--text-tertiary)',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
              }}
            >
              SUAS AGÊNCIAS ({organizations.length})
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1px' }}>
              {organizations.map((org) => {
                const isSelected = currentOrg?.id === org.id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    onClick={() => {
                      if (!isSelected) {
                        switchOrganization(org);
                      }
                      setIsOrgDropdownOpen(false);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      width: '100%',
                      padding: '0.45rem 0.55rem',
                      borderRadius: '4px',
                      border: 'none',
                      backgroundColor: isSelected ? 'var(--accent-subtle)' : 'transparent',
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '12px',
                      transition: 'background-color var(--transition-fast)',
                    }}
                    className="hover-subtle"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden' }}>
                      <Building2 size={12} style={{ flexShrink: 0, opacity: isSelected ? 1 : 0.6 }} />
                      <div style={{ overflow: 'hidden' }}>
                        <span
                          style={{
                            fontWeight: isSelected ? 600 : 450,
                            display: 'block',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {org.name}
                        </span>
                        <span style={{ fontSize: '9px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                          {org.role === 'OWNER' ? 'Proprietário' : org.role === 'ADMIN' ? 'Admin' : 'Membro'}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />}
                  </button>
                );
              })}
            </div>

            <div style={{ height: '1px', backgroundColor: 'var(--border-hairline)', margin: '0.3rem 0' }} />

            {/* Quick Actions */}
            <button
              type="button"
              onClick={() => {
                setIsOrgDropdownOpen(false);
                setIsCreateOrgModalOpen(true);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.45rem 0.55rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--accent-primary)',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                textAlign: 'left',
              }}
              className="hover-subtle"
            >
              <Plus size={13} />
              <span>Criar Nova Agência</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsOrgDropdownOpen(false);
                navigate('/dashboard/profile?tab=AGENCIES');
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                width: '100%',
                padding: '0.45rem 0.55rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--text-secondary)',
                fontSize: '11px',
                cursor: 'pointer',
                textAlign: 'left',
              }}
              className="hover-subtle"
            >
              <Settings size={12} />
              <span>Gerenciar Agências</span>
            </button>
          </div>
        )}
      </div>

      {/* Navigation Items */}
      <nav style={{ flex: 1, padding: '0.5rem 0.75rem', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <div style={{ padding: '0.4rem 0.5rem', marginBottom: '2px' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>
            PLATAFORMA
          </span>
        </div>

        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/dashboard'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              padding: '0.45rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
              border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
              transition: 'all var(--transition-fast)',
            })}
          >
            <item.icon size={16} style={{ color: 'inherit' }} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        <div style={{ margin: '1rem 0 0.25rem', padding: '0.4rem 0.5rem', borderTop: '1px solid var(--border-hairline)' }}>
          <span className="eyebrow" style={{ fontSize: '10px' }}>
            ACESSO EXTERNO
          </span>
        </div>

        <a
          href="/portal"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.45rem 0.65rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '13px',
            color: 'var(--text-secondary)',
            transition: 'all var(--transition-fast)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <ExternalLink size={15} />
            <span>Portal do Cliente</span>
          </span>
          <span className="eyebrow" style={{ fontSize: '9px', background: 'var(--bg-muted)', padding: '1px 5px', borderRadius: '4px' }}>
            VISÃO
          </span>
        </a>
      </nav>

      {/* User Footer */}
      <div
        style={{
          padding: '0.75rem 0.85rem',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-canvas)',
          gap: '0.4rem',
        }}
      >
        <NavLink
          to="/dashboard/profile"
          style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            overflow: 'hidden',
            textDecoration: 'none',
            flex: 1,
            padding: '0.35rem 0.45rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: isActive ? 'var(--accent-subtle)' : 'transparent',
            border: isActive ? '1px solid var(--accent-border)' : '1px solid transparent',
            transition: 'background-color var(--transition-fast)',
          })}
          title="Ver perfil e gerenciamento de conta"
        >
          {/* Avatar with fallback and online status */}
          <div style={{ position: 'relative', width: '30px', height: '30px', flexShrink: 0 }}>
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user?.name || 'Foto de Perfil'}
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  objectFit: 'cover',
                  display: 'block',
                  border: '1px solid var(--border-subtle)',
                }}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const fallback = e.currentTarget.parentElement?.querySelector('.avatar-fallback') as HTMLElement;
                  if (fallback) fallback.style.display = 'flex';
                }}
              />
            ) : null}
            <div
              className="avatar-fallback"
              style={{
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                backgroundColor: 'var(--bg-inverted)',
                color: 'var(--text-inverted)',
                display: user?.avatarUrl ? 'none' : 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid var(--border-subtle)',
              }}
            >
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            {/* Online status indicator */}
            <span
              style={{
                position: 'absolute',
                bottom: '-1px',
                right: '-1px',
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: 'var(--color-success)',
                border: '1.5px solid var(--bg-card)',
              }}
              title="Online"
            />
          </div>

          <div style={{ overflow: 'hidden', flex: 1 }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 550,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                margin: 0,
                lineHeight: 1.25,
              }}
            >
              {user?.name || 'Administrador'}
            </p>
            <p
              className="eyebrow"
              style={{
                fontSize: '9px',
                color: 'var(--text-tertiary)',
                margin: 0,
                lineHeight: 1.2,
                marginTop: '1px',
              }}
            >
              {currentOrg?.role || 'OWNER'}
            </p>
          </div>
        </NavLink>

        <button
          onClick={() => setShowLogoutConfirm(true)}
          className="btn btn-ghost"
          style={{
            padding: '0.4rem',
            borderRadius: 'var(--radius-button)',
            color: 'var(--text-tertiary)',
            flexShrink: 0,
          }}
          title="Encerrar Sessão"
          aria-label="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => !isLoggingOut && setShowLogoutConfirm(false)}
        title="Confirmar Saída"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
            <div
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-danger, #ef4444)',
                flexShrink: 0,
              }}
            >
              <LogOut size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                Deseja realmente sair da sua conta?
              </p>
              <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Sua sessão de 6 horas será encerrada com segurança neste dispositivo.
              </p>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              paddingTop: '0.875rem',
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            <button
              type="button"
              onClick={() => setShowLogoutConfirm(false)}
              className="btn btn-ghost btn-sm"
              disabled={isLoggingOut}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleConfirmLogout}
              className="btn btn-sm"
              style={{
                background: 'var(--color-danger, #ef4444)',
                color: '#ffffff',
                border: 'none',
              }}
              disabled={isLoggingOut}
            >
              {isLoggingOut ? 'Encerrando...' : 'Sair da Conta'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create New Agency Modal */}
      <Modal
        isOpen={isCreateOrgModalOpen}
        onClose={() => !isCreatingAgency && setIsCreateOrgModalOpen(false)}
        title="Criar Nova Agência"
      >
        <form onSubmit={handleCreateAgency} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                Nova Organização Independente
              </p>
              <p style={{ margin: '0.15rem 0 0', fontSize: '12px', color: 'var(--text-secondary)' }}>
                Você será o proprietário desta agência e poderá montar uma equipe exclusiva para ela.
              </p>
            </div>
          </div>

          <div>
            <label className="label">Nome da Agência *</label>
            <input
              type="text"
              value={newAgencyName}
              onChange={(e) => setNewAgencyName(e.target.value)}
              placeholder="Ex: Studio Criativo & Co."
              required
              className="input"
              autoFocus
            />
          </div>

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '0.5rem',
              paddingTop: '0.5rem',
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            <button
              type="button"
              onClick={() => setIsCreateOrgModalOpen(false)}
              className="btn btn-ghost btn-sm"
              disabled={isCreatingAgency}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={isCreatingAgency || !newAgencyName.trim()}
            >
              {isCreatingAgency ? 'Criando...' : 'Criar Agência'}
            </button>
          </div>
        </form>
      </Modal>
    </aside>
  );
};
