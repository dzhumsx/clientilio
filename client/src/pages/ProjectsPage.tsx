import React, { useState, useEffect } from 'react';
import { Plus, Calendar, DollarSign, FolderKanban, CheckCircle2, Edit2, Layers } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Project, Client } from '../types';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export const ProjectsPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [status, setStatus] = useState<Project['status']>('PLANNING');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      // Sequential queries to avoid PGlite lock collision
      const projRes = await api.get('/projects');
      setProjects(projRes.data.projects || projRes.data.data || []);

      const clientRes = await api.get('/clients?status=ACTIVE');
      const activeClients = clientRes.data.clients || clientRes.data.data || [];
      setClients(activeClients);
      if (activeClients.length > 0 && !clientId) {
        setClientId(activeClients[0].id);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg]);

  const handleOpenCreate = () => {
    if (clients.length === 0) {
      toast.error('Cadastre um cliente antes de criar um projeto.');
      return;
    }
    setEditingProject(null);
    setClientId(clients[0]?.id || '');
    setName('');
    setDescription('');
    setCategory('');
    setTargetEndDate('');
    setBudget('');
    setStatus('PLANNING');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Project) => {
    setEditingProject(p);
    setClientId(p.clientId);
    setName(p.name);
    setDescription(p.description || '');
    setCategory(p.category || '');
    setTargetEndDate(p.targetEndDate ? p.targetEndDate.split('T')[0] : '');
    setBudget(p.budget ? String(p.budget) : '');
    setStatus(p.status);
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingProject) {
        const { data: updatedProject } = await api.put(`/projects/${editingProject.id}`, {
          name,
          description: description || undefined,
          category: category || undefined,
          status,
          targetEndDate: targetEndDate ? new Date(targetEndDate).toISOString() : undefined,
          budget: budget ? parseFloat(budget) : undefined,
        });

        setProjects((prev) =>
          prev.map((p) => (p.id === editingProject.id ? { ...p, ...updatedProject } : p))
        );
        toast.success('Projeto atualizado com sucesso.');
        setIsModalOpen(false);
        setEditingProject(null);
      } else {
        const { data: newProject } = await api.post('/projects', {
          clientId,
          name,
          description: description || undefined,
          category: category || undefined,
          targetEndDate: targetEndDate ? new Date(targetEndDate).toISOString() : undefined,
          budget: budget ? parseFloat(budget) : undefined,
        });

        setProjects((prev) => [newProject, ...prev]);
        toast.success('Projeto criado com sucesso.');
        setIsModalOpen(false);
      }

      fetchData();
    } catch (err: any) {
      console.error('Failed to save project:', err);
      setFormError(
        err.response?.data?.error?.message ||
        'Erro ao salvar projeto. Verifique os dados ou o limite do plano da agência.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  const filterTabs = [
    { id: 'ALL', label: 'TODOS', count: projects.length },
    { id: 'IN_PROGRESS', label: 'EM ANDAMENTO', count: projects.filter(p => p.status === 'IN_PROGRESS').length },
    { id: 'REVIEW', label: 'EM REVISÃO', count: projects.filter(p => p.status === 'REVIEW').length },
    { id: 'PLANNING', label: 'PLANEJAMENTO', count: projects.filter(p => p.status === 'PLANNING').length },
    { id: 'COMPLETED', label: 'CONCLUÍDOS', count: projects.filter(p => p.status === 'COMPLETED').length },
    { id: 'ON_HOLD', label: 'PAUSADOS', count: projects.filter(p => p.status === 'ON_HOLD').length },
  ];

  return (
    <div>
      <Navbar
        title="Campanhas & Projetos"
        subtitle="Prazos, criativos e escopos em produção para seus clientes"
        actions={
          <button
            onClick={handleOpenCreate}
            className="btn btn-primary btn-sm"
          >
            <Plus size={14} />
            <span>Nova Campanha</span>
          </button>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Segmented Filter Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div
            style={{
              display: 'inline-flex',
              padding: '3px',
              background: 'var(--bg-subtle)',
              borderRadius: '6px',
              border: '1px solid var(--border-hairline)',
              gap: '2px',
              overflowX: 'auto',
              maxWidth: '100%',
            }}
          >
            {filterTabs.map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.6875rem',
                    fontWeight: active ? 600 : 500,
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.06em',
                    border: 'none',
                    borderRadius: '4px',
                    background: active ? 'var(--bg-surface)' : 'transparent',
                    color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    cursor: 'pointer',
                    boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                    transition: 'all 0.15s ease',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>{tab.label}</span>
                  <span
                    style={{
                      padding: '1px 5px',
                      borderRadius: '3px',
                      fontSize: '0.625rem',
                      background: active ? 'var(--accent-subtle)' : 'transparent',
                      color: active ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                    }}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <span
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '0.6875rem',
              color: 'var(--text-tertiary)',
              letterSpacing: '0.05em',
            }}
          >
            TOTAL: {filteredProjects.length} {filteredProjects.length === 1 ? 'PROJETO' : 'PROJETOS'}
          </span>
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
            CARREGANDO PROJETOS...
          </div>
        ) : filteredProjects.length === 0 ? (
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
              <FolderKanban size={20} />
            </div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              Nenhum projeto encontrado
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', maxWidth: '360px' }}>
              {statusFilter !== 'ALL'
                ? 'Nenhum projeto com este status. Tente outro filtro ou crie uma nova demanda.'
                : 'Crie seu primeiro projeto para gerenciar prazos, tarefas e entregáveis com seus clientes.'}
            </p>
            <button
              onClick={handleOpenCreate}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} />
              <span>Criar Projeto</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
            {filteredProjects.map((p) => (
              <div
                key={p.id}
                className="card card-interactive"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  padding: '1.25rem',
                }}
              >
                {/* Header with Eyebrow and Status */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.6875rem',
                        fontWeight: 600,
                        letterSpacing: '0.071em',
                        color: 'var(--text-tertiary)',
                        textTransform: 'uppercase',
                        marginBottom: '0.25rem',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {p.category || 'GERAL'} • {p.client?.name || 'CLIENTE'}
                    </div>
                    <h3
                      style={{
                        fontSize: '1rem',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.3,
                        margin: 0,
                      }}
                    >
                      {p.name}
                    </h3>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                {/* Description */}
                {p.description && (
                  <p
                    style={{
                      fontSize: '0.8125rem',
                      color: 'var(--text-secondary)',
                      marginBottom: '1rem',
                      lineHeight: 1.5,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {p.description}
                  </p>
                )}

                {/* Meta Items */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem',
                    marginBottom: '1.25rem',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    flexWrap: 'wrap',
                  }}
                >
                  {p.targetEndDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <Calendar size={13} style={{ color: 'var(--text-tertiary)' }} />
                      <span>{new Date(p.targetEndDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  {p.budget && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                      <DollarSign size={13} style={{ color: 'var(--accent-primary)' }} />
                      <span>R$ {p.budget.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                {/* Card Footer */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '0.875rem',
                    borderTop: '1px solid var(--border-hairline)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.75rem',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.6875rem',
                      color: 'var(--text-tertiary)',
                      letterSpacing: '0.04em',
                    }}
                  >
                    <Layers size={12} />
                    <span>{p._count?.deliverables || 0} ENTREGÁVEIS</span>
                    <span>•</span>
                    <span>{p._count?.tasks || 0} TAREFAS</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="btn btn-outline btn-sm"
                      title="Editar projeto"
                    >
                      <Edit2 size={13} />
                      <span>Editar</span>
                    </button>
                    <Link to="/dashboard/deliverables" className="btn btn-secondary btn-sm">
                      <CheckCircle2 size={13} />
                      <span>Entregáveis</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Project Modal (Create & Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingProject(null);
        }}
        title={editingProject ? 'Editar Projeto' : 'Novo Projeto'}
      >
        <form onSubmit={handleSaveProject} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
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

          {!editingProject && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                Cliente Vinculado *
              </label>
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.company ? `(${c.company})` : ''}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Nome do Projeto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Redesign de Identidade Visual"
            />
          </div>

          {editingProject && (
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                Status do Projeto
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="PLANNING">Planejamento</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="REVIEW">Em Revisão</option>
                <option value="COMPLETED">Concluído</option>
                <option value="ON_HOLD">Pausado</option>
              </select>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                Categoria / Tag
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Tráfego Pago, Social Media, Branding"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
                Orçamento / Fee (R$)
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="Ex: 8500"
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Prazo Estimado
            </label>
            <input
              type="date"
              value={targetEndDate}
              onChange={(e) => setTargetEndDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-secondary)', marginBottom: '0.375rem' }}>
              Descrição & Escopo da Campanha
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos da campanha, cronograma de postagens, entregáveis contratados..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)' }}>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingProject(null);
              }}
              className="btn btn-secondary btn-sm"
            >
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Salvando...' : editingProject ? 'Salvar Alterações' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

