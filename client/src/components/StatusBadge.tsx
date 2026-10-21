import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = () => {
    switch (status) {
      case 'ACTIVE':
        return { label: 'Ativo', variant: 'badge-success', dot: 'var(--color-success)' };
      case 'ARCHIVED':
        return { label: 'Arquivado', variant: 'badge-neutral', dot: 'var(--text-muted)' };
      case 'PLANNING':
        return { label: 'Planejamento', variant: 'badge-info', dot: 'var(--color-info)' };
      case 'IN_PROGRESS':
        return { label: 'Em Andamento', variant: 'badge-warning', dot: 'var(--color-warning)' };
      case 'REVIEW':
        return { label: 'Em Revisão', variant: 'badge-warning', dot: 'var(--color-warning)' };
      case 'COMPLETED':
        return { label: 'Concluído', variant: 'badge-success', dot: 'var(--color-success)' };
      case 'ON_HOLD':
        return { label: 'Pausado', variant: 'badge-neutral', dot: 'var(--text-muted)' };
      case 'DRAFT':
        return { label: 'Rascunho', variant: 'badge-neutral', dot: 'var(--text-muted)' };
      case 'READY_FOR_REVIEW':
        return { label: 'Aguardando Avaliação', variant: 'badge-warning', dot: 'var(--color-warning)' };
      case 'IN_REVIEW':
        return { label: 'Em Análise', variant: 'badge-info', dot: 'var(--color-info)' };
      case 'CHANGES_REQUESTED':
        return { label: 'Ajustes Solicitados', variant: 'badge-danger', dot: 'var(--color-danger)' };
      case 'APPROVED':
        return { label: 'Aprovado', variant: 'badge-success', dot: 'var(--color-success)' };
      case 'TODO':
        return { label: 'A Fazer', variant: 'badge-neutral', dot: 'var(--text-muted)' };
      case 'DONE':
        return { label: 'Feito', variant: 'badge-success', dot: 'var(--color-success)' };
      default:
        return { label: status, variant: 'badge-neutral', dot: 'var(--text-muted)' };
    }
  };

  const { label, variant, dot } = getStatusConfig();

  return (
    <span className={`badge ${variant}`}>
      <span
        style={{
          width: '5px',
          height: '5px',
          borderRadius: '50%',
          backgroundColor: dot,
          display: 'inline-block',
        }}
      />
      <span>{label}</span>
    </span>
  );
};
