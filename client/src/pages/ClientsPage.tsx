import React, { useState, useEffect } from 'react';
import { Plus, Search, Building2, Mail, Archive, RefreshCw, FolderKanban, Edit2 } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Client } from '../types';
import toast from 'react-hot-toast';

export const ClientsPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Modal State (Create & Edit)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchClients = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/clients?status=${statusFilter}${search ? `&search=${encodeURIComponent(search)}` : ''}`);
      setClients(data.clients || data.data || []);
    } catch (err) {
      console.error('Failed to fetch clients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, [currentOrg, statusFilter, search]);

  const handleOpenCreate = () => {
    setEditingClient(null);
    setName('');
    setCompany('');
    setEmail('');
    setNotes('');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (c: Client) => {
    setEditingClient(c);
    setName(c.name);
    setCompany(c.company || '');
    setEmail(c.email || '');
    setNotes(c.notes || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      if (editingClient) {
        const { data: updatedClient } = await api.put(`/clients/${editingClient.id}`, {
          name,
          company: company || undefined,
          email: email || undefined,
          notes: notes || undefined,
        });

        setClients((prev) =>
          prev.map((c) => (c.id === editingClient.id ? { ...c, ...updatedClient } : c))
        );
        toast.success('Cliente atualizado com sucesso.');
        setIsModalOpen(false);
        setEditingClient(null);
      } else {
        const { data: newClient } = await api.post('/clients', {
          name,
          company: company || undefined,
          email: email || undefined,
          notes: notes || undefined,
        });

        setClients((prev) => [newClient, ...prev]);
        toast.success('Cliente cadastrado com sucesso.');
        setIsModalOpen(false);
      }

      fetchClients();
    } catch (err: any) {
      console.error('Failed to save client:', err);
      setFormError(
        err.response?.data?.error?.message ||
        'Erro ao salvar cliente. Verifique os dados ou o limite do seu plano.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveToggle = async (client: Client) => {
    try {
      const isArchiving = client.status === 'ACTIVE';
      const nextStatus = isArchiving ? 'ARCHIVED' : 'ACTIVE';

      setClients((prev) =>
        prev.map((c) => (c.id === client.id ? { ...c, status: nextStatus } : c))
      );

      if (isArchiving) {
        await api.post(`/clients/${client.id}/archive`);
        toast.success('Cliente arquivado.');
      } else {
        await api.post(`/clients/${client.id}/reactivate`);
        toast.success('Cliente reativado.');
      }
      fetchClients();
    } catch (err: any) {
      console.error('Failed to toggle client archive status:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao alterar status');
      fetchClients();
    }
  };

  return (
    <div>
      <Navbar
        title="Contas & Clientes"
        subtitle="Empresas e stakeholders com acesso ao portal"
        actions={
          <button onClick={handleOpenCreate} className="btn btn-primary btn-sm">
            <Plus size={14} />
            <span>Novo Cliente</span>
          </button>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '1280px' }}>
        {/* Filters & Search Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '280px' }}>
            <input
              type="text"
              placeholder="Buscar por nome ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.2rem', fontSize: '13px' }}
            />
            <Search size={14} style={{ position: 'absolute', left: '0.8rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          </div>

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
              onClick={() => setStatusFilter('ACTIVE')}
              className="btn btn-sm"
              style={{
                backgroundColor: statusFilter === 'ACTIVE' ? 'var(--bg-card)' : 'transparent',
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
                backgroundColor: statusFilter === 'ARCHIVED' ? 'var(--bg-card)' : 'transparent',
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

        {/* Clients Grid */}
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: '13px' }}>
            Carregando registros...
          </div>
        ) : clients.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '3.5rem 1.5rem', color: 'var(--text-tertiary)' }}>
            <Building2 size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Nenhum cliente encontrado
            </h3>
            <p style={{ fontSize: '13px', marginBottom: '1.25rem', color: 'var(--text-secondary)' }}>
              {search ? 'Tente ajustar os termos de busca.' : 'Cadastre seu primeiro cliente para gerenciar campanhas e entregáveis.'}
            </p>
            <button onClick={handleOpenCreate} className="btn btn-primary btn-sm">
              <Plus size={14} />
              <span>Adicionar Cliente</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {clients.map((c) => (
              <div key={c.id} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
                  <div>
                    <h3 style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text-primary)' }}>{c.name}</h3>
                    {c.company && (
                      <p style={{ fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <Building2 size={12} style={{ color: 'var(--text-tertiary)' }} />
                        <span>{c.company}</span>
                      </p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {c.email && (
                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginBottom: '0.65rem', fontFamily: 'var(--font-mono)' }}>
                    <Mail size={12} />
                    <span>{c.email}</span>
                  </p>
                )}

                {c.notes && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-subtle)', padding: '0.5rem 0.65rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.85rem' }}>
                    {c.notes}
                  </p>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '11px', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
                    <FolderKanban size={13} />
                    <span>{c._count?.projects || 0} PROJETOS / CAMPANHAS</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <button
                      onClick={() => handleOpenEdit(c)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '12px' }}
                      title="Editar cliente"
                    >
                      <Edit2 size={12} />
                      <span>Editar</span>
                    </button>
                    <button
                      onClick={() => handleArchiveToggle(c)}
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '12px' }}
                      title={c.status === 'ACTIVE' ? 'Arquivar cliente' : 'Reativar cliente'}
                    >
                      {c.status === 'ACTIVE' ? <Archive size={12} /> : <RefreshCw size={12} />}
                      <span>{c.status === 'ACTIVE' ? 'Arquivar' : 'Reativar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Client Modal (Create & Edit) */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingClient(null);
        }}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      >
        <form onSubmit={handleSaveClient} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {formError && (
            <div style={{ backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid rgba(225, 29, 72, 0.25)', padding: '0.65rem', borderRadius: 'var(--radius-md)', fontSize: '12px' }}>
              {formError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Nome do Contato Principal *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Mariana Costa"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Nome da Empresa / Marca
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex: Studio Alpha, Loja Bela Moda"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              E-mail do Cliente
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mariana@marca.com.br"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', marginBottom: '0.35rem' }}>
              Observações / Contexto da Conta
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Fee mensal, calendário editorial, tom de voz ou links importantes..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)' }}>
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingClient(null);
              }}
              className="btn btn-ghost btn-sm"
            >
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Salvando...' : editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
