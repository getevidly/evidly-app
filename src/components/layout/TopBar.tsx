import { useState } from 'react';
import { ChevronDown, MapPin, User, ShieldCheck, Users, Building2, Lock, Eye, EyeOff, BarChart3 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ProfileModal } from '../ProfileModal';
import { useRole } from '../../contexts/RoleContext';
import { useDemo } from '../../contexts/DemoContext';

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
  const { profile, signOut, isEvidlyAdmin } = useAuth();
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
  const { userRole, setUserRole } = useRole();
  const { isDemoMode, companyName, userName } = useDemo();

  const handleChangePassword = () => {
    setPwError('');
    setPwSuccess('');
    if (!pwForm.current || !pwForm.newPw || !pwForm.confirm) {
      setPwError('All fields are required.');
      return;
    }
    if (pwForm.newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }
    if (pwForm.newPw !== pwForm.confirm) {
      setPwError('New passwords do not match.');
      return;
    }
    if (isDemoMode) {
      setPwSuccess('Password changes are available in live accounts only.');
      return;
    }
    // Live mode — call Supabase
    import('../../lib/supabase').then(({ supabase }) => {
      supabase.auth.updateUser({ password: pwForm.newPw }).then(({ error }) => {
        if (error) {
          setPwError(error.message);
        } else {
          setPwSuccess('Password updated successfully.');
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
  };

  const anyMenuOpen = showUserMenu || showLocationMenu || showRoleMenu;

  return (
    <>
      {anyMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={closeAllMenus}
        />
      )}

      <div className="sticky top-0 z-50 flex-shrink-0 flex h-16 bg-white shadow">
        <div className="flex-1 px-4 flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-[#1e4d6b] flex items-center justify-center flex-shrink-0">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div className="text-xl font-semibold text-gray-900">
              {isDemoMode ? companyName : profile?.organization_name || title}
            </div>
          </div>

          <div className="ml-4 flex items-center md:ml-6 space-x-4">
            {locations && locations.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => {
                    setShowLocationMenu(!showLocationMenu);
                    setShowRoleMenu(false);
                    setShowUserMenu(false);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150"
                >
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">
                    {selectedLocation
                      ? locations.find((loc) => loc.id === selectedLocation)?.name || 'All Locations'
                      : 'All Locations'}
                  </span>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>
                {showLocationMenu && (
                  <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
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
                        All Locations
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

            {/* Role switcher - only visible in demo mode */}
            {isDemoMode && (
            <div className="relative">
              <button
                onClick={() => {
                  setShowRoleMenu(!showRoleMenu);
                  setShowLocationMenu(false);
                  setShowUserMenu(false);
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150"
              >
                <Users className="h-5 w-5 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">
                  {{ executive: 'Executive View', management: 'Management View', kitchen: 'Kitchen Staff', facilities: 'Facilities' }[userRole]}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              {showRoleMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    {([
                      { role: 'executive' as const, label: 'Executive View' },
                      { role: 'management' as const, label: 'Management View' },
                      { role: 'kitchen' as const, label: 'Kitchen Staff' },
                      { role: 'facilities' as const, label: 'Facilities' },
                    ]).map(({ role, label }) => (
                      <button
                        key={role}
                        onClick={() => {
                          setUserRole(role);
                          setShowRoleMenu(false);
                        }}
                        className={`block w-full text-left px-4 py-2 text-sm transition-colors duration-150 ${
                          userRole === role
                            ? 'bg-[#eef4f8] text-[#1e4d6b] font-medium border-l-2 border-[#d4af37]'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {label}
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
                }}
                className="flex items-center space-x-2 px-3 py-2 rounded-md hover:bg-gray-100 transition-colors duration-150"
              >
                <div className="h-8 w-8 rounded-full bg-[#1e4d6b] flex items-center justify-center text-white font-medium">
                  {isDemoMode ? userName.charAt(0) : (profile?.full_name?.charAt(0) || 'U')}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700">
                  {isDemoMode ? userName : (profile?.full_name || 'User')}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
              </button>
              {showUserMenu && (
                <div className="origin-top-right absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowProfileModal(true);
                        setShowUserMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150 flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      My Profile
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
                      Change Password
                    </button>
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      Settings
                    </button>
                    {(isEvidlyAdmin || isDemoMode) && (
                      <>
                        <div className="border-t border-gray-200 my-1" />
                        <button
                          onClick={() => {
                            navigate('/admin/usage-analytics');
                            setShowUserMenu(false);
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-[#1e4d6b] hover:bg-[#eef4f8] transition-colors duration-150 flex items-center gap-2 font-medium"
                        >
                          <BarChart3 className="h-4 w-4" />
                          Usage Analytics
                        </button>
                      </>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-150"
                    >
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="hidden md:flex items-center space-x-1 ml-2">
              <ShieldCheck className="h-6 w-6 text-[#d4af37]" />
              <div>
                <span className="font-bold text-lg">
                  <span className="text-[#1e4d6b]">Evid</span>
                  <span className="text-[#d4af37]">LY</span>
                </span>
                <div className="text-[9px] text-gray-500 tracking-wide leading-none">Compliance Simplified</div>
              </div>
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
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[#1e4d6b] flex items-center justify-center">
                    <Lock className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Change Password</h2>
                    <p className="text-sm text-gray-500">Update your account password</p>
                  </div>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current Password</label>
                  <div className="relative">
                    <input
                      type={showCurrentPw ? 'text' : 'password'}
                      value={pwForm.current}
                      onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent pr-10"
                      placeholder="Enter current password"
                    />
                    <button type="button" onClick={() => setShowCurrentPw(!showCurrentPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showCurrentPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                  <div className="relative">
                    <input
                      type={showNewPw ? 'text' : 'password'}
                      value={pwForm.newPw}
                      onChange={(e) => setPwForm({ ...pwForm, newPw: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent pr-10"
                      placeholder="Enter new password (min 8 characters)"
                    />
                    <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={pwForm.confirm}
                    onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#1e4d6b] focus:border-transparent"
                    placeholder="Re-enter new password"
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
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleChangePassword}
                  className="px-4 py-2 text-sm font-medium text-white rounded-lg hover:opacity-90"
                  style={{ backgroundColor: '#1e4d6b' }}
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
