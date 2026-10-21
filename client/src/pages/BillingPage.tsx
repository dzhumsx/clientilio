import React, { useState, useEffect } from 'react';
import { CheckCircle2, ArrowUpRight, Check, ShieldCheck } from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionInfo } from '../types';

export const BillingPage: React.FC = () => {
  const { currentOrg, refreshProfile } = useAuth();
  const [billing, setBilling] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);

  const fetchBilling = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      const { data } = await api.get('/billing');
      setBilling(data);
    } catch (err) {
      console.error('Failed to load billing data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBilling();
  }, [currentOrg]);

  useEffect(() => {
    if (!isCheckoutModalOpen || !checkoutClientSecret) return;

    let isMounted = true;

    const setupCheckoutForm = async () => {
      try {
        const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_...';
        const stripeWindow = (window as any).Stripe;
        if (!stripeWindow) {
          console.error('Stripe.js Dahlia SDK not loaded.');
          return;
        }

        const stripe = stripeWindow(stripePublishableKey);

        const appearance = {
          theme: 'stripe',
          labels: 'auto',
          inputs: 'spaced',
          variables: {
            borderRadius: '6px',
            colorBackground: '#ffffff',
            colorDanger: '#df1b41',
            colorPrimary: '#171717',
            colorSuccess: '#297a3a',
            colorText: '#171717',
            fontFamily: 'default',
            fontSizeBase: '14px',
            spacingUnit: '4px',
          },
        };

        const checkout = await stripe.initCheckoutFormSdk({
          clientSecret: checkoutClientSecret,
          appearance,
        });

        if (!isMounted) return;

        const form = checkout.createForm({ layout: 'expanded' });
        form.mount('#checkout-form');

        const loadActionsResult = await checkout.loadActions();
        if (loadActionsResult.type === 'success') {
          form.on('confirm', async (event: any) => {
            try {
              await loadActionsResult.actions.confirm({ formConfirmEvent: event });
              setMessage('Pagamento confirmado com sucesso.');
              setIsCheckoutModalOpen(false);
              setCheckoutClientSecret(null);
              await fetchBilling();
              await refreshProfile();
            } catch (error) {
              console.error('Payment confirmation error:', error);
            }
          });
        }
      } catch (err) {
        console.error('Failed to initialize or mount Stripe checkout form:', err);
      }
    };

    const timer = setTimeout(() => {
      setupCheckoutForm();
    }, 50);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isCheckoutModalOpen, checkoutClientSecret]);

  const handleCheckout = async (planId: string) => {
    setUpgradingPlan(planId);
    setMessage(null);

    try {
      const { data } = await api.post('/billing/checkout', {
        planId,
      });

      if (data.simulated) {
        setMessage(`Plano alterado para ${planId.toUpperCase()} com sucesso.`);
        await fetchBilling();
        await refreshProfile();
      } else if (data.client_secret) {
        setCheckoutClientSecret(data.client_secret);
        setIsCheckoutModalOpen(true);
      }
    } catch (err: any) {
      console.error('Failed to initiate checkout:', err);
      setMessage(err.response?.data?.error?.message || 'Erro ao processar assinatura.');
    } finally {
      setUpgradingPlan(null);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Deseja realmente cancelar sua assinatura? O acesso continuará até o fim do ciclo atual.')) {
      return;
    }

    try {
      await api.post('/billing/cancel');
      setMessage('Assinatura cancelada com sucesso.');
      await fetchBilling();
      await refreshProfile();
    } catch (err: any) {
      console.error('Failed to cancel subscription:', err);
      setMessage(err.response?.data?.error?.message || 'Erro ao cancelar assinatura.');
    }
  };

  return (
    <div>
      <Navbar
        title="Faturamento"
        subtitle="Assinatura corporativa, cotas de recursos e pagamentos"
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        {message && (
          <div
            style={{
              background: 'var(--bg-subtle)',
              border: '1px solid var(--border-hairline)',
              borderRadius: '6px',
              padding: '0.875rem 1rem',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.625rem',
              fontSize: '0.8125rem',
              fontFamily: 'var(--font-mono)',
            }}
          >
            <ShieldCheck size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>{message}</span>
          </div>
        )}

        {/* Current Plan Overview Card */}
        {billing && (
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              padding: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.5rem' }}>
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
                  PLANO ATIVO
                </span>
                <h2
                  style={{
                    fontSize: '1.75rem',
                    fontWeight: 600,
                    letterSpacing: '-0.04em',
                    color: 'var(--text-primary)',
                    margin: '0 0 0.5rem 0',
                  }}
                >
                  Plano {billing.planName}
                </h2>
                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap',
                  }}
                >
                  <span>STATUS: <strong style={{ color: 'var(--accent-primary)' }}>{billing.status.toUpperCase()}</strong></span>
                  {billing.currentPeriodEnd && (
                    <>
                      <span>•</span>
                      <span>RENOVAÇÃO: {new Date(billing.currentPeriodEnd).toLocaleDateString('pt-BR')}</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'flex-end', gap: '4px' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>R$</span>
                  <span
                    style={{
                      fontSize: '2.25rem',
                      fontWeight: 600,
                      letterSpacing: '-0.04em',
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {billing.planPrice}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>/mês</span>
                </div>
                {billing.planId !== 'free' && (
                  <button
                    onClick={handleCancel}
                    className="btn btn-outline btn-sm"
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.6875rem',
                      fontFamily: 'var(--font-mono)',
                      color: '#ef4444',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    Cancelar Assinatura
                  </button>
                )}
              </div>
            </div>

            {/* Usage vs Limits Progress Bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border-hairline)' }}>
              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>CLIENTES ATIVOS</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{billing.usage.clients} / {billing.limits.maxActiveClients}</strong>
                </div>
                <div style={{ height: '4px', background: 'var(--border-hairline)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, (billing.usage.clients / billing.limits.maxActiveClients) * 100)}%`,
                      height: '100%',
                      background: 'var(--text-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>PROJETOS ATIVOS</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{billing.usage.projects} / {billing.limits.maxActiveProjects}</strong>
                </div>
                <div style={{ height: '4px', background: 'var(--border-hairline)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, (billing.usage.projects / billing.limits.maxActiveProjects) * 100)}%`,
                      height: '100%',
                      background: 'var(--text-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)' }}>MEMBROS DA EQUIPE</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{billing.usage.teamMembers} / {billing.limits.maxTeamMembers}</strong>
                </div>
                <div style={{ height: '4px', background: 'var(--border-hairline)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, (billing.usage.teamMembers / billing.limits.maxTeamMembers) * 100)}%`,
                      height: '100%',
                      background: 'var(--text-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Storage card preserved with display: 'none' */}
              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '6px', display: 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                  <span>ARMAZENAMENTO</span>
                  <strong>{billing.limits.maxStorageMb} MB</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  White-label: {billing.limits.whiteLabel ? 'Ativo' : 'Não incluso'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Plans Grid */}
        <div>
          <div style={{ marginBottom: '1.25rem' }}>
            <span
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                fontWeight: 600,
                letterSpacing: '0.071em',
                textTransform: 'uppercase',
                color: 'var(--text-tertiary)',
              }}
            >
              OPÇÕES DE EXPANSÃO
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.03em', margin: '0.25rem 0' }}>
              Planos & Níveis de Serviço
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
              Processamento seguro em Reais (BRL). Alterações de plano são aplicadas imediatamente.
            </p>
          </div>

          {billing && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
              {billing.availablePlans.map((p) => {
                const isCurrent = billing.planId === p.id;
                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      padding: '1.25rem',
                      position: 'relative',
                      border: isCurrent ? '1px solid var(--text-primary)' : '1px solid var(--border-hairline)',
                      boxShadow: isCurrent ? '0 0 0 1px var(--text-primary)' : 'none',
                    }}
                  >
                    {isCurrent && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '12px',
                          right: '12px',
                          fontFamily: 'var(--font-mono)',
                          fontSize: '0.625rem',
                          fontWeight: 600,
                          letterSpacing: '0.06em',
                          textTransform: 'uppercase',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          background: 'var(--text-primary)',
                          color: 'var(--bg-canvas)',
                        }}
                      >
                        PLANO ATUAL
                      </div>
                    )}

                    <div style={{ marginBottom: '1.25rem' }}>
                      <h4
                        style={{
                          fontSize: '1rem',
                          fontWeight: 600,
                          letterSpacing: '-0.02em',
                          margin: '0 0 0.5rem 0',
                          color: 'var(--text-primary)',
                        }}
                      >
                        {p.name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                        <span style={{ fontSize: '0.8125rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>R$</span>
                        <span
                          style={{
                            fontSize: '1.75rem',
                            fontWeight: 600,
                            letterSpacing: '-0.04em',
                            color: 'var(--text-primary)',
                            fontFamily: 'var(--font-mono)',
                          }}
                        >
                          {p.priceBRL}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>/mês</span>
                      </div>
                    </div>

                    <ul
                      style={{
                        listStyle: 'none',
                        padding: 0,
                        margin: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem',
                        fontSize: '0.75rem',
                        flex: 1,
                        marginBottom: '1.5rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span>Até {p.limits.maxActiveClients} clientes ativos</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span>Até {p.limits.maxActiveProjects} projetos simultâneos</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span>{p.limits.maxTeamMembers} usuários na equipe</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check size={13} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                        <span>{p.limits.maxStorageMb} MB de armazenamento</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Check
                          size={13}
                          style={{
                            color: p.limits.whiteLabel ? 'var(--accent-primary)' : 'var(--text-tertiary)',
                            flexShrink: 0,
                          }}
                        />
                        <span style={{ color: p.limits.whiteLabel ? 'var(--text-primary)' : 'var(--text-tertiary)' }}>
                          White-label {p.limits.whiteLabel ? 'incluído' : 'não incluso'}
                        </span>
                      </li>
                    </ul>

                    <button
                      onClick={() => handleCheckout(p.id)}
                      disabled={isCurrent || upgradingPlan === p.id}
                      className={`btn ${isCurrent ? 'btn-outline' : 'btn-primary'} btn-sm`}
                      style={{ width: '100%', justifyContent: 'center' }}
                    >
                      {isCurrent ? (
                        'Plano Atual'
                      ) : upgradingPlan === p.id ? (
                        'Processando...'
                      ) : (
                        <>
                          <span>Mudar para {p.name}</span>
                          <ArrowUpRight size={13} />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => {
          setIsCheckoutModalOpen(false);
          setCheckoutClientSecret(null);
        }}
        title="Pagamento Seguro"
      >
        <div style={{ minHeight: '380px', padding: '0.5rem 0' }}>
          <div id="checkout-form"></div>
        </div>
      </Modal>
    </div>
  );
};

