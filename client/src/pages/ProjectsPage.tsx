import React, { useState, useEffect } from 'react';
import { Plus, Briefcase, Calendar, DollarSign, FolderKanban, CheckCircle2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Project, Client } from '../types';
import { Link } from 'react-router-dom';

export const ProjectsPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [clientId, setClientId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [targetEndDate, setTargetEndDate] = useState('');
  const [budget, setBudget] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [projRes, clientRes] = await Promise.all([
        api.get('/projects'),
        api.get('/clients?status=ACTIVE'),
      ]);
      setProjects(projRes.data.projects || []);
      const activeClients = clientRes.data.clients || [];
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

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await api.post('/projects', {
        clientId,
        name,
        description: description || undefined,
        category: category || undefined,
        targetEndDate: targetEndDate ? new Date(targetEndDate).toISOString() : undefined,
        budget: budget ? parseFloat(budget) : undefined,
      });

      setIsModalOpen(false);
      setName('');
      setDescription('');
      setCategory('');
      setTargetEndDate('');
      setBudget('');
      fetchData();
    } catch (err: any) {
      console.error('Failed to create project:', err);
      setFormError(
        err.response?.data?.error?.message ||
        'Erro ao criar projeto. Verifique os dados ou o limite do plano da agência.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) => {
    if (statusFilter === 'ALL') return true;
    return p.status === statusFilter;
  });

  return (
    <div>
      <Navbar
        title="Projetos da Agência"
        subtitle="Entregas, campanhas e escopos em andamento"
        actions={
          <button
            onClick={() => {
              if (clients.length === 0) {
                alert('Cadastre um cliente antes de criar um projeto.');
                return;
              }
              setIsModalOpen(true);
            }}
            className="btn btn-primary btn-sm"
          >
            <Plus size={16} />
            <span>Novo Projeto</span>
          </button>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          {['ALL', 'IN_PROGRESS', 'REVIEW', 'PLANNING', 'COMPLETED', 'ON_HOLD'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`btn btn-sm ${statusFilter === st ? 'btn-secondary' : 'btn-outline'}`}
              style={{
                fontSize: '0.8rem',
                border: statusFilter === st ? '1px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
              }}
            >
              {st === 'ALL' && 'Todos'}
              {st === 'IN_PROGRESS' && 'Em Andamento'}
              {st === 'REVIEW' && 'Em Revisão'}
              {st === 'PLANNING' && 'Planejamento'}
              {st === 'COMPLETED' && 'Concluídos'}
              {st === 'ON_HOLD' && 'Pausados'}
            </button>
          ))}
        </div>

        {/* Projects Grid */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Carregando projetos...</p>
          </div>
        ) : filteredProjects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
            <FolderKanban size={42} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Nenhum projeto encontrado
            </h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              Crie seu primeiro projeto para gerenciar prazos, tarefas e entregáveis.
            </p>
            <button
              onClick={() => {
                if (clients.length === 0) {
                  alert('Cadastre um cliente antes de criar um projeto.');
                  return;
                }
                setIsModalOpen(true);
              }}
              className="btn btn-primary btn-sm"
            >
              <Plus size={14} />
              <span>Criar Projeto</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.25rem' }}>
            {filteredProjects.map((p) => (
              <div key={p.id} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>
                      {p.category || 'Geral'} • {p.client?.name || 'Cliente'}
                    </span>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginTop: '0.2rem' }}>{p.name}</h3>
                  </div>
                  <StatusBadge status={p.status} />
                </div>

                {p.description && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1.25rem', lineHeight: 1.5 }}>
                    {p.description}
                  </p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                  {p.targetEndDate && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calendar size={14} />
                      <span>Prazo: {new Date(p.targetEndDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  )}
                  {p.budget && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <DollarSign size={14} color="var(--color-success)" />
                      <span>Orçamento: R$ {p.budget.toLocaleString('pt-BR')}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                    <span>{p._count?.deliverables || 0} Entregáveis</span>
                    <span>•</span>
                    <span>{p._count?.tasks || 0} Tarefas</span>
                  </div>

                  <Link to="/dashboard/deliverables" className="btn btn-secondary btn-sm">
                    <CheckCircle2 size={14} />
                    <span>Entregáveis</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Project Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Projeto">
        <form onSubmit={handleCreateProject} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {formError && (
            <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              {formError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
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

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Nome do Projeto *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Redesign de Identidade Visual 2026"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
                Categoria / Serviço
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Ex: Branding, Social Media"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
                Orçamento Estimado (R$)
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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Prazo Estimado de Entrega
            </label>
            <input
              type="date"
              value={targetEndDate}
              onChange={(e) => setTargetEndDate(e.target.value)}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Descrição & Escopo
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Objetivos do projeto, entregáveis acordados, restrições..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Salvando...' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
