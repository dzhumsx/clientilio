import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Home,
  LayoutDashboard,
  Users,
  FolderKanban,
  FileCheck2,
  ExternalLink,
  Sun,
  Moon,
  Search,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Logo } from '../components/Logo';

export const NotFoundPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(isAuthenticated ? '/dashboard' : '/');
    }
  };

  const quickLinks = [
    {
      title: 'Painel da Agência',
      desc: 'Métricas, entregáveis recentes e visão geral.',
      icon: LayoutDashboard,
      to: '/dashboard',
    },
    {
      title: 'Gerenciar Clientes',
      desc: 'Lista de contas, contatos e marcas ativas.',
      icon: Users,
      to: '/dashboard/clients',
    },
    {
      title: 'Campanhas & Projetos',
      desc: 'Cronogramas, status e peças em andamento.',
      icon: FolderKanban,
      to: '/dashboard/projects',
    },
    {
      title: 'Portal do Cliente',
      desc: 'Acesso demonstrativo à área externa de aprovação.',
      icon: ExternalLink,
      to: '/portal',
    },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top Header */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-canvas)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            height: '100%',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Mark */}
          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            <Logo size={26} textSize="16px" />
          </Link>

          {/* Right Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={toggleTheme}
              className="btn btn-ghost btn-sm"
              style={{
                padding: '0.4rem',
                borderRadius: '6px',
                color: 'var(--text-secondary)',
              }}
              title="Alternar tema"
              aria-label="Alternar tema"
            >
              {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
            </button>

            {isAuthenticated ? (
              <Link to="/dashboard" className="btn btn-primary btn-sm">
                Ir para o Painel
              </Link>
            ) : (
              <Link to="/login" className="btn btn-primary btn-sm">
                Entrar
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '3rem 1.5rem 4rem',
          maxWidth: '900px',
          margin: '0 auto',
          width: '100%',
          textAlign: 'center',
        }}
      >
        {/* Eyebrow Status Badge */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.35rem 0.85rem',
            borderRadius: '9999px',
            backgroundColor: 'var(--accent-subtle)',
            border: '1px solid var(--accent-border)',
            color: 'var(--accent-primary)',
            fontSize: '12px',
            fontWeight: 600,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: 'var(--font-mono)',
            marginBottom: '1.5rem',
          }}
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-primary)',
            }}
          />
          Erro 404 • Página Não Encontrada
        </div>

        {/* Big 404 Headline */}
        <h1
          style={{
            fontSize: 'clamp(4.5rem, 12vw, 8.5rem)',
            fontWeight: 800,
            letterSpacing: '-0.07em',
            lineHeight: 0.95,
            margin: '0 0 1rem 0',
            background:
              theme === 'dark'
                ? 'linear-gradient(180deg, #ffffff 30%, #525252 100%)'
                : 'linear-gradient(180deg, #171717 30%, #a8a8a8 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontSize: 'clamp(1.25rem, 3vw, 1.75rem)',
            fontWeight: 600,
            letterSpacing: '-0.03em',
            margin: '0 0 0.85rem 0',
            color: 'var(--text-primary)',
          }}
        >
          Esta página desapareceu do mapa.
        </h2>

        <p
          style={{
            fontSize: '15px',
            color: 'var(--text-secondary)',
            maxWidth: '520px',
            lineHeight: 1.6,
            margin: '0 0 2rem 0',
          }}
        >
          O link acessado pode ter sido alterado, removido ou nunca existiu. Verifique o endereço
          digitado ou explore os atalhos abaixo.
        </p>

        {/* Action Buttons */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
            flexWrap: 'wrap',
            marginBottom: '3.5rem',
          }}
        >
          <button
            onClick={handleGoBack}
            className="btn btn-secondary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.15rem',
            }}
          >
            <ArrowLeft size={15} />
            <span>Voltar à página anterior</span>
          </button>

          <Link
            to={isAuthenticated ? '/dashboard' : '/'}
            className="btn btn-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.65rem 1.25rem',
            }}
          >
            {isAuthenticated ? <LayoutDashboard size={15} /> : <Home size={15} />}
            <span>{isAuthenticated ? 'Ir para o Painel da Agência' : 'Voltar ao Início'}</span>
          </Link>
        </div>

        {/* Quick Links Navigation Grid */}
        <div style={{ width: '100%', textAlign: 'left' }}>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-muted)',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            <Search size={13} />
            <span>Destinos Recomendados</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '0.85rem',
            }}
          >
            {quickLinks.map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  to={item.to}
                  style={{
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: '8px',
                    padding: '1rem',
                    textDecoration: 'none',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-dropdown)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-hairline)';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      backgroundColor: 'var(--accent-subtle)',
                      color: 'var(--accent-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon size={16} />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        marginBottom: '0.2rem',
                      }}
                    >
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-muted)',
                        lineHeight: 1.4,
                      }}
                    >
                      {item.desc}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </main>

      {/* Clean Minimalist Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-hairline)',
          padding: '1.5rem',
          textAlign: 'center',
          fontSize: '12px',
          color: 'var(--text-muted)',
        }}
      >
        Marketiv.io • Gestão Criativa & Aprovação de Entregáveis para Agências
      </footer>
    </div>
  );
};
