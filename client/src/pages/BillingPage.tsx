import React, { useState, useEffect } from 'react';
import { CreditCard, CheckCircle2, Sparkles, Zap, AlertCircle, ArrowUpRight } from 'lucide-react';
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
            borderRadius: '4px',
            colorBackground: '#ffffff',
            colorDanger: '#df1b41',
            colorPrimary: '#0570de',
            colorSuccess: '#00c853',
            colorText: '#30313d',
            fontFamily: 'default',
            fontSizeBase: '16px',
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
              setMessage('Pagamento confirmado com sucesso!');
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
        setMessage(`Plano alterado com sucesso para ${planId.toUpperCase()}! (Modo Simulação MVP)`);
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
        title="Planos & Faturamento"
        subtitle="Gerencie sua assinatura, limites da agência e gateway de pagamento"
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '1200px' }}>
        {message && (
          <div
            style={{
              background: 'rgba(99, 102, 241, 0.15)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              color: 'var(--text-primary)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
            }}
          >
            <Sparkles size={18} color="var(--accent-primary)" />
            <span>{message}</span>
          </div>
        )}

        {/* Current Plan Overview Card */}
        {billing && (
          <div
            className="card"
            style={{
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
              <div>
                <span className="badge badge-info" style={{ marginBottom: '0.5rem' }}>
                  Plano Atual
                </span>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>
                  Plano {billing.planName}
                </h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                  Status: <strong style={{ color: '#fff' }}>{billing.status}</strong>
                  {billing.currentPeriodEnd && ` • Renovação em: ${new Date(billing.currentPeriodEnd).toLocaleDateString('pt-BR')}`}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 800, color: '#ffffff' }}>
                  R$ {billing.planPrice}
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>/mês</span>
                </div>
                {billing.planId !== 'free' && (
                  <button
                    onClick={handleCancel}
                    className="btn btn-outline btn-sm"
                    style={{ marginTop: '0.5rem', color: 'var(--color-danger)', borderColor: 'rgba(244, 63, 94, 0.3)' }}
                  >
                    Cancelar Assinatura
                  </button>
                )}
              </div>
            </div>

            {/* Usage vs Limits Progress Bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.4rem' }}>
                  <span>Clientes Ativos</span>
                  <strong>{billing.usage.clients} / {billing.limits.maxActiveClients}</strong>
                </div>
                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, (billing.usage.clients / billing.limits.maxActiveClients) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent-gradient)',
                    }}
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.4rem' }}>
                  <span>Projetos Simultâneos</span>
                  <strong>{billing.usage.projects} / {billing.limits.maxActiveProjects}</strong>
                </div>
                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, (billing.usage.projects / billing.limits.maxActiveProjects) * 100)}%`,
                      height: '100%',
                      background: 'var(--color-info)',
                    }}
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.4rem' }}>
                  <span>Membros na Equipe</span>
                  <strong>{billing.usage.teamMembers} / {billing.limits.maxTeamMembers}</strong>
                </div>
                <div style={{ height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '99px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${Math.min(100, (billing.usage.teamMembers / billing.limits.maxTeamMembers) * 100)}%`,
                      height: '100%',
                      background: 'var(--color-success)',
                    }}
                  />
                </div>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '1rem', borderRadius: 'var(--radius-md)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.825rem', marginBottom: '0.4rem' }}>
                  <span>Armazenamento</span>
                  <strong>{billing.limits.maxStorageMb} MB</strong>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.25rem' }}>
                  White-label: {billing.limits.whiteLabel ? '✅ Ativo' : '❌ Não incluso'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Available Plans Grid */}
        <div>
          <h3 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Fazer Upgrade ou Mudar de Plano</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
            Pagamento automatizado via gateway Stripe em Reais (BRL). Cancele ou altere a qualquer momento.
          </p>

          {billing && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem' }}>
              {billing.availablePlans.map((p) => {
                const isCurrent = billing.planId === p.id;
                return (
                  <div
                    key={p.id}
                    className="card"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      border: isCurrent ? '2px solid var(--accent-primary)' : '1px solid var(--border-subtle)',
                    }}
                  >
                    <div style={{ marginBottom: '1rem' }}>
                      <h4 style={{ fontSize: '1.25rem', fontWeight: 700 }}>{p.name}</h4>
                      <div style={{ fontSize: '2rem', fontWeight: 800, color: '#fff', marginTop: '0.5rem' }}>
                        R$ {p.priceBRL}
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>/mês</span>
                      </div>
                    </div>

                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.825rem', flex: 1, marginBottom: '1.5rem' }}>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={14} color="var(--color-success)" />
                        <span>Até {p.limits.maxActiveClients} clientes ativos</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={14} color="var(--color-success)" />
                        <span>Até {p.limits.maxActiveProjects} projetos simultâneos</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={14} color="var(--color-success)" />
                        <span>{p.limits.maxTeamMembers} usuários da equipe</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={14} color="var(--color-success)" />
                        <span>{p.limits.maxStorageMb} MB de armazenamento</span>
                      </li>
                      <li style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <CheckCircle2 size={14} color={p.limits.whiteLabel ? 'var(--color-success)' : 'var(--text-muted)'} />
                        <span style={{ color: p.limits.whiteLabel ? 'inherit' : 'var(--text-muted)' }}>
                          White-label completo
                        </span>
                      </li>
                    </ul>

                    <button
                      onClick={() => handleCheckout(p.id)}
                      disabled={isCurrent || upgradingPlan === p.id}
                      className={`btn ${isCurrent ? 'btn-secondary' : 'btn-primary'} btn-sm`}
                      style={{ width: '100%' }}
                    >
                      {isCurrent ? (
                        'Plano Atual'
                      ) : upgradingPlan === p.id ? (
                        'Processando...'
                      ) : (
                        <>
                          <span>Assinar {p.name}</span>
                          <ArrowUpRight size={14} />
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
        title="Finalizar Pagamento Seguro"
      >
        <div style={{ minHeight: '400px', padding: '0.5rem 0' }}>
          <div id="checkout-form"></div>
        </div>
      </Modal>
    </div>
  );
};
