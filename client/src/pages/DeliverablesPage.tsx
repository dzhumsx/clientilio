import React, { useState, useEffect } from 'react';
import {
  Plus,
  CheckCircle2,
  ExternalLink,
  FileText,
  Send,
  Edit2,
  Layers,
  Link2,
  Trash2,
  Archive,
  RefreshCw,
  AlertCircle,
  Search,
  Clock,
  ArrowUpDown,
  X,
  Copy,
  Check,
  Share2,
  Sparkles,
  MessageSquare,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Deliverable, Project, DeliverableVersion, Approval } from '../types';
import toast from 'react-hot-toast';

export const DeliverablesPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [activeTabFilter, setActiveTabFilter] = useState<'ALL' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'DRAFT'>('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(5);

  // Quick Action States (Feedback)
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  const [copiedWhatsappId, setCopiedWhatsappId] = useState<string | null>(null);

  // Deliverable Modal (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientVisible, setClientVisible] = useState(true);
  const [initialExternalUrl, setInitialExternalUrl] = useState('');
  const [initialVersionNotes, setInitialVersionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Add Version Modal
  const [versionModalOpen, setVersionModalOpen] = useState(false);
  const [activeDeliverable, setActiveDeliverable] = useState<Deliverable | null>(null);
  const [versionTitle, setVersionTitle] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [versionNotes, setVersionNotes] = useState('');
  const [submitDirectly, setSubmitDirectly] = useState(true);


  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'agora há pouco';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `há ${diffMin} ${diffMin === 1 ? 'min' : 'mins'}`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `há ${diffHour}h`;
    const diffDays = Math.floor(diffHour / 24);
    if (diffDays < 7) return `há ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getPlatformInfo = (url?: string) => {
    if (!url) return null;
    const lower = url.toLowerCase();
    if (lower.includes('figma.com')) return { name: 'Figma', color: '#a259ff' };
    if (lower.includes('drive.google.com') || lower.includes('docs.google.com')) return { name: 'Google Drive', color: '#1ea362' };
    if (lower.includes('loom.com')) return { name: 'Loom', color: '#625df5' };
    if (lower.includes('canva.com')) return { name: 'Canva', color: '#00c4cc' };
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return { name: 'YouTube', color: '#ef4444' };
    if (lower.includes('dropbox.com')) return { name: 'Dropbox', color: '#0061ff' };
    if (lower.includes('notion.so') || lower.includes('notion.site')) return { name: 'Notion', color: '#e2e8f0' };
    return { name: 'Link Externo', color: 'var(--accent-primary)' };
  };

  const getVersionApprovals = (deliverable: Deliverable, version: DeliverableVersion): Approval[] => {
    if (version.approvals && version.approvals.length > 0) {
      return version.approvals;
    }
    return (deliverable.approvals || []).filter(
      (a) => a.versionId === version.id || a.version?.versionNumber === version.versionNumber
    );
  };

  const getVersionStatusInfo = (
    deliverable: Deliverable,
    version: DeliverableVersion,
    isLatest: boolean
  ) => {
    const approvals = getVersionApprovals(deliverable, version);
    const latestApproval = approvals[0];

    if (latestApproval?.decision === 'APPROVED') {
      return {
        status: 'APPROVED',
        label: 'Aprovada pelo Cliente',
        badgeBg: 'rgba(16, 185, 129, 0.12)',
        badgeColor: '#10b981',
        badgeBorder: 'rgba(16, 185, 129, 0.3)',
        actorName: latestApproval.actor?.name || 'Cliente',
        dateStr: new Date(latestApproval.createdAt).toLocaleDateString('pt-BR'),
        comment: latestApproval.comment,
      };
    }

    if (latestApproval?.decision === 'CHANGES_REQUESTED') {
      return {
        status: 'CHANGES_REQUESTED',
        label: 'Ajustes Solicitados pelo Cliente',
        badgeBg: 'rgba(239, 68, 68, 0.12)',
        badgeColor: '#ef4444',
        badgeBorder: 'rgba(239, 68, 68, 0.3)',
        actorName: latestApproval.actor?.name || 'Cliente',
        dateStr: new Date(latestApproval.createdAt).toLocaleDateString('pt-BR'),
        comment: latestApproval.comment,
      };
    }

    if (isLatest) {
      if (deliverable.status === 'IN_REVIEW' || deliverable.status === 'READY_FOR_REVIEW') {
        return {
          status: 'IN_REVIEW',
          label: 'Aguardando Cliente no Portal',
          badgeBg: 'rgba(245, 158, 11, 0.12)',
          badgeColor: '#f59e0b',
          badgeBorder: 'rgba(245, 158, 11, 0.3)',
        };
      }
      if (deliverable.status === 'APPROVED') {
        return {
          status: 'APPROVED',
          label: 'Aprovada pelo Cliente',
          badgeBg: 'rgba(16, 185, 129, 0.12)',
          badgeColor: '#10b981',
          badgeBorder: 'rgba(16, 185, 129, 0.3)',
        };
      }
      return {
        status: 'DRAFT',
        label: 'Rascunho Interno',
        badgeBg: 'var(--bg-subtle)',
        badgeColor: 'var(--text-tertiary)',
        badgeBorder: 'var(--border-hairline)',
      };
    }

    return {
      status: 'SUPERSEDED',
      label: 'Versão Anterior',
      badgeBg: 'var(--bg-subtle)',
      badgeColor: 'var(--text-tertiary)',
      badgeBorder: 'var(--border-hairline)',
    };
  };

  const getApprovedVersionInfo = (deliverable: Deliverable) => {
    if (!deliverable.versions) return null;
    for (const ver of deliverable.versions) {
      const approvals = getVersionApprovals(deliverable, ver);
      const approved = approvals.find((a) => a.decision === 'APPROVED');
      if (approved) {
        return { version: ver, approval: approved };
      }
    }
    if (deliverable.status === 'APPROVED' && deliverable.versions.length > 0) {
      return { version: deliverable.versions[0], approval: deliverable.approvals?.[0] };
    }
    return null;
  };

  const getLatestChangeRequestInfo = (deliverable: Deliverable) => {
    const approval = deliverable.approvals?.find((a) => a.decision === 'CHANGES_REQUESTED');
    if (!approval) return null;
    const verNumber =
      approval.version?.versionNumber ||
      deliverable.versions?.find((v) => v.id === approval.versionId)?.versionNumber ||
      deliverable.currentVersionNumber ||
      1;
    return { approval, versionNumber: verNumber };
  };

  const fetchProjectsAndDeliverables = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const projRes = await api.get('/projects');
      const projs = projRes.data.projects || projRes.data.data || [];
      setProjects(projs);

      const projId = selectedProjectId || (projs.length > 0 ? projs[0].id : '');
      if (projId) {
        setSelectedProjectId(projId);
        const searchParam = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : '';
        const delivRes = await api.get(`/deliverables?projectId=${projId}&status=${statusFilter}${searchParam}`);
        setDeliverables(delivRes.data || []);
      } else {
        setDeliverables([]);
      }
    } catch (err) {
      console.error('Failed to load deliverables:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    fetchProjectsAndDeliverables();
  }, [currentOrg, selectedProjectId, statusFilter, search]);

  const handleDeleteDeliverable = async (deliv: Deliverable) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir permanentemente o entregável "${deliv.title}"?\n\nATENÇÃO: Todas as versões, arquivos e decisões deste entregável serão excluídos em definitivo.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/deliverables/${deliv.id}`);
      toast.success('Entregável excluído permanentemente.');
      setIsModalOpen(false);
      setEditingDeliverable(null);
      fetchProjectsAndDeliverables();
    } catch (err: any) {
      console.error('Failed to delete deliverable:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao excluir entregável permanentemente.');
    }
  };

  const handleArchiveDeliverable = async (deliv: Deliverable) => {
    try {
      const isArchived = deliv.status === 'ARCHIVED';
      if (isArchived) {
        await api.post(`/deliverables/${deliv.id}/reactivate`);
        toast.success('Entregável reativado.');
      } else {
        await api.post(`/deliverables/${deliv.id}/archive`);
        toast.success('Entregável arquivado.');
      }
      setIsModalOpen(false);
      setEditingDeliverable(null);
      fetchProjectsAndDeliverables();
    } catch (err: any) {
      console.error('Failed to toggle deliverable archive status:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao alterar status de arquivamento.');
    }
  };

  const handleOpenCreateDeliverable = () => {
    if (projects.length === 0) {
      toast.error('Crie um projeto antes de adicionar entregáveis.');
      return;
    }
    setEditingDeliverable(null);
    setTitle('');
    setDescription('');
    setClientVisible(true);
    setInitialExternalUrl('');
    setInitialVersionNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEditDeliverable = (d: Deliverable) => {
    setEditingDeliverable(d);
    setTitle(d.title);
    setDescription(d.description || '');
    setClientVisible(d.clientVisible);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) return;
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingDeliverable) {
        const { data: updated } = await api.put(`/deliverables/${editingDeliverable.id}`, {
          title,
          description: description || undefined,
        });

        setDeliverables((prev) =>
          prev.map((d) => (d.id === editingDeliverable.id ? { ...d, ...updated } : d))
        );
        toast.success('Entregável atualizado com sucesso.');
        setIsModalOpen(false);
        setEditingDeliverable(null);
      } else {
        const { data: newDeliv } = await api.post('/deliverables', {
          projectId: selectedProjectId,
          title,
          description: description || undefined,
          clientVisible,
          initialExternalUrl: initialExternalUrl || undefined,
          initialNotes: initialVersionNotes || undefined,
        });

        setDeliverables((prev) => [newDeliv, ...prev]);
        toast.success('Entregável criado com versão inicial.');
        setIsModalOpen(false);
      }

      fetchProjectsAndDeliverables();
    } catch (err: any) {
      console.error('Failed to save deliverable:', err);
      setFormError(err.response?.data?.error?.message || 'Erro ao salvar entregável.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDeliverable) return;
    setSubmitting(true);

    try {
      await api.post(`/deliverables/${activeDeliverable.id}/versions`, {
        title: versionTitle || undefined,
        externalUrl: externalUrl || undefined,
        notes: versionNotes || undefined,
        submitForReview: submitDirectly,
      });

      toast.success(
        submitDirectly
          ? 'Nova versão enviada ao cliente com sucesso! O cliente já pode avaliar no portal.'
          : 'Nova versão adicionada como rascunho.'
      );

      setVersionModalOpen(false);
      setActiveDeliverable(null);
      setVersionTitle('');
      setExternalUrl('');
      setVersionNotes('');
      fetchProjectsAndDeliverables();
    } catch (err: any) {
      console.error('Failed to add version:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao adicionar versão');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitForReview = async (deliverableId: string) => {
    try {
      const { data: updated } = await api.post(`/deliverables/${deliverableId}/submit`);
      setDeliverables((prev) =>
        prev.map((d) => (d.id === deliverableId ? { ...d, ...(updated || {}), status: 'IN_REVIEW' } : d))
      );
      toast.success('Entregável enviado para aprovação do cliente.');
      fetchProjectsAndDeliverables();
    } catch (err: any) {
      console.error('Failed to submit for review:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao submeter entregável');
    }
  };

  const handleCopyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkId(id);
    toast.success('Link do material copiado!');
    setTimeout(() => setCopiedLinkId(null), 2500);
  };

  const handleCopyPortalLink = () => {
    const portalUrl = `${window.location.origin}/portal`;
    navigator.clipboard.writeText(portalUrl);
    toast.success('Link do Portal do Cliente copiado!');
  };

  const handleCopyWhatsappShare = (d: Deliverable, verNumber: number, _url?: string) => {
    const portalUrl = `${window.location.origin}/portal`;
    const text = `Olá! A versão v${verNumber} do entregável "${d.title}" está pronta para sua avaliação e aprovação no Portal do Cliente:\n${portalUrl}`;
    navigator.clipboard.writeText(text);
    setCopiedWhatsappId(d.id);
    toast.success('Mensagem com link do portal copiada para o WhatsApp!');
    setTimeout(() => setCopiedWhatsappId(null), 2500);
  };

  const handleTabChange = (tab: typeof activeTabFilter) => {
    setStatusFilter('ACTIVE');
    setActiveTabFilter(tab);
    setCurrentPage(1);
  };

  // Metrics calculation
  const totalCount = deliverables.length;
  const inReviewCount = deliverables.filter((d) => d.status === 'IN_REVIEW' || d.status === 'READY_FOR_REVIEW').length;
  const changesCount = deliverables.filter((d) => d.status === 'CHANGES_REQUESTED').length;
  const approvedCount = deliverables.filter((d) => d.status === 'APPROVED').length;
  const draftCount = deliverables.filter((d) => d.status === 'DRAFT').length;

  // Filter deliverables according to search & tabs
  const filteredDeliverables = deliverables
    .filter((d) => {
      if (statusFilter === 'ARCHIVED') return d.status === 'ARCHIVED';
      if (activeTabFilter === 'IN_REVIEW') return d.status === 'IN_REVIEW' || d.status === 'READY_FOR_REVIEW';
      if (activeTabFilter === 'CHANGES_REQUESTED') return d.status === 'CHANGES_REQUESTED';
      if (activeTabFilter === 'APPROVED') return d.status === 'APPROVED';
      if (activeTabFilter === 'DRAFT') return d.status === 'DRAFT';
      return true;
    })
    .sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());

  const selectedProjectObj = projects.find((p) => p.id === selectedProjectId);

  return (
    <div>
      <Navbar
        title="Entregáveis"
        subtitle="Versionamento de arquivos e fluxo de aprovação com clientes"
        actions={
          <button onClick={handleOpenCreateDeliverable} className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>Novo Entregável</span>
          </button>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* KPI / Metrics Summary Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Card: Total */}
          <div
            onClick={() => handleTabChange('ALL')}
            style={{
              background: 'var(--bg-surface)',
              border: activeTabFilter === 'ALL' && statusFilter === 'ACTIVE'
                ? '1px solid var(--accent-primary)'
                : '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '1.125rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              transition: 'all 0.15s ease',
              boxShadow: activeTabFilter === 'ALL' && statusFilter === 'ACTIVE' ? '0 0 0 1px var(--accent-primary)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Total de Entregáveis
              </span>
              <Layers size={14} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {totalCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              No projeto ativo selecionado
            </span>
          </div>

          {/* Card: Aguardando Aprovação */}
          <div
            onClick={() => handleTabChange('IN_REVIEW')}
            style={{
              background: 'var(--bg-surface)',
              border: activeTabFilter === 'IN_REVIEW' && statusFilter === 'ACTIVE'
                ? '1px solid #f59e0b'
                : '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '1.125rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              transition: 'all 0.15s ease',
              boxShadow: activeTabFilter === 'IN_REVIEW' && statusFilter === 'ACTIVE' ? '0 0 0 1px #f59e0b' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Aguardando Avaliação
              </span>
              <Clock size={14} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f59e0b', letterSpacing: '-0.03em' }}>
              {inReviewCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Com o cliente para revisão
            </span>
          </div>

          {/* Card: Ajustes Solicitados */}
          <div
            onClick={() => handleTabChange('CHANGES_REQUESTED')}
            style={{
              background: 'var(--bg-surface)',
              border: activeTabFilter === 'CHANGES_REQUESTED' && statusFilter === 'ACTIVE'
                ? '1px solid #ef4444'
                : '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '1.125rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              transition: 'all 0.15s ease',
              boxShadow: activeTabFilter === 'CHANGES_REQUESTED' && statusFilter === 'ACTIVE' ? '0 0 0 1px #ef4444' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#ef4444', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Ajustes Solicitados
              </span>
              <AlertCircle size={14} style={{ color: '#ef4444' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#ef4444', letterSpacing: '-0.03em' }}>
              {changesCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Ação necessária da equipe
            </span>
          </div>

          {/* Card: Aprovados */}
          <div
            onClick={() => handleTabChange('APPROVED')}
            style={{
              background: 'var(--bg-surface)',
              border: activeTabFilter === 'APPROVED' && statusFilter === 'ACTIVE'
                ? '1px solid #10b981'
                : '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '1.125rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              transition: 'all 0.15s ease',
              boxShadow: activeTabFilter === 'APPROVED' && statusFilter === 'ACTIVE' ? '0 0 0 1px #10b981' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#10b981', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Versões Aprovadas
              </span>
              <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#10b981', letterSpacing: '-0.03em' }}>
              {approvedCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Prontos para produção
            </span>
          </div>
        </div>

        {/* Project Selector Bar & Search Toolbar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.875rem 1.25rem',
            background: 'var(--bg-subtle)',
            borderRadius: '6px',
            border: '1px solid var(--border-hairline)',
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.071em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              PROJETO ATIVO
            </span>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                width: 'auto',
                minWidth: '260px',
                height: '34px',
                fontSize: '0.8125rem',
                padding: '0 0.75rem',
              }}
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} • {p.client?.name || 'Cliente'}
                </option>
              ))}
            </select>

            {/* Deliverables Search Bar */}
            <div style={{ position: 'relative', width: '260px' }}>
              <input
                type="text"
                placeholder="Buscar entregáveis..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.1rem', paddingRight: search ? '2rem' : '0.75rem', height: '34px', fontSize: '13px' }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.75rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                  pointerEvents: 'none',
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch('')}
                  style={{
                    position: 'absolute',
                    right: '0.6rem',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    cursor: 'pointer',
                    color: 'var(--text-tertiary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="Limpar pesquisa"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            {/* Last modified sort indicator */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid var(--border-hairline)',
                background: 'var(--bg-surface)',
                color: 'var(--accent-primary)',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.04em',
              }}
              title="Organizado automaticamente pelo modificado mais recentemente"
            >
              <ArrowUpDown size={11} />
              <span>MODIFICADO POR ÚLTIMO</span>
            </div>

            {/* Active / Archived Toggle */}
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-button)',
                padding: '2px',
                gap: '2px',
              }}
            >
              <button
                onClick={() => {
                  setStatusFilter('ACTIVE');
                  setCurrentPage(1);
                }}
                className="btn btn-sm"
                style={{
                  backgroundColor: statusFilter === 'ACTIVE' ? 'var(--bg-surface)' : 'transparent',
                  color: statusFilter === 'ACTIVE' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: statusFilter === 'ACTIVE' ? 'var(--shadow-subtle)' : 'none',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '0.25rem 0.65rem',
                }}
              >
                Ativos ({totalCount})
              </button>
              <button
                onClick={() => {
                  setStatusFilter('ARCHIVED');
                  setCurrentPage(1);
                }}
                className="btn btn-sm"
                style={{
                  backgroundColor: statusFilter === 'ARCHIVED' ? 'var(--bg-surface)' : 'transparent',
                  color: statusFilter === 'ARCHIVED' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: statusFilter === 'ARCHIVED' ? 'var(--shadow-subtle)' : 'none',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '0.25rem 0.65rem',
                }}
              >
                Arquivados
              </button>
            </div>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}
            >
              TOTAL: {filteredDeliverables.length} {filteredDeliverables.length === 1 ? 'ENTREGÁVEL' : 'ENTREGÁVEIS'}
            </span>
          </div>
        </div>

        {/* Deliverables List */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
            CARREGANDO ENTREGÁVEIS...
          </div>
        ) : filteredDeliverables.length === 0 ? (
          <div
            className="card"
            style={{
              textAlign: 'center',
              padding: '4rem 1.5rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '6px',
                border: '1px solid var(--border-hairline)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '1rem',
                color: 'var(--text-tertiary)',
              }}
            >
              {search ? <Search size={20} /> : <CheckCircle2 size={20} />}
            </div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {search
                ? `Nenhum entregável encontrado para "${search}"`
                : activeTabFilter !== 'ALL'
                ? 'Nenhum entregável com o filtro de status selecionado'
                : 'Nenhum entregável cadastrado neste projeto'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', maxWidth: '380px' }}>
              {search || activeTabFilter !== 'ALL'
                ? 'Tente ajustar ou limpar seus filtros para visualizar os entregáveis.'
                : 'Crie entregáveis (como layouts Figma, copys, vídeos ou relatórios) para versionar e submeter ao cliente para aprovação.'}
            </p>
            {search || activeTabFilter !== 'ALL' ? (
              <button
                onClick={() => {
                  setSearch('');
                  setActiveTabFilter('ALL');
                  setStatusFilter('ACTIVE');
                }}
                className="btn btn-secondary btn-sm"
              >
                Limpar filtros
              </button>
            ) : (
              <button onClick={handleOpenCreateDeliverable} className="btn btn-primary btn-sm">
                <Plus size={14} />
                <span>Adicionar Entregável</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {filteredDeliverables
                .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                .map((d) => {
              const currentVer = d.versions?.[0]?.versionNumber || d.currentVersionNumber || 1;
              const approvedInfo = getApprovedVersionInfo(d);
              const changeReqInfo = getLatestChangeRequestInfo(d);

              return (
                <div
                  key={d.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    padding: '1.25rem',
                    border: d.status === 'CHANGES_REQUESTED'
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : d.status === 'APPROVED'
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : undefined,
                  }}
                >
                  {/* Banner 1: Versão Aprovada */}
                  {approvedInfo && (
                    <div
                      style={{
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: '6px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.35rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#10b981', fontWeight: 600, fontSize: '0.8125rem' }}>
                          <CheckCircle2 size={16} />
                          <span>VERSÃO v{approvedInfo.version.versionNumber} APROVADA PELO CLIENTE</span>
                        </div>
                        {approvedInfo.approval?.actor?.name && (
                          <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                            Aprovada por {approvedInfo.approval.actor.name} em {new Date(approvedInfo.approval.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      {approvedInfo.approval?.comment && (
                        <div
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid rgba(16, 185, 129, 0.2)',
                            borderRadius: '4px',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.8125rem',
                            color: 'var(--text-primary)',
                            fontStyle: 'italic',
                          }}
                        >
                          "{approvedInfo.approval.comment}"
                        </div>
                      )}
                    </div>
                  )}

                  {/* Banner 2: Ajustes Solicitados */}
                  {d.status === 'CHANGES_REQUESTED' && changeReqInfo && (
                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.08)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        borderRadius: '6px',
                        padding: '0.875rem 1rem',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, fontSize: '0.8125rem' }}>
                          <AlertCircle size={16} />
                          <span>AJUSTES SOLICITADOS NA VERSÃO v{changeReqInfo.versionNumber}</span>
                        </div>
                        {changeReqInfo.approval?.actor?.name && (
                          <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                            Solicitado por {changeReqInfo.approval.actor.name} em {new Date(changeReqInfo.approval.createdAt).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                      {changeReqInfo.approval?.comment && (
                        <div
                          style={{
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-hairline)',
                            borderRadius: '4px',
                            padding: '0.625rem 0.875rem',
                            fontSize: '0.8125rem',
                            color: 'var(--text-primary)',
                            fontStyle: 'italic',
                            lineHeight: 1.5,
                          }}
                        >
                          "{changeReqInfo.approval.comment}"
                        </div>
                      )}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.25rem', flexWrap: 'wrap' }}>
                        <a
                          href="/portal"
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: '11px', height: '28px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                          title="Visualizar a visão do cliente no Portal"
                        >
                          <ExternalLink size={12} />
                          <span>Ver no Portal</span>
                        </a>
                        <button
                          onClick={() => {
                            setActiveDeliverable(d);
                            setVersionTitle(`Ajustes v${currentVer + 1}`);
                            setExternalUrl(d.versions?.[0]?.externalUrl || '');
                            setVersionNotes('');
                            setSubmitDirectly(true);
                            setVersionModalOpen(true);
                          }}
                          className="btn btn-sm"
                          style={{
                            backgroundColor: '#ef4444',
                            color: '#ffffff',
                            fontWeight: 600,
                            border: 'none',
                            gap: '6px',
                            height: '28px',
                          }}
                        >
                          <Send size={13} />
                          <span>Enviar Nova Versão v{currentVer + 1} com Ajustes</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Banner 3: Em Avaliação pelo Cliente no Portal */}
                  {d.status === 'IN_REVIEW' && (
                    <div
                      style={{
                        background: 'rgba(245, 158, 11, 0.08)',
                        border: '1px solid rgba(245, 158, 11, 0.25)',
                        borderRadius: '6px',
                        padding: '0.75rem 1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '0.75rem',
                        flexWrap: 'wrap',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#f59e0b', fontWeight: 600, fontSize: '0.8125rem' }}>
                        <Clock size={16} />
                        <span>VERSÃO v{currentVer} ENVIADA — AGUARDANDO APROVAÇÃO DO CLIENTE NO PORTAL</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          onClick={() => handleCopyWhatsappShare(d, currentVer, d.versions?.[0]?.externalUrl)}
                          className="btn btn-sm btn-secondary"
                          style={{ height: '26px', fontSize: '11px', gap: '4px' }}
                          title="Copiar mensagem com link do portal para avisar o cliente no WhatsApp"
                        >
                          {copiedWhatsappId === d.id ? <Check size={12} color="#10b981" /> : <Share2 size={12} />}
                          <span>{copiedWhatsappId === d.id ? 'Texto Copiado!' : 'Cobrar / Lembrar Cliente'}</span>
                        </button>
                        <button
                          onClick={handleCopyPortalLink}
                          className="btn btn-sm btn-secondary"
                          style={{ height: '26px', fontSize: '11px', gap: '4px' }}
                          title="Copiar link direto do Portal do Cliente"
                        >
                          <Copy size={12} />
                          <span>Copiar Link do Portal</span>
                        </button>
                        <a
                          href="/portal"
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm"
                          style={{
                            height: '26px',
                            fontSize: '11px',
                            background: 'var(--bg-surface)',
                            border: '1px solid var(--border-hairline)',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--text-primary)',
                          }}
                          title="Abrir o Portal do Cliente em uma nova aba"
                        >
                          <ExternalLink size={12} />
                          <span>Ver no Portal</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
                        <h3
                          style={{
                            fontSize: '1rem',
                            fontWeight: 600,
                            letterSpacing: '-0.02em',
                            color: 'var(--text-primary)',
                            margin: 0,
                          }}
                        >
                          {d.title}
                        </h3>

                        {/* Versão Atual Chip */}
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.6875rem',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            border: '1px solid var(--border-hairline)',
                            background: 'var(--bg-subtle)',
                            color: 'var(--text-secondary)',
                            letterSpacing: '0.04em',
                          }}
                        >
                          v{currentVer}
                        </span>

                        {/* Versão Aprovada Chip (if any) */}
                        {approvedInfo && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '2px 8px',
                              borderRadius: '4px',
                              border: '1px solid rgba(16, 185, 129, 0.3)',
                              background: 'rgba(16, 185, 129, 0.1)',
                              color: '#10b981',
                              letterSpacing: '0.04em',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <CheckCircle2 size={11} />
                            v{approvedInfo.version.versionNumber} Aprovada
                          </span>
                        )}

                        {d.clientVisible && (
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.625rem',
                              letterSpacing: '0.06em',
                              color: 'var(--accent-primary)',
                              textTransform: 'uppercase',
                            }}
                          >
                            • VISÍVEL NO PORTAL
                          </span>
                        )}
                      </div>

                      {d.description && (
                        <p
                          style={{
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            marginTop: '0.35rem',
                            lineHeight: 1.5,
                          }}
                        >
                          {d.description}
                        </p>
                      )}

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.45rem', flexWrap: 'wrap' }}>
                        {selectedProjectObj && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                            Projeto: <strong style={{ color: 'var(--text-secondary)' }}>{selectedProjectObj.name}</strong>
                            {selectedProjectObj.client?.name && ` • Cliente: ${selectedProjectObj.client.name}`}
                          </span>
                        )}

                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '0.6875rem',
                            fontFamily: 'var(--font-mono)',
                            color: 'var(--text-tertiary)',
                          }}
                          title={`Última alteração: ${new Date(d.updatedAt || d.createdAt).toLocaleString('pt-BR')}`}
                        >
                          <Clock size={11} />
                          Modificado {formatRelativeTime(d.updatedAt || d.createdAt)}
                        </span>
                      </div>
                    </div>

                    {/* Deliverable Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <StatusBadge status={d.status} />

                      {/* Submeter */}
                      {(d.status === 'DRAFT' || d.status === 'CHANGES_REQUESTED') && (
                        <button
                          onClick={() => handleSubmitForReview(d.id)}
                          className="btn btn-primary btn-sm"
                          title={d.status === 'CHANGES_REQUESTED' ? 'Submeter nova versão para aprovação' : 'Enviar para aprovação do cliente'}
                        >
                          <Send size={13} />
                          <span>{d.status === 'CHANGES_REQUESTED' ? 'Submeter Ajustes' : 'Submeter'}</span>
                        </button>
                      )}

                      {/* WhatsApp Share Button */}
                      <button
                        onClick={() => handleCopyWhatsappShare(d, currentVer, d.versions?.[0]?.externalUrl)}
                        className="btn btn-outline btn-sm"
                        title="Copiar mensagem com link do portal para o WhatsApp do cliente"
                      >
                        {copiedWhatsappId === d.id ? <Check size={13} color="#10b981" /> : <Share2 size={13} />}
                        <span>{copiedWhatsappId === d.id ? 'Copiado!' : 'Compartilhar'}</span>
                      </button>

                      {/* Portal Link */}
                      <a
                        href="/portal"
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        title="Abrir a visão do cliente no Portal"
                      >
                        <ExternalLink size={13} />
                        <span>Portal</span>
                      </a>

                      <button
                        onClick={() => handleOpenEditDeliverable(d)}
                        className="btn btn-outline btn-sm"
                        title="Editar entregável"
                      >
                        <Edit2 size={13} />
                        <span>Editar</span>
                      </button>

                      <button
                        onClick={() => {
                          setActiveDeliverable(d);
                          setVersionTitle('');
                          setExternalUrl(d.versions?.[0]?.externalUrl || '');
                          setVersionNotes('');
                          setSubmitDirectly(d.status === 'CHANGES_REQUESTED');
                          setVersionModalOpen(true);
                        }}
                        className="btn btn-secondary btn-sm"
                      >
                        <Plus size={13} />
                        <span>Nova Versão</span>
                      </button>
                    </div>
                  </div>

                  {/* Versions list */}
                  {d.versions && d.versions.length > 0 && (
                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        borderRadius: '6px',
                        border: '1px solid var(--border-hairline)',
                        padding: '0.875rem 1rem',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          letterSpacing: '0.071em',
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          marginBottom: '0.625rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '6px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Layers size={12} />
                          <span>HISTÓRICO E STATUS DE CADA VERSÃO ({d.versions.length})</span>
                        </div>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>
                          Identificação de versões aprovadas ou recusadas
                        </span>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {d.versions.map((ver, idx) => {
                          const isLatest = idx === 0;
                          const verStatus = getVersionStatusInfo(d, ver, isLatest);
                          const platform = getPlatformInfo(ver.externalUrl);

                          return (
                            <div
                              key={ver.id}
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '0.375rem',
                                padding: '0.625rem 0.875rem',
                                background: 'var(--bg-surface)',
                                borderRadius: '6px',
                                border: verStatus.status === 'APPROVED'
                                  ? '1px solid rgba(16, 185, 129, 0.35)'
                                  : verStatus.status === 'CHANGES_REQUESTED'
                                  ? '1px solid rgba(239, 68, 68, 0.3)'
                                  : '1px solid var(--border-hairline)',
                                fontSize: '0.8125rem',
                              }}
                            >
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '0.5rem',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0, flex: 1, flexWrap: 'wrap' }}>
                                  <FileText size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />

                                  {/* Version number badge */}
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontWeight: 700,
                                      fontSize: '0.75rem',
                                      color: 'var(--text-primary)',
                                    }}
                                  >
                                    v{ver.versionNumber}
                                  </span>

                                  {/* Status da Versão Tag */}
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: '0.6875rem',
                                      fontWeight: 600,
                                      padding: '2px 7px',
                                      borderRadius: '4px',
                                      backgroundColor: verStatus.badgeBg,
                                      color: verStatus.badgeColor,
                                      border: `1px solid ${verStatus.badgeBorder}`,
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                    }}
                                  >
                                    {verStatus.status === 'APPROVED' && <CheckCircle2 size={11} />}
                                    {verStatus.status === 'CHANGES_REQUESTED' && <AlertCircle size={11} />}
                                    {verStatus.status === 'IN_REVIEW' && <Clock size={11} />}
                                    {verStatus.label}
                                  </span>

                                  {/* Plataforma Detectada */}
                                  {platform && (
                                    <span
                                      style={{
                                        fontSize: '0.625rem',
                                        fontFamily: 'var(--font-mono)',
                                        fontWeight: 600,
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        background: 'var(--bg-subtle)',
                                        border: '1px solid var(--border-hairline)',
                                        color: platform.color,
                                      }}
                                    >
                                      {platform.name}
                                    </span>
                                  )}

                                  {ver.title && (
                                    <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                      {ver.title}
                                    </span>
                                  )}

                                  {ver.notes && (
                                    <span
                                      style={{
                                        color: 'var(--text-secondary)',
                                        fontSize: '0.75rem',
                                      }}
                                      title={ver.notes}
                                    >
                                      — {ver.notes}
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                                  <span
                                    style={{
                                      fontFamily: 'var(--font-mono)',
                                      fontSize: '0.6875rem',
                                      color: 'var(--text-tertiary)',
                                    }}
                                  >
                                    {new Date(ver.createdAt).toLocaleDateString('pt-BR')}
                                  </span>

                                  {/* Botão Copiar Link */}
                                  {ver.externalUrl && (
                                    <button
                                      type="button"
                                      onClick={() => handleCopyLink(ver.externalUrl!, ver.id)}
                                      className="btn btn-outline btn-sm"
                                      style={{
                                        padding: '0.2rem 0.5rem',
                                        fontSize: '0.6875rem',
                                        fontFamily: 'var(--font-mono)',
                                        height: '24px',
                                        gap: '4px',
                                      }}
                                      title="Copiar link desta versão"
                                    >
                                      {copiedLinkId === ver.id ? <Check size={11} color="#10b981" /> : <Copy size={11} />}
                                      <span>{copiedLinkId === ver.id ? 'COPIADO' : 'LINK'}</span>
                                    </button>
                                  )}

                                  {/* Botão ABRIR */}
                                  {ver.externalUrl && (
                                    <a
                                      href={ver.externalUrl}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="btn btn-outline btn-sm"
                                      style={{
                                        padding: '0.2rem 0.5rem',
                                        fontSize: '0.6875rem',
                                        fontFamily: 'var(--font-mono)',
                                        height: '24px',
                                        gap: '4px',
                                      }}
                                    >
                                      <span>ABRIR</span>
                                      <ExternalLink size={11} />
                                    </a>
                                  )}


                                </div>
                              </div>

                              {/* Feedback / Comentário da Decisão da Versão */}
                              {verStatus.comment && (
                                <div
                                  style={{
                                    marginTop: '0.25rem',
                                    padding: '0.4rem 0.65rem',
                                    background: verStatus.status === 'APPROVED' ? 'rgba(16, 185, 129, 0.05)' : 'rgba(239, 68, 68, 0.05)',
                                    border: `1px solid ${verStatus.badgeBorder}`,
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    alignItems: 'baseline',
                                    gap: '0.5rem',
                                    flexWrap: 'wrap',
                                  }}
                                >
                                  <span style={{ fontWeight: 600, color: verStatus.badgeColor }}>
                                    Feedback do Cliente:
                                  </span>
                                  <span style={{ fontStyle: 'italic', flex: 1 }}>
                                    "{verStatus.comment}"
                                  </span>
                                  {verStatus.actorName && (
                                    <span style={{ fontSize: '0.6875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                                      por {verStatus.actorName} em {verStatus.dateStr}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Approvals history */}
                  {d.approvals && d.approvals.length > 0 && (
                    <div
                      style={{
                        background: 'var(--bg-subtle)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: '6px',
                        padding: '0.75rem 1rem',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          letterSpacing: '0.071em',
                          color: 'var(--text-tertiary)',
                          textTransform: 'uppercase',
                          marginBottom: '0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>HISTÓRICO DE DECISÕES DO CLIENTE</span>
                        <span style={{ fontSize: '0.625rem', color: 'var(--text-tertiary)' }}>
                          {d.approvals.length} {d.approvals.length === 1 ? 'registro' : 'registros'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {d.approvals.map((appr) => {
                          const targetVerNum =
                            appr.version?.versionNumber ||
                            d.versions?.find((v) => v.id === appr.versionId)?.versionNumber;

                          return (
                            <div
                              key={appr.id}
                              style={{
                                fontSize: '0.8125rem',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.625rem',
                                flexWrap: 'wrap',
                                padding: '0.35rem 0.5rem',
                                background: 'var(--bg-surface)',
                                borderRadius: '4px',
                                border: '1px solid var(--border-hairline)',
                              }}
                            >
                              {targetVerNum && (
                                <span
                                  style={{
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 700,
                                    fontSize: '0.6875rem',
                                    padding: '1px 5px',
                                    borderRadius: '3px',
                                    background: 'var(--bg-subtle)',
                                    border: '1px solid var(--border-hairline)',
                                    color: 'var(--text-primary)',
                                  }}
                                >
                                  v{targetVerNum}
                                </span>
                              )}
                              <StatusBadge status={appr.decision} />
                              <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                                por {appr.actor?.name || 'Cliente'} em {new Date(appr.createdAt).toLocaleDateString('pt-BR')}:
                              </span>
                              {appr.comment && (
                                <span style={{ fontStyle: 'italic', color: 'var(--text-primary)', fontSize: '0.8125rem', flex: 1 }}>
                                  "{appr.comment}"
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredDeliverables.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[5, 10, 20]}
              itemLabel="entregáveis"
              hideIfSinglePage={true}
            />
          </>
        )}
      </div>

      {/* Deliverable Modal (Create & Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDeliverable(null);
        }}
        title={editingDeliverable ? 'Editar Entregável' : 'Novo Entregável'}
      >
        <form onSubmit={handleSaveDeliverable} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                color: '#ef4444',
                padding: '0.75rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                fontFamily: 'var(--font-mono)',
              }}
            >
              {formError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Título do Entregável *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Pacote de Criativos Meta Ads / Carrosséis v1"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Instruções / Descrição
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que foi entregue, escopo e instruções para o cliente..."
            />
          </div>

          {!editingDeliverable && (
            <>
              <div
                style={{
                  padding: '1rem',
                  background: 'var(--bg-subtle)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.875rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      fontWeight: 600,
                      letterSpacing: '0.071em',
                      textTransform: 'uppercase',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    VERSÃO INICIAL (v1)
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.625rem',
                      color: 'var(--text-tertiary)',
                    }}
                  >
                    LINK DO MATERIAL
                  </span>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                    Link do Material (Figma, Canva, Google Drive, Loom, YouTube)
                  </label>
                  <input
                    type="url"
                    value={initialExternalUrl}
                    onChange={(e) => setInitialExternalUrl(e.target.value)}
                    placeholder="https://www.figma.com/file/... ou link do Google Drive / Canva"
                  />
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                    Notas da Versão Inicial (Opcional)
                  </label>
                  <input
                    type="text"
                    value={initialVersionNotes}
                    onChange={(e) => setInitialVersionNotes(e.target.value)}
                    placeholder="Ex: Primeira proposta de layout pronta para aprovação"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="clientVis"
                  checked={clientVisible}
                  onChange={(e) => setClientVisible(e.target.checked)}
                  style={{ width: 'auto' }}
                />
                <label htmlFor="clientVis" style={{ fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                  Disponibilizar no portal do cliente imediatamente
                </label>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: editingDeliverable ? 'space-between' : 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)', flexWrap: 'wrap' }}>
            {editingDeliverable && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleDeleteDeliverable(editingDeliverable)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title="Excluir permanentemente do banco"
                >
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleArchiveDeliverable(editingDeliverable)}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-hairline)',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                  title={editingDeliverable.status === 'ARCHIVED' ? 'Reativar entregável' : 'Ocultar e enviar para arquivados'}
                >
                  {editingDeliverable.status === 'ARCHIVED' ? <RefreshCw size={13} /> : <Archive size={13} />}
                  <span>{editingDeliverable.status === 'ARCHIVED' ? 'Reativar' : 'Arquivar'}</span>
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setEditingDeliverable(null);
                }}
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
                {submitting ? 'Salvando...' : editingDeliverable ? 'Salvar Alterações' : 'Criar Entregável'}
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Add Version Modal */}
      <Modal
        isOpen={versionModalOpen}
        onClose={() => setVersionModalOpen(false)}
        title={
          activeDeliverable?.status === 'CHANGES_REQUESTED'
            ? `Enviar Nova Versão com Ajustes: ${activeDeliverable?.title}`
            : `Nova Versão: ${activeDeliverable?.title}`
        }
      >
        <form onSubmit={handleAddVersion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeDeliverable?.status === 'CHANGES_REQUESTED' && (
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '6px',
                padding: '0.75rem 1rem',
                fontSize: '0.8125rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, marginBottom: '0.35rem' }}>
                <AlertCircle size={15} />
                <span>LEMBRETE DO AJUSTE SOLICITADO:</span>
              </div>
              <p style={{ margin: 0, color: 'var(--text-primary)', fontStyle: 'italic', lineHeight: 1.4 }}>
                "{activeDeliverable.approvals?.find((a) => a.decision === 'CHANGES_REQUESTED')?.comment || 'Ajustes solicitados pelo cliente.'}"
              </p>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Título ou Resumo da Versão
            </label>
            <input
              type="text"
              value={versionTitle}
              onChange={(e) => setVersionTitle(e.target.value)}
              placeholder="Ex: Ajustes de tipografia e paleta de cores"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Link do Material (Figma, Canva, Google Drive, Loom, YouTube) *
            </label>
            <input
              type="url"
              required
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://www.figma.com/file/... ou Google Drive"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Notas da Versão (O que foi alterado)
            </label>
            <textarea
              rows={3}
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="Descreva o que foi corrigido para o cliente saber o que avaliar..."
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-subtle)', padding: '0.625rem 0.875rem', borderRadius: '4px', border: '1px solid var(--border-hairline)' }}>
            <input
              type="checkbox"
              id="submitDirectlyCheck"
              checked={submitDirectly}
              onChange={(e) => setSubmitDirectly(e.target.checked)}
              style={{ width: 'auto' }}
            />
            <label htmlFor="submitDirectlyCheck" style={{ fontSize: '0.8125rem', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: 500 }}>
              Enviar imediatamente para avaliação do cliente no portal
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)' }}>
            <button type="button" onClick={() => setVersionModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting
                ? 'Enviando...'
                : submitDirectly
                ? 'Enviar Nova Versão ao Cliente'
                : 'Salvar como Rascunho'}
            </button>
          </div>
        </form>
      </Modal>


    </div>
  );
};
