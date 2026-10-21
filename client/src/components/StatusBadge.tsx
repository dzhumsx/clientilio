import React from 'react';

interface StatusBadgeProps {
  status: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  switch (status) {
    case 'ACTIVE':
      return <span className="badge badge-success">Ativo</span>;
    case 'ARCHIVED':
      return <span className="badge badge-neutral">Arquivado</span>;
    case 'PLANNING':
      return <span className="badge badge-info">Planejamento</span>;
    case 'IN_PROGRESS':
      return <span className="badge badge-warning">Em Andamento</span>;
    case 'REVIEW':
      return <span className="badge badge-warning">Em Revisão</span>;
    case 'COMPLETED':
      return <span className="badge badge-success">Concluído</span>;
    case 'ON_HOLD':
      return <span className="badge badge-neutral">Pausado</span>;
    case 'DRAFT':
      return <span className="badge badge-neutral">Rascunho</span>;
    case 'READY_FOR_REVIEW':
      return <span className="badge badge-warning">Aguardando Avaliação</span>;
    case 'IN_REVIEW':
      return <span className="badge badge-info">Em Análise</span>;
    case 'CHANGES_REQUESTED':
      return <span className="badge badge-danger">Ajustes Solicitados</span>;
    case 'APPROVED':
      return <span className="badge badge-success">Aprovado</span>;
    case 'TODO':
      return <span className="badge badge-neutral">A Fazer</span>;
    case 'DONE':
      return <span className="badge badge-success">Feito</span>;
    default:
      return <span className="badge badge-neutral">{status}</span>;
  }
};
