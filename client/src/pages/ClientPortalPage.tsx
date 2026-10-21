import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  Sparkles,
  ArrowLeft,
  Clock,
  ShieldCheck,
  FileCheck
} from 'lucide-react';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Deliverable, Project } from '../types';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';

export const ClientPortalPage: React.FC = () => {
  const { currentOrg, user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  // Approval Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<Deliverable | null>(null);
  const [decision, setDecision] = useState<'APPROVED' | 'CHANGES_REQUESTED'>('APPROVED');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      const [projRes, delivRes] = await Promise.all([
        api.get('/projects'),
        api.get('/deliverables'),
      ]);
      setProjects(projRes.data.projects || projRes.data.data || []);
      setDeliverables(delivRes.data || []);
    } catch (err) {
      console.error('Failed to load portal data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, [currentOrg]);

  const handleDecisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDeliverable) return;

    const latestVersion =
      selectedDeliverable.versions && selectedDeliverable.versions.length > 0
        ? selectedDeliverable.versions[selectedDeliverable.versions.length - 1]
        : null;

    if (!latestVersion) {
      alert('Não há versão cadastrada para este entregável.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post(
        `/deliverables/${selectedDeliverable.id}/versions/${latestVersion.id}/approve`,
        {
          decision,
          comment: comment || undefined,
        }
      );

      setModalOpen(false);
      setSelectedDeliverable(null);
      setComment('');
      setSuccessMessage(
        decision === 'APPROVED'
          ? '🎉 Entregável aprovado com sucesso! A equipe da agência foi notificada.'
          : '📝 Ajustes enviados com sucesso! A equipe da agência iniciará as alterações.'
      );
      fetchPortalData();
    } catch (err) {
      console.error('Failed to submit decision:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const pendingItems = deliverables.filter(
    (d) => d.status === 'READY_FOR_REVIEW' || d.status === 'IN_REVIEW' || d.status === 'DRAFT'
  );
  const approvedItems = deliverables.filter((d) => d.status === 'APPROVED');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', color: 'var(--text-primary)' }}>
      {/* Client Portal Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(9, 13, 22, 0.9)',
          backdropFilter: 'blur(10px)',
          padding: '1.25rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #0ea5e9, #6366f1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={20} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.2rem', fontWeight: 800 }}>Portal do Cliente</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {currentOrg?.name || 'Agência Digital'}
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <Link to="/dashboard" className="btn btn-secondary btn-sm">
            <ArrowLeft size={14} />
            <span>Voltar ao Painel da Agência</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
        {/* Welcome Greeting Card */}
        <div
          className="card"
          style={{
            background: 'linear-gradient(135deg, rgba(14, 165, 233, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%)',
            border: '1px solid rgba(14, 165, 233, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem',
          }}
        >
          <div>
            <span className="badge badge-info" style={{ marginBottom: '0.4rem' }}>
              Área Exclusiva de Aprovações
            </span>
            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginTop: '0.2rem' }}>
              Olá{user?.name ? `, ${user.name}` : ''}!
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem' }}>
              Aqui você acompanha as entregas da sua agência em tempo real e valida cada etapa do projeto.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-warning)' }}>
                {pendingItems.length}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Aguardando Avaliação</span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: '1.5rem', textAlign: 'center' }}>
              <div style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-success)' }}>
                {approvedItems.length}
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Entregáveis Aprovados</span>
            </div>
          </div>
        </div>

        {successMessage && (
          <div
            style={{
              background: 'var(--color-success-bg)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              color: 'var(--color-success)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              fontSize: '0.9rem',
              fontWeight: 500,
            }}
          >
            <CheckCircle2 size={18} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Pending Deliverables Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <Clock size={20} color="var(--color-warning)" />
            <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Entregas para sua Revisão</h2>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Carregando entregáveis...</p>
          ) : pendingItems.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem 1.5rem', color: 'var(--text-muted)' }}>
              <FileCheck size={38} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
              <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Nenhum item pendente de aprovação</p>
              <p style={{ fontSize: '0.85rem', marginTop: '0.25rem' }}>
                Você está em dia! Assim que a agência disponibilizar uma nova versão, ela aparecerá aqui.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {pendingItems.map((item) => {
                const latestVersion = item.versions && item.versions.length > 0 ? item.versions[item.versions.length - 1] : null;

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{item.title}</h3>
                          <span className="badge badge-warning">v{item.currentVersionNumber}</span>
                        </div>
                        {item.description && (
                          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {latestVersion?.externalUrl && (
                          <a
                            href={latestVersion.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                          >
                            <ExternalLink size={14} />
                            <span>Abrir Material para Revisão</span>
                          </a>
                        )}

                        <button
                          onClick={() => {
                            setSelectedDeliverable(item);
                            setDecision('CHANGES_REQUESTED');
                            setModalOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                        >
                          <MessageSquare size={14} />
                          <span>Solicitar Ajustes</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedDeliverable(item);
                            setDecision('APPROVED');
                            setModalOpen(true);
                          }}
                          className="btn btn-primary btn-sm"
                        >
                          <ThumbsUp size={14} />
                          <span>Aprovar Entregável</span>
                        </button>
                      </div>
                    </div>

                    {latestVersion && (
                      <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                        <strong>Notas da Agência sobre esta versão:</strong>{' '}
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {latestVersion.notes || 'Sem comentários adicionais da equipe.'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Approved Deliverables Section */}
        {approvedItems.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem' }}>
              <CheckCircle2 size={20} color="var(--color-success)" />
              <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>Entregas Concluídas & Aprovadas</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
              {approvedItems.map((item) => (
                <div key={item.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: 600 }}>{item.title}</h3>
                    <StatusBadge status="APPROVED" />
                  </div>
                  <p style={{ fontSize: '0.825rem', color: 'var(--text-muted)' }}>
                    Versão final aprovada: v{item.currentVersionNumber}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Decision Submission Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={decision === 'APPROVED' ? 'Confirmar Aprovação do Entregável' : 'Solicitar Ajustes no Entregável'}
      >
        <form onSubmit={handleDecisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {decision === 'APPROVED'
              ? `Você está aprovando o item "${selectedDeliverable?.title}". Isso sinalizará à equipe da agência que o material está aprovado.`
              : `Descreva detalhadamente os ajustes que você gostaria que a agência fizesse no item "${selectedDeliverable?.title}".`}
          </p>

          <div>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 500, marginBottom: '0.4rem' }}>
              {decision === 'APPROVED' ? 'Comentário ou Elogio (Opcional)' : 'Descrição dos Ajustes Solicitados *'}
            </label>
            <textarea
              rows={4}
              required={decision === 'CHANGES_REQUESTED'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                decision === 'APPROVED'
                  ? 'Ex: Ficou excelente! Podem prosseguir com a publicação.'
                  : 'Ex: Por favor trocar a cor do botão principal para azul marinho e ajustar a imagem do banner...'
              }
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setModalOpen(false)} className="btn btn-secondary btn-sm">
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`btn ${decision === 'APPROVED' ? 'btn-primary' : 'btn-danger'} btn-sm`}
            >
              {submitting
                ? 'Gravando...'
                : decision === 'APPROVED'
                ? 'Confirmar Aprovação'
                : 'Enviar Solicitação de Ajustes'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
