import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  TrendingUp,
  FolderKanban,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Client, Project, Deliverable } from '../types';

export const DashboardPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const [clientsRes, projectsRes] = await Promise.all([
        api.get('/clients?status=ACTIVE'),
        api.get('/projects'),
      ]);
      setClients(clientsRes.data.clients || []);
      setProjects(projectsRes.data.projects || []);

      // If there are projects, fetch deliverables for first project
      if (projectsRes.data.projects?.length > 0) {
        const delivRes = await api.get(`/deliverables?projectId=${projectsRes.data.projects[0].id}`);
        setDeliverables(delivRes.data || []);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg]);

  const activeClientsCount = clients.length;
  const inProgressProjectsCount = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'REVIEW').length;
  const pendingApprovalsCount = deliverables.filter((d) => d.status === 'READY_FOR_REVIEW' || d.status === 'IN_REVIEW').length;

  return (
    <div>
      <Navbar
        title="Painel Executivo"
        subtitle={`Visão geral da agência: ${currentOrg?.name || 'Carregando...'}`}
        actions={
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Link to="/portal" className="btn btn-secondary btn-sm">
              <ExternalLink size={14} />
              <span>Ver Portal do Cliente</span>
            </Link>
            <Link to="/dashboard/projects" className="btn btn-primary btn-sm">
              <Plus size={14} />
              <span>Novo Projeto</span>
            </Link>
          </div>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.25rem' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Clientes Ativos</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(99, 102, 241, 0.15)',
                  color: 'var(--accent-primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Users size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>{loading ? '-' : activeClientsCount}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-success)' }}>
              <TrendingUp size={14} />
              <span>Relacionamentos ativos</span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Projetos em Andamento</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(14, 165, 233, 0.15)',
                  color: 'var(--color-info)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Briefcase size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>{loading ? '-' : inProgressProjectsCount}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              <FolderKanban size={14} />
              <span>{projects.length} projetos cadastrados</span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Entregáveis Aguardando Revisão</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(245, 158, 11, 0.15)',
                  color: 'var(--color-warning)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Clock size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>{loading ? '-' : pendingApprovalsCount}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.75rem', color: 'var(--color-warning)' }}>
              <CheckCircle2 size={14} />
              <span>Aguardando feedback do cliente</span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 500 }}>Plano da Agência</span>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(168, 85, 247, 0.15)',
                  color: '#c084fc',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={18} />
              </div>
            </div>
            <div style={{ fontSize: '1.85rem', fontWeight: 800 }}>
              {currentOrg?.planId ? currentOrg.planId.toUpperCase() : 'FREE'}
            </div>
            <Link
              to="/dashboard/billing"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.5rem', fontSize: '0.75rem', fontWeight: 600 }}
            >
              <span>Gerenciar plano & limites</span>
              <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>

        {/* Recent Projects Table Section */}
        <div className="card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 700 }}>Projetos Recentes</h2>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Status e prazos das contas ativas</p>
            </div>
            <Link to="/dashboard/projects" className="btn btn-outline btn-sm">
              Ver todos os projetos
            </Link>
          </div>

          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
              <FolderKanban size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 500, fontSize: '0.95rem' }}>Nenhum projeto cadastrado ainda</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>Cadastre um cliente e crie o primeiro projeto da sua agência.</p>
              <Link to="/dashboard/clients" className="btn btn-primary btn-sm" style={{ marginTop: '1rem' }}>
                <Plus size={14} />
                <span>Adicionar Primeiro Cliente</span>
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Nome do Projeto</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Cliente</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>Prazo</th>
                    <th style={{ padding: '0.75rem 1rem', fontWeight: 600, textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 5).map((project) => (
                    <tr
                      key={project.id}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background var(--transition-fast)',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <td style={{ padding: '1rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {project.name}
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-secondary)' }}>
                        {project.client?.name || 'Cliente'}
                      </td>
                      <td style={{ padding: '1rem' }}>
                        <StatusBadge status={project.status} />
                      </td>
                      <td style={{ padding: '1rem', color: 'var(--text-muted)' }}>
                        {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString('pt-BR') : 'Sem prazo'}
                      </td>
                      <td style={{ padding: '1rem', textAlign: 'right' }}>
                        <Link to={`/dashboard/projects`} className="btn btn-secondary btn-sm">
                          Gerenciar
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
