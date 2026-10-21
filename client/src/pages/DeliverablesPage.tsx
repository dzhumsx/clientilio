import React, { useState, useEffect } from 'react';
import { Plus, CheckCircle2, Clock, Upload, ExternalLink, AlertCircle, FileText, Send, Edit2 } from 'lucide-react';
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
  const [loading, setLoading] = useState(true);

  // Deliverable Modal (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDeliverable, setEditingDeliverable] = useState<Deliverable | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [clientVisible, setClientVisible] = useState(true);
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
        const delivRes = await api.get(`/deliverables?projectId=${projId}`);
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
  }, [currentOrg, selectedProjectId]);

  const handleOpenCreateDeliverable = () => {
    if (projects.length === 0) {
      alert('Crie um projeto antes de adicionar entregáveis.');
      return;
    }
    setEditingDeliverable(null);
    setTitle('');
    setDescription('');
    setClientVisible(true);
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
        // Query de update do entregável
        const { data: updated } = await api.put(`/deliverables/${editingDeliverable.id}`, {
          title,
          description: description || undefined,
        });

        // Atualiza imediatamente a exibição do conteúdo com as mudanças
        setDeliverables((prev) =>
          prev.map((d) => (d.id === editingDeliverable.id ? { ...d, ...updated } : d))
        );
        toast.success('Entregável atualizado com sucesso!');
        setIsModalOpen(false);
        setEditingDeliverable(null);
      } else {
        const { data: newDeliv } = await api.post('/deliverables', {
          projectId: selectedProjectId,
          title,
          description: description || undefined,
          clientVisible,
        });

        setDeliverables((prev) => [newDeliv, ...prev]);
        toast.success('Entregável criado com sucesso!');
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

      // Atualiza imediatamente a exibição
      setDeliverables((prev) =>
        prev.map((d) => {
          if (d.id === activeDeliverable.id) {
            const versions = [newVersion, ...(d.versions || [])];
            return { ...d, versions, currentVersionNumber: newVersion.versionNumber };
          }
          return d;
        })
      );
      toast.success('Nova versão adicionada!');

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
      // Atualiza imediatamente a exibição do conteúdo
      setDeliverables((prev) =>
        prev.map((d) => (d.id === deliverableId ? { ...d, ...(updated || {}), status: 'IN_REVIEW' } : d))
      );
      toast.success('Entregável enviado para aprovação do cliente!');
      fetchProjectsAndDeliverables();
    } catch (err: any) {
      console.error('Failed to submit for review:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao submeter entregável');
    }
  };

  return (
    <div>
      <Navbar
        title="Entregáveis & Aprovações"
        subtitle="Versionamento de arquivos e fluxo de aceite com os clientes"
        actions={
          <button
            onClick={handleOpenCreateDeliverable}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} />
            <span>Novo Entregável</span>
          </button>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Project Selector Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
            Filtrar por Projeto:
          </span>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            style={{ width: 'auto', minWidth: '240px' }}
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.client?.name || 'Cliente'})
              </option>
            ))}
          </select>
        </div>

        {/* Deliverables List */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Carregando entregáveis...</p>
          </div>
        ) : deliverables.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
            <CheckCircle2 size={42} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Nenhum entregável cadastrado neste projeto
            </h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Crie entregáveis (como layouts, vídeos, copys, relatórios) para enviar para aprovação do cliente.
            </p>
            <button
              onClick={() => setIsModalOpen(true)}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} />
              <span>Adicionar Entregável</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {deliverables.map((d) => (
              <div key={d.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>{d.title}</h3>
                      <span className="badge badge-neutral" style={{ fontSize: '0.75rem', fontWeight: 700 }}>
                        v{d.currentVersionNumber}
                      </span>
                    </div>
                    {d.description && (
                      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
                        {d.description}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <StatusBadge status={d.status} />

                    {d.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSubmitForReview(d.id)}
                        className="btn btn-primary btn-sm"
                        title="Enviar para aprovação do cliente"
                      >
                        <Send size={14} />
                        <span>Enviar p/ Cliente</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditDeliverable(d)}
                      className="btn btn-outline btn-sm"
                      title="Editar entregável"
                    >
                      <Edit2 size={14} />
                      <span>Editar</span>
                    </button>

                    <button
                      onClick={() => {
                        setActiveDeliverable(d);
                        setVersionModalOpen(true);
                      }}
                      className="btn btn-secondary btn-sm"
                    >
                      <Upload size={14} />
                      <span>Nova Versão</span>
                    </button>
                  </div>
                </div>

                {/* Versions list */}
                {d.versions && d.versions.length > 0 && (
                  <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: 'var(--radius-md)', padding: '1rem' }}>
                    <h4 style={{ fontSize: '0.825rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
                      Histórico de Versões
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {d.versions.map((ver) => (
                        <div
                          key={ver.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.5rem 0.75rem',
                            background: 'rgba(255, 255, 255, 0.02)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: '0.85rem',
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                            <FileText size={16} color="var(--accent-primary)" />
                            <span style={{ fontWeight: 600 }}>Versão {ver.versionNumber}</span>
                            {ver.notes && <span style={{ color: 'var(--text-muted)' }}>— {ver.notes}</span>}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {new Date(ver.createdAt).toLocaleDateString('pt-BR')}
                            </span>
                            {ver.externalUrl && (
                              <a
                                href={ver.externalUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-outline btn-sm"
                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                              >
                                <ExternalLink size={12} />
                                <span>Abrir Link</span>
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
                  <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '0.75rem 1rem' }}>
                    <h5 style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
                      Registro de Decisões do Cliente:
                    </h5>
                    {d.approvals.map((appr) => (
                      <div key={appr.id} style={{ fontSize: '0.825rem', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
                        <StatusBadge status={appr.decision} />
                        <span style={{ color: 'var(--text-secondary)' }}>
                          por {appr.actor?.name || 'Cliente'} em {new Date(appr.createdAt).toLocaleDateString('pt-BR')}:
                        </span>
                        {appr.comment && <span style={{ fontStyle: 'italic', color: '#fff' }}>"{appr.comment}"</span>}
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
        <form onSubmit={handleSaveDeliverable} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {formError && (
            <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              {formError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Título do Entregável *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Landing Page Mobile & Desktop v1"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Instruções / Descrição
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o que foi entregue, pontos de atenção para o cliente..."
            />
          </div>

          {!editingDeliverable && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="checkbox"
                id="clientVis"
                checked={clientVisible}
                onChange={(e) => setClientVisible(e.target.checked)}
                style={{ width: 'auto' }}
              />
              <label htmlFor="clientVis" style={{ fontSize: '0.85rem', cursor: 'pointer' }}>
                Visível no portal do cliente imediatamente
              </label>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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
        </form>
      </Modal>

      {/* Add Version Modal */}
      <Modal isOpen={versionModalOpen} onClose={() => setVersionModalOpen(false)} title={`Nova Versão: ${activeDeliverable?.title}`}>
        <form onSubmit={handleAddVersion} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Título ou Resumo da Versão
            </label>
            <input
              type="text"
              value={versionTitle}
              onChange={(e) => setVersionTitle(e.target.value)}
              placeholder="Ex: Ajustes de tipografia e botões solicitados"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Link Externo (Figma, Loom, Google Drive, Canva)
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://figma.com/file/..."
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Notas da Versão (Changelog)
            </label>
            <textarea
              rows={3}
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              placeholder="Detalhe o que mudou em relação à versão anterior..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
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
