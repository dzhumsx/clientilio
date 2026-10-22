import React, { useState, useEffect, useRef } from 'react';
import {
  User,
  Shield,
  Users,
  Camera,
  Upload,
  Trash2,
  Check,
  KeyRound,
  Eye,
  EyeOff,
  UserPlus,
  Mail,
  Copy,
  AlertCircle,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Crown,
  Phone,
  Briefcase,
  FileText,
  Save,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Crop,
  Building2,
  Plus,
  ArrowRight,
  Bell,
} from 'lucide-react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { AvatarCropperModal } from '../components/AvatarCropperModal';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Role } from '../types';
import toast from 'react-hot-toast';

// Curated avatar presets with modern, clean styling
const AVATAR_PRESETS = [
  'https://api.dicebear.com/7.x/bottts/svg?seed=Felix',
  'https://api.dicebear.com/7.x/notionists/svg?seed=Aneka',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Milo',
];

export const ProfilePage: React.FC = () => {
  const { user, currentOrg, organizations, switchOrganization, createOrganization, updateUser, refreshProfile, pendingInvitations, acceptUserInvitation, declineUserInvitation } = useAuth();
  const [processingInviteId, setProcessingInviteId] = useState<string | null>(null);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const tabParam = searchParams.get('tab');
  const initialTab = tabParam === 'AGENCIES' ? 'AGENCIES' : tabParam === 'SECURITY' ? 'SECURITY' : 'PROFILE';
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'SECURITY' | 'AGENCIES'>(initialTab);

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl || null);
  const [phone, setPhone] = useState(user?.phone || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [customUrlInput, setCustomUrlInput] = useState('');
  const [showUrlModal, setShowUrlModal] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Avatar Cropper Modal State
  const [cropperOpen, setCropperOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);

  // Password Change State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // 2FA / MFA State
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loadingMfaStatus, setLoadingMfaStatus] = useState(true);
  const [showMfaSetupModal, setShowMfaSetupModal] = useState(false);
  const [showMfaDisableModal, setShowMfaDisableModal] = useState(false);
  const [mfaQrCode, setMfaQrCode] = useState<string | null>(null);
  const [mfaSecret, setMfaSecret] = useState<string | null>(null);
  const [mfaVerificationCode, setMfaVerificationCode] = useState('');
  const [mfaDisablePassword, setMfaDisablePassword] = useState('');
  const [isSubmittingMfa, setIsSubmittingMfa] = useState(false);
  const [mfaBackupCodes, setMfaBackupCodes] = useState<string[]>([]);
  const [showBackupCodesModal, setShowBackupCodesModal] = useState(false);

  // Create Agency Modal State
  const [showCreateAgencyModal, setShowCreateAgencyModal] = useState(false);
  const [newAgencyName, setNewAgencyName] = useState('');
  const [isCreatingAgency, setIsCreatingAgency] = useState(false);

  // Sync profile data when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setAvatarUrl(user.avatarUrl || null);
      setPhone(user.phone || '');
      setJobTitle(user.jobTitle || '');
      setBio(user.bio || '');
    }
  }, [user]);

  // Load MFA status on mount
  useEffect(() => {
    const fetchMfaStatus = async () => {
      try {
        const { data } = await api.get('/auth/mfa/status');
        setMfaEnabled(Boolean(data.enabled));
      } catch (e) {
        console.warn('Could not load MFA status:', e);
      } finally {
        setLoadingMfaStatus(false);
      }
    };
    fetchMfaStatus();
  }, []);

  const handleCreateAgency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAgencyName.trim()) {
      toast.error('Informe o nome da nova agência.');
      return;
    }
    setIsCreatingAgency(true);
    try {
      const created = await createOrganization(newAgencyName.trim());
      toast.success(`Agência ${created.name} criada com sucesso!`);
      setShowCreateAgencyModal(false);
      setNewAgencyName('');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Erro ao criar agência.');
    } finally {
      setIsCreatingAgency(false);
    }
  };

  // Profile Image Upload / Processing Handler with Crop Support
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      toast.error('O arquivo é muito grande. O limite máximo é 8MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawDataUrl = event.target?.result as string;
      setImageToCrop(rawDataUrl);
      setCropperOpen(true);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropComplete = (croppedDataUrl: string) => {
    setAvatarUrl(croppedDataUrl);
    toast.success('Foto recortada com sucesso! Clique em "Salvar Alterações" para confirmar.');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('O nome completo não pode ficar vazio.');
      return;
    }

    setIsSavingProfile(true);
    try {
      const payload = {
        name: name.trim(),
        avatarUrl: avatarUrl || null,
      };

      const { data } = await api.put('/auth/profile', payload);

      // Instantly update user in AuthContext to reflect on Sidebar & Navbar
      updateUser({
        name: data.name,
        avatarUrl: data.avatarUrl,
        phone,
        jobTitle,
        bio,
      });

      toast.success('Perfil atualizado com sucesso!');
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      const msg = err.response?.data?.error?.message || 'Erro ao atualizar informações do perfil.';
      toast.error(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleSelectPreset = (url: string) => {
    setAvatarUrl(url);
    toast.success('Avatar selecionado! Não esqueça de salvar as alterações.');
  };

  const handleApplyCustomUrl = () => {
    if (!customUrlInput.trim()) return;
    try {
      new URL(customUrlInput.trim());
      setAvatarUrl(customUrlInput.trim());
      setShowUrlModal(false);
      setCustomUrlInput('');
      toast.success('URL da foto aplicada com sucesso!');
    } catch {
      toast.error('Insira uma URL de imagem válida (começando com https://)');
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    toast.success('Foto de perfil removida. Clique em "Salvar Alterações" para confirmar.');
  };

  // Password Change Handler
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error('Informe sua senha atual.');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('A nova senha deve ter no mínimo 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('A confirmação da nova senha não coincide.');
      return;
    }

    setIsChangingPassword(true);
    try {
      await api.post('/auth/change-password', {
        currentPassword,
        newPassword,
      });
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Failed to change password:', err);
      const msg = err.response?.data?.error?.message || 'Erro ao alterar a senha. Verifique a senha atual informada.';
      toast.error(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  // 2FA Handlers
  const handleStartMfaSetup = async () => {
    setIsSubmittingMfa(true);
    try {
      const { data } = await api.post('/auth/mfa/setup');
      setMfaQrCode(data.qrCode);
      setMfaSecret(data.secret);
      setMfaVerificationCode('');
      setShowMfaSetupModal(true);
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Erro ao iniciar configuração do 2FA.');
    } finally {
      setIsSubmittingMfa(false);
    }
  };

  const handleConfirmEnableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaVerificationCode.length < 6) {
      toast.error('Insira o código de 6 dígitos gerado pelo seu aplicativo autenticador.');
      return;
    }
    setIsSubmittingMfa(true);
    try {
      const { data } = await api.post('/auth/mfa/enable', { code: mfaVerificationCode });
      setMfaEnabled(true);
      setShowMfaSetupModal(false);
      if (data.backupCodes && data.backupCodes.length > 0) {
        setMfaBackupCodes(data.backupCodes);
        setShowBackupCodesModal(true);
      } else {
        toast.success('Autenticação de dois fatores ativada com sucesso!');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Código incorreto. Tente novamente.');
    } finally {
      setIsSubmittingMfa(false);
    }
  };

  const handleConfirmDisableMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mfaDisablePassword) {
      toast.error('Informe sua senha atual para confirmar a desativação do 2FA.');
      return;
    }
    setIsSubmittingMfa(true);
    try {
      await api.post('/auth/mfa/disable', { password: mfaDisablePassword });
      setMfaEnabled(false);
      setShowMfaDisableModal(false);
      setMfaDisablePassword('');
      toast.success('Autenticação de dois fatores desativada com sucesso.');
    } catch (err: any) {
      toast.error(err.response?.data?.error?.message || 'Senha incorreta.');
    } finally {
      setIsSubmittingMfa(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Navbar
        title="Meu Perfil & Minhas Agências"
        subtitle="Gerencie suas informações pessoais, credenciais de acesso e todas as agências às quais você pertence"
      />

      <div style={{ flex: 1, padding: '2rem', maxWidth: '1100px', margin: '0 auto', width: '100%' }}>
        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            borderBottom: '1px solid var(--border-hairline)',
            paddingBottom: '0.75rem',
            marginBottom: '2rem',
          }}
        >
          <button
            onClick={() => setActiveTab('PROFILE')}
            className="btn btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: activeTab === 'PROFILE' ? 600 : 450,
              color: activeTab === 'PROFILE' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'PROFILE' ? 'var(--accent-subtle)' : 'transparent',
              border: activeTab === 'PROFILE' ? '1px solid var(--accent-border)' : '1px solid transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <User size={15} />
            <span>Meu Perfil</span>
          </button>

          <button
            onClick={() => setActiveTab('SECURITY')}
            className="btn btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: activeTab === 'SECURITY' ? 600 : 450,
              color: activeTab === 'SECURITY' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'SECURITY' ? 'var(--accent-subtle)' : 'transparent',
              border: activeTab === 'SECURITY' ? '1px solid var(--accent-border)' : '1px solid transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Shield size={15} />
            <span>Segurança & Senha</span>
            {mfaEnabled && (
              <span
                style={{
                  fontSize: '9px',
                  background: 'var(--color-success)',
                  color: '#ffffff',
                  padding: '1px 6px',
                  borderRadius: '10px',
                  fontWeight: 600,
                  marginLeft: '2px',
                }}
              >
                2FA ATIVO
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('AGENCIES')}
            className="btn btn-ghost"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              padding: '0.5rem 1rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '13px',
              fontWeight: activeTab === 'AGENCIES' ? 600 : 450,
              color: activeTab === 'AGENCIES' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              backgroundColor: activeTab === 'AGENCIES' ? 'var(--accent-subtle)' : 'transparent',
              border: activeTab === 'AGENCIES' ? '1px solid var(--accent-border)' : '1px solid transparent',
              transition: 'all var(--transition-fast)',
            }}
          >
            <Building2 size={15} />
            <span>Minhas Agências</span>
            <span
              style={{
                fontSize: '10px',
                background: 'var(--bg-muted)',
                color: 'var(--text-secondary)',
                padding: '1px 6px',
                borderRadius: '10px',
                fontWeight: 600,
              }}
            >
              {organizations.length}
            </span>
          </button>
        </div>

        {/* =========================================================================
            TAB 1: MEU PERFIL (FOTO, NOME, INFORMAÇÕES PESSOAIS)
           ========================================================================= */}
        {activeTab === 'PROFILE' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Top Card: Profile Photo & Visual Identity */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Foto de Perfil & Identidade
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
                    Esta foto será exibida na barra lateral, no cabeçalho e visível para os outros membros da agência.
                  </p>
                </div>
                <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                  FORMATO PNG, JPG OU WEBP
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2rem',
                  padding: '1.25rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  flexWrap: 'wrap',
                }}
              >
                {/* Avatar Display with Glow */}
                <div style={{ position: 'relative' }}>
                  <div
                    style={{
                      width: '96px',
                      height: '96px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: 'var(--bg-inverted)',
                      color: 'var(--text-inverted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      fontWeight: 600,
                      border: '3px solid var(--bg-card)',
                      boxShadow: 'var(--accent-glow)',
                    }}
                  >
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={() => setAvatarUrl(null)}
                      />
                    ) : (
                      <span>{name ? name.charAt(0).toUpperCase() : 'U'}</span>
                    )}
                  </div>

                  {/* Camera icon badge */}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      position: 'absolute',
                      bottom: '2px',
                      right: '2px',
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-primary)',
                      color: '#ffffff',
                      border: '2px solid var(--bg-card)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      boxShadow: 'var(--shadow-dropdown)',
                    }}
                    title="Carregar nova foto"
                  >
                    <Camera size={14} />
                  </button>
                </div>

                {/* Photo Actions */}
                <div style={{ flex: 1, minWidth: '240px' }}>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />

                  <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="btn btn-primary btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                    >
                      <Upload size={14} />
                      <span>Carregar do Computador</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlModal(true)}
                      className="btn btn-ghost btn-sm"
                      style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}
                    >
                      <ExternalLink size={14} />
                      <span>Inserir URL</span>
                    </button>

                    {avatarUrl && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setImageToCrop(avatarUrl);
                            setCropperOpen(true);
                          }}
                          className="btn btn-ghost btn-sm"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            color: 'var(--accent-primary)',
                          }}
                          title="Ajustar enquadramento e corte da foto"
                        >
                          <Crop size={14} />
                          <span>Recortar Foto</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="btn btn-ghost btn-sm"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.45rem',
                            color: 'var(--color-danger)',
                          }}
                        >
                          <Trash2 size={14} />
                          <span>Remover Foto</span>
                        </button>
                      </>
                    )}
                  </div>

                  <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
                    Recomendado: Imagem quadrada com no mínimo 300x300 pixels. Máximo 5MB.
                  </p>
                </div>
              </div>

              {/* Avatar Presets Selection */}
              <div style={{ marginTop: '1.5rem' }}>
                <span className="eyebrow" style={{ fontSize: '10px', display: 'block', marginBottom: '0.65rem' }}>
                  OU ESCOLHA UM AVATAR ESTILIZADO:
                </span>
                <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
                  {AVATAR_PRESETS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        overflow: 'hidden',
                        padding: 0,
                        border: avatarUrl === preset ? '2px solid var(--accent-primary)' : '2px solid var(--border-subtle)',
                        cursor: 'pointer',
                        transition: 'transform var(--transition-fast)',
                        boxShadow: avatarUrl === preset ? '0 0 10px var(--accent-primary)' : 'none',
                        transform: avatarUrl === preset ? 'scale(1.1)' : 'scale(1)',
                        backgroundColor: 'var(--bg-canvas)',
                      }}
                      title={`Avatar de demonstração ${idx + 1}`}
                    >
                      <img src={preset} alt={`Preset ${idx}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Bottom Card: Personal Details Form */}
            <form
              onSubmit={handleSaveProfile}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                <div>
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Informações Pessoais
                  </h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
                    Atualize seus dados cadastrais e função dentro da plataforma.
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      background: 'var(--color-success-bg)',
                      color: 'var(--color-success)',
                      border: '1px solid var(--accent-border)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontWeight: 500,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    <CheckCircle2 size={12} />
                    CONTA ATIVA
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
                {/* Nome Completo */}
                <div>
                  <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <User size={13} style={{ color: 'var(--accent-primary)' }} />
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="input"
                    placeholder="Seu nome completo"
                  />
                </div>

                {/* E-mail (Read-only with badge) */}
                <div>
                  <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Mail size={13} style={{ color: 'var(--accent-primary)' }} />
                    Endereço de E-mail
                  </label>
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="input"
                    style={{
                      backgroundColor: 'var(--bg-subtle)',
                      cursor: 'not-allowed',
                      color: 'var(--text-secondary)',
                    }}
                    title="O e-mail de acesso é fixo para manter a integridade dos acessos"
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                    Vinculado ao ID da conta e às sessões ativas.
                  </span>
                </div>

                {/* Cargo / Título Profissional */}
                <div>
                  <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Briefcase size={13} style={{ color: 'var(--accent-primary)' }} />
                    Cargo / Especialidade
                  </label>
                  <input
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    className="input"
                    placeholder="Ex: Diretor de Arte, Tech Lead, Gestor de Tráfego"
                  />
                </div>

                {/* Telefone / WhatsApp */}
                <div>
                  <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <Phone size={13} style={{ color: 'var(--accent-primary)' }} />
                    Telefone / WhatsApp
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="input"
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>

              {/* Biografia / Sobre mim */}
              <div style={{ marginTop: '1.25rem' }}>
                <label className="label" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <FileText size={13} style={{ color: 'var(--accent-primary)' }} />
                  Sobre mim / Biografia
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  className="input"
                  rows={3}
                  placeholder="Escreva brevemente sobre suas responsabilidades, especialidades e projetos..."
                  style={{ resize: 'vertical' }}
                />
              </div>

              {/* Organização Atual Info */}
              <div
                style={{
                  marginTop: '1.5rem',
                  padding: '1rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-hairline)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                }}
              >
                <div>
                  <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Organização Atual: {currentOrg?.name || 'Agência'}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: 'var(--text-tertiary)' }}>
                    Sua função registrada nesta organização: <strong>{currentOrg?.role || 'MEMBRO'}</strong>
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span className="badge badge-neutral" style={{ fontSize: '11px' }}>
                    PLANO: {currentOrg?.planId?.toUpperCase() || 'AGENCY'}
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div
                style={{
                  marginTop: '1.75rem',
                  paddingTop: '1.25rem',
                  borderTop: '1px solid var(--border-hairline)',
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '0.75rem',
                }}
              >
                <button
                  type="submit"
                  disabled={isSavingProfile}
                  className="btn btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '150px' }}
                >
                  <Save size={15} />
                  <span>{isSavingProfile ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* =========================================================================
            TAB 2: SEGURANÇA & SENHA (ALTERAÇÃO DE SENHA, 2FA/MFA)
           ========================================================================= */}
        {activeTab === 'SECURITY' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            {/* Password Change Card */}
            <form
              onSubmit={handleChangePassword}
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Alterar Senha de Acesso
                </h2>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
                  Recomendamos a utilização de uma senha forte contendo letras maiúsculas, minúsculas e números.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', maxWidth: '480px' }}>
                {/* Current Password */}
                <div>
                  <label className="label">Senha Atual *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      required
                      className="input"
                      placeholder="••••••••••••"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                      }}
                    >
                      {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label className="label">Nova Senha * (mínimo 8 caracteres)</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
                      className="input"
                      placeholder="••••••••••••"
                      style={{ paddingRight: '2.5rem' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      style={{
                        position: 'absolute',
                        right: '0.75rem',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                      }}
                    >
                      {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {/* Password rules hints */}
                  {newPassword && (
                    <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          fontSize: '11px',
                          color: newPassword.length >= 8 ? 'var(--color-success)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Check size={12} /> 8+ caracteres
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: /[A-Z]/.test(newPassword) ? 'var(--color-success)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Check size={12} /> Letra maiúscula
                      </span>
                      <span
                        style={{
                          fontSize: '11px',
                          color: /[0-9]/.test(newPassword) ? 'var(--color-success)' : 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <Check size={12} /> Número
                      </span>
                    </div>
                  )}
                </div>

                {/* Confirm New Password */}
                <div>
                  <label className="label">Confirmar Nova Senha *</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="input"
                    placeholder="••••••••••••"
                  />
                  {confirmPassword && newPassword !== confirmPassword && (
                    <span style={{ fontSize: '11px', color: 'var(--color-danger)', marginTop: '4px', display: 'block' }}>
                      As senhas não coincidem.
                    </span>
                  )}
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isChangingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                    className="btn btn-primary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '160px' }}
                  >
                    <KeyRound size={15} />
                    <span>{isChangingPassword ? 'Atualizando...' : 'Atualizar Senha'}</span>
                  </button>
                </div>
              </div>
            </form>

            {/* Two-Factor Authentication (2FA / MFA) Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '8px',
                      backgroundColor: mfaEnabled ? 'var(--color-success-bg)' : 'var(--bg-subtle)',
                      color: mfaEnabled ? 'var(--color-success)' : 'var(--text-tertiary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <ShieldCheck size={22} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                      Autenticação de Dois Fatores (2FA / TOTP)
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0.25rem 0 0' }}>
                      Adicione uma camada extra de segurança utilizando Google Authenticator, Authy ou 1Password.
                    </p>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: '11px',
                    padding: '3px 10px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    backgroundColor: mfaEnabled ? 'var(--color-success-bg)' : 'var(--bg-muted)',
                    color: mfaEnabled ? 'var(--color-success)' : 'var(--text-secondary)',
                    border: `1px solid ${mfaEnabled ? 'var(--accent-border)' : 'var(--border-hairline)'}`,
                  }}
                >
                  {mfaEnabled ? 'ATIVADO E PROTEGIDO' : 'DESATIVADO'}
                </span>
              </div>

              <div
                style={{
                  padding: '1rem 1.25rem',
                  backgroundColor: 'var(--bg-subtle)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  marginBottom: '1.25rem',
                }}
              >
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {mfaEnabled
                    ? 'Sua conta está protegida com autenticação de dois fatores. Em novos logins, será exigido o código temporário de 6 dígitos gerado pelo seu aplicativo autenticador.'
                    : 'A autenticação em duas etapas impede que terceiros acessem sua conta mesmo que descubram sua senha.'}
                </p>
              </div>

              <div>
                {mfaEnabled ? (
                  <button
                    type="button"
                    onClick={() => setShowMfaDisableModal(true)}
                    className="btn btn-ghost"
                    style={{
                      color: 'var(--color-danger)',
                      borderColor: 'var(--color-danger)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                    }}
                  >
                    <Shield size={15} />
                    <span>Desativar Autenticação de Dois Fatores</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStartMfaSetup}
                    disabled={isSubmittingMfa}
                    className="btn btn-primary"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
                  >
                    <QrCode size={15} />
                    <span>{isSubmittingMfa ? 'Iniciando...' : 'Configurar 2FA com QR Code'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Session Security Details */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.75rem',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Sessão & Dispositivos Conectados
              </h2>
              <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0.25rem 0 1.25rem' }}>
                Tokens de acesso utilizam padrão de alta segurança JWT criptografado com rotação automática.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)' }}>
                  <span className="eyebrow" style={{ fontSize: '10px' }}>VALIDADE DA SESSÃO</span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    7 Dias (Refresh Token Seguro)
                  </p>
                </div>

                <div style={{ padding: '0.85rem', backgroundColor: 'var(--bg-subtle)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-hairline)' }}>
                  <span className="eyebrow" style={{ fontSize: '10px' }}>STATUS DE CONSENTIMENTO</span>
                  <p style={{ margin: '0.25rem 0 0', fontSize: '13px', fontWeight: 600, color: 'var(--color-success)' }}>
                    Protegido (LGPD / GDPR)
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 3: MINHAS AGÊNCIAS & EMPRESAS
           ========================================================================= */}
        {activeTab === 'AGENCIES' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {/* Header Card */}
            <div
              style={{
                backgroundColor: 'var(--bg-card)',
                border: '1px solid var(--border-hairline)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.5rem',
                boxShadow: 'var(--shadow-card)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={20} style={{ color: 'var(--accent-primary)' }} />
                  <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Minhas Agências & Workspaces ({organizations.length})
                  </h2>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: '0.35rem 0 0' }}>
                  Sua conta de usuário ({user?.email}) pode gerenciar ou fazer parte de múltiplas agências. A equipe de colaboradores é vinculada exclusivamente a cada agência.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowCreateAgencyModal(true)}
                className="btn btn-primary"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.6rem 1.1rem',
                  fontSize: '13px',
                  fontWeight: 600,
                  borderRadius: 'var(--radius-button)',
                }}
              >
                <Plus size={16} />
                <span>Nova Agência</span>
              </button>
            </div>

            {/* Architecture Explanation Banner */}
            <div
              style={{
                backgroundColor: 'rgba(99, 102, 241, 0.05)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem 1.25rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <Sparkles size={18} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                <strong style={{ color: 'var(--text-primary)' }}>Como funciona a sua conta:</strong>{' '}
                Seus dados pessoais e credenciais de login pertencem ao seu <em>Usuário</em>. Cada <em>Agência</em> possui seu próprio banco de clientes, projetos, faturamento e sua <strong>Equipe de Membros</strong> dedicada. Para gerenciar a equipe de uma agência, selecione-a e acesse a aba Equipe.
              </div>
            </div>

            {/* Pending Invitations Section */}
            {pendingInvitations.length > 0 && (
              <div
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid rgba(99, 102, 241, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '1.25rem 1.5rem',
                  boxShadow: 'var(--shadow-card)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                  <Bell size={18} style={{ color: 'var(--accent-primary)' }} />
                  <h3 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                    Convites Pendentes para Você ({pendingInvitations.length})
                  </h3>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {pendingInvitations.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        padding: '1rem',
                        backgroundColor: 'var(--bg-subtle)',
                        border: '1px solid var(--border-hairline)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <div
                          style={{
                            width: '38px',
                            height: '38px',
                            borderRadius: '8px',
                            backgroundColor: 'var(--accent-subtle)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '14px',
                          }}
                        >
                          <Building2 size={18} />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {inv.organization.name}
                            </span>
                            <span
                              style={{
                                fontSize: '10px',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                backgroundColor: inv.role === 'ADMIN' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-muted)',
                                color: inv.role === 'ADMIN' ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                fontWeight: 600,
                              }}
                            >
                              {inv.role === 'ADMIN' ? 'Administrador' : 'Membro'}
                            </span>
                          </div>
                          <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-tertiary)' }}>
                            Convidado por <strong>{inv.createdBy.name || 'Admin'}</strong> • Expira em {new Date(inv.expiresAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => declineUserInvitation(inv.id)}
                          disabled={processingInviteId === inv.id}
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: '12px', color: 'var(--color-danger)' }}
                        >
                          Recusar
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            setProcessingInviteId(inv.id);
                            try {
                              await acceptUserInvitation(inv.id);
                            } finally {
                              setProcessingInviteId(null);
                            }
                          }}
                          disabled={processingInviteId === inv.id}
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        >
                          <Check size={14} />
                          <span>{processingInviteId === inv.id ? 'Ingressando...' : 'Aceitar e Entrar'}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agencies Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '1.25rem',
              }}
            >
              {organizations.map((org) => {
                const isCurrent = currentOrg?.id === org.id;
                const role = org.role || (isCurrent ? currentOrg?.role : 'MEMBER');
                const isOwner = role === 'OWNER';
                const isAdmin = role === 'ADMIN';

                return (
                  <div
                    key={org.id}
                    style={{
                      backgroundColor: 'var(--bg-card)',
                      border: isCurrent
                        ? '2px solid var(--accent-primary)'
                        : '1px solid var(--border-hairline)',
                      borderRadius: 'var(--radius-lg)',
                      padding: '1.5rem',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      position: 'relative',
                      boxShadow: isCurrent
                        ? '0 0 0 1px var(--accent-primary), var(--shadow-card)'
                        : 'var(--shadow-card)',
                      transition: 'all var(--transition-fast)',
                    }}
                  >
                    <div>
                      {/* Top Badges */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          marginBottom: '1rem',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '3px 8px',
                            borderRadius: '12px',
                            backgroundColor: isOwner
                              ? 'rgba(234, 179, 8, 0.12)'
                              : isAdmin
                              ? 'rgba(99, 102, 241, 0.12)'
                              : 'var(--bg-muted)',
                            color: isOwner
                              ? '#eab308'
                              : isAdmin
                              ? 'var(--accent-primary)'
                              : 'var(--text-secondary)',
                            border: `1px solid ${
                              isOwner
                                ? 'rgba(234, 179, 8, 0.3)'
                                : isAdmin
                                ? 'rgba(99, 102, 241, 0.3)'
                                : 'var(--border-hairline)'
                            }`,
                          }}
                        >
                          {isOwner && <Crown size={12} />}
                          {isAdmin && <Shield size={12} />}
                          {!isOwner && !isAdmin && <User size={12} />}
                          {isOwner ? 'Proprietário' : isAdmin ? 'Administrador' : 'Membro'}
                        </span>

                        {isCurrent && (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '11px',
                              fontWeight: 700,
                              color: 'var(--color-success)',
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              border: '1px solid rgba(34, 197, 94, 0.25)',
                              padding: '2px 8px',
                              borderRadius: '12px',
                              letterSpacing: '0.02em',
                            }}
                          >
                            <span
                              style={{
                                width: '6px',
                                height: '6px',
                                borderRadius: '50%',
                                backgroundColor: 'var(--color-success)',
                              }}
                            />
                            EM USO
                          </span>
                        )}
                      </div>

                      {/* Agency Name & Avatar */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', marginBottom: '1.25rem' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '10px',
                            backgroundColor: isCurrent ? 'var(--accent-subtle)' : 'var(--bg-muted)',
                            border: `1px solid ${isCurrent ? 'var(--accent-border)' : 'var(--border-hairline)'}`,
                            color: isCurrent ? 'var(--accent-primary)' : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '16px',
                            fontWeight: 700,
                          }}
                        >
                          {org.name ? org.name.substring(0, 2).toUpperCase() : 'AG'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <h3
                            style={{
                              fontSize: '16px',
                              fontWeight: 600,
                              color: 'var(--text-primary)',
                              margin: 0,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {org.name}
                          </h3>
                          <p
                            style={{
                              fontSize: '12px',
                              color: 'var(--text-tertiary)',
                              margin: '2px 0 0',
                              fontFamily: 'monospace',
                            }}
                          >
                            @{org.slug || 'agencia'}
                          </p>
                        </div>
                      </div>

                      {/* Agency Stats */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr 1fr',
                          gap: '0.5rem',
                          backgroundColor: 'var(--bg-muted)',
                          padding: '0.75rem',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: '1.25rem',
                          textAlign: 'center',
                        }}
                      >
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {org.memberCount ?? 1}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            Equipe
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {org.clientCount ?? 0}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            Clientes
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {org.projectCount ?? 0}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
                            Projetos
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Agency Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px solid var(--border-hairline)', paddingTop: '1rem' }}>
                      {isCurrent ? (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            type="button"
                            onClick={() => navigate('/dashboard/team')}
                            className="btn btn-ghost btn-sm"
                            style={{
                              flex: 1,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              fontSize: '12px',
                            }}
                          >
                            <Users size={14} />
                            <span>Ver Equipe</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => navigate('/dashboard/billing')}
                            className="btn btn-ghost btn-sm"
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: '0.35rem',
                              fontSize: '12px',
                            }}
                            title="Plano e Faturamento"
                          >
                            <span>Plano</span>
                            <ArrowRight size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => switchOrganization(org)}
                          className="btn btn-primary btn-sm"
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            fontWeight: 600,
                            fontSize: '12px',
                          }}
                        >
                          <Building2 size={14} />
                          <span>Acessar esta Agência</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Create New Agency Card Button */}
              <button
                type="button"
                onClick={() => setShowCreateAgencyModal(true)}
                style={{
                  minHeight: '230px',
                  backgroundColor: 'transparent',
                  border: '2px dashed var(--border-hairline)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '2rem',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.75rem',
                  cursor: 'pointer',
                  color: 'var(--text-tertiary)',
                  transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-primary)';
                  e.currentTarget.style.color = 'var(--accent-primary)';
                  e.currentTarget.style.backgroundColor = 'var(--accent-subtle)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-hairline)';
                  e.currentTarget.style.color = 'var(--text-tertiary)';
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--bg-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Plus size={20} />
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '14px', fontWeight: 600 }}>Criar Nova Agência</div>
                  <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '2px' }}>
                    Cadastrar um novo workspace separado
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =========================================================================
          MODALS
         ========================================================================= */}

      {/* 1. Inserir URL Direta da Foto Modal */}
      <Modal isOpen={showUrlModal} onClose={() => setShowUrlModal(false)} title="Inserir URL da Imagem">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Cole o link direto da sua foto de perfil (ex: Unsplash, Gravatar, GitHub, CDN).
          </p>
          <input
            type="url"
            value={customUrlInput}
            onChange={(e) => setCustomUrlInput(e.target.value)}
            placeholder="https://exemplo.com/minha-foto.jpg"
            className="input"
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setShowUrlModal(false)} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
            <button type="button" onClick={handleApplyCustomUrl} className="btn btn-primary btn-sm">
              Aplicar Foto
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. Configurar 2FA (QR Code) Modal */}
      <Modal isOpen={showMfaSetupModal} onClose={() => setShowMfaSetupModal(false)} title="Configurar Autenticação de Dois Fatores">
        <form onSubmit={handleConfirmEnableMfa} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            1. Abra seu aplicativo autenticador (Google Authenticator, 1Password ou Authy) e escaneie o QR Code abaixo:
          </p>

          {mfaQrCode && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '1rem', backgroundColor: '#ffffff', borderRadius: '8px', width: 'fit-content', margin: '0 auto' }}>
              <img src={mfaQrCode} alt="QR Code 2FA" style={{ width: '180px', height: '180px' }} />
            </div>
          )}

          {mfaSecret && (
            <div style={{ backgroundColor: 'var(--bg-subtle)', padding: '0.75rem', borderRadius: '6px', textAlign: 'center' }}>
              <span className="eyebrow" style={{ fontSize: '9px' }}>CHAVE SECRETA MANUAL:</span>
              <p style={{ margin: '4px 0 0', fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                {mfaSecret}
              </p>
            </div>
          )}

          <div>
            <label className="label">2. Insira o código de 6 dígitos gerado:</label>
            <input
              type="text"
              maxLength={6}
              value={mfaVerificationCode}
              onChange={(e) => setMfaVerificationCode(e.target.value.replace(/\D/g, ''))}
              placeholder="000000"
              required
              className="input"
              style={{ textAlign: 'center', fontSize: '20px', letterSpacing: '6px', fontWeight: 600 }}
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" onClick={() => setShowMfaSetupModal(false)} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmittingMfa || mfaVerificationCode.length < 6} className="btn btn-primary btn-sm">
              {isSubmittingMfa ? 'Verificando...' : 'Ativar 2FA'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 3. Desativar 2FA Modal */}
      <Modal isOpen={showMfaDisableModal} onClose={() => setShowMfaDisableModal(false)} title="Desativar Autenticação de Dois Fatores">
        <form onSubmit={handleConfirmDisableMfa} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Para sua segurança, informe sua senha atual para confirmar a desativação do 2FA.
          </p>
          <input
            type="password"
            value={mfaDisablePassword}
            onChange={(e) => setMfaDisablePassword(e.target.value)}
            placeholder="Sua senha atual"
            required
            className="input"
            autoFocus
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button type="button" onClick={() => setShowMfaDisableModal(false)} className="btn btn-ghost btn-sm">
              Cancelar
            </button>
            <button type="submit" disabled={isSubmittingMfa || !mfaDisablePassword} className="btn btn-sm" style={{ backgroundColor: 'var(--color-danger)', color: '#ffffff', border: 'none' }}>
              {isSubmittingMfa ? 'Desativando...' : 'Confirmar Desativação'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 4. Backup Codes Modal */}
      <Modal isOpen={showBackupCodesModal} onClose={() => setShowBackupCodesModal(false)} title="Códigos de Backup 2FA">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Guarde estes códigos de backup em um local seguro. Caso perca acesso ao seu autenticador, você poderá usá-los para entrar.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', padding: '1rem', backgroundColor: 'var(--bg-subtle)', borderRadius: '6px' }}>
            {mfaBackupCodes.map((c, i) => (
              <span key={i} style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: 600 }}>{c}</span>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowBackupCodesModal(false)} className="btn btn-primary btn-sm">
              Entendido, Guardei os Códigos
            </button>
          </div>
        </div>
      </Modal>

      {/* 5. Criar Nova Agência Modal */}
      <Modal
        isOpen={showCreateAgencyModal}
        onClose={() => setShowCreateAgencyModal(false)}
        title="Criar Nova Agência"
      >
        <form onSubmit={handleCreateAgency} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <p style={{ margin: 0, fontSize: '13px', color: 'var(--text-secondary)' }}>
            Dê um nome à sua nova agência. Um novo espaço de trabalho com equipe, clientes e faturamento próprios será criado para o seu usuário.
          </p>

          <div>
            <label className="label">Nome da Agência *</label>
            <input
              type="text"
              value={newAgencyName}
              onChange={(e) => setNewAgencyName(e.target.value)}
              placeholder="Ex: Minha Nova Agência Criativa"
              required
              className="input"
              autoFocus
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setShowCreateAgencyModal(false)}
              className="btn btn-ghost btn-sm"
              disabled={isCreatingAgency}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isCreatingAgency || !newAgencyName.trim()}
              className="btn btn-primary btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Building2 size={14} />
              <span>{isCreatingAgency ? 'Criando...' : 'Criar e Acessar Agência'}</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* 8. Modal de Recorte Interativo de Foto de Perfil */}
      <AvatarCropperModal
        isOpen={cropperOpen}
        imageSrc={imageToCrop}
        onClose={() => setCropperOpen(false)}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};
export default ProfilePage;
