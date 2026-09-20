import { useCallback, useState } from 'react';
import { filterByCampusMode } from '../utils/opportunityHelpers';
import type { CampusMode, Opportunity } from '../types';

const DEFAULT_FILTER = 'all';
type CampusFilter = CampusMode | 'all';

export function useCampusModeFilter(initialFilter: CampusFilter = DEFAULT_FILTER) {
  const [campusModeFilter, setCampusModeFilter] = useState<CampusFilter>(initialFilter);

  const resetCampusModeFilter = useCallback(() => {
    setCampusModeFilter(initialFilter);
  }, [initialFilter]);

  const applyCampusModeFilter = useCallback(
    (opportunities: Opportunity[]) => filterByCampusMode(opportunities, campusModeFilter),
    [campusModeFilter]
  );

  return {
    campusModeFilter,
    setCampusModeFilter,
    resetCampusModeFilter,
    isCampusFilterActive: campusModeFilter !== DEFAULT_FILTER,
    applyCampusModeFilter,
  };
}
