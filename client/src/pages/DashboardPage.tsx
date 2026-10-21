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
  ChevronRight,
  UserPlus,
  ShieldCheck,
  Crown,
  Shield,
  FileText,
  AlertCircle,
  Building2,
  Sparkles,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Client, Project, Deliverable, TeamMember } from '../types';

export const DashboardPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [pendingInvitesCount, setPendingInvitesCount] = useState<number>(0);
  const [limits, setLimits] = useState<{ maxTeamMembers: number; maxActiveClients: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      // Sequential/safe queries to avoid PGlite lock collision
      const clientsRes = await api.get('/clients?status=ACTIVE');
      setClients(clientsRes.data.clients || clientsRes.data.data || []);

      const projectsRes = await api.get('/projects');
      setProjects(projectsRes.data.projects || projectsRes.data.data || []);

      const delivRes = await api.get('/deliverables');
      setDeliverables(delivRes.data || []);

      const membersRes = await api.get('/organizations/members');
      setMembers(membersRes.data || []);

      try {
        const orgRes = await api.get('/organizations/current');
        if (orgRes.data?.limits) {
          setLimits(orgRes.data.limits);
        }
      } catch (e) {}

      try {
        const invRes = await api.get('/organizations/invitations');
        setPendingInvitesCount(invRes.data?.length || 0);
      } catch (e) {}
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg]);

  // Derived Metrics
  const activeClientsCount = clients.length;
  const inProgressProjectsCount = projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'REVIEW').length;
  const completedProjectsCount = projects.filter((p) => p.status === 'COMPLETED').length;

  const inReviewDeliverables = deliverables.filter((d) => d.status === 'IN_REVIEW' || d.status === 'READY_FOR_REVIEW');
  const approvedDeliverables = deliverables.filter((d) => d.status === 'APPROVED');
  const changesRequestedDeliverables = deliverables.filter((d) => d.status === 'CHANGES_REQUESTED');

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div>
      <Navbar
        title="Painel da Agência"
        subtitle={`Visão geral de clientes, campanhas, entregáveis e equipe • ${currentOrg?.name || 'Agência'}`}
        actions={
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Link to="/portal" className="btn btn-ghost btn-sm">
              <ExternalLink size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>Portal Demo</span>
            </Link>
            <Link to="/dashboard/clients" className="btn btn-secondary btn-sm">
              <Plus size={13} />
              <span>Novo Cliente</span>
            </Link>
            <Link to="/dashboard/projects" className="btn btn-primary btn-sm">
              <Plus size={13} />
              <span>Nova Campanha</span>
            </Link>
          </div>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.75rem', maxWidth: '1400px', margin: '0 auto' }}>
        {/* Metric Cards Row (4 cards) */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1rem' }}>
          {/* 1. Clientes */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="eyebrow">CLIENTES ATIVOS</span>
                <Users size={16} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
                {loading ? '-' : activeClientsCount}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                <span>Empresas & contas sob gestão</span>
              </div>
            </div>
            <Link
              to="/dashboard/clients"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '12px', color: 'var(--accent-primary)', marginTop: '0.85rem', fontWeight: 500 }}
            >
              <span>Gerenciar clientes</span>
              <ChevronRight size={12} />
            </Link>
          </div>

          {/* 2. Campanhas / Projetos */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="eyebrow">CAMPANHAS EM PRODUÇÃO</span>
                <Briefcase size={16} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
                {loading ? '-' : inProgressProjectsCount}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                <span>{projects.length} total • {completedProjectsCount} concluídos</span>
              </div>
            </div>
            <Link
              to="/dashboard/projects"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '12px', color: 'var(--accent-primary)', marginTop: '0.85rem', fontWeight: 500 }}
            >
              <span>Ver campanhas</span>
              <ChevronRight size={12} />
            </Link>
          </div>

          {/* 3. Entregáveis & Peças */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="eyebrow">ENTREGÁVEIS & PEÇAS</span>
                <Clock size={16} style={{ color: inReviewDeliverables.length > 0 ? 'var(--color-warning)' : 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', color: inReviewDeliverables.length > 0 ? 'var(--color-warning)' : 'var(--text-primary)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
                {loading ? '-' : deliverables.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                <span>{inReviewDeliverables.length} em análise • {approvedDeliverables.length} aprovados</span>
              </div>
            </div>
            <Link
              to="/dashboard/deliverables"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '12px', color: inReviewDeliverables.length > 0 ? 'var(--color-warning)' : 'var(--accent-primary)', marginTop: '0.85rem', fontWeight: 500 }}
            >
              <span>{inReviewDeliverables.length > 0 ? 'Revisar pendentes' : 'Ver entregáveis'}</span>
              <ChevronRight size={12} />
            </Link>
          </div>

          {/* 4. Equipe & Colaboradores */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="eyebrow">EQUIPE DA AGÊNCIA</span>
                <UserPlus size={16} style={{ color: 'var(--accent-primary)' }} />
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 600, letterSpacing: '-0.04em', color: 'var(--text-primary)', margin: '0.25rem 0', fontFamily: 'var(--font-mono)' }}>
                {loading ? '-' : members.length}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                <span>
                  {pendingInvitesCount > 0 ? `${pendingInvitesCount} convite(s) pendente(s)` : 'Assentos ativos na agência'}
                </span>
              </div>
            </div>
            <Link
              to="/dashboard/team"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', fontSize: '12px', color: 'var(--accent-primary)', marginTop: '0.85rem', fontWeight: 500 }}
            >
              <span>Gerenciar equipe</span>
              <ChevronRight size={12} />
            </Link>
          </div>
        </div>

        {/* Action Highlights Banner if there are deliverables in review */}
        {inReviewDeliverables.length > 0 && (
          <div
            style={{
              padding: '1rem 1.25rem',
              backgroundColor: 'rgba(234, 179, 8, 0.08)',
              border: '1px solid rgba(234, 179, 8, 0.25)',
              borderRadius: 'var(--radius-card)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <AlertCircle size={18} style={{ color: '#eab308', flexShrink: 0 }} />
              <div>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  {inReviewDeliverables.length} {inReviewDeliverables.length === 1 ? 'entregável aguardando' : 'entregáveis aguardando'} aprovação do cliente
                </span>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Os clientes já podem revisar e validar as versões publicadas pelo portal exclusivo.
                </p>
              </div>
            </div>
            <Link to="/dashboard/deliverables" className="btn btn-sm" style={{ backgroundColor: '#eab308', color: '#000', fontWeight: 600, border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span>Acessar Entregáveis</span>
              <ArrowUpRight size={13} />
            </Link>
          </div>
        )}

        {/* 2-Column Grid Layout: Main Columns */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1.2fr)', gap: '1.5rem', alignItems: 'start' }}>
          {/* Left Column: Projects & Deliverables */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Projetos Recentes */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    Campanhas Recentes
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Prazos, status e clientes vinculados
                  </p>
                </div>
                <Link to="/dashboard/projects" className="btn btn-ghost btn-sm">
                  Ver todas ({projects.length})
                </Link>
              </div>

              {projects.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-tertiary)' }}>
                  <FolderKanban size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>Nenhuma campanha cadastrada</p>
                  <p style={{ fontSize: '12px', marginTop: '0.2rem', color: 'var(--text-secondary)' }}>Cadastre um cliente e inicie a primeira campanha.</p>
                  <Link to="/dashboard/projects" className="btn btn-primary btn-sm" style={{ marginTop: '0.85rem' }}>
                    <Plus size={13} />
                    <span>Criar Campanha</span>
                  </Link>
                </div>
              ) : (
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Nome da Campanha</th>
                        <th>Cliente</th>
                        <th>Status</th>
                        <th>Prazo</th>
                        <th style={{ textAlign: 'right' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {projects.slice(0, 5).map((project) => (
                        <tr key={project.id}>
                          <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {project.name}
                          </td>
                          <td style={{ color: 'var(--text-secondary)' }}>{project.client?.name || 'Cliente'}</td>
                          <td>
                            <StatusBadge status={project.status} />
                          </td>
                          <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--text-secondary)' }}>
                            {project.targetEndDate ? new Date(project.targetEndDate).toLocaleDateString('pt-BR') : '—'}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <Link to="/dashboard/projects" className="btn btn-ghost btn-sm">
                              Ver Detalhes
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Entregáveis Recentes */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    Peças & Entregáveis
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Materiais criativos e status no fluxo de aprovação
                  </p>
                </div>
                <Link to="/dashboard/deliverables" className="btn btn-ghost btn-sm">
                  Ver todos ({deliverables.length})
                </Link>
              </div>

              {deliverables.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-tertiary)' }}>
                  <FileText size={32} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>Nenhum entregável cadastrado</p>
                  <p style={{ fontSize: '12px', marginTop: '0.2rem', color: 'var(--text-secondary)' }}>Adicione arquivos e links externos para envio de aprovação.</p>
                  <Link to="/dashboard/deliverables" className="btn btn-primary btn-sm" style={{ marginTop: '0.85rem' }}>
                    <Plus size={13} />
                    <span>Novo Entregável</span>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {deliverables.slice(0, 4).map((deliv) => {
                    const latestVersion = deliv.versions?.[0];
                    return (
                      <div
                        key={deliv.id}
                        style={{
                          padding: '0.875rem 1rem',
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '34px',
                              height: '34px',
                              borderRadius: '6px',
                              backgroundColor: 'var(--bg-card)',
                              border: '1px solid var(--border-hairline)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'var(--accent-primary)',
                              flexShrink: 0,
                            }}
                          >
                            <FileText size={16} />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {deliv.title}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              <span>v{latestVersion?.versionNumber || 1}</span>
                              <span>•</span>
                              <span>{deliv.project?.name || 'Projeto'}</span>
                              {latestVersion?.externalUrl && (
                                <>
                                  <span>•</span>
                                  <a
                                    href={latestVersion.externalUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '2px' }}
                                  >
                                    Link Externo <ExternalLink size={10} />
                                  </a>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <StatusBadge status={deliv.status} />
                          <Link to="/dashboard/deliverables" className="btn btn-ghost btn-sm" style={{ padding: '0.25rem 0.5rem', fontSize: '12px' }}>
                            Gerenciar
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Clients & Team Members */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Clientes Ativos */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    Clientes Recentes
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Contas e stakeholders vinculados
                  </p>
                </div>
                <Link to="/dashboard/clients" className="btn btn-ghost btn-sm">
                  Ver todos ({clients.length})
                </Link>
              </div>

              {clients.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-tertiary)' }}>
                  <Building2 size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>Nenhum cliente cadastrado</p>
                  <Link to="/dashboard/clients" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                    <Plus size={13} />
                    <span>Cadastrar Cliente</span>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {clients.slice(0, 4).map((client) => (
                    <div
                      key={client.id}
                      style={{
                        padding: '0.75rem 0.875rem',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            backgroundColor: 'var(--accent-subtle)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 600,
                            fontSize: '11px',
                            fontFamily: 'var(--font-mono)',
                            flexShrink: 0,
                          }}
                        >
                          {getInitials(client.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                            {client.name}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                            {client.company || client.email || 'Conta ativa'}
                          </div>
                        </div>
                      </div>

                      <Link to="/dashboard/clients" className="btn btn-ghost btn-sm" style={{ padding: '0.2rem 0.5rem', fontSize: '11px' }}>
                        Acessar
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Membros da Equipe */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <div>
                  <h2 style={{ fontSize: '15px', fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
                    Equipe da Agência
                  </h2>
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
                    Colaboradores e permissões ativas
                  </p>
                </div>
                <Link to="/dashboard/team" className="btn btn-ghost btn-sm">
                  Gerenciar ({members.length})
                </Link>
              </div>

              {members.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-tertiary)' }}>
                  <Users size={28} style={{ margin: '0 auto 0.5rem', opacity: 0.4 }} />
                  <p style={{ fontWeight: 500, fontSize: '13px', color: 'var(--text-primary)' }}>Nenhum membro listado</p>
                  <Link to="/dashboard/team" className="btn btn-primary btn-sm" style={{ marginTop: '0.75rem' }}>
                    <UserPlus size={13} />
                    <span>Convidar Membro</span>
                  </Link>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
                  {members.slice(0, 4).map((member) => {
                    const isOwner = member.role === 'OWNER';
                    const isAdmin = member.role === 'ADMIN';

                    return (
                      <div
                        key={member.id}
                        style={{
                          padding: '0.75rem 0.875rem',
                          backgroundColor: 'var(--bg-subtle)',
                          border: '1px solid var(--border-hairline)',
                          borderRadius: 'var(--radius-md)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.5rem',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div
                            style={{
                              width: '32px',
                              height: '32px',
                              borderRadius: '50%',
                              backgroundColor: isOwner ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-card)',
                              color: isOwner ? '#ca8a04' : 'var(--accent-primary)',
                              border: '1px solid var(--border-hairline)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 600,
                              fontSize: '11px',
                              fontFamily: 'var(--font-mono)',
                              flexShrink: 0,
                            }}
                          >
                            {getInitials(member.name)}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                              {member.name}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                              {member.email}
                            </div>
                          </div>
                        </div>

                        <div>
                          {isOwner && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                                background: 'rgba(234, 179, 8, 0.1)',
                                color: '#ca8a04',
                                border: '1px solid rgba(234, 179, 8, 0.25)',
                              }}
                            >
                              <Crown size={10} />
                              <span>DONO</span>
                            </span>
                          )}
                          {isAdmin && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                                background: 'rgba(16, 185, 129, 0.1)',
                                color: 'var(--accent-primary)',
                                border: '1px solid rgba(16, 185, 129, 0.25)',
                              }}
                            >
                              <ShieldCheck size={10} />
                              <span>ADMIN</span>
                            </span>
                          )}
                          {!isOwner && !isAdmin && (
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                                background: 'var(--bg-card)',
                                color: 'var(--text-secondary)',
                                border: '1px solid var(--border-hairline)',
                              }}
                            >
                              <Shield size={10} />
                              <span>EQUIPE</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: '0.85rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
                  {pendingInvitesCount > 0 ? `${pendingInvitesCount} convite(s) pendente(s)` : 'Todos os membros ativos'}
                </span>
                <Link to="/dashboard/team" className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '0.25rem 0.6rem' }}>
                  <UserPlus size={12} />
                  <span>Convidar</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
export default DashboardPage;
