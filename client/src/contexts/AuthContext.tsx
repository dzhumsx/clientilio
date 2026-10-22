import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Organization, UserAgencyInvitation } from '../types';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  currentOrg: Organization | null;
  organizations: Organization[];
  pendingInvitations: UserAgencyInvitation[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, companyName?: string, inviteToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentOrg: (org: Organization) => void;
  switchOrganization: (org: Organization) => void;
  createOrganization: (name: string) => Promise<Organization>;
  refreshProfile: () => Promise<void>;
  fetchPendingInvitations: () => Promise<void>;
  acceptUserInvitation: (invitationId: string) => Promise<void>;
  declineUserInvitation: (invitationId: string) => Promise<void>;
  updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [pendingInvitations, setPendingInvitations] = useState<UserAgencyInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentOrg = (org: Organization) => {
    setCurrentOrgState(org);
    localStorage.setItem('currentOrganizationId', org.id);
  };

  const switchOrganization = (org: Organization) => {
    setCurrentOrg(org);
    // Reload window to reset tenant-specific caches and data cleanly
    window.location.reload();
  };

  const createOrganization = async (name: string): Promise<Organization> => {
    const { data } = await api.post('/organizations', { name });
    const newOrg: Organization = {
      id: data.id,
      name: data.name,
      slug: data.slug,
      ownerId: user?.id || '',
      planId: data.planId || 'free',
      role: 'OWNER',
    };
    await refreshProfile();
    setCurrentOrg(newOrg);
    return newOrg;
  };

  const updateUser = (data: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...data } : prev));
  };

  const fetchPendingInvitations = async () => {
    try {
      const { data } = await api.get('/organizations/my-invitations');
      setPendingInvitations(Array.isArray(data) ? data : []);
    } catch {
      // Ignore errors if not authenticated
    }
  };

  const acceptUserInvitation = async (invitationId: string) => {
    try {
      const { data } = await api.post(`/organizations/my-invitations/${invitationId}/accept`);
      toast.success(`Você agora faz parte da agência "${data.organization?.name || 'convidada'}"!`);
      // Remove from pending list
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
      // Refresh user's organizations list
      await refreshProfile();
      // Switch to newly accepted organization
      if (data.organization) {
        setCurrentOrg(data.organization);
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Erro ao aceitar convite.');
      throw err;
    }
  };

  const declineUserInvitation = async (invitationId: string) => {
    try {
      await api.post(`/organizations/my-invitations/${invitationId}/decline`);
      toast.success('Convite recusado com sucesso.');
      setPendingInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Erro ao recusar convite.');
      throw err;
    }
  };

  const refreshProfile = async () => {
    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user || data);

      // Fetch full organization list with computed counts & roles
      let orgs: Organization[] = [];
      try {
        const orgRes = await api.get('/organizations');
        orgs = Array.isArray(orgRes.data) ? orgRes.data : data.organizations || [];
      } catch {
        orgs = data.organizations || [];
      }
      setOrganizations(orgs);

      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const found = orgs.find((o) => o.id === savedOrgId);
      if (found) {
        setCurrentOrgState(found);
      } else if (orgs.length > 0) {
        setCurrentOrgState(orgs[0]);
        localStorage.setItem('currentOrganizationId', orgs[0].id);
      }

      // Check for pending invitations sent to this user
      await fetchPendingInvitations();
    } catch {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      setOrganizations([]);
      setPendingInvitations([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();

    const handleExpired = () => {
      setUser(null);
      setOrganizations([]);
      setPendingInvitations([]);
      setCurrentOrgState(null);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    const accessToken = data.tokens?.accessToken || data.accessToken;
    const refreshToken = data.tokens?.refreshToken || data.refreshToken;
    if (accessToken) localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    setUser(data.user || data);

    const orgs = data.organizations || [];
    setOrganizations(orgs);
    if (orgs.length > 0) {
      setCurrentOrg(orgs[0]);
    }
    // Fetch pending invitations on login
    await fetchPendingInvitations();
  };

  const register = async (name: string, email: string, password: string, companyName?: string, inviteToken?: string) => {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      companyName,
      inviteToken,
    });
    const accessToken = data.tokens?.accessToken || data.accessToken;
    const refreshToken = data.tokens?.refreshToken || data.refreshToken;
    if (accessToken) localStorage.setItem('token', accessToken);
    if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
    setUser(data.user || data);

    const orgs = data.organizations || [];
    setOrganizations(orgs);
    if (orgs.length > 0) {
      setCurrentOrg(orgs[0]);
    }
    await fetchPendingInvitations();
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      await api.post('/auth/logout', { refreshToken: refreshToken || undefined });
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentOrganizationId');
      setUser(null);
      setOrganizations([]);
      setPendingInvitations([]);
      setCurrentOrgState(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg,
        organizations,
        pendingInvitations,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        setCurrentOrg,
        switchOrganization,
        createOrganization,
        refreshProfile,
        fetchPendingInvitations,
        acceptUserInvitation,
        declineUserInvitation,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
