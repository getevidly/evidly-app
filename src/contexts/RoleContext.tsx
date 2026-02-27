import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { toast } from 'sonner';
import { useAuth } from './AuthContext';
import { useDemo } from './DemoContext';

export type UserRole = 'platform_admin' | 'owner_operator' | 'executive' | 'compliance_manager' | 'chef' | 'facilities_manager' | 'kitchen_manager' | 'kitchen_staff';

export interface LocationAssignment {
  locationId: string;
  locationUrlId: string;
  locationName: string;
}

export interface TempCoverageAssignment {
  id: string;
  userId: string;
  userName: string;
  locationId: string;
  locationName: string;
  grantedBy: string;
  grantedByRole: UserRole;
  startDate: string;
  endDate: string;
  createdAt: string;
}

const ALL_LOCATIONS: LocationAssignment[] = [ // demo
  { locationId: '1', locationUrlId: 'downtown', locationName: 'Downtown Kitchen' }, // demo
  { locationId: '2', locationUrlId: 'airport', locationName: 'Airport Cafe' }, // demo
  { locationId: '3', locationUrlId: 'university', locationName: 'University Dining' }, // demo
];

const ROLE_LOCATION_ASSIGNMENTS: Record<UserRole, LocationAssignment[]> = {
  platform_admin: ALL_LOCATIONS,                    // Platform admin sees everything
  owner_operator: ALL_LOCATIONS,                       // All locations — owner sees everything
  executive: ALL_LOCATIONS,
  compliance_manager: ALL_LOCATIONS,                // All locations — compliance spans org
  chef: [ALL_LOCATIONS[0], ALL_LOCATIONS[1]],       // Downtown + Airport (same as kitchen_manager)
  facilities_manager: ALL_LOCATIONS,                // All locations — facilities services entire org
  kitchen_manager: [ALL_LOCATIONS[0], ALL_LOCATIONS[1]], // Downtown + Airport
  kitchen_staff: [ALL_LOCATIONS[0]],                // Downtown only
};

const INITIAL_TEMP_COVERAGE: TempCoverageAssignment[] = [
  {
    id: 'tc-1',
    userId: 'd5',
    userName: 'Michael Torres',
    locationId: '2',
    locationName: 'Airport Cafe', // demo
    grantedBy: 'Sarah Chen',
    grantedByRole: 'executive',
    startDate: '2026-02-10',
    endDate: '2026-02-17',
    createdAt: '2026-02-08T10:00:00Z',
  },
];

interface RoleContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  roleLocationAssignments: Record<UserRole, LocationAssignment[]>;
  tempCoverageAssignments: TempCoverageAssignment[];
  addTempCoverage: (assignment: Omit<TempCoverageAssignment, 'id' | 'createdAt'>) => void;
  removeTempCoverage: (id: string) => void;
  getAccessibleLocations: () => LocationAssignment[];
  getAccessibleLocationUrlIds: () => string[];
  canAccessLocation: (locationUrlId: string) => boolean;
  canManageTeam: () => boolean;
  canAccessBilling: () => boolean;
  canAssignTempCoverage: () => boolean;
  hasMultipleLocations: () => boolean;
  showAllLocationsOption: () => boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

const VALID_ROLES: UserRole[] = ['platform_admin', 'owner_operator', 'executive', 'compliance_manager', 'chef', 'facilities_manager', 'kitchen_manager', 'kitchen_staff'];

/** Map a database user_profiles.role string to the UserRole type. */
function dbRoleToUserRole(dbRole: string | undefined | null): UserRole {
  const MAP: Record<string, UserRole> = {
    platform_admin: 'platform_admin',
    admin: 'owner_operator',
    owner: 'owner_operator',
    owner_operator: 'owner_operator',
    executive: 'executive',
    compliance_manager: 'compliance_manager',
    chef: 'chef',
    facilities_manager: 'facilities_manager',
    kitchen_manager: 'kitchen_manager',
    kitchen_staff: 'kitchen_staff',
  };
  return MAP[dbRole || ''] || 'owner_operator';
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const { profile, session } = useAuth();
  const { isDemoMode } = useDemo();

  const [userRole, setUserRoleRaw] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('evidly-demo-role');
      if (saved && VALID_ROLES.includes(saved as UserRole)) return saved as UserRole;
    } catch {}
    return 'owner_operator';
  });
  const setUserRole = useCallback((role: UserRole) => {
    setUserRoleRaw(role);
    try { localStorage.setItem('evidly-demo-role', role); } catch {}
  }, []);
  const [tempCoverageAssignments, setTempCoverageAssignments] = useState<TempCoverageAssignment[]>(INITIAL_TEMP_COVERAGE);

  // ── Sync role from database when a real session exists ──
  // When an authenticated user has a profile, use the database role.
  // Demo mode uses the localStorage-based demo role switcher instead.
  useEffect(() => {
    if (!isDemoMode && session && profile?.role) {
      const dbRole = dbRoleToUserRole(profile.role);
      setUserRoleRaw(dbRole);
    }
  }, [isDemoMode, session, profile?.role]);

  const getAccessibleLocations = useCallback((): LocationAssignment[] => {
    return ROLE_LOCATION_ASSIGNMENTS[userRole] || [];
  }, [userRole]);

  const getAccessibleLocationUrlIds = useCallback((): string[] => {
    return getAccessibleLocations().map(l => l.locationUrlId);
  }, [getAccessibleLocations]);

  const canAccessLocation = useCallback((locationUrlId: string): boolean => {
    if (locationUrlId === 'all') return getAccessibleLocations().length > 1;
    return getAccessibleLocationUrlIds().includes(locationUrlId);
  }, [getAccessibleLocations, getAccessibleLocationUrlIds]);

  const canManageTeam = useCallback((): boolean => {
    return userRole === 'platform_admin' || userRole === 'executive' || userRole === 'owner_operator';
  }, [userRole]);

  const canAccessBilling = useCallback((): boolean => {
    return userRole === 'platform_admin' || userRole === 'executive';
  }, [userRole]);

  const canAssignTempCoverage = useCallback((): boolean => {
    return userRole === 'platform_admin' || userRole === 'executive' || userRole === 'owner_operator';
  }, [userRole]);

  const hasMultipleLocations = useCallback((): boolean => {
    return getAccessibleLocations().length > 1;
  }, [getAccessibleLocations]);

  const showAllLocationsOption = useCallback((): boolean => {
    return hasMultipleLocations();
  }, [hasMultipleLocations]);

  const addTempCoverage = useCallback((assignment: Omit<TempCoverageAssignment, 'id' | 'createdAt'>) => {
    // Validate management can only assign locations they have access to
    if (userRole === 'owner_operator') {
      const accessible = ROLE_LOCATION_ASSIGNMENTS.owner_operator.map(l => l.locationId);
      if (!accessible.includes(assignment.locationId)) {
        toast.warning('You can only assign coverage for your locations');
        return;
      }
    }
    if (new Date(assignment.endDate) <= new Date(assignment.startDate)) {
      toast.warning('End date must be after start date');
      return;
    }
    const newAssignment: TempCoverageAssignment = {
      ...assignment,
      id: `tc-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setTempCoverageAssignments(prev => [...prev, newAssignment]);
  }, [userRole]);

  const removeTempCoverage = useCallback((id: string) => {
    setTempCoverageAssignments(prev => prev.filter(a => a.id !== id));
  }, []);

  return (
    <RoleContext.Provider value={{
      userRole,
      setUserRole,
      roleLocationAssignments: ROLE_LOCATION_ASSIGNMENTS,
      tempCoverageAssignments,
      addTempCoverage,
      removeTempCoverage,
      getAccessibleLocations,
      getAccessibleLocationUrlIds,
      canAccessLocation,
      canManageTeam,
      canAccessBilling,
      canAssignTempCoverage,
      hasMultipleLocations,
      showAllLocationsOption,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (context === undefined) {
    throw new Error('useRole must be used within a RoleProvider');
  }
  return context;
}
