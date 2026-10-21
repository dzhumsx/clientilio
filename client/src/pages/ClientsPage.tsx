import React, { useState, useEffect } from 'react';
import { Plus, Search, Building2, Mail, Archive, RefreshCw, FolderKanban } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Client } from '../types';

export const ClientsPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'ARCHIVED'>('ACTIVE');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
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

  const handleCreateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);

    try {
      await api.post('/clients', {
        name,
        company: company || undefined,
        email: email || undefined,
        notes: notes || undefined,
      });

      setIsModalOpen(false);
      setName('');
      setCompany('');
      setEmail('');
      setNotes('');
      fetchClients();
    } catch (err: any) {
      console.error('Failed to create client:', err);
      setFormError(
        err.response?.data?.error?.message ||
        'Erro ao criar cliente. Verifique se o limite do seu plano foi atingido.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleArchiveToggle = async (client: Client) => {
    try {
      if (client.status === 'ACTIVE') {
        await api.post(`/clients/${client.id}/archive`);
      } else {
        await api.post(`/clients/${client.id}/reactivate`);
      }
      fetchClients();
    } catch (err) {
      console.error('Failed to toggle client archive status:', err);
    }
  };

  return (
    <div>
      <Navbar
        title="Gestão de Clientes"
        subtitle="Contas e empresas atendidas pela sua agência"
        actions={
          <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
            <Plus size={16} />
            <span>Novo Cliente</span>
          </button>
        }
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {/* Filters & Search Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', width: '300px' }}>
            <input
              type="text"
              placeholder="Buscar por nome ou empresa..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.4rem' }}
            />
            <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)' }} />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.04)', padding: '0.25rem', borderRadius: 'var(--radius-md)' }}>
            <button
              onClick={() => setStatusFilter('ACTIVE')}
              className={`btn btn-sm ${statusFilter === 'ACTIVE' ? 'btn-secondary' : 'btn-outline'}`}
              style={{ border: 'none' }}
            >
              Ativos
            </button>
            <button
              onClick={() => setStatusFilter('ARCHIVED')}
              className={`btn btn-sm ${statusFilter === 'ARCHIVED' ? 'btn-secondary' : 'btn-outline'}`}
              style={{ border: 'none' }}
            >
              Arquivados
            </button>
          </div>
        </div>

        {/* Clients Grid */}
        {loading ? (
          <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <p>Carregando clientes...</p>
          </div>
        ) : clients.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '4rem 1.5rem', color: 'var(--text-muted)' }}>
            <Building2 size={42} style={{ margin: '0 auto 1rem', opacity: 0.4 }} />
            <h3 style={{ fontSize: '1.15rem', color: 'var(--text-primary)', marginBottom: '0.5rem' }}>
              Nenhum cliente encontrado
            </h3>
            <p style={{ fontSize: '0.875rem', marginBottom: '1.5rem' }}>
              {search ? 'Tente ajustar os filtros de busca.' : 'Cadastre sua primeira conta corporativa para começar.'}
            </p>
            <button onClick={() => setIsModalOpen(true)} className="btn btn-primary btn-sm">
              <Plus size={14} />
              <span>Adicionar Cliente</span>
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.25rem' }}>
            {clients.map((c) => (
              <div key={c.id} className="card card-interactive" style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <div>
                    <h3 style={{ fontSize: '1.15rem', fontWeight: 700 }}>{c.name}</h3>
                    {c.company && (
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.15rem' }}>
                        <Building2 size={13} />
                        <span>{c.company}</span>
                      </p>
                    )}
                  </div>
                  <StatusBadge status={c.status} />
                </div>

                {c.email && (
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.75rem' }}>
                    <Mail size={13} />
                    <span>{c.email}</span>
                  </p>
                )}

                {c.notes && (
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', background: 'rgba(255, 255, 255, 0.02)', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius-sm)', marginBottom: '1rem', fontStyle: 'italic' }}>
                    "{c.notes}"
                  </p>
                )}

                <div style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    <FolderKanban size={14} />
                    <span>{c._count?.projects || 0} Projetos</span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      onClick={() => handleArchiveToggle(c)}
                      className="btn btn-outline btn-sm"
                      title={c.status === 'ACTIVE' ? 'Arquivar cliente' : 'Reativar cliente'}
                    >
                      {c.status === 'ACTIVE' ? <Archive size={14} /> : <RefreshCw size={14} />}
                      <span>{c.status === 'ACTIVE' ? 'Arquivar' : 'Reativar'}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Client Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Novo Cliente">
        <form onSubmit={handleCreateClient} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {formError && (
            <div style={{ background: 'var(--color-danger-bg)', color: 'var(--color-danger)', padding: '0.75rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
              {formError}
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
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
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Nome da Empresa / Marca
            </label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex: Start Tech Brasil"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              E-mail do Cliente
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="mariana@starttech.com.br"
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              Observações / Contexto
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Notas internas sobre o contrato, escopo ou preferências do cliente..."
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={submitting} className="btn btn-primary btn-sm">
              {submitting ? 'Salvando...' : 'Cadastrar Cliente'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
