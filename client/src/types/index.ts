export type Role = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  planId: string;
  role?: Role;
  isClientUser?: boolean;
}

export interface Client {
  id: string;
  organizationId: string;
  name: string;
  email?: string;
  company?: string;
  notes?: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  _count?: {
    projects: number;
  };
}

export interface Project {
  id: string;
  organizationId: string;
  clientId: string;
  client?: Client;
  name: string;
  description?: string;
  category?: string;
  startDate?: string;
  targetEndDate?: string;
  budget?: number;
  status: 'PLANNING' | 'IN_PROGRESS' | 'REVIEW' | 'COMPLETED' | 'ON_HOLD' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  _count?: {
    deliverables: number;
    tasks: number;
  };
}

export interface Task {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description?: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  status: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DeliverableVersion {
  id: string;
  versionNumber: number;
  fileId?: string;
  externalUrl?: string;
  title?: string;
  notes?: string;
  createdAt: string;
}

export interface Approval {
  id: string;
  deliverableId: string;
  versionId: string;
  actorId: string;
  decision: 'APPROVED' | 'CHANGES_REQUESTED';
  comment?: string;
  createdAt: string;
  actor?: {
    name: string;
    email: string;
  };
}

export interface Deliverable {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'READY_FOR_REVIEW' | 'IN_REVIEW' | 'CHANGES_REQUESTED' | 'APPROVED' | 'ARCHIVED';
  clientVisible: boolean;
  currentVersionNumber: number;
  project?: {
    id: string;
    name: string;
  };
  versions?: DeliverableVersion[];
  approvals?: Approval[];
  createdAt: string;
  updatedAt: string;
}

export interface PlanLimits {
  maxActiveClients: number;
  maxActiveProjects: number;
  maxTeamMembers: number;
  whiteLabel: boolean;
  customDomain: boolean;
}

export interface SubscriptionInfo {
  organizationId: string;
  planId: 'free' | 'pro' | 'business' | 'agency';
  planName: string;
  planPrice: number;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodEnd?: string | null;
  limits: PlanLimits;
  usage: {
    clients: number;
    projects: number;
    teamMembers: number;
  };
  availablePlans: Array<{
    id: string;
    name: string;
    priceBRL: number;
    priceUsd: number;
    limits: PlanLimits;
  }>;
}

export interface TeamMember {
  id: string;
  userId: string;
  name: string;
  email: string;
  avatarUrl?: string;
  role: Role;
  joinedAt: string;
}

export interface Invitation {
  id: string;
  email: string;
  role: Role;
  type: 'TEAM_MEMBER' | 'CLIENT';
  expiresAt: string;
  createdAt: string;
  createdBy?: {
    id: string;
    name: string;
    email: string;
  };
  token?: string;
}

