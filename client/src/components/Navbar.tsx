import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ title, subtitle, actions }) => {
  const { currentOrg } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const planName = currentOrg?.planId ? currentOrg.planId.toUpperCase() : 'AGENCY';

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
