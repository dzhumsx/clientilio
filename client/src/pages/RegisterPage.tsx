import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Lock, Mail, User, Building2, AlertCircle, Sun, Moon, Sparkles } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Logo, LogoIcon } from '../components/Logo';

export const RegisterPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email');
  const tokenParam = searchParams.get('token');
  const redirectParam = searchParams.get('redirect');
  const inviteToken = tokenParam || (redirectParam?.includes('/invite/') ? redirectParam.split('/invite/')[1]?.split('?')[0] : null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState(emailParam || '');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('A senha deve ter no mínimo 8 caracteres.');
      return;
    }

    setLoading(true);

    try {
      await register(name, email, password, companyName || `${name}'s Agency`, inviteToken || undefined);
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.error?.message ||
        'Não foi possível criar a conta. Verifique os dados inseridos.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-canvas)',
        padding: '1.5rem',
        position: 'relative',
      }}
    >
      {/* Top Bar with Brand Link & Theme Toggle */}
      <div
        style={{
          position: 'absolute',
          top: '1.5rem',
          left: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
          }}
        >
          <Logo size={22} textSize="0.875rem" />
        </Link>

        <button
          onClick={toggleTheme}
          aria-label="Alternar tema"
          style={{
            width: 32,
            height: 32,
            borderRadius: '6px',
            border: '1px solid var(--border-hairline)',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
          }}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
        </button>
      </div>

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
          <div style={{ margin: '0 auto 1rem', display: 'flex', justifyContent: 'center' }}>
            <LogoIcon size={42} />
          </div>
          <h2
            style={{
              fontSize: '1.375rem',
              fontWeight: 600,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              margin: '0 0 0.35rem 0',
            }}
          >
            Criar Conta para sua Agência
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
            Configure o portal de clientes e campanhas em instantes
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px',
              padding: '0.625rem 0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.5rem',
              color: '#ef4444',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <AlertCircle size={15} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {inviteToken && (
          <div
            style={{
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              borderRadius: '6px',
              padding: '0.75rem 0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.65rem',
              color: 'var(--accent-primary)',
            }}
          >
            <Sparkles size={16} style={{ flexShrink: 0 }} />
            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
              <strong style={{ color: 'var(--text-primary)' }}>Convite de Equipe Detectado!</strong> Ao concluir o cadastro, você ingressará automaticamente na agência convidante.
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.071em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}
            >
              Nome Completo
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Cristian Silva"
                style={{ paddingLeft: '2.25rem', height: '36px' }}
              />
              <User
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.071em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}
            >
              Nome da Agência ou Estúdio
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ex: Studio Alpha Criativo"
                style={{ paddingLeft: '2.25rem', height: '36px' }}
              />
              <Building2
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.071em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}
            >
              E-mail de Trabalho
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="cristian@agencia.com"
                style={{ paddingLeft: '2.25rem', height: '36px' }}
              />
              <Mail
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
            </div>
          </div>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.071em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}
            >
              Senha (mínimo 8 caracteres)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                style={{ paddingLeft: '2.25rem', height: '36px' }}
              />
              <Lock
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '0.5rem',
              height: '36px',
              justifyContent: 'center',
            }}
          >
            {loading ? 'Criando conta...' : 'Criar Conta Corporativa'}
            {!loading && <ArrowRight size={14} />}
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: '1.5rem',
            paddingTop: '1.25rem',
            borderTop: '1px solid var(--border-hairline)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          Já possui uma conta?{' '}
          <Link
            to="/login"
            style={{
              fontWeight: 600,
              color: 'var(--accent-primary)',
              textDecoration: 'none',
              borderBottom: '1px solid var(--accent-primary)',
            }}
          >
            Fazer login
          </Link>
        </div>
      </div>
    </div>
  );
};

