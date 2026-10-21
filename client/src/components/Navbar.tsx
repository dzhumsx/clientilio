import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavbarProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export const Navbar: React.FC<NavbarProps> = ({ title, subtitle, actions }) => {
  const { currentOrg } = useAuth();

  const planName = currentOrg?.planId ? currentOrg.planId.toUpperCase() : 'FREE';

  return (
    <header
      style={{
        height: '70px',
        borderBottom: '1px solid var(--border-subtle)',
        background: 'rgba(9, 13, 22, 0.8)',
        backdropFilter: 'blur(10px)',
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
        <h1 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{subtitle}</p>}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link
          to="/dashboard/billing"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            background: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: 'var(--radius-full)',
            padding: '0.25rem 0.75rem',
            fontSize: '0.75rem',
            fontWeight: 700,
            color: 'var(--text-link)',
          }}
        >
          <Sparkles size={12} />
          <span>PLANO {planName}</span>
        </Link>

        {actions}
      </div>
    </header>
  );
};
