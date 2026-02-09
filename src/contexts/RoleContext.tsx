import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export type UserRole = 'executive' | 'management' | 'kitchen' | 'facilities';

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

const ALL_LOCATIONS: LocationAssignment[] = [
  { locationId: '1', locationUrlId: 'downtown', locationName: 'Downtown Kitchen' },
  { locationId: '2', locationUrlId: 'airport', locationName: 'Airport Cafe' },
  { locationId: '3', locationUrlId: 'university', locationName: 'University Dining' },
];

const ROLE_LOCATION_ASSIGNMENTS: Record<UserRole, LocationAssignment[]> = {
  executive: ALL_LOCATIONS,
  management: [ALL_LOCATIONS[0], ALL_LOCATIONS[1]], // Downtown + Airport
  kitchen: [ALL_LOCATIONS[0]],    // Downtown only
  facilities: ALL_LOCATIONS,      // All locations — facilities services entire org
};

const INITIAL_TEMP_COVERAGE: TempCoverageAssignment[] = [
  {
    id: 'tc-1',
    userId: 'd5',
    userName: 'Michael Torres',
    locationId: '2',
    locationName: 'Airport Cafe',
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

export function RoleProvider({ children }: { children: ReactNode }) {
  const [userRole, setUserRole] = useState<UserRole>('executive');
  const [tempCoverageAssignments, setTempCoverageAssignments] = useState<TempCoverageAssignment[]>(INITIAL_TEMP_COVERAGE);

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
    return userRole === 'executive' || userRole === 'management';
  }, [userRole]);

  const canAccessBilling = useCallback((): boolean => {
    return userRole === 'executive';
  }, [userRole]);

  const canAssignTempCoverage = useCallback((): boolean => {
    return userRole === 'executive' || userRole === 'management';
  }, [userRole]);

  const hasMultipleLocations = useCallback((): boolean => {
    return getAccessibleLocations().length > 1;
  }, [getAccessibleLocations]);

  const showAllLocationsOption = useCallback((): boolean => {
    return hasMultipleLocations();
  }, [hasMultipleLocations]);

  const addTempCoverage = useCallback((assignment: Omit<TempCoverageAssignment, 'id' | 'createdAt'>) => {
    // Validate management can only assign locations they have access to
    if (userRole === 'management') {
      const accessible = ROLE_LOCATION_ASSIGNMENTS.management.map(l => l.locationId);
      if (!accessible.includes(assignment.locationId)) {
        alert('You can only assign temporary coverage for locations you have access to.');
        return;
      }
    }
    if (new Date(assignment.endDate) <= new Date(assignment.startDate)) {
      alert('End date must be after start date.');
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
