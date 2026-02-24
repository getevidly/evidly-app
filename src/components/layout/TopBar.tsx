import { useState, useMemo } from 'react';
import { ChevronDown, MapPin, User, Users, Lock, Eye, EyeOff, Globe, Search, Settings, HelpCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProfileModal } from '../ProfileModal';
import { NotificationCenter } from '../NotificationCenter';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';
import { useTranslation } from '../../contexts/LanguageContext';
import { SUPPORTED_LOCALES, LOCALE_META, type Locale } from '../../lib/i18n';
import { DEMO_ROLES, checkTestMode } from '../../config/sidebarConfig';
import { usePermission } from '../../hooks/usePermission';

interface LocationOption {
  id: string;
  name: string;
}

interface TopBarProps {
  title: string;
  locations?: LocationOption[];
  selectedLocation?: string | null;
  onLocationChange?: (locationId: string | null) => void;
  demoMode?: boolean;
}

export function TopBar({ title, locations, selectedLocation, onLocationChange, demoMode = false }: TopBarProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [pwForm, setPwForm] = useState({ current: '', newPw: '', confirm: '' });
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const { userRole, setUserRole } = useRole();
  const { isDemoMode, companyName, userName } = useDemo();
  const { t, locale, setLocale } = useTranslation();

  const isTestMode = useMemo(() => checkTestMode(), []);
  const showRoleSwitcher = isDemoMode || isTestMode;
  const canAccessSettings = usePermission('settings_access');
  const canAccessHelp = usePermission('help_access');

  const roleLabels: Record<string, string> = {
    platform_admin: t('topBar.platformAdmin') !== 'topBar.platformAdmin' ? t('topBar.platformAdmin') : 'Platform Admin',
    owner_operator: t('topBar.ownerOperator'),
    executive: t('topBar.executiveView'),
    compliance_manager: t('topBar.complianceManager'),
    chef: t('topBar.chef'),
    facilities_manager: t('topBar.facilitiesManager'),
    kitchen_manager: t('topBar.kitchenManager'),
    kitchen_staff: t('topBar.kitchenStaff'),
  };

  const demoRoleNames: Record<string, string> = {
    platform_admin: 'Arthur Samuels',
    owner_operator: 'James Wilson',
    executive: 'David Chen',
    compliance_manager: 'Sarah Kim',
    chef: 'Maria Santos',
    facilities_manager: 'Robert Okafor',
    kitchen_manager: 'Carlos Rivera',
    kitchen_staff: 'Miguel Torres',
  };

  const displayName = isDemoMode ? (demoRoleNames[userRole] || userName) : (profile?.full_name || t('topBar.user'));

  const handleChangePassword = () => {
    setPwError('');
    setPwSuccess('');
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      setPwError(t('topBar.allFieldsRequired'));
      return;
    }
    if (pwForm.newPw.length < 8) {
      setPwError(t('topBar.passwordMinLength'));
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError(t('topBar.passwordsDoNotMatch'));
      return;
    }
    if (isDemoMode) {
      setPwSuccess(t('topBar.passwordLiveOnly'));
      return;
    }
    // Live mode — call Supabase
    import('../../lib/supabase').then(({ supabase }) => {
      supabase.auth.updateUser({ password: pwForm.newPw }).then(({ error }) => {
        if (error) {
          setPwError(error.message);
        } else {
          setPwSuccess(t('topBar.passwordUpdated'));
          setPwForm({ current: '', newPw: '', confirm: '' });
        }
      });
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const closeAllMenus = () => {
    setShowUserMenu(false);
    setShowLocationMenu(false);
    setShowRoleMenu(false);
    setShowLangMenu(false);
  };

  const anyMenuOpen = showUserMenu || showLocationMenu || showRoleMenu || showLangMenu;

  return (
    <>
      {anyMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeAllMenus}
        />
      )}

      <div className="sticky top-0 z-50 flex-shrink-0 flex h-16 bg-[#1a2d4a] shadow-sm">
        <div className="flex-1 px-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="text-sm md:text-base font-semibold text-white truncate max-w-[200px] lg:max-w-none">
              {isDemoMode ? companyName : profile?.organization_name || title}
            </div>
            {userRole === 'platform_admin' && (
              <span className="px-2 py-0.5 text-[10px] font-bold tracking-wider rounded bg-[#d4af37] text-[#1a2d4a] uppercase whitespace-nowrap flex-shrink-0">
                Platform Admin
              </span>
            )}
          </div>

          <div className="ml-4 flex items-center md:ml-6 space-x-4">
            {/* Quick Switcher trigger (Ctrl+K) */}
            <button
              onClick={() => window.dispatchEvent(new Event('open-quick-switcher'))}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/20 bg-white/10 hover:bg-white/15 hover:border-white/30 transition-colors text-sm text-gray-300 cursor-pointer"
              title={`${t('topBar.quickSearch')} (${navigator.platform?.includes('Mac') ? '\u2318K' : 'Ctrl+K'})`}
            >
              <Search className="h-3.5 w-3.5" />
              <span className="text-xs">{t('topBar.search')}</span>
              <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-white/10 border border-white/20 rounded text-gray-400">
                {navigator.platform?.includes('Mac') ? '\u2318K' : 'Ctrl+K'}
              </kbd>
            </button>

            {/* Notification Center */}
            <NotificationCenter />

            {locations && locations.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLocationMenu(!showLocationMenu);
                    setShowRoleMenu(false);
                    setShowUserMenu(false);
                    setShowLangMenu(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors duration-150"
                >
                  <MapPin className="h-5 w-5 text-gray-300" />
                  <span className="text-sm font-medium text-gray-200">
                    {selectedLocation
                      ? locations.find((loc) => loc.id === selectedLocation)?.name || t('common.allLocations')
                      : t('common.allLocations')}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-300" />
                </button>
                {showLocationMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-sm bg-white ring-1 ring-black ring-opacity-5 z-50">
                    <div className="py-1">
                      <button
                        onClick={() => {
                          onLocationChange?.(null);
                          setShowLocationMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                          !selectedLocation
                            ? 'bg-[#eef4f8] text-[#1e4d6b] font-medium border-l-2 border-[#d4af37]'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {t('common.allLocations')}
                      </button>
                      {locations.map((location) => (
                        <button
                          key={location.id}
                          onClick={() => {
                            onLocationChange?.(location.id);
                            setShowLocationMenu(false);
                          }}
                          className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                            selectedLocation === location.id
                              ? 'bg-[#eef4f8] text-[#1e4d6b] font-medium border-l-2 border-[#d4af37]'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {location.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Language switcher */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowLangMenu(!showLangMenu);
                  setShowLocationMenu(false);
                  setShowRoleMenu(false);
                  setShowUserMenu(false);
                }}
                className="flex items-center space-x-1.5 px-2.5 py-2 rounded-md hover:bg-white/10 transition-colors duration-150"
                title={t('topBar.language')}
              >
                <Globe className="h-4 w-4 text-gray-300" />
                <span className="text-xs font-semibold text-gray-300 uppercase">{locale}</span>
              </button>
              {showLangMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-44 rounded-md shadow-sm bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {SUPPORTED_LOCALES.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => {
                          setLocale(loc as Locale);
                          setShowLangMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                          locale === loc
                            ? 'bg-[#eef4f8] text-[#1e4d6b] font-medium border-l-2 border-[#d4af37]'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {LOCALE_META[loc as Locale].flag} {LOCALE_META[loc as Locale].label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Help & Settings icons */}
            {canAccessHelp && (
              <button
                onClick={() => navigate('/help')}
                className="p-2 rounded-md hover:bg-white/10 transition-colors duration-150"
                title={t('topBar.helpAndSupport')}
              >
                <HelpCircle className="h-5 w-5 text-gray-300" />
              </button>
            )}
            {canAccessSettings && (
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-md hover:bg-white/10 transition-colors duration-150"
                title={t('nav.settings')}
              >
                <Settings className="h-5 w-5 text-gray-300" />
              </button>
            )}

            {/* Role switcher - visible in demo mode and test mode */}
            {showRoleSwitcher && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowRoleMenu(!showRoleMenu);
                  setShowLocationMenu(false);
                  setShowUserMenu(false);
                  setShowLangMenu(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors duration-150"
                {...(isTestMode ? { 'data-testid': 'role-switcher-button' } : {})}
              >
                <Users className="h-5 w-5 text-gray-300" />
                <span className="text-sm font-medium text-gray-200">
                  {roleLabels[userRole]}
                </span>
                {isTestMode && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-orange-500 text-white">TEST</span>
                )}
                <ChevronDown className="h-4 w-4 text-gray-300" />
              </button>
              {showRoleMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-72 rounded-md shadow-sm bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {DEMO_ROLES.map(({ role, label, description, i18nKey, i18nDescKey }) => (
                      <button
                        key={role}
                        onClick={() => {
                          setUserRole(role);
                          setShowRoleMenu(false);
                          navigate('/dashboard', { replace: true });
                        }}
                        className={`block w-full text-left px-4 py-2.5 transition-colors duration-150 ${
                          userRole === role
                            ? 'bg-[#eef4f8] text-[#1e4d6b] border-l-2 border-[#d4af37]'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                        {...(isTestMode ? { 'data-testid': `role-option-${role}` } : {})}
                      >
                        <span className={`text-sm ${userRole === role ? 'font-medium' : ''}`}>
                          {t(i18nKey) !== i18nKey ? t(i18nKey) : label}
                        </span>
                        <p className="text-xs text-gray-400 mt-0.5 leading-snug">{t(i18nDescKey) !== i18nDescKey ? t(i18nDescKey) : description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            )}

            <div className="relative">
              <button
                onClick={() => {
                  setShowUserMenu(!showUserMenu);
                  setShowLocationMenu(false);
                  setShowRoleMenu(false);
                  setShowLangMenu(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-white/10 transition-colors duration-150"
              >
                <div className="h-8 w-8 rounded-full bg-[#A08C5A] flex items-center justify-center text-[#1a2d4a] font-medium">
                  {displayName.charAt(0)}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-200">
                  {displayName}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-300" />
              </button>
              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-sm bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowUserMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      {t('topBar.myProfile')}
                    </button>
                    <button
                      onClick={() => {
                        setShowChangePassword(true);
                        setShowUserMenu(false);
                        setPwForm({ current: '', newPw: '', confirm: '' });
                        setPwError('');
                        setPwSuccess('');
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2"
                    >
                      <Lock className="h-4 w-4" />
                      {t('topBar.changePassword')}
                    </button>
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      {t('nav.settings')}
                    </button>
                    <div className="border-t border-gray-200 my-1" />
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      {t('topBar.signOut')}
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>

      <ProfileModal isOpen={showProfileModal} onClose={() => setShowProfileModal(false)} />

      {/* Change Password Modal */}
      {showChangePassword && (
        <>
          <div className="fixed inset-0 bg-black bg-opacity-50 z-[60]" onClick={() => setShowChangePassword(false)} />
          <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#1e4d6b] flex items-center justify-center">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">{t('topBar.changePassword')}</h2>
                    <p className="text-sm text-gray-500">{t('topBar.updateYourPassword')}</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('topBar.currentPassword')}</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={pwForm.current}
                      onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent pr-10"
                      placeholder={t('topBar.enterCurrentPassword')}
                    />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('topBar.newPassword')}</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={pwForm.newPw}
                      onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent pr-10"
                      placeholder={t('topBar.enterNewPassword')}
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('topBar.confirmNewPassword')}</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                    placeholder={t('topBar.reEnterNewPassword')}
                  />
                </div>
                {pwError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{pwError}</div>
                )}
                {pwSuccess && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{pwSuccess}</div>
                )}
              </div>
              <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
                <button
                  onClick={() => setShowChangePassword(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleChangePassword}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90"
                  style={{ backgroundColor: '#1e4d6b' }}
                >
                  {t('topBar.updatePassword')}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
