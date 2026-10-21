import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Check,
  ShieldCheck,
  Users,
  FolderKanban,
  FileCheck2,
  Sun,
  Moon,
  Sparkles,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  Clock,
  Layers,
  Palette
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { Logo, LogoIcon } from '../components/Logo';

export const LandingPage: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const plans = [
    {
      name: 'Free',
      price: 'R$ 0',
      period: 'para sempre',
      desc: 'Para freelancers e profissionais autônomos no início.',
      features: ['2 clientes ativos', '3 projetos simultâneos', 'Links ilimitados (Figma, Canva, Drive)', 'Portal do cliente padrão'],
      highlight: false,
    },
    {
      name: 'Pro',
      price: 'R$ 59',
      period: '/mês',
      desc: 'Para criativos experientes e estúdios em crescimento.',
      features: ['10 clientes ativos', '25 projetos simultâneos', '2 membros na equipe', 'Histórico de versões de entregáveis', 'Notificações automáticas por email'],
      highlight: false,
    },
    {
      name: 'Business',
      price: 'R$ 119',
      period: '/mês',
      desc: 'Para agências de marketing com maiores volumes.',
      features: ['30 clientes ativos', '100 projetos simultâneos', '5 membros na equipe', 'Aprovações ilimitadas'],
      highlight: false,
    },
    {
      name: 'Agency',
      price: 'R$ 239',
      period: '/mês',
      desc: 'Para agências full-service com alto volume de clientes e campanhas.',
      features: ['Clientes ativos ilimitados', 'Projetos simultâneos ilimitados', 'Membros de equipe ilimitados', 'Relatórios executivos', 'Suporte com SLA prioritário'],
      highlight: true,
      tag: 'MAIS POPULAR',
    },
  ];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
      {/* Top Navigation Bar */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-canvas)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: '1280px',
            margin: '0 auto',
            height: '100%',
            padding: '0 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Brand Mark with Emerald Green Accent */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
            <Logo size={26} textSize="16px" />
          </Link>

          {/* Nav Links */}
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
            <a href="#features" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Recursos
            </a>
            <a href="#workflow" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Como Funciona
            </a>
            <a href="#pricing" style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
              Planos
            </a>
          </nav>

          {/* Action Cluster */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={toggleTheme}
              className="btn btn-ghost"
              style={{
                padding: '0.45rem',
                borderRadius: 'var(--radius-button)',
                color: 'var(--text-secondary)',
              }}
              aria-label="Alternar tema"
              title={theme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            <Link to="/login" className="btn btn-ghost btn-sm">
              Entrar
            </Link>
            <Link to="/register" className="btn btn-primary btn-sm">
              <span>Criar Conta</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section — Agency Marketing & Freelance Focus */}
      <section style={{ maxWidth: '1280px', margin: '0 auto', padding: '5rem 1.5rem 4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 0.85fr', gap: '3rem', alignItems: 'center' }}>
          <div>
            <div style={{ marginBottom: '1.25rem' }}>
              <span className="eyebrow" style={{ color: 'var(--accent-primary)', borderColor: 'var(--accent-border)', background: 'var(--accent-subtle)' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent-primary)', display: 'inline-block' }} />
                PLATAFORMA PARA AGÊNCIAS DE MARKETING & CRIATIVOS
              </span>
            </div>

            <h1
              style={{
                fontSize: 'clamp(2.4rem, 4.8vw, 3.75rem)',
                fontWeight: 600,
                lineHeight: 1.08,
                letterSpacing: '-0.045em',
                color: 'var(--text-primary)',
                marginBottom: '1.35rem',
              }}
            >
              Suas campanhas, clientes e aprovações organizadas em um só lugar.
            </h1>

            <p
              style={{
                fontSize: '1.05rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
                maxWidth: '540px',
                marginBottom: '2rem',
              }}
            >
              Diga adeus a aprovações perdidas no WhatsApp e planilhas confusas. Encante seus clientes com um portal profissional para aprovar criativos, vídeos, copys e relatórios em tempo real.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flexWrap: 'wrap' }}>
              <Link to="/register" className="btn btn-primary btn-lg">
                <span>Começar Gratuitamente</span>
                <ArrowRight size={16} />
              </Link>
              <Link to="/portal" className="btn btn-ghost btn-lg">
                <span>Ver Portal do Cliente</span>
                <ExternalLink size={14} />
              </Link>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginTop: '2.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Check size={14} style={{ color: 'var(--accent-primary)' }} />
                <span>SEM CARTÃO PARA TESTAR</span>
              </div>
            </div>
          </div>

          {/* Interactive Marketing Campaign & Deliverables Showcase Card */}
          <div
            className="card"
            style={{
              padding: '1.5rem',
              boxShadow: 'var(--shadow-modal)',
              border: '1px solid var(--accent-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem',
              background: 'var(--bg-surface)',
            }}
          >
            {/* Window Top Controls */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid var(--border-hairline)',
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }} />
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }} />
              </div>
              <span style={{ color: 'var(--text-secondary)' }}>PORTAL DO CLIENTE • Marketiv.io</span>
            </div>

            {/* Campaign Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.35rem' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  CLIENTE: RED BULL BRASIL
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '9999px',
                    background: 'var(--accent-subtle)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: 'var(--accent-primary)' }} />
                  AGUARDANDO REVISÃO
                </span>
              </div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
                Campanha Q4 — Tráfego Pago & Reels Criativos
              </h3>
            </div>

            {/* Deliverables Pipeline Showcase */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.85rem',
                  borderRadius: '6px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Palette size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: 500 }}>Carrossel Meta Ads (1080x1350)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>v2.2</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  ✓ APROVADO
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.85rem',
                  borderRadius: '6px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--accent-border)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Layers size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: 500 }}>Vídeos Reels & TikTok (Motion 9:16)</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>v3.0</span>
                </div>
                <div style={{ display: 'flex', gap: '0.35rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '11px', height: '24px' }}
                  >
                    <ThumbsUp size={11} />
                    <span>Aprovar</span>
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ padding: '0.2rem 0.6rem', fontSize: '11px', height: '24px' }}
                  >
                    <MessageSquare size={11} />
                    <span>Ajuste</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.625rem 0.85rem',
                  borderRadius: '6px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-hairline)',
                  fontSize: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileCheck2 size={14} style={{ color: 'var(--accent-primary)' }} />
                  <span style={{ fontWeight: 500 }}>Copywriting & Roteiro dos Criativos</span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '10px', color: 'var(--text-tertiary)' }}>v1.0</span>
                </div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--accent-primary)', fontWeight: 600 }}>
                  ✓ APROVADO
                </span>
              </div>
            </div>

            {/* Client Quote & Status */}
            <div
              style={{
                padding: '0.75rem',
                borderRadius: '6px',
                background: 'var(--accent-subtle)',
                border: '1px solid var(--accent-border)',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                lineHeight: 1.4,
              }}
            >
              <strong style={{ color: 'var(--accent-primary)', display: 'block', marginBottom: '2px', fontFamily: 'var(--font-mono)' }}>
                FEEDBACK DO CLIENTE:
              </strong>
              "Adoramos a versão v2.2 das artes! Podem subir no Gerenciador de Anúncios assim que o vídeo estiver aprovado."
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Strip */}
      <section
        style={{
          borderTop: '1px solid var(--border-hairline)',
          borderBottom: '1px solid var(--border-hairline)',
          backgroundColor: 'var(--bg-subtle)',
          padding: '2rem 1.5rem',
        }}
      >
        <div style={{ maxWidth: '1280px', margin: '0 auto', textAlign: 'center' }}>
          <p className="eyebrow" style={{ marginBottom: '1.25rem', textAlign: 'center', display: 'block', color: 'var(--text-tertiary)' }}>
            CONFIADO POR MAIS DE 500 AGÊNCIAS E PROFISSIONAIS CRIATIVOS
          </p>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3rem',
              flexWrap: 'wrap',
              opacity: 0.85,
              fontSize: '14px',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--text-secondary)',
            }}
          >
            <span>STUDIO LUMINA</span>
            <span>VÉRTICE PERFORMANCE</span>
            <span>ALPHA BRANDING</span>
            <span>CRIATIVA CO.</span>
            <span>NORTH MEDIA</span>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section id="features" style={{ maxWidth: '1280px', margin: '0 auto', padding: '5.5rem 1.5rem' }}>
        <div style={{ marginBottom: '3rem', maxWidth: '640px' }}>
          <span className="eyebrow" style={{ marginBottom: '0.75rem', display: 'inline-block', color: 'var(--accent-primary)', borderColor: 'var(--accent-border)' }}>
            RECURSOS CRIADOS PARA AGÊNCIAS
          </span>
          <h2 style={{ fontSize: '2.1rem', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: '0.85rem' }}>
            Tudo o que sua agência precisa para reter clientes e entregar no prazo.
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '15px', lineHeight: 1.55 }}>
            Acabe com a desorganização de arquivos e garanta aprovações rápidas com uma experiência que valoriza o trabalho criativo da sua equipe.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '6px', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <Users size={16} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Gestão de Contratos & Retainers</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.55, margin: 0 }}>
              Controle de contas ativas, contatos decisores, orçamentos mensais acordados e histórico confidencial de cada cliente da sua agência.
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '6px', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <FolderKanban size={16} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Projetos & Campanhas Criativas</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.55, margin: 0 }}>
              Acompanhamento de prazos, escopos de Social Media, Branding, Tráfego Pago e Produção de Conteúdo em um painel claro e objetivo.
            </p>
          </div>

          <div className="card" style={{ padding: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.85rem' }}>
              <div style={{ width: 32, height: 32, borderRadius: '6px', background: 'var(--accent-subtle)', border: '1px solid var(--accent-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-primary)' }}>
                <FileCheck2 size={16} />
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>Aprovações & Versionamento</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.55, margin: 0 }}>
              Envio de layouts do Figma, vídeos do Drive e copys com versionamento formal (v1, v2, v3), registro de aprovação e solicitação de ajustes.
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" style={{ borderTop: '1px solid var(--border-hairline)', backgroundColor: 'var(--bg-subtle)', padding: '5.5rem 1.5rem' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', maxWidth: '600px', margin: '0 auto 3.5rem' }}>
            <span className="eyebrow" style={{ marginBottom: '0.75rem', display: 'inline-block', color: 'var(--accent-primary)', borderColor: 'var(--accent-border)' }}>
              PLANOS TRANSPARENTES
            </span>
            <h2 style={{ fontSize: '2.1rem', fontWeight: 600, letterSpacing: '-0.035em', lineHeight: 1.15, marginBottom: '0.85rem' }}>
              Planos que crescem junto com a sua agência.
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Sem contratos de fidelidade. Escolha a quantidade de clientes que gerencia hoje e evolua a qualquer momento.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
            {plans.map((p) => (
              <div
                key={p.name}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  padding: '1.5rem',
                  borderColor: p.highlight ? 'var(--accent-primary)' : 'var(--border-hairline)',
                  boxShadow: p.highlight ? 'var(--accent-glow)' : 'none',
                  backgroundColor: 'var(--bg-surface)',
                }}
              >
                {p.highlight && (
                  <div style={{ position: 'absolute', top: '-11px', left: '16px' }}>
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        fontFamily: 'var(--font-mono)',
                        padding: '2px 8px',
                        borderRadius: '9999px',
                        background: 'var(--accent-primary)',
                        color: '#ffffff',
                      }}
                    >
                      {p.tag}
                    </span>
                  </div>
                )}

                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600, marginBottom: '0.25rem' }}>{p.name}</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', minHeight: '38px', margin: 0 }}>{p.desc}</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.35rem', marginBottom: '1.5rem' }}>
                  <span style={{ fontSize: '2.1rem', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                    {p.price}
                  </span>
                  <span style={{ fontSize: '13px', color: 'var(--text-tertiary)' }}>{p.period}</span>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 1.75rem', display: 'flex', flexDirection: 'column', gap: '0.65rem', flex: 1 }}>
                  {p.features.map((f, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '13px', color: 'var(--text-secondary)' }}>
                      <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/register"
                  className={p.highlight ? 'btn btn-primary' : 'btn btn-outline'}
                  style={{ width: '100%', textAlign: 'center', justifyContent: 'center' }}
                >
                  Começar no {p.name}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid var(--border-hairline)', padding: '2.5rem 1.5rem', backgroundColor: 'var(--bg-canvas)' }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div
              style={{
                width: '20px',
                height: '20px',
                borderRadius: '4px',
                background: 'var(--accent-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '9px',
                fontWeight: 900,
              }}
            >
              ▲
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
              Marketiv.io — Gestão para Agências & Criativos
            </span>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, fontFamily: 'var(--font-mono)' }}>
            © {new Date().getFullYear()} Marketiv.io. Feito para estúdios e agências de alta performance.
          </p>
        </div>
      </footer>
    </div>
  );
};

