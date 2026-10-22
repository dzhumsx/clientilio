import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ExternalLink,
  ThumbsUp,
  MessageSquare,
  ArrowLeft,
  Clock,
  FileCheck,
  Sun,
  Moon,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { Deliverable, Project, DeliverableVersion } from '../types';
import { Modal } from '../components/Modal';
import { StatusBadge } from '../components/StatusBadge';
import { LogoIcon } from '../components/Logo';

export const ClientPortalPage: React.FC = () => {
  const { currentOrg, user } = useAuth();
  const { theme, toggleTheme } = useTheme();
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

  const getLatestVersion = (item?: Deliverable | null): DeliverableVersion | null => {
    if (!item?.versions || item.versions.length === 0) return null;
    return [...item.versions].sort((a, b) => b.versionNumber - a.versionNumber)[0];
  };

  const fetchPortalData = async () => {
    setLoading(true);
    try {
      // Sequential queries to avoid PGlite lock collision
      const projRes = await api.get('/projects');
      setProjects(projRes.data.projects || projRes.data.data || []);

      const delivRes = await api.get('/deliverables');
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

    const latestVersion = getLatestVersion(selectedDeliverable);

    if (!latestVersion) {
      toast.error('Não há versão cadastrada para este entregável.');
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

      const updatedStatus = decision === 'APPROVED' ? 'APPROVED' : 'CHANGES_REQUESTED';
      setDeliverables((prev) =>
        prev.map((d) => (d.id === selectedDeliverable.id ? { ...d, status: updatedStatus } : d))
      );

      setModalOpen(false);
      setSelectedDeliverable(null);
      setComment('');
      const msg =
        decision === 'APPROVED'
          ? 'Entregável aprovado com sucesso. A agência foi notificada.'
          : 'Solicitação de ajustes enviada com sucesso para a agência.';
      setSuccessMessage(msg);
      toast.success(msg);
      fetchPortalData();
    } catch (err: any) {
      console.error('Failed to submit decision:', err);
      toast.error(err.response?.data?.error?.message || 'Erro ao registrar decisão');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingItems = deliverables.filter(
    (d) => d.status === 'IN_REVIEW' || d.status === 'READY_FOR_REVIEW'
  );
  const inAdjustmentItems = deliverables.filter((d) => d.status === 'CHANGES_REQUESTED');
  const approvedItems = deliverables.filter((d) => d.status === 'APPROVED');

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', color: 'var(--text-primary)' }}>
      {/* Client Portal Header */}
      <header
        style={{
          borderBottom: '1px solid var(--border-hairline)',
          background: 'var(--bg-surface)',
          padding: '0.875rem 2rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <LogoIcon size={26} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, letterSpacing: '-0.02em' }}>
                Portal do Cliente
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.625rem',
                  padding: '1px 5px',
                  borderRadius: '3px',
                  background: 'var(--bg-subtle)',
                  border: '1px solid var(--border-hairline)',
                  color: 'var(--text-secondary)',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase',
                }}
              >
                {currentOrg?.name || 'AGÊNCIA'}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <button
            onClick={toggleTheme}
            aria-label="Alternar tema"
            style={{
              width: 32,
              height: 32,
              borderRadius: '6px',
              border: '1px solid var(--border-hairline)',
              background: 'var(--bg-subtle)',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          <Link to="/dashboard" className="btn btn-secondary btn-sm">
            <ArrowLeft size={13} />
            <span>Voltar ao Painel</span>
          </Link>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '1080px', margin: '0 auto', padding: '2.5rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        {/* Welcome Greeting Card */}
        <div
          className="card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1.5rem',
            padding: '1.5rem',
          }}
        >
          <div>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.071em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
                display: 'block',
                marginBottom: '0.25rem',
              }}
            >
              PAINEL DE APROVAÇÕES
            </span>
            <h2
              style={{
                fontSize: '1.5rem',
                fontWeight: 600,
                letterSpacing: '-0.035em',
                color: 'var(--text-primary)',
                margin: '0 0 0.35rem 0',
              }}
            >
              Olá{user?.name ? `, ${user.name}` : ''}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0, maxWidth: '480px' }}>
              Acompanhe as entregas da sua agência em tempo real e aprove materiais para produção.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-0.04em',
                  color: 'var(--text-primary)',
                }}
              >
                {pendingItems.length}
              </div>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                AGUARDANDO SUA REVISÃO
              </span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-hairline)', paddingLeft: '1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-0.04em',
                  color: inAdjustmentItems.length > 0 ? '#ef4444' : 'var(--text-primary)',
                }}
              >
                {inAdjustmentItems.length}
              </div>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                EM AJUSTE PELA AGÊNCIA
              </span>
            </div>
            <div style={{ borderLeft: '1px solid var(--border-hairline)', paddingLeft: '1.5rem', textAlign: 'center' }}>
              <div
                style={{
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  fontFamily: 'var(--font-mono)',
                  letterSpacing: '-0.04em',
                  color: 'var(--accent-primary)',
                }}
              >
                {approvedItems.length}
              </div>
              <span style={{ fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                ENTREGAS APROVADAS
              </span>
            </div>
          </div>
        </div>

        {successMessage && (
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '6px',
              padding: '0.875rem 1rem',
              color: 'var(--accent-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Pending Deliverables Section */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Clock size={16} style={{ color: 'var(--text-tertiary)' }} />
            <h2 style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>
              Entregas para sua Revisão & Aprovação
            </h2>
          </div>

          {loading ? (
            <p style={{ color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', fontSize: '0.8125rem' }}>
              CARREGANDO ENTREGÁVEIS...
            </p>
          ) : pendingItems.length === 0 ? (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '3rem 1.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '6px',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '0.75rem',
                  color: 'var(--text-tertiary)',
                }}
              >
                <FileCheck size={18} />
              </div>
              <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.875rem', margin: '0 0 0.25rem 0' }}>
                Nenhum item pendente de aprovação no momento
              </p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '360px' }}>
                Assim que a agência enviar um novo entregável ou uma nova versão ajustada, ela ficará disponível aqui.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {pendingItems.map((item) => {
                const latestVersion = getLatestVersion(item);
                const isUpdatedVersion = (latestVersion?.versionNumber || 1) > 1;

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '1rem',
                      padding: '1.25rem',
                      border: isUpdatedVersion ? '1px solid rgba(16, 185, 129, 0.4)' : undefined,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
                            {item.title}
                          </h3>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-hairline)',
                              background: 'var(--bg-subtle)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            v{latestVersion?.versionNumber || item.currentVersionNumber}
                          </span>

                          {isUpdatedVersion && (
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.6875rem',
                                fontWeight: 600,
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: 'rgba(16, 185, 129, 0.12)',
                                border: '1px solid rgba(16, 185, 129, 0.3)',
                                color: 'var(--accent-primary)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                              }}
                            >
                              <RefreshCw size={11} />
                              <span>NOVA VERSÃO ENVIADA</span>
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                            {item.description}
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {latestVersion?.externalUrl && (
                          <a
                            href={latestVersion.externalUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                          >
                            <ExternalLink size={13} />
                            <span>Abrir Material</span>
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
                          <MessageSquare size={13} />
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
                          <ThumbsUp size={13} />
                          <span>Aprovar</span>
                        </button>
                      </div>
                    </div>

                    {latestVersion?.notes && (
                      <div
                        style={{
                          background: 'var(--bg-subtle)',
                          padding: '0.75rem 1rem',
                          borderRadius: '6px',
                          border: '1px solid var(--border-hairline)',
                          fontSize: '0.8125rem',
                        }}
                      >
                        <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6875rem', letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
                          {isUpdatedVersion ? 'NOTAS DA ATUALIZAÇÃO DA AGÊNCIA:' : 'NOTAS DA EQUIPE:'}
                        </strong>{' '}
                        <span style={{ color: 'var(--text-primary)' }}>
                          {latestVersion.notes}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Changes Requested / In Adjustment Section */}
        {inAdjustmentItems.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <AlertCircle size={16} style={{ color: '#ef4444' }} />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>
                Ajustes em Andamento pela Agência ({inAdjustmentItems.length})
              </h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {inAdjustmentItems.map((item) => {
                const latestVer = getLatestVersion(item);
                const changeApproval = item.approvals?.find((a) => a.decision === 'CHANGES_REQUESTED');

                return (
                  <div
                    key={item.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.875rem',
                      padding: '1.25rem',
                      border: '1px solid rgba(239, 68, 68, 0.25)',
                      background: 'rgba(239, 68, 68, 0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                          <h3 style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.02em', margin: 0 }}>
                            {item.title}
                          </h3>
                          <span
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: '0.6875rem',
                              fontWeight: 600,
                              padding: '2px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border-hairline)',
                              background: 'var(--bg-subtle)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            v{latestVer?.versionNumber || item.currentVersionNumber}
                          </span>
                          <StatusBadge status="CHANGES_REQUESTED" />
                        </div>
                        {item.description && (
                          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.35rem', lineHeight: 1.5 }}>
                            {item.description}
                          </p>
                        )}
                      </div>

                      {latestVer?.externalUrl && (
                        <a
                          href={latestVer.externalUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                          title="Visualizar versão anterior"
                        >
                          <ExternalLink size={13} />
                          <span>Ver Versão Anterior</span>
                        </a>
                      )}
                    </div>

                    <div
                      style={{
                        background: 'rgba(239, 68, 68, 0.06)',
                        border: '1px solid rgba(239, 68, 68, 0.15)',
                        borderRadius: '6px',
                        padding: '0.75rem 1rem',
                        fontSize: '0.8125rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ef4444', fontWeight: 600, fontSize: '0.75rem', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                        <Clock size={13} />
                        <span>Aguardando envio da nova versão pela equipe da agência</span>
                      </div>
                      {changeApproval?.comment && (
                        <p style={{ margin: '0.25rem 0', fontStyle: 'italic', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                          Sua solicitação: "{changeApproval.comment}"
                        </p>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', display: 'block', marginTop: '0.25rem' }}>
                        Assim que a agência enviar o ajuste, este entregável reaparecerá no topo para sua aprovação final.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Approved Deliverables Section */}
        {approvedItems.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <CheckCircle2 size={16} style={{ color: 'var(--accent-primary)' }} />
              <h2 style={{ fontSize: '1.125rem', fontWeight: 600, letterSpacing: '-0.025em', margin: 0 }}>
                Entregas Concluídas & Aprovadas
              </h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '0.75rem' }}>
              {approvedItems.map((item) => (
                <div
                  key={item.id}
                  className="card"
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    padding: '1rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                    <h3 style={{ fontSize: '0.9375rem', fontWeight: 600, margin: 0 }}>{item.title}</h3>
                    <StatusBadge status="APPROVED" />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.25rem' }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)', margin: 0 }}>
                      VERSÃO APROVADA: v{getLatestVersion(item)?.versionNumber || item.currentVersionNumber || 1}
                    </p>
                    {getLatestVersion(item)?.externalUrl && (
                      <a
                        href={getLatestVersion(item)!.externalUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-outline btn-sm"
                        style={{ height: '24px', padding: '0 0.5rem', fontSize: '0.6875rem' }}
                      >
                        <ExternalLink size={11} />
                        <span>Abrir</span>
                      </a>
                    )}
                  </div>
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
        title={decision === 'APPROVED' ? 'Aprovar Entregável' : 'Solicitar Ajustes'}
      >
        <form onSubmit={handleDecisionSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            {decision === 'APPROVED'
              ? `Você está aprovando "${selectedDeliverable?.title}". A agência receberá o aceite formal para prosseguir.`
              : `Descreva detalhadamente os ajustes solicitados para "${selectedDeliverable?.title}".`}
          </p>

          <div>
            <label
              style={{
                display: 'block',
                fontSize: '0.6875rem',
                fontWeight: 600,
                fontFamily: 'var(--font-mono)',
                letterSpacing: '0.071em',
                textTransform: 'uppercase',
                color: 'var(--text-secondary)',
                marginBottom: '0.375rem',
              }}
            >
              {decision === 'APPROVED' ? 'Comentário ou Feedback (Opcional)' : 'Descrição dos Ajustes *'}
            </label>
            <textarea
              rows={4}
              required={decision === 'CHANGES_REQUESTED'}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                decision === 'APPROVED'
                  ? 'Ex: Aprovado! Segue perfeitamente o alinhamento da reunião.'
                  : 'Ex: Ajustar contraste do rodapé e trocar o logo para versão monocromática...'
              }
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-hairline)' }}>
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
                : 'Enviar Solicitação'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

