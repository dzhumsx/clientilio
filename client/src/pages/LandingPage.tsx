import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Zap,
  Users,
  Eye,
  CreditCard,
  Layers,
  FolderKanban
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const plans = [
    {
      name: 'Free',
      price: 'R$ 0',
      period: 'para sempre',
      desc: 'Ideal para freelancers e profissionais autônomos testarem.',
      features: ['Até 2 clientes ativos', 'Até 3 projetos simultâneos', '2 membros da equipe', '100 MB de armazenamento', 'Portal do cliente padrão'],
      highlight: false,
    },
    {
      name: 'Pro',
      price: 'R$ 59',
      period: '/mês',
      desc: 'Para estúdios e agências em crescimento.',
      features: ['Até 10 clientes ativos', 'Até 25 projetos simultâneos', '5 membros na equipe', '1 GB de armazenamento', 'Notificações e histórico'],
      highlight: true,
      tag: 'Mais Popular',
    },
    {
      name: 'Business',
      price: 'R$ 119',
      period: '/mês',
      desc: 'Para agências consolidadas que exigem white-label.',
      features: ['Até 30 clientes ativos', 'Até 100 projetos', '15 membros na equipe', '5 GB de armazenamento', 'White-label (sem marca Nexora)', 'Domínio personalizado'],
      highlight: false,
    },
    {
      name: 'Agency',
      price: 'R$ 239',
      period: '/mês',
      desc: 'Escala total com capacidade máxima e automações.',
      features: ['Até 100 clientes ativos', 'Até 500 projetos', '50 membros de equipe', '20 GB de armazenamento', 'White-label + Domínio próprio', 'Suporte prioritário 24/7'],
      highlight: false,
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Top Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          padding: '1.25rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1280px',
          margin: '0 auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--accent-gradient)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: 'var(--accent-glow)',
            }}
          >
            <Sparkles size={22} color="#fff" />
          </div>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, letterSpacing: '-0.03em' }}>Nexora</span>
        </div>

        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <a href="#features" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            Recursos
          </a>
          <a href="#pricing" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            Planos
          </a>
          <Link to="/portal" style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', fontWeight: 500 }}>
            Ver Demonstração do Portal
          </Link>
          <Link to="/login" className="btn btn-secondary btn-sm">
            Entrar
          </Link>
          <Link to="/register" className="btn btn-primary btn-sm">
            Criar Conta Grátis
          </Link>
        </nav>
      </header>

      {/* Hero Section */}
      <section
        style={{
          padding: '6rem 1.5rem 4rem',
          maxWidth: '1100px',
          margin: '0 auto',
          textAlign: 'center',
          position: 'relative',
        }}
      >
        {/* Glow ambient circle */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '500px',
            height: '300px',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.25) 0%, rgba(9, 13, 22, 0) 70%)',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <div style={{ position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.35rem 0.95rem',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(99, 102, 241, 0.12)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--text-link)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '1.75rem',
            }}
          >
            <Zap size={14} />
            <span>Portal de Clientes & Gestão de Projetos para Agências</span>
          </div>

          <h1
            style={{
              fontSize: '3.6rem',
              lineHeight: 1.15,
              fontWeight: 800,
              letterSpacing: '-0.04em',
              marginBottom: '1.5rem',
              maxWidth: '920px',
              margin: '0 auto 1.5rem',
            }}
          >
            A experiência de aprovação e acompanhamento que seus{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              clientes merecem.
            </span>
          </h1>

          <p
            style={{
              fontSize: '1.25rem',
              color: 'var(--text-secondary)',
              maxWidth: '680px',
              margin: '0 auto 2.5rem',
              lineHeight: 1.6,
            }}
          >
            Diga adeus a aprovações perdidas no WhatsApp e feedback desorganizado. O Nexora centraliza entregáveis,
            comentários com versionamento e faturamento recorrente.
          </p>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <Link to="/register" className="btn btn-primary btn-lg">
              <span>Experimentar Grátis Agora</span>
              <ArrowRight size={18} />
            </Link>
            <Link to="/portal" className="btn btn-secondary btn-lg">
              <Eye size={18} />
              <span>Ver Portal do Cliente</span>
            </Link>
          </div>

          {/* Social Proof Stats */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '2rem',
              maxWidth: '750px',
              margin: '4.5rem auto 0',
              padding: '1.5rem',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-xl)',
            }}
          >
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: '#ffffff' }}>98%</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Agilidade nas Aprovações</p>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-subtle)', borderRight: '1px solid var(--border-subtle)' }}>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--color-success)' }}>100%</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Isolamento Multi-tenant</p>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text-link)' }}>Zero</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Atrasos por Ruído</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" style={{ padding: '5rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>
            Tudo o que sua agência precisa para escalar
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '580px', margin: '0 auto' }}>
            Projetado de ponta a ponta com foco na experiência do cliente final e na produtividade da sua equipe.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.75rem' }}>
          <div className="card card-interactive">
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <Eye size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Portal do Cliente Dedicado</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Uma interface simplificada e limpa onde seu cliente visualiza apenas os entregáveis prontos para revisão,
              com botão de aprovação rápida ou solicitação de ajustes estruturados.
            </p>
          </div>

          <div className="card card-interactive">
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Fluxo Formal de Aprovação</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Histórico rastreável de cada versão (v1, v2, v3), quem aprovou, data, hora e comentários pontuais.
              Elimina o "eu não aprovei isso" da rotina da sua agência.
            </p>
          </div>

          <div className="card card-interactive">
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(14, 165, 233, 0.15)',
                color: 'var(--color-info)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <FolderKanban size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Gestão de Projetos & Tarefas</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Acompanhe status em tempo real, prazos de entrega, responsáveis internos e prioridades operacionais sem
              complexidade excessiva.
            </p>
          </div>

          <div className="card card-interactive">
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(168, 85, 247, 0.15)',
                color: '#c084fc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <CreditCard size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Gateway Stripe Integrado</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Assinaturas mensais em Reais (BRL), controle de limites por plano (Free, Pro, Business, Agency), checkout
              seguro e simulação integrada para desenvolvimento.
            </p>
          </div>

          <div className="card card-interactive">
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(245, 158, 11, 0.15)',
                color: 'var(--color-warning)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Segurança & Isolamento de Dados</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Criptografia com bcrypt (salt rounds: 12), tokens JWT com rotação contínua e garantia rigorosa de que um
              cliente jamais veja arquivos de outros clientes.
            </p>
          </div>

          <div className="card card-interactive">
            <div
              style={{
                width: '44px',
                height: '44px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(244, 63, 94, 0.15)',
                color: 'var(--color-danger)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1.25rem',
              }}
            >
              <Layers size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>White-Label Completo</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.925rem', lineHeight: 1.6 }}>
              Nos planos avançados, customize a paleta de cores, logotipo da sua agência e oculte a menção à Nexora para
              entregar uma experiência 100% personalizada.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ padding: '5rem 1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <h2 style={{ fontSize: '2.4rem', fontWeight: 800, marginBottom: '0.75rem' }}>Planos transparentes e escaláveis</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem' }}>
            Comece no plano gratuito e faça upgrade conforme sua agência conquista novos clientes.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {plans.map((p) => (
            <div
              key={p.name}
              className="card"
              style={{
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                border: p.highlight ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                background: p.highlight ? 'linear-gradient(180deg, rgba(99, 102, 241, 0.08) 0%, var(--bg-card) 100%)' : 'var(--bg-card)',
              }}
            >
              {p.tag && (
                <div
                  style={{
                    position: 'absolute',
                    top: '-12px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'var(--accent-gradient)',
                    color: '#fff',
                    padding: '0.2rem 0.75rem',
                    borderRadius: 'var(--radius-full)',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                  }}
                >
                  {p.tag}
                </div>
              )}

              <div style={{ marginBottom: '1.25rem' }}>
                <h3 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{p.name}</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.25rem' }}>{p.desc}</p>
              </div>

              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff' }}>{p.price}</span>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{p.period}</span>
              </div>

              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem', flex: 1, marginBottom: '2rem' }}>
                {p.features.map((feat) => (
                  <li key={feat} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem' }}>
                    <CheckCircle2 size={16} color="var(--color-success)" />
                    <span>{feat}</span>
                  </li>
                ))}
              </ul>

              <Link
                to="/register"
                className={`btn ${p.highlight ? 'btn-primary' : 'btn-secondary'}`}
                style={{ width: '100%' }}
              >
                Começar no {p.name}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '2.5rem 2rem',
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-muted)',
          fontSize: '0.875rem',
          flexWrap: 'wrap',
          gap: '1rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Sparkles size={16} color="var(--accent-primary)" />
          <span>© 2026 Nexora Software. Todos os direitos reservados. Pronto para Railway.</span>
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <Link to="/login">Entrar</Link>
          <Link to="/register">Registrar</Link>
          <Link to="/portal">Portal do Cliente</Link>
        </div>
      </footer>
    </div>
  );
};
