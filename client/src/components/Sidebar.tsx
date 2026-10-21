import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  CheckCircle2,
  CreditCard,
  LogOut,
  ExternalLink,
  Building2,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar: React.FC = () => {
  const { user, currentOrg, organizations, setCurrentOrg, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItems = [
    { label: 'Visão Geral', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Clientes', path: '/dashboard/clients', icon: Users },
    { label: 'Projetos', path: '/dashboard/projects', icon: Briefcase },
    { label: 'Entregáveis', path: '/dashboard/deliverables', icon: CheckCircle2 },
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
      {/* Brand Header with Vercel-style Triangle Glyph */}
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
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '5px',
            background: 'var(--accent-primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '11px',
            fontWeight: 900,
            boxShadow: 'var(--accent-glow)',
          }}
        >
          ▲
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.4rem' }}>
          <span style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
            Nexora
          </span>
          <span
            className="eyebrow"
            style={{
              fontSize: '9px',
              color: 'var(--accent-primary)',
              background: 'var(--accent-subtle)',
              padding: '1px 5px',
              borderRadius: '3px',
              border: '1px solid var(--accent-border)',
            }}
          >
            AGÊNCIA
          </span>
        </div>
      </div>

      {/* Organization Switcher */}
      <div style={{ padding: '0.75rem 1rem 0.5rem' }}>
        <div
          style={{
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-md)',
            padding: '0.45rem 0.65rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflow: 'hidden' }}>
            <Building2 size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
            <span
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {currentOrg?.name || 'Agência'}
            </span>
          </div>

          {organizations.length > 1 && (
            <select
              value={currentOrg?.id}
              onChange={(e) => {
                const selected = organizations.find((o) => o.id === e.target.value);
                if (selected) setCurrentOrg(selected);
              }}
              style={{
                position: 'absolute',
                opacity: 0,
                width: '100%',
                height: '100%',
                cursor: 'pointer',
                left: 0,
                top: 0,
              }}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          )}
        </div>
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
          padding: '0.85rem 1rem',
          borderTop: '1px solid var(--border-hairline)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--bg-canvas)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', overflow: 'hidden' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-inverted)',
              color: 'var(--text-inverted)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '11px',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div style={{ overflow: 'hidden' }}>
            <p
              style={{
                fontSize: '12px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {user?.name || 'Administrador'}
            </p>
            <p className="eyebrow" style={{ fontSize: '9px', color: 'var(--text-tertiary)' }}>
              {currentOrg?.role || 'OWNER'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn btn-ghost"
          style={{
            padding: '0.4rem',
            borderRadius: 'var(--radius-button)',
            color: 'var(--text-tertiary)',
          }}
          title="Encerrar Sessão"
          aria-label="Logout"
        >
          <LogOut size={15} />
        </button>
      </div>
    </aside>
  );
};
