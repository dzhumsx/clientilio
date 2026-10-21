import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Briefcase,
  CheckCircle2,
  Clock,
  Plus,
  ArrowUpRight,
  FolderKanban,
  ExternalLink,
  ChevronRight
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
      const clientsRes = await api.get('/clients?status=ACTIVE');
      const projectsRes = await api.get('/projects');
      const delivRes = await api.get('/deliverables');

      setClients(clientsRes.data.clients || clientsRes.data.data || []);
      setProjects(projectsRes.data.projects || projectsRes.data.data || []);
      setDeliverables(delivRes.data || []);
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
        title="Painel da Agência"
        subtitle={`Controle de campanhas, clientes e entregáveis: ${currentOrg?.name || 'Agência'}`}
        actions={
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <Link to="/portal" className="btn btn-ghost btn-sm">
              <ExternalLink size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>Portal Demo</span>
            </Link>
            <Link to="/dashboard/projects" className="btn btn-primary btn-sm">
              <Plus size={13} />
              <span>Nova Campanha</span>
            </Link>
          </div>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1280px', margin: '0 auto' }}>
        {/* Metric Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="eyebrow">CLIENTES ATIVOS</span>
              <Users size={16} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
              {loading ? '-' : activeClientsCount}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              <span>Contas sob gestão ativa</span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="eyebrow">CAMPANHAS EM ANDAMENTO</span>
              <Briefcase size={16} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
              {loading ? '-' : inProgressProjectsCount}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              <span>{projects.length} campanhas no total</span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="eyebrow">PEÇAS P/ REVISÃO</span>
              <Clock size={16} style={{ color: 'var(--color-warning)' }} />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', color: pendingApprovalsCount > 0 ? 'var(--color-warning)' : 'var(--accent-primary)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
              {loading ? '-' : pendingApprovalsCount}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
              <span>Aguardando aprovação do cliente</span>
            </div>
          </div>

          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span className="eyebrow">PLANO DA AGÊNCIA</span>
              <ArrowUpRight size={16} style={{ color: 'var(--accent-primary)' }} />
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--accent-primary)', margin: '0.35rem 0', fontFamily: 'var(--font-mono)' }}>
              {currentOrg?.planId ? currentOrg.planId.toUpperCase() : 'AGENCY'}
            </div>
            <Link
              to="/dashboard/billing"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '12px', color: 'var(--text-secondary)' }}
            >
              <span>Gerenciar plano & limites</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Recent Projects Table Section */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '15px', fontWeight: 500, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                Projetos Recentes
              </h2>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Status, prazos e entregáveis associados
              </p>
            </div>
            <Link to="/dashboard/projects" className="btn btn-ghost btn-sm">
              Ver todos os projetos
            </Link>
          </div>

          {projects.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-tertiary)' }}>
              <FolderKanban size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>Nenhum projeto cadastrado ainda</p>
              <p style={{ fontSize: '12px', marginTop: '0.2rem', color: 'var(--text-secondary)' }}>Cadastre um cliente e configure seu primeiro projeto.</p>
              <Link to="/dashboard/clients" className="btn btn-primary btn-sm" style={{ marginTop: '0.85rem' }}>
                <Plus size={13} />
                <span>Adicionar Primeiro Cliente</span>
              </Link>
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Nome do Projeto</th>
                    <th>Cliente</th>
                    <th>Status</th>
                    <th>Prazo</th>
                    <th style={{ textAlign: 'right' }}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.slice(0, 5).map((project) => (
                    <tr key={project.id}>
                      <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {project.name}
                      </td>
                      <td>{project.client?.name || 'Cliente'}</td>
                      <td>
                        <StatusBadge status={project.status} />
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>
                        {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <Link to="/dashboard/projects" className="btn btn-ghost btn-sm">
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
