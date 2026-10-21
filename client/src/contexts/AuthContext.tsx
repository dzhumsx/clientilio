import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';
import { User, Organization } from '../types';

interface AuthContextType {
  user: User | null;
  currentOrg: Organization | null;
  organizations: Organization[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, companyName?: string) => Promise<void>;
  logout: () => Promise<void>;
  setCurrentOrg: (org: Organization) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrgState] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const setCurrentOrg = (org: Organization) => {
    setCurrentOrgState(org);
    localStorage.setItem('currentOrganizationId', org.id);
  };

  const refreshProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setOrganizations([]);
      setCurrentOrgState(null);
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.get('/auth/me');
      setUser(data.user);
      const orgs: Organization[] = data.organizations || [];
      setOrganizations(orgs);

      const savedOrgId = localStorage.getItem('currentOrganizationId');
      const found = orgs.find((o) => o.id === savedOrgId);
      if (found) {
        setCurrentOrgState(found);
      } else if (orgs.length > 0) {
        setCurrentOrgState(orgs[0]);
        localStorage.setItem('currentOrganizationId', orgs[0].id);
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refreshProfile();

    const handleExpired = () => {
      setUser(null);
      setOrganizations([]);
      setCurrentOrgState(null);
    };

    window.addEventListener('auth:expired', handleExpired);
    return () => window.removeEventListener('auth:expired', handleExpired);
  }, []);

  const login = async (email: string, password: string) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('token', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    setUser(data.user);

    const orgs = data.organizations || [];
    setOrganizations(orgs);
    if (orgs.length > 0) {
      setCurrentOrg(orgs[0]);
    }
  };

  const register = async (name: string, email: string, password: string, companyName?: string) => {
    const { data } = await api.post('/auth/register', {
      name,
      email,
      password,
      companyName,
    });
    localStorage.setItem('token', data.tokens.accessToken);
    localStorage.setItem('refreshToken', data.tokens.refreshToken);
    setUser(data.user);

    const orgs = data.organizations || [];
    setOrganizations(orgs);
    if (orgs.length > 0) {
      setCurrentOrg(orgs[0]);
    }
  };

  const logout = async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('currentOrganizationId');
      setUser(null);
      setOrganizations([]);
      setCurrentOrgState(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        currentOrg,
        organizations,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        setCurrentOrg,
        refreshProfile,
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
