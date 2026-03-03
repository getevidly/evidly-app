import { useNavigate } from 'react-router-dom';
import { useRole, type UserRole } from '../../contexts/RoleContext';

const ROLE_PILLS: { role: UserRole; icon: string; label: string }[] = [
  { role: 'owner_operator', icon: '👔', label: 'Owner' },
  { role: 'executive', icon: '📊', label: 'Exec' },
  { role: 'compliance_manager', icon: '📋', label: 'Compliance' },
  { role: 'facilities_manager', icon: '🔧', label: 'Facilities' },
  { role: 'chef', icon: '🍳', label: 'Chef' },
  { role: 'kitchen_manager', icon: '👨‍🍳', label: 'Mgr' },
  { role: 'kitchen_staff', icon: '🥄', label: 'Staff' },
];

export function MobileRoleSwitcher() {
  const { userRole, setUserRole } = useRole();
  const navigate = useNavigate();

  const handleSwitch = (role: UserRole) => {
    setUserRole(role);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="px-4 overflow-x-auto scrollbar-none">
      <div className="flex gap-2 pb-1 md:flex-wrap">
        {ROLE_PILLS.map(pill => {
          const active = userRole === pill.role;
          return (
            <button
              key={pill.role}
              onClick={() => handleSwitch(pill.role)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-full text-[12px] font-semibold whitespace-nowrap min-h-[44px] flex-shrink-0 transition-colors cursor-pointer ${
                active
                  ? 'text-[#1E2D4D]'
                  : 'bg-white/60 text-[#6B7280] active:bg-white/80'
              }`}
              style={active ? { background: '#A08C5A', color: '#1E2D4D' } : undefined}
            >
              <span>{pill.icon}</span>
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
