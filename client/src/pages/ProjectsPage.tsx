import React, { useState, useEffect } from 'react';
import { Plus, Calendar, DollarSign, FolderKanban, CheckCircle2, Edit2, Layers, Trash2, Archive, RefreshCw, Search, X, Clock, AlertCircle, Play, Share2, ExternalLink } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { Pagination } from '../components/Pagination';
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
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6);

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

  const fetchData = async (filter: string = statusFilter, query: string = search) => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      // Sequential queries to avoid PGlite lock collision
      const isArchived = filter === 'ARCHIVED';
      const searchParam = query.trim() ? `&search=${encodeURIComponent(query.trim())}` : '';
      const projRes = await api.get(`/projects?status=${isArchived ? 'ARCHIVED' : 'ALL'}&limit=100${searchParam}`);
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
    setCurrentPage(1);
    fetchData(statusFilter, search);
  }, [currentOrg, statusFilter, search]);

  const handleDeleteProject = async (proj: Project) => {
    const confirmed = window.confirm(
      `Tem certeza que deseja excluir permanentemente o projeto "${proj.name}"?\n\nATENÇÃO: Todos os entregáveis, versões, tarefas e comentários deste projeto serão excluídos permanentemente.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/projects/${proj.id}`);
      toast.success('Projeto excluído permanentemente.');
      setIsModalOpen(false);
      setEditingProject(null);
      fetchData(statusFilter);
    } catch (err: any) {
      console.error('Failed to delete project:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao excluir projeto permanentemente.');
    }
  };

  const handleArchiveProject = async (proj: Project) => {
    try {
      const isArchived = proj.status === 'ARCHIVED';
      if (isArchived) {
        await api.post(`/projects/${proj.id}/reactivate`);
        toast.success('Projeto reativado.');
      } else {
        await api.post(`/projects/${proj.id}/archive`);
        toast.success('Projeto arquivado.');
      }
      setIsModalOpen(false);
      setEditingProject(null);
      fetchData(statusFilter);
    } catch (err: any) {
      console.error('Failed to toggle archive status:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao alterar status de arquivamento.');
    }
  };

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
      const isLimit = err.response?.data?.error?.code === 'PLAN_LIMIT_REACHED';
      setFormError(
        err.response?.data?.error?.message ||
        (isLimit
          ? 'Limite de projetos do seu plano ativo atingido. Faça upgrade para iniciar novas campanhas.'
          : 'Erro ao salvar projeto. Verifique os dados fornecidos.')
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter !== 'ALL' && statusFilter !== 'ARCHIVED' && p.status !== statusFilter) {
      return false;
    }
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const nameMatch = p.name?.toLowerCase().includes(q);
    const descMatch = p.description?.toLowerCase().includes(q);
    const clientMatch = p.client?.name?.toLowerCase().includes(q);
    const catMatch = p.category?.toLowerCase().includes(q);
    return Boolean(nameMatch || descMatch || clientMatch || catMatch);
  });

  // Metrics
  const totalProjectsCount = statusFilter === 'ARCHIVED' ? 0 : projects.length;
  const inProgressCount = projects.filter((p) => p.status === 'IN_PROGRESS').length;
  const reviewCount = projects.filter((p) => p.status === 'REVIEW').length;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;

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
        {/* KPI Cards Grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: '1rem',
          }}
        >
          {/* Card: Total de Projetos */}
          <div
            onClick={() => {
              setStatusFilter('ALL');
              setCurrentPage(1);
            }}
            style={{
              background: 'var(--bg-surface)',
              border: statusFilter === 'ALL'
                ? '1px solid var(--accent-primary)'
                : '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '1.125rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              transition: 'all 0.15s ease',
              boxShadow: statusFilter === 'ALL' ? '0 0 0 1px var(--accent-primary)' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--text-tertiary)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Total de Projetos
              </span>
              <FolderKanban size={14} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
              {totalProjectsCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Campanhas ativas no workspace
            </span>
          </div>

          {/* Card: Em Andamento */}
          <div
            onClick={() => {
              setStatusFilter('IN_PROGRESS');
              setCurrentPage(1);
            }}
            style={{
              background: 'var(--bg-surface)',
              border: statusFilter === 'IN_PROGRESS'
                ? '1px solid #3b82f6'
                : '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '1.125rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              transition: 'all 0.15s ease',
              boxShadow: statusFilter === 'IN_PROGRESS' ? '0 0 0 1px #3b82f6' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#3b82f6', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Em Andamento
              </span>
              <Play size={14} style={{ color: '#3b82f6' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#3b82f6', letterSpacing: '-0.03em' }}>
              {inProgressCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Produção ativa da equipe
            </span>
          </div>

          {/* Card: Em Revisão */}
          <div
            onClick={() => {
              setStatusFilter('REVIEW');
              setCurrentPage(1);
            }}
            style={{
              background: 'var(--bg-surface)',
              border: statusFilter === 'REVIEW'
                ? '1px solid #f59e0b'
                : '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '1.125rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              transition: 'all 0.15s ease',
              boxShadow: statusFilter === 'REVIEW' ? '0 0 0 1px #f59e0b' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#f59e0b', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Em Revisão
              </span>
              <Clock size={14} style={{ color: '#f59e0b' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#f59e0b', letterSpacing: '-0.03em' }}>
              {reviewCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Aguardando validação do cliente
            </span>
          </div>

          {/* Card: Concluídos */}
          <div
            onClick={() => {
              setStatusFilter('COMPLETED');
              setCurrentPage(1);
            }}
            style={{
              background: 'var(--bg-surface)',
              border: statusFilter === 'COMPLETED'
                ? '1px solid #10b981'
                : '1px solid var(--border-hairline)',
              borderRadius: '8px',
              padding: '1.125rem 1.25rem',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.375rem',
              transition: 'all 0.15s ease',
              boxShadow: statusFilter === 'COMPLETED' ? '0 0 0 1px #10b981' : 'none',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#10b981', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                Concluídos
              </span>
              <CheckCircle2 size={14} style={{ color: '#10b981' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, fontFamily: 'var(--font-mono)', color: '#10b981', letterSpacing: '-0.03em' }}>
              {completedCount}
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
              Campanhas finalizadas
            </span>
          </div>
        </div>

        {/* Cohesive Toolbar */}
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
            {/* Search Input */}
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="Buscar por nome, cliente ou tag..."
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

            {/* Status Select Filter */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                width: 'auto',
                minWidth: '170px',
                height: '34px',
                fontSize: '0.8125rem',
                padding: '0 0.75rem',
              }}
            >
              <option value="ALL">Todos os Projetos</option>
              <option value="IN_PROGRESS">Em Andamento</option>
              <option value="REVIEW">Em Revisão</option>
              <option value="PLANNING">Planejamento</option>
              <option value="ON_HOLD">Pausados</option>
              <option value="COMPLETED">Concluídos</option>
              <option value="ARCHIVED">Arquivados</option>
            </select>

            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
                letterSpacing: '0.05em',
                whiteSpace: 'nowrap',
              }}
            >
              TOTAL: {filteredProjects.length} {filteredProjects.length === 1 ? 'PROJETO' : 'PROJETOS'}
            </span>
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
                setStatusFilter('ALL');
                setCurrentPage(1);
              }}
              className="btn btn-sm"
              style={{
                backgroundColor: statusFilter !== 'ARCHIVED' ? 'var(--bg-surface)' : 'transparent',
                color: statusFilter !== 'ARCHIVED' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: statusFilter !== 'ARCHIVED' ? 'var(--shadow-subtle)' : 'none',
                border: 'none',
                fontSize: '12px',
                fontWeight: 500,
                padding: '0.25rem 0.65rem',
              }}
            >
              Ativos ({totalProjectsCount})
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
              {search ? <Search size={20} /> : <FolderKanban size={20} />}
            </div>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
              {search ? `Nenhum projeto encontrado para "${search}"` : 'Nenhum projeto encontrado'}
            </h3>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', maxWidth: '360px' }}>
              {search
                ? 'Tente buscar com outro nome de campanha, cliente ou categoria, ou limpe o filtro.'
                : statusFilter !== 'ALL'
                ? 'Nenhum projeto com este status. Tente outro filtro ou crie uma nova demanda.'
                : 'Crie seu primeiro projeto para gerenciar prazos, tarefas e entregáveis com seus clientes.'}
            </p>
            {search ? (
              <button onClick={() => setSearch('')} className="btn btn-secondary btn-sm">
                Limpar busca
              </button>
            ) : (
              <button
                onClick={handleOpenCreate}
                className="btn btn-primary btn-sm"
              >
                <Plus size={14} />
                <span>Criar Projeto</span>
              </button>
            )}
          </div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))', gap: '1rem' }}>
              {filteredProjects.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
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

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const portalUrl = `${window.location.origin}/portal/${p.id}`;
                        navigator.clipboard.writeText(portalUrl);
                        toast.success(`Link do portal (${p.name}) copiado!`);
                      }}
                      className="btn btn-outline btn-sm"
                      title="Copiar link do portal do cliente (acesso sem senha)"
                      style={{ gap: '4px', fontSize: '11px', height: '28px', padding: '0 7px' }}
                    >
                      <Share2 size={12} />
                      <span>Link Portal</span>
                    </button>
                    <a
                      href={`/portal/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-outline btn-sm"
                      title="Abrir portal do cliente em nova aba"
                      style={{ height: '28px', padding: '0 7px' }}
                    >
                      <ExternalLink size={12} />
                    </a>
                    <button
                      onClick={() => handleOpenEdit(p)}
                      className="btn btn-outline btn-sm"
                      title="Editar projeto"
                      style={{ height: '28px', padding: '0 7px' }}
                    >
                      <Edit2 size={12} />
                    </button>
                    <Link to="/dashboard/deliverables" className="btn btn-secondary btn-sm" style={{ height: '28px', padding: '0 8px', fontSize: '11px' }}>
                      <CheckCircle2 size={12} />
                      <span>Entregáveis</span>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
            </div>

            <Pagination
              currentPage={currentPage}
              totalItems={filteredProjects.length}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={(val) => {
                setItemsPerPage(val);
                setCurrentPage(1);
              }}
              itemsPerPageOptions={[6, 12, 24]}
              itemLabel="projetos"
              hideIfSinglePage={true}
            />
          </>
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
                padding: '0.75rem 0.85rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.35rem',
              }}
            >
              <span>{formError}</span>
              {(formError.includes('upgrade') || formError.includes('Limite')) && (
                <Link to="/dashboard/billing" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none', borderBottom: '1px solid var(--accent-primary)', width: 'fit-content', marginTop: '0.2rem' }}>
                  Ver Opções de Planos & Upgrade →
                </Link>
              )}
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

          <div style={{ display: 'flex', justifyContent: editingProject ? 'space-between' : 'flex-end', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)', flexWrap: 'wrap' }}>
            {editingProject && (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(editingProject)}
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
                  onClick={() => handleArchiveProject(editingProject)}
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
                  title={editingProject.status === 'ARCHIVED' ? 'Reativar projeto' : 'Ocultar e enviar para arquivados'}
                >
                  {editingProject.status === 'ARCHIVED' ? <RefreshCw size={13} /> : <Archive size={13} />}
                  <span>{editingProject.status === 'ARCHIVED' ? 'Reativar' : 'Arquivar'}</span>
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
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
          </div>
        </form>
      </Modal>
    </div>
  );
};

