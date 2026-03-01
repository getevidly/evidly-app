import { useState } from 'react';
import { X, User, Mail, Phone, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDemo } from '../contexts/DemoContext';
import { useRole } from '../contexts/RoleContext';
import { supabase } from '../lib/supabase';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEMO_ROLE_PROFILES: Record<string, { name: string; email: string }> = {
  platform_admin: { name: 'Arthur Samuels', email: 'arthur@getevidly.com' },
  owner_operator: { name: 'Maria Rodriguez', email: 'maria@cleaningprosplus.com' },
  executive: { name: 'James Park', email: 'jpark@cleaningprosplus.com' },
  compliance_manager: { name: 'Sofia Chen', email: 'schen@cleaningprosplus.com' },
  chef: { name: 'Ana Torres', email: 'atorres@cleaningprosplus.com' },
  facilities_manager: { name: 'Michael Torres', email: 'mtorres@cleaningprosplus.com' },
  kitchen_manager: { name: 'David Kim', email: 'dkim@cleaningprosplus.com' },
  kitchen_staff: { name: 'Lisa Nguyen', email: 'lnguyen@cleaningprosplus.com' },
};

export function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { profile } = useAuth();
  const { isDemoMode } = useDemo();
  const { userRole } = useRole();

  const demoProfile = DEMO_ROLE_PROFILES[userRole] || DEMO_ROLE_PROFILES.owner_operator;
  const profileName = profile?.full_name || (isDemoMode ? demoProfile.name : '');
  const profileEmail = profile?.email || (isDemoMode ? demoProfile.email : '');
  // Guard: if phone looks like an email, treat as empty
  const rawPhone = profile?.phone || '';
  const profilePhone = rawPhone.includes('@') ? '' : rawPhone;

  const [fullName, setFullName] = useState(profileName);
  const [phone, setPhone] = useState(profilePhone);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  if (!isOpen) return null;

  const pinMismatch = pin.length > 0 && confirmPin.length > 0 && pin !== confirmPin;
  const saveDisabled = loading || pinMismatch;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const updates: any = {
        full_name: fullName,
        phone: phone || null,
      };

      if (pin) {
        if (pin.length !== 4 || !/^\d{4}$/.test(pin)) {
          setMessage('PIN must be 4 digits');
          setLoading(false);
          return;
        }
        if (pin !== confirmPin) {
          setMessage('PINs do not match');
          setLoading(false);
          return;
        }
        updates.kiosk_pin = pin;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', profile?.id);

      if (error) throw error;

      setMessage('Profile updated successfully');
      setTimeout(() => {
        onClose();
        window.location.reload();
      }, 1500);
    } catch (error) {
      setMessage('Error updating profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl p-4 sm:p-5 max-w-md w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">My Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <User className="h-4 w-4" />
              Full Name
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email
            </label>
            <input
              type="email"
              value={profileEmail}
              disabled
              className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Phone
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/[^0-9()\-\s+]/g, ''))}
              inputMode="tel"
              placeholder="(555) 123-4567"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37]"
            />
          </div>

          <div className="border-t border-gray-200 pt-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
              <Lock className="h-4 w-4" />
              Kiosk PIN (Optional)
            </h3>
            <p className="text-xs text-gray-600 mb-3">Set a 4-digit PIN for quick access on kiosk devices</p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">PIN</label>
                <div className="relative">
                  <input
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="● ● ● ●"
                    maxLength={4}
                    className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-center text-lg tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin(!showPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Confirm PIN</label>
                <div className="relative">
                  <input
                    type={showConfirmPin ? 'text' : 'password'}
                    value={confirmPin}
                    onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="● ● ● ●"
                    maxLength={4}
                    className={`w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#d4af37] text-center text-lg tracking-widest ${
                      pinMismatch ? 'border-red-400' : 'border-gray-300'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPin(!showConfirmPin)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showConfirmPin ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {pinMismatch && (
                  <p className="text-xs text-red-600 mt-1">PINs do not match</p>
                )}
              </div>
            </div>
          </div>

          {message && (
            <div className={`text-sm p-3 rounded ${
              message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saveDisabled}
              className="flex-1 px-4 py-2 bg-[#1e4d6b] text-white rounded-lg hover:bg-[#2a6a8f] disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
