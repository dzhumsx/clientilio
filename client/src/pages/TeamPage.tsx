import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  UserPlus,
  Users,
  Shield,
  ShieldCheck,
  Crown,
  Mail,
  Copy,
  Check,
  Trash2,
  Clock,
  AlertCircle,
  Sparkles,
  Search,
  Building2,
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { TeamMember, Invitation, PlanLimits, Role } from '../types';
import toast from 'react-hot-toast';

export const TeamPage: React.FC = () => {
  const { user, currentOrg } = useAuth();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [limits, setLimits] = useState<PlanLimits | null>(null);
  const [planId, setPlanId] = useState<string>('free');
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'MEMBERS' | 'INVITATIONS'>('MEMBERS');

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER'>('MEMBER');
  const [submittingInvite, setSubmittingInvite] = useState(false);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Current user permissions
  const currentUserRole = currentOrg?.role as Role | undefined;
  const isOwnerOrAdmin = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const fetchData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      // 1. Fetch current org details (plan & limits)
      const orgRes = await api.get('/organizations/current');
      if (orgRes.data) {
        setLimits(orgRes.data.limits || null);
        setPlanId(orgRes.data.planId || 'free');
      }

      // 2. Fetch active members
      const membersRes = await api.get('/organizations/members');
      setMembers(membersRes.data || []);

      // 3. Fetch pending invitations if admin/owner
      if (isOwnerOrAdmin) {
        try {
          const invRes = await api.get('/organizations/invitations');
          setInvitations(invRes.data || []);
        } catch (invErr) {
          console.warn('Could not load invitations:', invErr);
        }
      }
    } catch (err) {
      console.error('Failed to load team data:', err);
      toast.error('Erro ao carregar dados da equipe.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg]);

  const handleOpenInvite = () => {
    setInviteEmail('');
    setInviteRole('MEMBER');
    setInviteError(null);
    setCreatedInviteLink(null);
    setCopiedLink(false);
    setIsInviteModalOpen(true);
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(null);
    setSubmittingInvite(true);

    try {
      const { data } = await api.post('/organizations/invitations', {
        email: inviteEmail,
        role: inviteRole,
      });

      toast.success('Convite gerado com sucesso!');

      if (data.token) {
        const fullLink = `${window.location.origin}/invite/${data.token}`;
        setCreatedInviteLink(fullLink);
      } else {
        setIsInviteModalOpen(false);
      }

      fetchData();
    } catch (err: any) {
      console.error('Failed to invite member:', err);
      const isLimit = err.response?.data?.error?.code === 'PLAN_LIMIT_REACHED';
      setInviteError(
        err.response?.data?.error?.message ||
        (isLimit
          ? 'Limite de membros na equipe atingido para o plano ativo. Faça upgrade para adicionar mais colaboradores.'
          : 'Erro ao enviar convite. Verifique o e-mail informado.')
      );
    } finally {
      setSubmittingInvite(false);
    }
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    toast.success('Link de convite copiado!');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleRoleChange = async (membershipId: string, memberName: string, newRole: 'ADMIN' | 'MEMBER') => {
    try {
      await api.patch(`/organizations/members/${membershipId}/role`, { role: newRole });
      setMembers((prev) =>
        prev.map((m) => (m.id === membershipId ? { ...m, role: newRole } : m))
      );
      toast.success(`Papel de ${memberName} atualizado para ${newRole === 'ADMIN' ? 'Administrador' : 'Membro'}.`);
    } catch (err: any) {
      console.error('Failed to update role:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao alterar permissão do membro.');
    }
  };

  const handleRemoveMember = async (member: TeamMember) => {
    if (member.role === 'OWNER') {
      toast.error('O proprietário da organização não pode ser removido.');
      return;
    }

    const confirmed = window.confirm(
      `Tem certeza que deseja remover ${member.name} (${member.email}) da equipe?\n\nO usuário perderá o acesso imediato aos projetos e arquivos desta agência.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/organizations/members/${member.id}`);
      setMembers((prev) => prev.filter((m) => m.id !== member.id));
      toast.success(`${member.name} foi removido da equipe.`);
      fetchData();
    } catch (err: any) {
      console.error('Failed to remove member:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao remover membro.');
    }
  };

  const handleRevokeInvitation = async (invitationId: string, email: string) => {
    const confirmed = window.confirm(`Deseja revogar o convite para ${email}?`);
    if (!confirmed) return;

    try {
      await api.delete(`/organizations/invitations/${invitationId}`);
      setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      toast.success('Convite cancelado.');
    } catch (err: any) {
      console.error('Failed to revoke invitation:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao cancelar convite.');
    }
  };

  const filteredMembers = members.filter((m) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return m.name.toLowerCase().includes(term) || m.email.toLowerCase().includes(term);
  });

  const isUnlimitedTeam = limits?.maxTeamMembers === -1;
  const currentMembersCount = members.length;
  const maxMembers = limits?.maxTeamMembers ?? 1;
  const isNearOrAtLimit = !isUnlimitedTeam && currentMembersCount >= maxMembers;

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
        title={`Equipe da Agência ${currentOrg?.name ? `• ${currentOrg.name}` : ''}`}
        subtitle={`Colaboradores e permissões vinculados exclusivamente à agência "${currentOrg?.name || 'sua agência'}". A equipe pertence à agência, e não ao usuário individual.`}
        actions={
          isOwnerOrAdmin && (
            <button onClick={handleOpenInvite} className="btn btn-primary btn-sm">
              <UserPlus size={14} />
              <span>Convidar Membro</span>
            </button>
          )
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px', margin: '0 auto' }}>
        {/* Agency Ownership Context Banner */}
        <div
          style={{
            backgroundColor: 'var(--bg-card)',
            border: '1px solid var(--border-hairline)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '13px',
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Equipe referente à agência: <strong>{currentOrg?.name || 'Agência Atual'}</strong>
                </span>
                <span
                  style={{
                    fontSize: '10px',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    color: 'var(--accent-primary)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    fontWeight: 600,
                  }}
                >
                  WORKSPACE
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                Esta equipe pertence à agência ativa. Seus membros e permissões são isolados deste workspace.
              </p>
            </div>
          </div>

          <Link
            to="/dashboard/profile?tab=AGENCIES"
            className="btn btn-ghost btn-sm"
            style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <span>Minhas Agências</span>
            <Building2 size={13} />
          </Link>
        </div>
        {/* Plan Limit & Quota Card */}
        <div
          className="card"
          style={{
            padding: '1.25rem 1.5rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            background: 'var(--bg-subtle)',
            borderColor: isNearOrAtLimit ? 'rgba(239, 68, 68, 0.3)' : 'var(--border-hairline)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: isNearOrAtLimit ? 'rgba(239, 68, 68, 0.1)' : 'var(--accent-subtle)',
                color: isNearOrAtLimit ? '#ef4444' : 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Users size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Assentos de Equipe
                </span>
                <span
                  style={{
                    fontSize: '0.6875rem',
                    fontFamily: 'var(--font-mono)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-card)',
                    border: '1px solid var(--border-hairline)',
                    color: 'var(--text-secondary)',
                    textTransform: 'uppercase',
                  }}
                >
                  Plano {planId.toUpperCase()}
                </span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                {isUnlimitedTeam
                  ? `${currentMembersCount} membro(s) ativos • Assentos ilimitados no plano ativo`
                  : `${currentMembersCount} de ${maxMembers} assento(s) ocupados na organização`}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {isNearOrAtLimit ? (
              <Link to="/dashboard/billing" className="btn btn-primary btn-sm" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Sparkles size={13} />
                <span>Fazer Upgrade de Plano</span>
              </Link>
            ) : (
              <Link to="/dashboard/billing" className="btn btn-secondary btn-sm" style={{ fontSize: '12px' }}>
                Ver Planos & Capacidade
              </Link>
            )}
          </div>
        </div>

        {/* Toolbar & Filter Tabs */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div
              style={{
                display: 'inline-flex',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-button)',
                padding: '2px',
                gap: '2px',
              }}
            >
              <button
                onClick={() => setActiveTab('MEMBERS')}
                className="btn btn-sm"
                style={{
                  backgroundColor: activeTab === 'MEMBERS' ? 'var(--bg-card)' : 'transparent',
                  color: activeTab === 'MEMBERS' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  boxShadow: activeTab === 'MEMBERS' ? 'var(--shadow-subtle)' : 'none',
                  border: 'none',
                  fontSize: '12px',
                  fontWeight: 500,
                  padding: '0.35rem 0.75rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Membros Ativos</span>
                <span
                  style={{
                    padding: '1px 5px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    backgroundColor: activeTab === 'MEMBERS' ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                    color: activeTab === 'MEMBERS' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  {members.length}
                </span>
              </button>

              {isOwnerOrAdmin && (
                <button
                  onClick={() => setActiveTab('INVITATIONS')}
                  className="btn btn-sm"
                  style={{
                    backgroundColor: activeTab === 'INVITATIONS' ? 'var(--bg-card)' : 'transparent',
                    color: activeTab === 'INVITATIONS' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                    boxShadow: activeTab === 'INVITATIONS' ? 'var(--shadow-subtle)' : 'none',
                    border: 'none',
                    fontSize: '12px',
                    fontWeight: 500,
                    padding: '0.35rem 0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span>Convites Pendentes</span>
                  {invitations.length > 0 && (
                    <span
                      style={{
                        padding: '1px 5px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        backgroundColor: activeTab === 'INVITATIONS' ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                        color: activeTab === 'INVITATIONS' ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                      }}
                    >
                      {invitations.length}
                    </span>
                  )}
                </button>
              )}
            </div>
          </div>

          {activeTab === 'MEMBERS' && (
            <div style={{ position: 'relative', width: '280px' }}>
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ paddingLeft: '2.2rem', fontSize: '13px' }}
              />
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  left: '0.8rem',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)',
                }}
              />
            </div>
          )}
        </div>

        {/* Content Section */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
            CARREGANDO EQUIPE...
          </div>
        ) : activeTab === 'MEMBERS' ? (
          /* Active Members List */
          filteredMembers.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
              <Users size={36} style={{ margin: '0 auto 0.75rem', color: 'var(--text-tertiary)' }} />
              <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Nenhum membro encontrado</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                {search ? 'Tente ajustar os termos da busca.' : 'Convide colaboradores para trabalharem juntos nos projetos.'}
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
                      <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Colaborador
                      </th>
                      <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Função / Cargo
                      </th>
                      <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Data de Ingresso
                      </th>
                      <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const isSelf = member.userId === user?.id;
                      const isOwner = member.role === 'OWNER';
                      const canManageThisUser = isOwnerOrAdmin && !isOwner && !isSelf;

                      return (
                        <tr
                          key={member.id}
                          style={{
                            borderBottom: '1px solid var(--border-hairline)',
                            transition: 'background-color 0.15s ease',
                          }}
                        >
                          <td style={{ padding: '1rem 1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                              <div
                                style={{
                                  width: '36px',
                                  height: '36px',
                                  borderRadius: '50%',
                                  background: isOwner ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-subtle)',
                                  color: isOwner ? '#eab308' : 'var(--accent-primary)',
                                  border: '1px solid var(--border-hairline)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  fontWeight: 600,
                                  fontSize: '12px',
                                  fontFamily: 'var(--font-mono)',
                                  flexShrink: 0,
                                }}
                              >
                                {member.avatarUrl ? (
                                  <img src={member.avatarUrl} alt={member.name} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                                ) : (
                                  getInitials(member.name)
                                )}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span>{member.name}</span>
                                  {isSelf && (
                                    <span style={{ fontSize: '10px', padding: '1px 5px', borderRadius: '4px', background: 'var(--bg-subtle)', color: 'var(--text-tertiary)', border: '1px solid var(--border-hairline)' }}>
                                      Você
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: '1px' }}>
                                  {member.email}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td style={{ padding: '1rem 1.25rem' }}>
                            {canManageThisUser ? (
                              <select
                                value={member.role}
                                onChange={(e) => handleRoleChange(member.id, member.name, e.target.value as any)}
                                style={{
                                  height: '30px',
                                  fontSize: '12px',
                                  padding: '0 0.5rem',
                                  width: 'auto',
                                  minWidth: '140px',
                                }}
                              >
                                <option value="ADMIN">Administrador</option>
                                <option value="MEMBER">Membro da Equipe</option>
                              </select>
                            ) : (
                              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                                {member.role === 'OWNER' && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      fontFamily: 'var(--font-mono)',
                                      letterSpacing: '0.04em',
                                      background: 'rgba(234, 179, 8, 0.1)',
                                      color: '#ca8a04',
                                      border: '1px solid rgba(234, 179, 8, 0.25)',
                                    }}
                                  >
                                    <Crown size={11} />
                                    <span>PROPRIETÁRIO</span>
                                  </span>
                                )}
                                {member.role === 'ADMIN' && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      fontFamily: 'var(--font-mono)',
                                      letterSpacing: '0.04em',
                                      background: 'rgba(16, 185, 129, 0.1)',
                                      color: 'var(--accent-primary)',
                                      border: '1px solid rgba(16, 185, 129, 0.25)',
                                    }}
                                  >
                                    <ShieldCheck size={11} />
                                    <span>ADMINISTRADOR</span>
                                  </span>
                                )}
                                {member.role === 'MEMBER' && (
                                  <span
                                    style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      padding: '3px 8px',
                                      borderRadius: '4px',
                                      fontSize: '11px',
                                      fontWeight: 600,
                                      fontFamily: 'var(--font-mono)',
                                      letterSpacing: '0.04em',
                                      background: 'var(--bg-subtle)',
                                      color: 'var(--text-secondary)',
                                      border: '1px solid var(--border-hairline)',
                                    }}
                                  >
                                    <Shield size={11} />
                                    <span>COLABORADOR</span>
                                  </span>
                                )}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontSize: '12px' }}>
                            {new Date(member.joinedAt).toLocaleDateString('pt-BR')}
                          </td>

                          <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                            {canManageThisUser ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(member)}
                                className="btn btn-sm"
                                style={{
                                  backgroundColor: 'transparent',
                                  color: '#ef4444',
                                  border: '1px solid transparent',
                                  fontSize: '12px',
                                  padding: '4px 8px',
                                }}
                                title="Remover da equipe"
                              >
                                <Trash2 size={14} />
                                <span style={{ marginLeft: '4px' }}>Remover</span>
                              </button>
                            ) : (
                              <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )
        ) : (
          /* Pending Invitations List */
          invitations.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-secondary)' }}>
              <Mail size={36} style={{ margin: '0 auto 0.75rem', color: 'var(--text-tertiary)' }} />
              <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>Nenhum convite pendente</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>
                Todos os colaboradores convidados já ingressaram na organização.
              </p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
                      <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        E-mail Convidado
                      </th>
                      <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Papel Concedido
                      </th>
                      <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                        Expira em
                      </th>
                      <th style={{ padding: '0.75rem 1.25rem', fontWeight: 600, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: '11px', letterSpacing: '0.05em', textTransform: 'uppercase', textAlign: 'right' }}>
                        Ações
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {invitations.map((inv) => (
                      <tr
                        key={inv.id}
                        style={{
                          borderBottom: '1px solid var(--border-hairline)',
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <td style={{ padding: '1rem 1.25rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Mail size={14} style={{ color: 'var(--text-tertiary)' }} />
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{inv.email}</span>
                          </div>
                          {inv.createdBy && (
                            <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
                              Enviado por {inv.createdBy.name}
                            </div>
                          )}
                        </td>

                        <td style={{ padding: '1rem 1.25rem' }}>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontSize: '11px',
                              fontWeight: 600,
                              fontFamily: 'var(--font-mono)',
                              letterSpacing: '0.04em',
                              background: inv.role === 'ADMIN' ? 'rgba(16, 185, 129, 0.1)' : 'var(--bg-subtle)',
                              color: inv.role === 'ADMIN' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                              border: inv.role === 'ADMIN' ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border-hairline)',
                            }}
                          >
                            {inv.role === 'ADMIN' ? 'ADMINISTRADOR' : 'COLABORADOR'}
                          </span>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', color: 'var(--text-secondary)', fontSize: '12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={12} style={{ color: 'var(--text-tertiary)' }} />
                            <span>{new Date(inv.expiresAt).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </td>

                        <td style={{ padding: '1rem 1.25rem', textAlign: 'right' }}>
                          <button
                            type="button"
                            onClick={() => handleRevokeInvitation(inv.id, inv.email)}
                            className="btn btn-sm"
                            style={{
                              backgroundColor: 'transparent',
                              color: '#ef4444',
                              border: '1px solid transparent',
                              fontSize: '12px',
                            }}
                          >
                            Cancelar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        )}
      </div>

      {/* Invite Member Modal */}
      <Modal isOpen={isInviteModalOpen} onClose={() => setIsInviteModalOpen(false)} title="Convidar Novo Colaborador">
        {createdInviteLink ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ padding: '1rem', backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent-primary)', fontWeight: 600, fontSize: '13px', marginBottom: '0.35rem' }}>
                <Check size={16} />
                <span>Convite criado com sucesso!</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Envie o link abaixo para <strong>{inviteEmail}</strong> para que ele possa acessar a organização:
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                <input
                  type="text"
                  readOnly
                  value={createdInviteLink}
                  style={{ fontSize: '12px', fontFamily: 'var(--font-mono)' }}
                />
                <button
                  type="button"
                  onClick={() => handleCopyLink(createdInviteLink)}
                  className="btn btn-primary btn-sm"
                  style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  {copiedLink ? <Check size={14} /> : <Copy size={14} />}
                  <span>{copiedLink ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => {
                  setIsInviteModalOpen(false);
                  setCreatedInviteLink(null);
                }}
                className="btn btn-secondary btn-sm"
              >
                Concluir
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSendInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {inviteError && (
              <div
                style={{
                  backgroundColor: 'var(--color-danger-bg)',
                  color: 'var(--color-danger)',
                  border: '1px solid rgba(225, 29, 72, 0.25)',
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.35rem',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertCircle size={14} />
                  <span>{inviteError}</span>
                </div>
                {(inviteError.includes('upgrade') || inviteError.includes('Limite')) && (
                  <Link
                    to="/dashboard/billing"
                    style={{
                      color: 'var(--accent-primary)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      borderBottom: '1px solid var(--accent-primary)',
                      width: 'fit-content',
                      marginTop: '0.2rem',
                    }}
                  >
                    Ver Opções de Planos & Upgrade →
                  </Link>
                )}
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                E-mail do Colaborador *
              </label>
              <input
                type="email"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="colaborador@suaagencia.com.br"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
                Nível de Permissão na Agência *
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div
                  onClick={() => setInviteRole('MEMBER')}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '6px',
                    border: `1px solid ${inviteRole === 'MEMBER' ? 'var(--accent-primary)' : 'var(--border-hairline)'}`,
                    backgroundColor: inviteRole === 'MEMBER' ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    <Shield size={14} style={{ color: inviteRole === 'MEMBER' ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
                    <span>Colaborador</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: '1.4' }}>
                    Acesso a projetos, tarefas e entregáveis vinculados.
                  </p>
                </div>

                <div
                  onClick={() => setInviteRole('ADMIN')}
                  style={{
                    padding: '0.875rem',
                    borderRadius: '6px',
                    border: `1px solid ${inviteRole === 'ADMIN' ? 'var(--accent-primary)' : 'var(--border-hairline)'}`,
                    backgroundColor: inviteRole === 'ADMIN' ? 'var(--accent-subtle)' : 'var(--bg-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, fontSize: '13px', color: 'var(--text-primary)' }}>
                    <ShieldCheck size={14} style={{ color: inviteRole === 'ADMIN' ? 'var(--accent-primary)' : 'var(--text-tertiary)' }} />
                    <span>Administrador</span>
                  </div>
                  <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '4px', lineHeight: '1.4' }}>
                    Gerencia membros, configurações, campanhas e clientes.
                  </p>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)' }}>
              <button
                type="button"
                onClick={() => setIsInviteModalOpen(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancelar
              </button>
              <button type="submit" disabled={submittingInvite} className="btn btn-primary btn-sm">
                {submittingInvite ? 'Gerando Convite...' : 'Criar Link de Convite'}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
export default TeamPage;
