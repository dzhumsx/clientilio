import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, ExternalLink, FileText, Send, Edit2, Layers, Link2, Trash2, Archive, RefreshCw } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Deliverable, Project } from '../types';
import toast from 'react-hot-toast';

export const DeliverablesPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');
  const [loading, setLoading] = useState(true);

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
        const delivRes = await api.get(`/deliverables?projectId=${projId}&status=${statusFilter}`);
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
    fetchProjectsAndDeliverables();
  }, [currentOrg, selectedProjectId, statusFilter]);

  const handleDeleteDeliverable = async (deliv: Deliverable) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir permanentemente o entregável "${deliv.title}"?\n\nATENÇÃO: Todas as versões, arquivos, comentários e aprovações deste entregável serão excluídos em definitivo.`
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
      const { data: newVersion } = await api.post(`/deliverables/${activeDeliverable.id}/versions`, {
        title: versionTitle || undefined,
        externalUrl: externalUrl || undefined,
        notes: versionNotes || undefined,
      });

      setDeliverables((prev) =>
        prev.map((d) => {
          if (d.id === activeDeliverable.id) {
            const versions = [newVersion, ...(d.versions || [])];
            return { ...d, versions, currentVersionNumber: newVersion.versionNumber };
          }
          return d;
        })
      );
      toast.success('Nova versão adicionada.');

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

  return (
    <div>
      <Navbar
        title="Entregáveis"
        subtitle="Versionamento de arquivos e fluxo de aprovação com clientes"
        actions={
          <button
            onClick={handleOpenCreateDeliverable}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} />
            <span>Novo Entregável</span>
          </button>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Project Selector Bar */}
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
                minWidth: '280px',
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
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
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
                onClick={() => setStatusFilter('ACTIVE')}
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
                Ativos
              </button>
              <button
                onClick={() => setStatusFilter('ARCHIVED')}
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
              }}
            >
              {deliverables.length} {deliverables.length === 1 ? 'ITEM' : 'ITENS'} {statusFilter === 'ARCHIVED' ? 'ARQUIVADOS' : 'NESTE PROJETO'}
            </span>
          </div>
        </div>

        {/* Deliverables List */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
            CARREGANDO ENTREGÁVEIS...
          </div>
        ) : deliverables.length === 0 ? (
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
              <CheckCircle2 size={20} />
            </div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Nenhum entregável cadastrado neste projeto
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', maxWidth: '380px' }}>
              Crie entregáveis (como layouts Figma, copys, vídeos ou relatórios) para versionar e submeter ao cliente para aprovação.
            </p>
            <button
              onClick={handleOpenCreateDeliverable}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} />
              <span>Adicionar Entregável</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {deliverables.map((d) => (
              <div
                key={d.id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  padding: '1.25rem',
                }}
              >
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
                        v{d.currentVersionNumber}
                      </span>
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
                          • VISÍVEL AO CLIENTE
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
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <StatusBadge status={d.status} />

                    {d.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitForReview(d.id)}
                        className="btn btn-primary btn-sm"
                        title="Enviar para aprovação do cliente"
                      >
                        <Send size={13} />
                        <span>Submeter</span>
                      </button>
                    )}

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
                        setVersionModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <ExternalLink size={13} />
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
                        gap: '6px',
                      }}
                    >
                      <Layers size={12} />
                      <span>HISTÓRICO DE VERSÕES ({d.versions.length})</span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
                      {d.versions.map((ver) => (
                        <div
                          key={ver.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            background: 'var(--bg-surface)',
                            borderRadius: '4px',
                            border: '1px solid var(--border-hairline)',
                            fontSize: '0.8125rem',
                            flexWrap: 'wrap',
                            gap: '0.5rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', minWidth: 0, flex: 1 }}>
                            <FileText size={14} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontWeight: 600,
                                fontSize: '0.75rem',
                                color: 'var(--text-primary)',
                              }}
                            >
                              v{ver.versionNumber}
                            </span>
                            {ver.title && (
                              <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                                {ver.title}
                              </span>
                            )}
                            {ver.notes && (
                              <span
                                style={{
                                  color: 'var(--text-tertiary)',
                                  fontSize: '0.75rem',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                — {ver.notes}
                              </span>
                            )}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.6875rem',
                                color: 'var(--text-tertiary)',
                              }}
                            >
                              {new Date(ver.createdAt).toLocaleDateString('pt-BR')}
                            </span>
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
                      ))}
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
                      }}
                    >
                      DECISÕES DO CLIENTE
                    </div>
                    {d.approvals.map((appr) => (
                      <div
                        key={appr.id}
                        style={{
                          fontSize: '0.8125rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          marginTop: '0.25rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <StatusBadge status={appr.decision} />
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'var(--font-mono)' }}>
                          por {appr.actor?.name || 'Cliente'} em {new Date(appr.createdAt).toLocaleDateString('pt-BR')}:
                        </span>
                        {appr.comment && (
                          <span style={{ fontStyle: 'italic', color: 'var(--text-primary)', fontSize: '0.8125rem' }}>
                            "{appr.comment}"
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
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
      <Modal isOpen={versionModalOpen} onClose={() => setVersionModalOpen(false)} title={`Nova Versão: ${activeDeliverable?.title}`}>
        <form onSubmit={handleAddVersion} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Título ou Resumo da Versão
            </label>
            <input
              type="text"
              value={versionTitle}
              onChange={(e) => setVersionTitle(e.target.value)}
              placeholder="Ex: Ajustes solicitados de tipografia"
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
              Notas da Versão (Changelog)
            </label>
            <textarea
              rows={3}
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="Detalhes sobre o que foi alterado nesta iteração..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)' }}>
            <button type="button" onClick={() => setVersionModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Salvando...' : 'Adicionar Versão'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

