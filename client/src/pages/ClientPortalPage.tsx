import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  ArrowLeft,
  Clock,
  FileCheck,
  Sun,
  Moon,
  AlertCircle,
  RefreshCw,
  Building2,
  User,
  FolderKanban,
  Calendar,
  Share2,
  Copy,
  Check,
  Eye,
  Download,
  Send,
  Sparkles,
  Shield,
  Layers,
} from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { LogoIcon } from '../components/Logo';

interface PortalProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  category?: string;
  startDate?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface PortalClient {
  id: string;
  name: string;
  company?: string;
  email?: string;
  notes?: string;
}

interface PortalAgency {
  id: string;
  name: string;
  slug: string;
  brandSettings?: any;
}

interface PortalVersion {
  id: string;
  versionNumber: number;
  notes?: string;
  externalUrl?: string;
  createdAt: string;
  file?: {
    id: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey: string;
  } | null;
  approvals?: Array<{
    id: string;
    decision: 'APPROVED' | 'CHANGES_REQUESTED';
    comment?: string;
    createdAt: string;
    actor?: {
      name: string;
      email: string;
    };
  }>;
}

interface PortalComment {
  id: string;
  body: string;
  createdAt: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
}

interface PortalDeliverable {
  id: string;
  title: string;
  description?: string;
  type: string;
  status: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  versions: PortalVersion[];
  comments?: PortalComment[];
}

interface PortalData {
  project: PortalProject;
  client: PortalClient;
  agency: PortalAgency;
  deliverables: PortalDeliverable[];
  metrics: {
    total: number;
    approved: number;
    inReview: number;
    changesRequested: number;
    progressPercentage: number;
  };
}

export const ClientPortalPage: React.FC = () => {
  const { token: routeToken } = useParams<{ token?: string }>();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token') || searchParams.get('p') || searchParams.get('project');
  const effectiveToken = routeToken || queryToken;

  const { theme, toggleTheme } = useTheme();
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [portalData, setPortalData] = useState<PortalData | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Agency projects fallback for logged in users visiting /portal without token
  const [agencyProjects, setAgencyProjects] = useState<any[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'IN_REVIEW' | 'APPROVED' | 'CHANGES_REQUESTED'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Approval Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<PortalDeliverable | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'CHANGES_REQUESTED'>('APPROVED');
  const [comment, setComment] = useState('');
  const [clientSignName, setClientSignName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Quick Comment Input State per Deliverable
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [sendingCommentId, setSendingCommentId] = useState<string | null>(null);

  // Link copy state
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchPortalData = async () => {
    if (!effectiveToken) {
      // If user is logged into the agency, fetch their projects so they can select or copy links
      if (user) {
        setLoadingProjects(true);
        try {
          const res = await api.get('/projects?limit=50');
          setAgencyProjects(res.data.projects || res.data.data || []);
        } catch {
          // ignore
        } finally {
          setLoadingProjects(false);
        }
      }
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const { data } = await api.get(`/portal/${encodeURIComponent(effectiveToken)}`);
      setPortalData(data);
      if (data.client?.name && !clientSignName) {
        setClientSignName(data.client.name);
      }
    } catch (err: any) {
      console.error('Failed to load portal data:', err);
      setError(
        err.response?.data?.error?.message ||
          'Não foi possível encontrar este projeto ou o link do portal expirou. Solicite um novo link à sua agência.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [effectiveToken]);

  const getLatestVersion = (item?: PortalDeliverable | null): PortalVersion | null => {
    if (!item?.versions || item.versions.length === 0) return null;
    return [...item.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
  };

  const handleOpenDecisionModal = (deliv: PortalDeliverable, defaultDecision: 'APPROVED' | 'CHANGES_REQUESTED') => {
    setSelectedDeliverable(deliv);
    setDecision(defaultDecision);
    setComment('');
    if (portalData?.client?.name && !clientSignName) {
      setClientSignName(portalData.client.name);
    }
    setModalOpen(true);
  };

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliverable || !effectiveToken) return;

    const latestVersion = getLatestVersion(selectedDeliverable);
    if (!latestVersion) {
      toast.error('Nenhuma versão disponível para aprovação.');
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post(
        `/portal/${encodeURIComponent(effectiveToken)}/deliverables/${selectedDeliverable.id}/versions/${latestVersion.id}/decision`,
        {
          decision,
          comment: comment.trim() || undefined,
          clientName: clientSignName.trim() || portalData?.client?.name,
        }
      );

      toast.success(data.message || 'Decisão registrada com sucesso!');
      setModalOpen(false);
      setSelectedDeliverable(null);
      setComment('');
      // Refresh portal data to reflect status change
      await fetchPortalData();
    } catch (err: any) {
      console.error('Failed to submit decision:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao registrar decisão.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendComment = async (deliverableId: string) => {
    const draft = commentDrafts[deliverableId]?.trim();
    if (!draft || !effectiveToken) return;

    setSendingCommentId(deliverableId);
    try {
      await api.post(`/portal/${encodeURIComponent(effectiveToken)}/deliverables/${deliverableId}/comments`, {
        content: draft,
        clientName: clientSignName || portalData?.client?.name || 'Cliente',
      });

      toast.success('Comentário enviado para a agência!');
      setCommentDrafts((prev) => ({ ...prev, [deliverableId]: '' }));
      await fetchPortalData();
    } catch (err: any) {
      console.error('Failed to send comment:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao enviar comentário.');
    } finally {
      setSendingCommentId(null);
    }
  };

  const handleCopyPortalLink = () => {
    const rawId = portalData?.project?.id || effectiveToken || '';
    const isPrefixed = rawId.startsWith('p_') || rawId.startsWith('prj_');
    const cleanToken = isPrefixed
      ? rawId
      : (rawId.includes('-') ? rawId.split('-')[0] : rawId);
    const portalUrl = cleanToken ? `${window.location.origin}/p/${cleanToken}` : window.location.href;
    navigator.clipboard.writeText(portalUrl);
    setCopiedLink(true);
    toast.success(`Link do portal copiado: ${portalUrl}`);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Deliverables filtering
  const filteredDeliverables = (portalData?.deliverables || []).filter((d) => {
    if (statusFilter !== 'ALL') {
      if (statusFilter === 'IN_REVIEW' && d.status !== 'IN_REVIEW' && d.status !== 'DRAFT') return false;
      if (statusFilter === 'APPROVED' && d.status !== 'APPROVED') return false;
      if (statusFilter === 'CHANGES_REQUESTED' && d.status !== 'CHANGES_REQUESTED') return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = d.title.toLowerCase().includes(q);
      const matchDesc = d.description?.toLowerCase().includes(q);
      const matchType = d.type.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc && !matchType) return false;
    }
    return true;
  });

  // State: Loading
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-canvas)',
          gap: '1rem',
          color: 'var(--text-tertiary)',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.84rem',
        }}
      >
        <LogoIcon size={36} />
        <div>CARREGANDO PORTAL EXCLUSIVO DO CLIENTE...</div>
      </div>
    );
  }

  // State: No token provided (e.g. visited /portal directly)
  if (!effectiveToken) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-canvas)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '560px',
            width: '100%',
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '12px',
              background: 'var(--accent-subtle)',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <FolderKanban size={28} />
          </div>

          <h1
            style={{
              fontSize: '1.375rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              marginBottom: '0.5rem',
              letterSpacing: '-0.03em',
            }}
          >
            Portal Exclusivo por Projeto
          </h1>
          <p
            style={{
              fontSize: '0.875rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.5,
              marginBottom: '1.75rem',
            }}
          >
            Cada projeto possui uma página única e segura, acessível pelo cliente sem necessidade de senha.
            Se você é um cliente, utilize o link direto compartilhado pela sua agência.
          </p>

          {user && agencyProjects.length > 0 ? (
            <div style={{ textAlign: 'left', marginBottom: '1.5rem' }}>
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  color: 'var(--text-tertiary)',
                  textTransform: 'uppercase',
                  display: 'block',
                  marginBottom: '0.5rem',
                }}
              >
                Projetos da sua agência (Acessar portal como cliente):
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {agencyProjects.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.75rem 1rem',
                      borderRadius: '6px',
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-hairline)',
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: '0.84rem', color: 'var(--text-primary)', display: 'block' }}>
                        {p.name}
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                        Cliente: {p.client?.name || 'Cliente'}
                      </span>
                    </div>
                    <Link
                      to={`/portal/${p.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.75rem', height: '28px' }}
                    >
                      <Eye size={13} />
                      <span>Abrir Portal</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <Link to="/dashboard/projects" className="btn btn-primary" style={{ height: '36px' }}>
              <ArrowLeft size={14} />
              <span>Ir para Meus Projetos</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State: Error / Not Found
  if (error || !portalData) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-canvas)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem 1.5rem',
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: '480px',
            width: '100%',
            padding: '2.5rem 2rem',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              width: '50px',
              height: '50px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.25rem',
            }}
          >
            <AlertCircle size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
            Portal Não Localizado
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '1.75rem' }}>
            {error || 'O link do portal informado é inválido ou o projeto foi encerrado.'}
          </p>
          <button
            onClick={() => fetchPortalData()}
            className="btn btn-secondary btn-sm"
            style={{ margin: '0 auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <RefreshCw size={14} />
            <span>Tentar Novamente</span>
          </button>
        </div>
      </div>
    );
  }

  const { project, client, agency, metrics } = portalData;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
      {/* Top Navbar: Agency & Client Branding */}
      <header
        style={{
          borderBottom: '1px solid var(--border-hairline)',
          background: 'var(--bg-surface)',
          padding: '0.875rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
        }}
      >
        {/* Left: Agency branding & Portal indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
          <LogoIcon size={28} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.9375rem', fontWeight: 700, letterSpacing: '-0.025em', color: 'var(--text-primary)' }}>
                {agency.name}
              </span>
              <span
                style={{
                  fontSize: '0.625rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-mono)',
                  textTransform: 'uppercase',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent-primary)',
                  letterSpacing: '0.04em',
                }}
              >
                Portal do Cliente
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
              Ambiente Seguro • Acesso Direto do Cliente
            </span>
          </div>
        </div>

        {/* Right: Controls & Theme */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <button
            onClick={handleCopyPortalLink}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '0.78rem', gap: '0.4rem', height: '32px' }}
            title="Copiar link direto para este projeto"
          >
            {copiedLink ? <Check size={13} color="#10b981" /> : <Copy size={13} />}
            <span>{copiedLink ? 'Link Copiado!' : 'Copiar Link'}</span>
          </button>

          <button
            onClick={toggleTheme}
            aria-label="Alternar tema"
            style={{
              width: 32,
              height: 32,
              borderRadius: '6px',
              border: '1px solid var(--border-hairline)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {user && (
            <Link to="/dashboard/projects" className="btn btn-outline btn-sm" style={{ height: '32px', fontSize: '0.78rem' }}>
              <ArrowLeft size={13} />
              <span>Painel Agência</span>
            </Link>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main
        style={{
          maxWidth: '1120px',
          margin: '0 auto',
          padding: '2rem 1.5rem 4rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1.75rem',
        }}
      >
        {/* Project Header Card */}
        <div
          className="card"
          style={{
            padding: '2rem',
            borderRadius: '12px',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-hairline)',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.05))',
          }}
        >
          {/* Subtitle with Client & Agency breadcrumb */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '0.75rem',
              marginBottom: '0.75rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
              <Building2 size={13} />
              <span>{agency.name}</span>
              <span>/</span>
              <User size={13} />
              <strong style={{ color: 'var(--accent-primary)' }}>{client.name}</strong>
              {client.company && <span>({client.company})</span>}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {project.category && (
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  {project.category}
                </span>
              )}
              <StatusBadge status={project.status as any} />
            </div>
          </div>

          {/* Project Title */}
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.035em',
              margin: '0 0 0.5rem 0',
              lineHeight: 1.25,
            }}
          >
            {project.name}
          </h1>

          {/* Project Description */}
          {project.description && (
            <p
              style={{
                fontSize: '0.875rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.6,
                margin: '0 0 1.25rem 0',
                maxWidth: '850px',
              }}
            >
              {project.description}
            </p>
          )}

          {/* Due date & Metadata */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '1.25rem',
              fontSize: '0.78rem',
              color: 'var(--text-secondary)',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-hairline)',
            }}
          >
            {project.dueDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Calendar size={14} style={{ color: 'var(--text-tertiary)' }} />
                <span>Prazo Final:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {new Date(project.dueDate).toLocaleDateString('pt-BR')}
                </strong>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Shield size={14} color="#10b981" />
              <span>Área restrita de aprovação do cliente</span>
            </div>
          </div>
        </div>

        {/* Progress & Metric KPI Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Progress Card */}
          <div
            className="card"
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-hairline)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                Progresso Geral
              </span>
              <span style={{ fontSize: '0.875rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--accent-primary)' }}>
                {metrics.progressPercentage}%
              </span>
            </div>
            <div
              style={{
                height: '6px',
                width: '100%',
                borderRadius: '3px',
                background: 'var(--bg-subtle)',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  width: `${metrics.progressPercentage}%`,
                  background: 'var(--accent-primary)',
                  borderRadius: '3px',
                  transition: 'width 0.4s ease',
                }}
              />
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>
              {metrics.approved} de {metrics.total} entregáveis aprovados
            </span>
          </div>

          {/* Approved Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: statusFilter === 'APPROVED' ? '1px solid #10b981' : '1px solid var(--border-hairline)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#10b981', textTransform: 'uppercase' }}>
                Aprovados
              </span>
              <CheckCircle2 size={15} color="#10b981" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#10b981' }}>
              {metrics.approved}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Prontos e validados</span>
          </div>

          {/* In Review Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'IN_REVIEW' ? 'ALL' : 'IN_REVIEW')}
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: statusFilter === 'IN_REVIEW' ? '1px solid #3b82f6' : '1px solid var(--border-hairline)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#3b82f6', textTransform: 'uppercase' }}>
                Aguardando Aprovação
              </span>
              <Clock size={15} color="#3b82f6" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#3b82f6' }}>
              {metrics.inReview}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Requerem sua análise</span>
          </div>

          {/* Changes Requested Card */}
          <div
            onClick={() => setStatusFilter(statusFilter === 'CHANGES_REQUESTED' ? 'ALL' : 'CHANGES_REQUESTED')}
            style={{
              padding: '1.25rem',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              border: statusFilter === 'CHANGES_REQUESTED' ? '1px solid #f59e0b' : '1px solid var(--border-hairline)',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem',
              transition: 'all 0.15s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#f59e0b', textTransform: 'uppercase' }}>
                Em Ajuste
              </span>
              <AlertCircle size={15} color="#f59e0b" />
            </div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#f59e0b' }}>
              {metrics.changesRequested}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-tertiary)' }}>Aguardando equipe da agência</span>
          </div>
        </div>

        {/* Deliverables Section & Filters */}
        <section style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1rem',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                Entregáveis e Peças para Aprovação
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
                Analise os materiais produzidos pela agência e registre sua aprovação ou solicite ajustes com um clique.
              </p>
            </div>

            {/* Filter Buttons */}
            <div
              style={{
                display: 'inline-flex',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '8px',
                padding: '3px',
                gap: '3px',
              }}
            >
              {[
                { key: 'ALL', label: `Todos (${metrics.total})` },
                { key: 'IN_REVIEW', label: `Aguardando (${metrics.inReview})` },
                { key: 'APPROVED', label: `Aprovados (${metrics.approved})` },
                { key: 'CHANGES_REQUESTED', label: `Ajustes (${metrics.changesRequested})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key as any)}
                  style={{
                    padding: '0.35rem 0.75rem',
                    borderRadius: '5px',
                    fontSize: '0.75rem',
                    fontWeight: statusFilter === tab.key ? 600 : 500,
                    border: 'none',
                    background: statusFilter === tab.key ? 'var(--bg-canvas)' : 'transparent',
                    color: statusFilter === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: statusFilter === tab.key ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Deliverables List */}
          {filteredDeliverables.length === 0 ? (
            <div
              className="card"
              style={{
                padding: '3rem 2rem',
                textAlign: 'center',
                borderRadius: '10px',
                background: 'var(--bg-surface)',
              }}
            >
              <FileCheck size={36} style={{ color: 'var(--text-tertiary)', margin: '0 auto 0.75rem' }} />
              <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                Nenhum entregável encontrado
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0 }}>
                {statusFilter !== 'ALL'
                  ? 'Não há itens correspondentes ao filtro selecionado.'
                  : 'A equipe da agência ainda não publicou entregáveis para este projeto.'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredDeliverables.map((deliv) => {
                const latestVersion = getLatestVersion(deliv);
                const isApproved = deliv.status === 'APPROVED';
                const isChangesRequested = deliv.status === 'CHANGES_REQUESTED';
                const isAwaitingReview = deliv.status === 'IN_REVIEW' || deliv.status === 'DRAFT';

                return (
                  <div
                    key={deliv.id}
                    className="card"
                    style={{
                      padding: '1.5rem',
                      borderRadius: '10px',
                      background: 'var(--bg-surface)',
                      border: isApproved
                        ? '1px solid rgba(16, 185, 129, 0.3)'
                        : isChangesRequested
                        ? '1px solid rgba(245, 158, 11, 0.3)'
                        : '1px solid var(--border-hairline)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1.25rem',
                    }}
                  >
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <span
                            style={{
                              fontSize: '0.6875rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 600,
                              textTransform: 'uppercase',
                              color: 'var(--text-tertiary)',
                              letterSpacing: '0.05em',
                            }}
                          >
                            {deliv.type || 'ENTREGÁVEL'}
                          </span>
                          {latestVersion && (
                            <span
                              style={{
                                fontSize: '0.6875rem',
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 700,
                                padding: '1px 5px',
                                borderRadius: '4px',
                                background: 'var(--bg-subtle)',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              v{latestVersion.versionNumber}
                            </span>
                          )}
                        </div>
                        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                          {deliv.title}
                        </h3>
                      </div>

                      <StatusBadge status={deliv.status as any} />
                    </div>

                    {/* Description */}
                    {deliv.description && (
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>
                        {deliv.description}
                      </p>
                    )}

                    {/* Version Assets & Notes */}
                    {latestVersion && (
                      <div
                        style={{
                          background: 'var(--bg-subtle, rgba(0,0,0,0.02))',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: '8px',
                          padding: '1rem',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.75rem',
                        }}
                      >
                        {latestVersion.notes && (
                          <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>Notas da Agência: </strong>
                            {latestVersion.notes}
                          </div>
                        )}

                        {/* File / Link Attachment */}
                        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                          {latestVersion.externalUrl && (
                            <a
                              href={latestVersion.externalUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ gap: '0.4rem', fontSize: '0.78rem' }}
                            >
                              <ExternalLink size={13} />
                              <span>Abrir Link Externo (Figma / Drive / Preview)</span>
                            </a>
                          )}

                          {latestVersion.file && (
                            <a
                              href={`/api/files/${latestVersion.file.id}/download`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-secondary btn-sm"
                              style={{ gap: '0.4rem', fontSize: '0.78rem' }}
                            >
                              <Download size={13} />
                              <span>Baixar Arquivo ({latestVersion.file.originalName})</span>
                            </a>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Decision Action Bar (Client Approval) */}
                    <div
                      style={{
                        paddingTop: '1rem',
                        borderTop: '1px solid var(--border-hairline)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.875rem',
                      }}
                    >
                      {/* Left: Status Message */}
                      <div>
                        {isApproved ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontSize: '0.8125rem', fontWeight: 600 }}>
                            <CheckCircle2 size={16} />
                            <span>Entregável aprovado pelo cliente</span>
                          </div>
                        ) : isChangesRequested ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontSize: '0.8125rem', fontWeight: 600 }}>
                            <AlertCircle size={16} />
                            <span>Ajustes solicitados à agência</span>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                            <Clock size={15} style={{ color: '#3b82f6' }} />
                            <span>Aguardando sua decisão de aprovação</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Decision Action Buttons (NO PASSWORD REQUIRED) */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                        <button
                          type="button"
                          onClick={() => handleOpenDecisionModal(deliv, 'CHANGES_REQUESTED')}
                          className="btn btn-outline btn-sm"
                          style={{
                            height: '34px',
                            padding: '0 0.875rem',
                            fontSize: '0.78rem',
                            gap: '0.4rem',
                            borderColor: isChangesRequested ? '#f59e0b' : undefined,
                            color: isChangesRequested ? '#f59e0b' : undefined,
                          }}
                        >
                          <MessageSquare size={13} />
                          <span>Solicitar Ajustes</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenDecisionModal(deliv, 'APPROVED')}
                          className="btn btn-primary btn-sm"
                          style={{
                            height: '34px',
                            padding: '0 1rem',
                            fontSize: '0.78rem',
                            gap: '0.4rem',
                            backgroundColor: isApproved ? '#059669' : undefined,
                          }}
                        >
                          <ThumbsUp size={13} />
                          <span>{isApproved ? 'Aprovação Confirmada' : 'Aprovar Entregável'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Comments & Feedback Section */}
                    {deliv.comments && deliv.comments.length > 0 && (
                      <div
                        style={{
                          marginTop: '0.25rem',
                          paddingTop: '0.75rem',
                          borderTop: '1px dashed var(--border-hairline)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.5rem',
                        }}
                      >
                        <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                          Histórico de Mensagens & Ajustes:
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                          {deliv.comments.map((c) => (
                            <div
                              key={c.id}
                              style={{
                                fontSize: '0.78rem',
                                padding: '0.5rem 0.75rem',
                                borderRadius: '6px',
                                background: 'var(--bg-canvas)',
                                border: '1px solid var(--border-hairline)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                gap: '0.5rem',
                              }}
                            >
                              <span style={{ color: 'var(--text-primary)', lineHeight: 1.4 }}>{c.body}</span>
                              <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', flexShrink: 0, fontFamily: 'var(--font-mono)' }}>
                                {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Quick feedback input for client */}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <input
                        type="text"
                        value={commentDrafts[deliv.id] || ''}
                        onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [deliv.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSendComment(deliv.id);
                          }
                        }}
                        placeholder="Enviar mensagem ou observação rápida para a agência..."
                        style={{ flex: 1, height: '34px', fontSize: '0.8rem' }}
                      />
                      <button
                        type="button"
                        disabled={sendingCommentId === deliv.id || !commentDrafts[deliv.id]?.trim()}
                        onClick={() => handleSendComment(deliv.id)}
                        className="btn btn-secondary btn-sm"
                        style={{ height: '34px', padding: '0 0.875rem', gap: '0.35rem', flexShrink: 0 }}
                      >
                        <Send size={13} />
                        <span>{sendingCommentId === deliv.id ? 'Enviando...' : 'Enviar'}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Decision Modal (Zero Password Friction) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={decision === 'APPROVED' ? 'Aprovar Entregável' : 'Solicitar Ajustes'}
      >
        <form onSubmit={handleDecisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
              Entregável Selecionado:
            </span>
            <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: '0.25rem 0 0 0' }}>
              {selectedDeliverable?.title}
            </h4>
          </div>

          {/* Toggle between Decision */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px',
              padding: '4px',
              borderRadius: '8px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-hairline)',
            }}
          >
            <button
              type="button"
              onClick={() => setDecision('APPROVED')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: decision === 'APPROVED' ? 600 : 500,
                background: decision === 'APPROVED' ? '#10b981' : 'transparent',
                color: decision === 'APPROVED' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <ThumbsUp size={14} />
              <span>Aprovar Peça</span>
            </button>

            <button
              type="button"
              onClick={() => setDecision('CHANGES_REQUESTED')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                padding: '0.5rem',
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.8125rem',
                fontWeight: decision === 'CHANGES_REQUESTED' ? 600 : 500,
                background: decision === 'CHANGES_REQUESTED' ? '#f59e0b' : 'transparent',
                color: decision === 'CHANGES_REQUESTED' ? '#fff' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              <MessageSquare size={14} />
              <span>Solicitar Ajustes</span>
            </button>
          </div>

          {/* Client Signer Name */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              Seu Nome / Responsável pela Aprovação
            </label>
            <input
              type="text"
              required
              value={clientSignName}
              onChange={(e) => setClientSignName(e.target.value)}
              placeholder="Ex: João Silva (Marketing)"
              style={{ height: '36px', fontSize: '0.84rem' }}
            />
          </div>

          {/* Feedback Commentary */}
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              {decision === 'APPROVED' ? 'Comentário ou Elogio (Opcional)' : 'Descreva os Ajustes Necessários *'}
            </label>
            <textarea
              required={decision === 'CHANGES_REQUESTED'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={4}
              placeholder={
                decision === 'APPROVED'
                  ? 'Ex: Ficou excelente! Pode seguir com o lançamento.'
                  : 'Ex: Por favor, alterar a cor do botão para azul e ajustar o logotipo no final...'
              }
              style={{
                width: '100%',
                padding: '0.625rem 0.75rem',
                fontSize: '0.84rem',
                borderRadius: '6px',
                border: '1px solid var(--border-hairline)',
                background: 'var(--bg-canvas)',
                color: 'var(--text-primary)',
                fontFamily: 'inherit',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn btn-secondary btn-sm"
              disabled={submitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn btn-primary btn-sm"
              style={{
                backgroundColor: decision === 'APPROVED' ? '#10b981' : '#f59e0b',
                gap: '0.4rem',
              }}
            >
              {submitting ? (
                <span>Salvando decisão...</span>
              ) : decision === 'APPROVED' ? (
                <>
                  <Check size={14} />
                  <span>Confirmar Aprovação</span>
                </>
              ) : (
                <>
                  <Send size={14} />
                  <span>Enviar Solicitação de Ajustes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ClientPortalPage;
