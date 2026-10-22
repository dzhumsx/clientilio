import React, { useState, useEffect } from 'react';
import {
  CheckCircle2,
  ArrowUpRight,
  Check,
  ShieldCheck,
  CreditCard,
  FileText,
  HelpCircle,
  Download,
  Zap,
  ChevronDown,
  ChevronUp,
  Lock,
  Calendar,
  Tag,
  Sparkles,
  Building2,
  Users,
  Briefcase
} from 'lucide-react';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { SubscriptionInfo } from '../types';
import toast from 'react-hot-toast';

export const BillingPage: React.FC = () => {
  const { currentOrg, refreshProfile } = useAuth();
  const [billing, setBilling] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgradingPlan, setUpgradingPlan] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [checkoutClientSecret, setCheckoutClientSecret] = useState<string | null>(null);

  // Billing Cycle: 'monthly' or 'yearly' (10% discount)
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('yearly');

  // FAQ open item tracker
  const [openFaq, setOpenFaq] = useState<number | null>(null);

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
    if (billing?.planInterval) {
      setBillingCycle(billing.planInterval);
    } else if (billing?.planId?.endsWith('_yearly')) {
      setBillingCycle('yearly');
    }
  }, [billing?.planId, billing?.planInterval]);

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
              toast.success('Pagamento confirmado com sucesso!');
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
        interval: billingCycle,
      });

      if (data.simulated) {
        const cycleText = billingCycle === 'yearly' ? 'Anual (com 10% OFF)' : 'Mensal';
        toast.success(`Plano alterado para ${planId.toUpperCase()} (${cycleText}) com sucesso!`);
        setMessage(`Plano alterado para ${planId.toUpperCase()} (${cycleText}) com sucesso.`);
        await fetchBilling();
        await refreshProfile();
      } else if (data.client_secret) {
        setCheckoutClientSecret(data.client_secret);
        setIsCheckoutModalOpen(true);
      }
    } catch (err: any) {
      console.error('Failed to initiate checkout:', err);
      const errMsg = err.response?.data?.error?.message || 'Erro ao processar assinatura.';
      toast.error(errMsg);
      setMessage(errMsg);
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
      toast.success('Assinatura cancelada com sucesso.');
      setMessage('Assinatura cancelada com sucesso.');
      await fetchBilling();
      await refreshProfile();
    } catch (err: any) {
      console.error('Failed to cancel subscription:', err);
      const errMsg = err.response?.data?.error?.message || 'Erro ao cancelar assinatura.';
      toast.error(errMsg);
      setMessage(errMsg);
    }
  };

  // Pricing calculations with 10% yearly discount
  const getPlanPricing = (priceBRL: number) => {
    if (priceBRL === 0) {
      return {
        monthlyFormatted: '0',
        yearlyPerMonthFormatted: '0',
        yearlyTotalFormatted: '0',
        savingsFormatted: '0',
      };
    }

    const discountedMonthly = priceBRL * 0.9; // 10% off
    const yearlyTotal = discountedMonthly * 12;
    const yearlySavings = priceBRL * 12 - yearlyTotal;

    return {
      monthlyFormatted: priceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 }),
      yearlyPerMonthFormatted: discountedMonthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      yearlyTotalFormatted: yearlyTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      savingsFormatted: yearlySavings.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
    };
  };

  const faqs = [
    {
      q: 'Como funciona o desconto de 10% no faturamento anual?',
      a: 'Ao optar pelo plano anual, você recebe 10% de desconto sobre o valor total de 12 meses. O valor integral do ano com desconto é cobrado em parcela única ou parcelado no cartão de crédito, garantindo economia direta e congelamento do valor durante todo o período contratado.',
    },
    {
      q: 'Posso alterar meu plano ou ciclo de faturamento a qualquer momento?',
      a: 'Sim! Você pode fazer upgrade de plano ou mudar de mensal para anual a qualquer momento. Os créditos não utilizados do seu plano anterior são calculados proporcionalmente (pró-rata) e aplicados como desconto no novo plano.',
    },
    {
      q: 'Como são emitidas as Notas Fiscais (NFS-e)?',
      a: 'As notas fiscais são geradas de forma automática após a confirmação de cada pagamento e enviadas por e-mail para o titular da conta. Você também pode cadastrar a Razão Social e CNPJ da agência nas configurações.',
    },
    {
      q: 'O que acontece se minha agência ultrapassar as cotas de clientes ou projetos?',
      a: 'O sistema notificará os administradores quando você atingir 80% e 100% dos limites. Nenhum cliente ou projeto existente será bloqueado ou excluído; apenas a criação de novos itens ficará temporariamente pausada até que você faça um upgrade simples de plano.',
    },
    {
      q: 'Quais formas de pagamento são aceitas?',
      a: 'Aceitamos Cartão de Crédito (todas as principais bandeiras nacionais e internacionais), PIX com ativação em tempo real e Boleto Bancário. O parcelamento em até 12x está disponível no plano anual.',
    },
    {
      q: 'Existe taxa de cancelamento ou contrato de fidelidade?',
      a: 'Não. Você pode cancelar sua assinatura a qualquer momento com apenas 1 clique, sem multas, sem taxas ocultas e sem fidelidade. O acesso aos recursos continuará normalmente até o término do ciclo já pago.',
    },
  ];

  // Invoices mock demonstration data
  const invoiceHistory = [
    {
      id: 'INV-2026-003',
      date: '01/10/2026',
      amount: billing?.planPrice ? `R$ ${billing.planPrice},00` : 'R$ 239,00',
      status: 'PAGO',
      method: 'Cartão de Crédito •••• 4242',
      period: '01/10/2026 - 31/10/2026',
    },
    {
      id: 'INV-2026-002',
      date: '01/09/2026',
      amount: billing?.planPrice ? `R$ ${billing.planPrice},00` : 'R$ 239,00',
      status: 'PAGO',
      method: 'Cartão de Crédito •••• 4242',
      period: '01/09/2026 - 30/09/2026',
    },
    {
      id: 'INV-2026-001',
      date: '01/08/2026',
      amount: billing?.planPrice ? `R$ ${billing.planPrice},00` : 'R$ 239,00',
      status: 'PAGO',
      method: 'PIX Instantâneo',
      period: '01/08/2026 - 31/08/2026',
    },
  ];

  return (
    <div>
      <Navbar
        title="Planos & Faturamento"
        subtitle="Gerenciamento da assinatura corporativa, cotas de recursos, faturas e métodos de pagamento"
      />

      <div style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', maxWidth: '1200px', margin: '0 auto' }}>
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

        {/* =========================================================================
            SECTION 1: CURRENT PLAN OVERVIEW & RESOURCE USAGE
           ========================================================================= */}
        {billing && (
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-card)',
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
                  PLANO ATIVO DA AGÊNCIA
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                  <h2
                    style={{
                      fontSize: '1.75rem',
                      fontWeight: 600,
                      letterSpacing: '-0.04em',
                      color: 'var(--text-primary)',
                      margin: 0,
                    }}
                  >
                    Plano {billing.planName}
                  </h2>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'var(--color-success-bg)',
                      color: 'var(--color-success)',
                      border: '1px solid var(--accent-border)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {billing.status.toUpperCase()}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      background: 'var(--bg-subtle)',
                      border: '1px solid var(--border-hairline)',
                      color: 'var(--text-secondary)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    {billing.planInterval === 'yearly' || billing.planId.endsWith('_yearly') ? 'CICLO ANUAL (10% OFF)' : 'CICLO MENSAL'}
                  </span>
                  <span
                    style={{
                      fontSize: '10px',
                      color: 'var(--text-tertiary)',
                      fontFamily: 'var(--font-mono)',
                    }}
                  >
                    PLANO INTERNO: {billing.planId.toUpperCase()}
                  </span>
                </div>

                <div
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.75rem',
                    color: 'var(--text-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.65rem',
                    flexWrap: 'wrap',
                    marginTop: '0.5rem',
                  }}
                >
                  <span>EMPRESA: <strong>{currentOrg?.name || 'Agência'}</strong></span>
                  {billing.currentPeriodEnd && (
                    <>
                      <span>•</span>
                      <span>RENOVAÇÃO: <strong>{new Date(billing.currentPeriodEnd).toLocaleDateString('pt-BR')}</strong></span>
                    </>
                  )}
                  <span>•</span>
                  <span>FATURAMENTO: <strong>AUTOMÁTICO</strong></span>
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
                    {billing.planPrice.toLocaleString('pt-BR', { minimumFractionDigits: billing.planInterval === 'yearly' || billing.planId.endsWith('_yearly') ? 2 : 0 })}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                    {billing.planInterval === 'yearly' || billing.planId.endsWith('_yearly') ? '/ano' : '/mês'}
                  </span>
                </div>
                {(billing.planInterval === 'yearly' || billing.planId.endsWith('_yearly')) && (
                  <p style={{ margin: '0.2rem 0 0', fontSize: '11px', color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                    Equivalente a R$ {(billing.monthlyEquivalentPrice || billing.planPrice / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/mês
                  </p>
                )}
                {billing.planId !== 'free' && (
                  <button
                    onClick={handleCancel}
                    className="btn btn-outline btn-sm"
                    style={{
                      marginTop: '0.5rem',
                      fontSize: '0.6875rem',
                      fontFamily: 'var(--font-mono)',
                      color: 'var(--color-danger)',
                      borderColor: 'rgba(239, 68, 68, 0.3)',
                    }}
                  >
                    Cancelar Assinatura
                  </button>
                )}
              </div>
            </div>

            {/* Shared Limits Explanation Banner */}
            <div
              style={{
                marginTop: '1.25rem',
                marginBottom: '1rem',
                padding: '0.875rem 1.15rem',
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.65rem',
              }}
            >
              <Sparkles size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Limites compartilhados entre suas agências:</strong>{' '}
                Os recursos do seu plano contratado ({billing.planName}) são compartilhados entre todas as agências que você é proprietário. Membros e colaboradores convidados não consomem nem afetam os limites do seu plano.
              </div>
            </div>

            {/* Usage vs Limits Progress Bars */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-hairline)' }}>
              {/* Agências */}
              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Building2 size={13} style={{ color: 'var(--accent-primary)' }} /> AGÊNCIAS CRIADAS
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {billing.limits.maxAgencies === -1
                      ? `${billing.usage.agencies || 1} / Ilimitado`
                      : `${billing.usage.agencies || 1} / ${billing.limits.maxAgencies}`}
                  </strong>
                </div>
                <div style={{ height: '5px', background: 'var(--border-hairline)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: billing.limits.maxAgencies === -1
                        ? '100%'
                        : `${Math.min(100, ((billing.usage.agencies || 1) / billing.limits.maxAgencies) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Clientes */}
              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Building2 size={13} style={{ color: 'var(--accent-primary)' }} /> CLIENTES ATIVOS
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {billing.limits.maxActiveClients === -1
                      ? `${billing.usage.clients} / Ilimitado`
                      : `${billing.usage.clients} / ${billing.limits.maxActiveClients}`}
                  </strong>
                </div>
                <div style={{ height: '5px', background: 'var(--border-hairline)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: billing.limits.maxActiveClients === -1
                        ? '100%'
                        : `${Math.min(100, (billing.usage.clients / billing.limits.maxActiveClients) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Projetos */}
              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Briefcase size={13} style={{ color: 'var(--accent-primary)' }} /> PROJETOS ATIVOS
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {billing.limits.maxActiveProjects === -1
                      ? `${billing.usage.projects} / Ilimitado`
                      : `${billing.usage.projects} / ${billing.limits.maxActiveProjects}`}
                  </strong>
                </div>
                <div style={{ height: '5px', background: 'var(--border-hairline)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: billing.limits.maxActiveProjects === -1
                        ? '100%'
                        : `${Math.min(100, (billing.usage.projects / billing.limits.maxActiveProjects) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>

              {/* Membros Equipe */}
              <div style={{ background: 'var(--bg-subtle)', padding: '1rem', borderRadius: '6px', border: '1px solid var(--border-hairline)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.75rem', fontFamily: 'var(--font-mono)', marginBottom: '0.5rem' }}>
                  <span style={{ color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <Users size={13} style={{ color: 'var(--accent-primary)' }} /> MEMBROS DA EQUIPE
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {billing.limits.maxTeamMembers === -1
                      ? `${billing.usage.teamMembers} / Ilimitado`
                      : `${billing.usage.teamMembers} / ${billing.limits.maxTeamMembers}`}
                  </strong>
                </div>
                <div style={{ height: '5px', background: 'var(--border-hairline)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: billing.limits.maxTeamMembers === -1
                        ? '100%'
                        : `${Math.min(100, (billing.usage.teamMembers / billing.limits.maxTeamMembers) * 100)}%`,
                      height: '100%',
                      background: 'var(--accent-primary)',
                      transition: 'width 0.3s ease',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            SECTION 2: PLAN SELECTION WITH MONTHLY VS ANNUAL (10% OFF) TOGGLE
           ========================================================================= */}
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '1.25rem',
              marginBottom: '1.75rem',
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
                }}
              >
                OPÇÕES DE ASSINATURA
              </span>
              <h3 style={{ fontSize: '1.5rem', fontWeight: 600, letterSpacing: '-0.03em', margin: '0.25rem 0' }}>
                Planos & Níveis de Serviço
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', margin: 0 }}>
                Selecione o plano ideal para a escala de clientes e projetos da sua agência.
              </p>
            </div>

            {/* Monthly vs Annual Toggle */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: 'var(--bg-subtle)',
                border: '1px solid var(--border-hairline)',
                borderRadius: '8px',
                padding: '4px',
                gap: '4px',
              }}
            >
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: billingCycle === 'monthly' ? 600 : 450,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: billingCycle === 'monthly' ? 'var(--bg-card)' : 'transparent',
                  color: billingCycle === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: billingCycle === 'monthly' ? 'var(--shadow-dropdown)' : 'none',
                  transition: 'all var(--transition-fast)',
                }}
              >
                Mensal
              </button>

              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: billingCycle === 'yearly' ? 600 : 450,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: billingCycle === 'yearly' ? 'var(--bg-card)' : 'transparent',
                  color: billingCycle === 'yearly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  boxShadow: billingCycle === 'yearly' ? 'var(--shadow-dropdown)' : 'none',
                  transition: 'all var(--transition-fast)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Anual</span>
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 700,
                    backgroundColor: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    border: '1px solid var(--accent-border)',
                    padding: '1px 6px',
                    borderRadius: '10px',
                    letterSpacing: '0.02em',
                  }}
                >
                  10% OFF
                </span>
              </button>
            </div>
          </div>

          {/* Plan Cards Grid */}
          {billing && (() => {
            const displayedPlans = (billing.availablePlans || []).filter((p) => {
              if (p.id === 'free') return true;
              if (billingCycle === 'yearly') {
                return p.interval === 'yearly' || p.id.endsWith('_yearly');
              }
              return p.interval === 'monthly' || (!p.interval && !p.id.endsWith('_yearly'));
            });

            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem' }}>
                {displayedPlans.map((p) => {
                  const isCurrent = billing.planId === p.id;
                  const isPopular =
                    p.basePlanId === 'business' ||
                    p.basePlanId === 'agency' ||
                    p.id === 'business' ||
                    p.id === 'agency' ||
                    p.id === 'business_yearly' ||
                    p.id === 'agency_yearly';
                  const isYearly = p.interval === 'yearly' || p.id.endsWith('_yearly');

                  return (
                    <div
                      key={p.id}
                      className="card"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        padding: '1.5rem',
                        position: 'relative',
                        border: isCurrent
                          ? '2px solid var(--accent-primary)'
                          : isPopular
                            ? '1px solid var(--accent-border)'
                            : '1px solid var(--border-hairline)',
                        boxShadow: isCurrent ? '0 0 15px rgba(5, 150, 105, 0.15)' : 'var(--shadow-card)',
                        backgroundColor: 'var(--bg-card)',
                        borderRadius: 'var(--radius-lg)',
                        transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                      }}
                    >
                      {/* Top Badges */}
                      {isCurrent ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'var(--accent-primary)',
                            color: '#ffffff',
                          }}
                        >
                          PLANO ATUAL
                        </div>
                      ) : isPopular ? (
                        <div
                          style={{
                            position: 'absolute',
                            top: '12px',
                            right: '12px',
                            fontFamily: 'var(--font-mono)',
                            fontSize: '0.625rem',
                            fontWeight: 700,
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            background: 'var(--bg-subtle)',
                            border: '1px solid var(--border-hairline)',
                            color: 'var(--accent-primary)',
                          }}
                        >
                          MAIS POPULAR
                        </div>
                      ) : null}

                      {/* Plan Header */}
                      <div style={{ marginBottom: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                          <h4
                            style={{
                              fontSize: '1.15rem',
                              fontWeight: 600,
                              letterSpacing: '-0.02em',
                              margin: 0,
                              color: 'var(--text-primary)',
                            }}
                          >
                            {p.name}
                          </h4>
                          <span
                            style={{
                              fontSize: '9px',
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text-tertiary)',
                              background: 'var(--bg-subtle)',
                              border: '1px solid var(--border-hairline)',
                              padding: '1px 5px',
                              borderRadius: '3px',
                            }}
                          >
                            {p.id.toUpperCase()}
                          </span>
                        </div>

                        {/* Pricing */}
                        {p.priceBRL === 0 ? (
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px' }}>
                            <span
                              style={{
                                fontSize: '2rem',
                                fontWeight: 600,
                                letterSpacing: '-0.04em',
                                color: 'var(--text-primary)',
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              Grátis
                            </span>
                          </div>
                        ) : isYearly ? (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                              <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>R$</span>
                              <span
                                style={{
                                  fontSize: '2rem',
                                  fontWeight: 600,
                                  letterSpacing: '-0.04em',
                                  color: 'var(--text-primary)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {(p.monthlyEquivalentBRL ?? p.priceBRL / 12).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>/mês</span>
                              <span
                                style={{
                                  fontSize: '0.75rem',
                                  color: 'var(--text-muted)',
                                  textDecoration: 'line-through',
                                  fontFamily: 'var(--font-mono)',
                                  marginLeft: '4px',
                                }}
                              >
                                R$ {(p.priceBRL / (12 * 0.90)).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                            </div>

                            <p
                              style={{
                                margin: '0.35rem 0 0',
                                fontSize: '11px',
                                color: 'var(--color-success)',
                                fontWeight: 600,
                                fontFamily: 'var(--font-mono)',
                              }}
                            >
                              Cobrado R$ {p.priceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/ano (Economia de R$ {(p.savingsBRL || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
                            </p>
                          </div>
                        ) : (
                          <div>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                              <span style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>R$</span>
                              <span
                                style={{
                                  fontSize: '2rem',
                                  fontWeight: 600,
                                  letterSpacing: '-0.04em',
                                  color: 'var(--text-primary)',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {p.priceBRL.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                              </span>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>/mês</span>
                            </div>
                            <p style={{ margin: '0.35rem 0 0', fontSize: '11px', color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)' }}>
                              Faturado mensalmente sem fidelidade
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Features List */}
                      <ul
                        style={{
                          listStyle: 'none',
                          padding: 0,
                          margin: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.6rem',
                          fontSize: '0.785rem',
                          flex: 1,
                          marginBottom: '1.75rem',
                          fontFamily: 'var(--font-sans)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                          <span>
                            <strong>
                              {p.limits.maxAgencies === -1 ? 'Agências ilimitadas' : `Até ${p.limits.maxAgencies} agência(s)`}
                            </strong>
                          </span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                          <span>
                            <strong>
                              {p.limits.maxActiveClients === -1 ? 'Clientes ilimitados' : `${p.limits.maxActiveClients} clientes ativos`}
                            </strong>
                          </span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                          <span>
                            <strong>
                              {p.limits.maxActiveProjects === -1 ? 'Projetos ilimitados' : `${p.limits.maxActiveProjects} projetos simultâneos`}
                            </strong>
                          </span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                          <span>
                            {p.limits.maxTeamMembers === -1 ? 'Membros ilimitados' : `${p.limits.maxTeamMembers} usuários na equipe`}
                          </span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                          <span>Entregáveis e links de aprovação ilimitados</span>
                        </li>
                        <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <Check size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                          <span>Portal do Cliente com Acesso Externo</span>
                        </li>
                        {(p.id === 'agency' || p.id === 'agency_yearly' || p.basePlanId === 'agency') && (
                          <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Sparkles size={14} style={{ color: 'var(--accent-primary)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                              Suporte VIP com Gerente de Conta Dedicado
                            </span>
                          </li>
                        )}
                      </ul>

                      {/* Action Button */}
                      <button
                        onClick={() => handleCheckout(p.id)}
                        disabled={isCurrent || upgradingPlan === p.id}
                        className={`btn ${isCurrent ? 'btn-outline' : 'btn-primary'} btn-sm`}
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '0.6rem',
                          fontSize: '13px',
                          fontWeight: 600,
                        }}
                      >
                        {isCurrent ? (
                          'Plano Atual'
                        ) : upgradingPlan === p.id ? (
                          'Processando...'
                        ) : (
                          <>
                            <span>Mudar para {p.name}</span>
                            <ArrowUpRight size={14} />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>

        {/* =========================================================================
            SECTION 3: COMPLETE FEATURE COMPARISON MATRIX
           ========================================================================= */}
        <div
          className="card"
          style={{
            padding: '1.75rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
            overflowX: 'auto',
          }}
        >
          <div style={{ marginBottom: '1.5rem' }}>
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
              COMPARATIVO DETALHADO
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.03em', margin: '0.25rem 0' }}>
              Matriz Completa de Recursos & Limites
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.8125rem', margin: 0 }}>
              Compare detalhadamente todos os recursos inclusos em cada nível da plataforma.
            </p>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-hairline)', backgroundColor: 'var(--bg-subtle)' }}>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Recursos</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Free</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pro</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Business</th>
                <th style={{ padding: '0.85rem 1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Agency (Completo)</th>
              </tr>
            </thead>
            <tbody>
              {/* Capacidade */}
              <tr style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 550 }}>Clientes Ativos</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Até 2</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Até 10</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Até 30</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Ilimitado</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 550 }}>Projetos Simultâneos</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Até 3</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Até 25</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>Até 100</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Ilimitado</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 550 }}>Membros da Equipe</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>2</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>5</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-secondary)' }}>15</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Ilimitado</td>
              </tr>

              {/* Portal do Cliente */}
              <tr style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 550 }}>Portal do Cliente com Acesso Externo</td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
              </tr>

              {/* Produtividade & Automações */}
              <tr style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 550 }}>Aprovações de Entregáveis com 1 Clique</td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 550 }}>Histórico de Versões e Comentários</td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
                <td style={{ padding: '0.75rem 1rem' }}><Check size={15} style={{ color: 'var(--accent-primary)' }} /></td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--border-hairline)' }}>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 550 }}>Nível de Suporte</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>Comunitário</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>E-mail (24h)</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>Prioritário (4h)</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>Gerente VIP 24/7</td>
              </tr>
              <tr>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 550 }}>SLA de Disponibilidade</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>99.0%</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>99.5%</td>
                <td style={{ padding: '0.75rem 1rem', color: 'var(--text-tertiary)' }}>99.9%</td>
                <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: 'var(--accent-primary)' }}>99.99% Dedicado</td>
              </tr>
            </tbody>
          </table>
        </div>


        {/* =========================================================================
            SECTION 6: FREQUENTLY ASKED QUESTIONS (FAQ)
           ========================================================================= */}
        <div
          className="card"
          style={{
            padding: '1.75rem',
            borderRadius: 'var(--radius-lg)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
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
              DÚVIDAS FREQUENTES
            </span>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '-0.03em', margin: '0.25rem 0' }}>
              Perguntas Frequentes sobre Faturamento & Cobrança
            </h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  style={{
                    backgroundColor: 'var(--bg-subtle)',
                    border: '1px solid var(--border-hairline)',
                    borderRadius: '8px',
                    overflow: 'hidden',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    style={{
                      width: '100%',
                      padding: '1rem 1.25rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'transparent',
                      border: 'none',
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: '13.5px',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                    }}
                  >
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
                  </button>

                  {isOpen && (
                    <div
                      style={{
                        padding: '0 1.25rem 1rem',
                        fontSize: '13px',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        borderTop: '1px solid var(--border-subtle)',
                        paddingTop: '0.75rem',
                      }}
                    >
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stripe Checkout Form Modal */}
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

export default BillingPage;
