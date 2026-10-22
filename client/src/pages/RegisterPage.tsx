import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowRight,
  Lock,
  Mail,
  User,
  Building2,
  AlertCircle,
  Sun,
  Moon,
  Sparkles,
  CheckCircle2,
  Eye,
  EyeOff,
  Users,
  ShieldCheck,
  KeyRound,
  Check,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Logo, LogoIcon } from '../components/Logo';
import { api } from '../services/api';

type RegisterMode = 'create_agency' | 'join_invite';

interface InvitePreview {
  id: string;
  email: string;
  role: string;
  organization: {
    id: string;
    name: string;
    slug: string;
  };
  inviterName: string;
  expiresAt: string;
}

const AGENCY_NICHES = [
  'Publicidade & Tráfego',
  'Design & Branding',
  'Social Media & Conteúdo',
  'Audiovisual & Produção',
  'Tech & Dev',
];

export const RegisterPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const emailParam = searchParams.get('email');
  const tokenParam = searchParams.get('token');
  const redirectParam = searchParams.get('redirect');
  const modeParam = searchParams.get('mode');

  // Extract invite token if present in any query parameter
  const extractedInviteToken =
    tokenParam ||
    (redirectParam?.includes('/invite/')
      ? redirectParam.split('/invite/')[1]?.split('?')[0]
      : null);

  const [mode, setMode] = useState<RegisterMode>(
    extractedInviteToken || modeParam === 'invite' ? 'join_invite' : 'create_agency'
  );

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState(emailParam || '');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [selectedNiche, setSelectedNiche] = useState<string>('');

  // Invite-specific states
  const [inviteTokenInput, setInviteTokenInput] = useState(extractedInviteToken || '');
  const [activeInviteToken, setActiveInviteToken] = useState<string | null>(extractedInviteToken || null);
  const [invitePreview, setInvitePreview] = useState<InvitePreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [alsoCreatePersonalAgency, setAlsoCreatePersonalAgency] = useState(false);

  // General form feedback
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  // Slug generation preview helper
  const slugPreview = companyName
    ? companyName
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'minha-agencia'
    : 'minha-agencia';

  // Password strength calculation
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'Muito fraca', color: 'var(--text-tertiary)' };
    let score = 0;
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { score: 1, label: 'Fraca', color: '#ef4444' };
    if (score === 2 || score === 3) return { score: 2, label: 'Média', color: '#f59e0b' };
    if (score === 4) return { score: 3, label: 'Forte', color: '#10b981' };
    return { score: 4, label: 'Excelente', color: '#059669' };
  };

  const passwordStrength = getPasswordStrength(password);

  // Fetch invitation preview when activeInviteToken changes
  useEffect(() => {
    if (!activeInviteToken) {
      setInvitePreview(null);
      setInviteError(null);
      return;
    }

    const fetchPreview = async () => {
      setLoadingPreview(true);
      setInviteError(null);
      try {
        const { data } = await api.get(`/organizations/invitations/preview/${activeInviteToken}`);
        setInvitePreview(data);
        if (data.email && !email) {
          setEmail(data.email);
        }
      } catch (err: any) {
        console.error('Failed to load invitation preview:', err);
        setInviteError(
          err.response?.data?.error?.message ||
            'Convite não encontrado ou expirado. Verifique o código e tente novamente.'
        );
        setInvitePreview(null);
      } finally {
        setLoadingPreview(false);
      }
    };

    fetchPreview();
  }, [activeInviteToken]);

  // Handle manual invite code validation
  const handleValidateInviteCode = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inviteTokenInput.trim()) {
      setInviteError('Por favor, informe o código ou link do convite.');
      return;
    }

    let token = inviteTokenInput.trim();
    if (token.includes('/invite/')) {
      token = token.split('/invite/')[1]?.split('?')[0] || token;
    } else if (token.includes('token=')) {
      token = new URLSearchParams(token.split('?')[1]).get('token') || token;
    }

    setActiveInviteToken(token);
  };

  const handleSelectMode = (newMode: RegisterMode) => {
    setMode(newMode);
    setError(null);
    const newParams = new URLSearchParams(searchParams);
    if (newMode === 'join_invite') {
      newParams.set('mode', 'invite');
    } else {
      newParams.delete('mode');
    }
    setSearchParams(newParams, { replace: true });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('A senha deve conter no mínimo 8 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('As senhas não coincidem. Por favor, confirme sua senha corretamente.');
      return;
    }

    // Validation per mode
    if (mode === 'create_agency') {
      if (!companyName.trim()) {
        setError('Por favor, informe o nome da sua agência.');
        return;
      }
    } else {
      if (!activeInviteToken) {
        setError('Você precisa informar um código de convite válido para ingressar em uma agência existente.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'create_agency') {
        const finalAgencyName = selectedNiche
          ? `${companyName.trim()}`
          : companyName.trim();

        await register(
          name.trim(),
          email.trim(),
          password,
          finalAgencyName,
          undefined,
          true
        );
      } else {
        // Joining via invite
        await register(
          name.trim(),
          email.trim(),
          password,
          alsoCreatePersonalAgency && companyName.trim() ? companyName.trim() : undefined,
          activeInviteToken || undefined,
          alsoCreatePersonalAgency
        );
      }

      navigate('/dashboard');
    } catch (err: any) {
      console.error('Registration error:', err);
      setError(
        err.response?.data?.error?.message ||
          'Não foi possível concluir o cadastro. Verifique os dados inseridos.'
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
        padding: '2rem 1rem',
        position: 'relative',
      }}
    >
      {/* Top Bar with Brand Link & Theme Toggle */}
      <div
        style={{
          position: 'absolute',
          top: '1.25rem',
          left: '1.5rem',
          right: '1.5rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          maxWidth: '1200px',
          margin: '0 auto',
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
            width: 34,
            height: 34,
            borderRadius: '6px',
            border: '1px solid var(--border-hairline)',
            background: 'var(--bg-surface)',
            color: 'var(--text-secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'background 0.2s',
          }}
        >
          {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>

      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '2.25rem 2rem',
          marginTop: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: 'var(--shadow-lg, 0 10px 25px -5px rgba(0,0,0,0.1))',
          borderRadius: 'var(--radius-lg, 12px)',
        }}
      >
        {/* Brand Icon Header */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ margin: '0 auto 0.75rem', display: 'flex', justifyContent: 'center' }}>
            <LogoIcon size={44} />
          </div>

          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 700,
              letterSpacing: '-0.035em',
              color: 'var(--text-primary)',
              margin: '0 0 0.35rem 0',
            }}
          >
            {mode === 'create_agency' ? 'Criar Workspace da Agência' : 'Entrar em Agência Existente'}
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '0.84rem',
              margin: 0,
              lineHeight: 1.4,
            }}
          >
            {mode === 'create_agency'
              ? 'Configure a sua agência, equipe e portal de clientes em poucos segundos.'
              : 'Conclua seu cadastro para colaborar com a equipe que enviou seu convite.'}
          </p>
        </div>

        {/* Mode Selector Segmented Control */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            background: 'var(--bg-subtle, rgba(0,0,0,0.04))',
            padding: '4px',
            borderRadius: '8px',
            border: '1px solid var(--border-hairline)',
            marginBottom: '1.5rem',
            gap: '4px',
          }}
        >
          <button
            type="button"
            onClick={() => handleSelectMode('create_agency')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.625rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: mode === 'create_agency' ? 600 : 500,
              border: 'none',
              cursor: 'pointer',
              background: mode === 'create_agency' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'create_agency' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: mode === 'create_agency' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
            }}
          >
            <Building2 size={16} color={mode === 'create_agency' ? 'var(--accent-primary)' : 'currentColor'} />
            <span>Criar Nova Agência</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectMode('join_invite')}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              padding: '0.625rem 0.75rem',
              borderRadius: '6px',
              fontSize: '0.8125rem',
              fontWeight: mode === 'join_invite' ? 600 : 500,
              border: 'none',
              cursor: 'pointer',
              background: mode === 'join_invite' ? 'var(--bg-surface)' : 'transparent',
              color: mode === 'join_invite' ? 'var(--text-primary)' : 'var(--text-secondary)',
              boxShadow: mode === 'join_invite' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              transition: 'all 0.15s ease',
              position: 'relative',
            }}
          >
            <Users size={16} color={mode === 'join_invite' ? 'var(--accent-primary)' : 'currentColor'} />
            <span>Entrar por Convite</span>
            {activeInviteToken && (
              <span
                style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'var(--accent-primary)',
                  position: 'absolute',
                  top: '6px',
                  right: '6px',
                }}
              />
            )}
          </button>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              borderRadius: '6px',
              padding: '0.75rem 0.875rem',
              marginBottom: '1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.625rem',
              color: '#ef4444',
              fontSize: '0.8125rem',
            }}
          >
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
            <span>{error}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE B: JOIN VIA INVITATION HEADER & PREVIEW CARD              */}
        {/* ============================================================== */}
        {mode === 'join_invite' && (
          <div style={{ marginBottom: '1.5rem' }}>
            {!activeInviteToken ? (
              // Prompt for invite token if not provided
              <div
                style={{
                  background: 'var(--bg-subtle, rgba(0,0,0,0.03))',
                  border: '1px dashed var(--border-hairline)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-primary)' }}>
                  <KeyRound size={16} color="var(--accent-primary)" />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Insira o código do seu convite</span>
                </div>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', margin: 0 }}>
                  Se você recebeu um convite por e-mail ou link da agência, cole o código ou link abaixo para verificar:
                </p>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={inviteTokenInput}
                    onChange={(e) => setInviteTokenInput(e.target.value)}
                    placeholder="Cole aqui o token ou link de convite"
                    style={{ flex: 1, height: '34px', fontSize: '0.8125rem' }}
                  />
                  <button
                    type="button"
                    onClick={() => handleValidateInviteCode()}
                    className="btn btn-secondary btn-sm"
                    style={{ height: '34px', padding: '0 0.875rem', flexShrink: 0 }}
                  >
                    Verificar
                  </button>
                </div>
                {inviteError && (
                  <div style={{ color: '#ef4444', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={13} />
                    <span>{inviteError}</span>
                  </div>
                )}
              </div>
            ) : loadingPreview ? (
              <div
                style={{
                  padding: '1.5rem',
                  textAlign: 'center',
                  background: 'var(--bg-subtle, rgba(0,0,0,0.03))',
                  borderRadius: '8px',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--text-secondary)',
                  fontSize: '0.8125rem',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Localizando agência do convite...
              </div>
            ) : invitePreview ? (
              // Active Valid Invitation Card
              <div
                style={{
                  background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.08) 0%, rgba(168, 85, 247, 0.06) 100%)',
                  border: '1px solid rgba(99, 102, 241, 0.28)',
                  borderRadius: '10px',
                  padding: '1.125rem 1.25rem',
                  position: 'relative',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: '8px',
                        background: 'var(--accent-primary)',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 700,
                        fontSize: '1rem',
                      }}
                    >
                      {invitePreview.organization.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          fontFamily: 'var(--font-mono)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          color: 'var(--accent-primary)',
                          fontWeight: 600,
                          display: 'block',
                        }}
                      >
                        Agência Convidante
                      </span>
                      <h3
                        style={{
                          fontSize: '1.0625rem',
                          fontWeight: 700,
                          color: 'var(--text-primary)',
                          margin: 0,
                          letterSpacing: '-0.02em',
                        }}
                      >
                        {invitePreview.organization.name}
                      </h3>
                    </div>
                  </div>

                  <span
                    style={{
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: 'var(--accent-primary)',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em',
                    }}
                  >
                    {invitePreview.role === 'ADMIN' ? 'ADMIN' : 'COLABORADOR'}
                  </span>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
                    gap: '0.625rem',
                    fontSize: '0.78rem',
                    color: 'var(--text-secondary)',
                    paddingTop: '0.625rem',
                    borderTop: '1px solid rgba(99, 102, 241, 0.15)',
                  }}
                >
                  <div>
                    <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.72rem' }}>Convidado por:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{invitePreview.inviterName || 'Administrador'}</strong>
                  </div>
                  <div>
                    <span style={{ color: 'var(--text-tertiary)', display: 'block', fontSize: '0.72rem' }}>E-mail autorizado:</span>
                    <strong style={{ color: 'var(--text-primary)' }}>{invitePreview.email}</strong>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: '0.75rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <CheckCircle2 size={13} color="var(--accent-primary)" />
                  <span>Sua conta terá acesso imediato aos projetos e campanhas desta agência.</span>
                </div>
              </div>
            ) : (
              // Invalid Token Banner
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  borderRadius: '8px',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.5rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, fontSize: '0.8125rem' }}>
                  <AlertCircle size={16} />
                  <span>{inviteError || 'Convite inválido ou expirado.'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveInviteToken(null);
                    setInviteTokenInput('');
                    setInviteError(null);
                  }}
                  className="btn btn-secondary btn-sm"
                  style={{ alignSelf: 'flex-start', marginTop: '0.25rem' }}
                >
                  Tentar outro código
                </button>
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* REGISTRATION FORM                                             */}
        {/* ============================================================== */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* SECTION 1: AGENCY INFO (Only in create_agency mode or if opted-in) */}
          {mode === 'create_agency' && (
            <div
              style={{
                background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                border: '1px solid var(--border-hairline)',
                borderRadius: '8px',
                padding: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.875rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--accent-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem',
                  }}
                >
                  <Building2 size={13} />
                  Identificação da Agência
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-tertiary)',
                  }}
                >
                  Plano Agency Starter
                </span>
              </div>

              <div>
                <label
                  style={{
                    display: 'block',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    marginBottom: '0.375rem',
                  }}
                >
                  Nome da Agência ou Estúdio <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    required={mode === 'create_agency'}
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Ex: Studio Alpha Criativo"
                    style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.84rem' }}
                  />
                  <Building2
                    size={15}
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

              {/* Dynamic URL / Workspace Slug Preview */}
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-tertiary)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontFamily: 'var(--font-mono)',
                  background: 'var(--bg-canvas)',
                  padding: '0.45rem 0.65rem',
                  borderRadius: '4px',
                  border: '1px solid var(--border-hairline)',
                }}
              >
                <span>URL do workspace:</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                  marketiv.io/<span style={{ color: 'var(--accent-primary)' }}>{slugPreview}</span>
                </span>
              </div>

              {/* Quick Niche Tags */}
              <div>
                <span
                  style={{
                    display: 'block',
                    fontSize: '0.71rem',
                    color: 'var(--text-tertiary)',
                    marginBottom: '0.35rem',
                  }}
                >
                  Segmento principal (opcional):
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
                  {AGENCY_NICHES.map((niche) => {
                    const isSelected = selectedNiche === niche;
                    return (
                      <button
                        key={niche}
                        type="button"
                        onClick={() => setSelectedNiche(isSelected ? '' : niche)}
                        style={{
                          fontSize: '0.71rem',
                          padding: '3px 8px',
                          borderRadius: '12px',
                          border: isSelected
                            ? '1px solid var(--accent-primary)'
                            : '1px solid var(--border-hairline)',
                          background: isSelected ? 'var(--accent-subtle)' : 'var(--bg-surface)',
                          color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {isSelected && <Check size={11} style={{ marginRight: '3px', verticalAlign: 'middle' }} />}
                        {niche}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 2: USER PROFILE DATA */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}
            >
              Seu Nome Completo <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Carlos Oliveira"
                style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.84rem' }}
              />
              <User
                size={15}
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
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}
            >
              E-mail de Trabalho <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="carlos@agencia.com"
                style={{ paddingLeft: '2.25rem', height: '38px', fontSize: '0.84rem' }}
              />
              <Mail
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
            </div>
            {mode === 'join_invite' && invitePreview?.email && invitePreview.email.toLowerCase() !== email.toLowerCase().trim() && (
              <span style={{ fontSize: '0.72rem', color: '#f59e0b', marginTop: '3px', display: 'block' }}>
                Aviso: O convite foi enviado para <strong>{invitePreview.email}</strong>. Recomendamos utilizar o mesmo endereço.
              </span>
            )}
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                Senha de Acesso <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {password && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: passwordStrength.color,
                    fontWeight: 600,
                  }}
                >
                  {passwordStrength.label}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
                style={{ paddingLeft: '2.25rem', paddingRight: '2.25rem', height: '38px', fontSize: '0.84rem' }}
              />
              <Lock
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
                aria-label={showPassword ? 'Ocultar senha' : 'Exibir senha'}
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Password strength bar */}
            {password && (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '4px',
                  marginTop: '0.375rem',
                }}
              >
                {[1, 2, 3, 4].map((step) => (
                  <div
                    key={step}
                    style={{
                      height: '3px',
                      borderRadius: '2px',
                      backgroundColor:
                        step <= passwordStrength.score ? passwordStrength.color : 'var(--border-hairline)',
                      transition: 'background-color 0.2s',
                    }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Confirm Password Field */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.375rem' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                }}
              >
                Confirmar Senha <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {confirmPassword && (
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    color: password === confirmPassword ? '#10b981' : '#ef4444',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '3px',
                  }}
                >
                  {password === confirmPassword ? '✓ Senhas coincidem' : '✕ Senhas não coincidem'}
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita sua senha"
                style={{
                  paddingLeft: '2.25rem',
                  paddingRight: '2.25rem',
                  height: '38px',
                  fontSize: '0.84rem',
                  borderColor:
                    confirmPassword && password !== confirmPassword
                      ? 'rgba(239, 68, 68, 0.5)'
                      : undefined,
                }}
              />
              <Lock
                size={15}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: 'absolute',
                  right: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-tertiary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 0,
                }}
                aria-label={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Exibir confirmação de senha'}
              >
                {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Optional: Checkbox in Invite mode to also create an agency if they want */}
          {mode === 'join_invite' && (
            <div
              style={{
                marginTop: '0.25rem',
                paddingTop: '0.75rem',
                borderTop: '1px dashed var(--border-hairline)',
              }}
            >
              <label
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.5rem',
                  fontSize: '0.78rem',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={alsoCreatePersonalAgency}
                  onChange={(e) => setAlsoCreatePersonalAgency(e.target.checked)}
                  style={{ marginTop: '2px' }}
                />
                <span>Também criar um workspace de agência própria independente (opcional)</span>
              </label>

              {alsoCreatePersonalAgency && (
                <div style={{ marginTop: '0.625rem', paddingLeft: '1.5rem' }}>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Nome da sua agência pessoal"
                    style={{ height: '34px', fontSize: '0.8rem' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading || (mode === 'join_invite' && !activeInviteToken)}
            className="btn btn-primary"
            style={{
              width: '100%',
              marginTop: '0.5rem',
              height: '40px',
              fontSize: '0.875rem',
              fontWeight: 600,
              justifyContent: 'center',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
            }}
          >
            {loading ? (
              <span>Configurando workspace...</span>
            ) : mode === 'create_agency' ? (
              <>
                <span>Criar Agência e Acessar Painel</span>
                <ArrowRight size={15} />
              </>
            ) : (
              <>
                <span>
                  {invitePreview
                    ? `Ingressar em ${invitePreview.organization.name}`
                    : 'Concluir Cadastro & Ingressar'}
                </span>
                <ArrowRight size={15} />
              </>
            )}
          </button>
        </form>

        {/* Footer Guarantee / Trust notes */}
        <div
          style={{
            marginTop: '1.25rem',
            textAlign: 'center',
            fontSize: '0.75rem',
            color: 'var(--text-tertiary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.75rem',
          }}
        >
          {mode === 'create_agency' ? (
            <>
              <span>✓ 7 dias de avaliação gratuita</span>
              <span>•</span>
              <span>✓ Sem cartão de crédito</span>
            </>
          ) : (
            <>
              <ShieldCheck size={13} color="var(--accent-primary)" />
              <span>Acesso seguro com permissões da sua agência</span>
            </>
          )}
        </div>

        {/* Login Alternative */}
        <div
          style={{
            textAlign: 'center',
            marginTop: '1.25rem',
            paddingTop: '1.125rem',
            borderTop: '1px solid var(--border-hairline)',
            fontSize: '0.8125rem',
            color: 'var(--text-secondary)',
          }}
        >
          Já possui uma conta?{' '}
          <Link
            to={
              activeInviteToken
                ? `/login?redirect=/invite/${activeInviteToken}`
                : '/login'
            }
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

export default RegisterPage;
