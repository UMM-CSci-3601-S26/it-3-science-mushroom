export interface SchoolInfo {
  name: string;         // e.g. "Morris Area High School"
  abbreviation?: string; // legacy field, no longer used in UI
}

/**
 * Maps each availability slot key to an operator-defined clock time string.
 * Family documents store boolean flags against these same keys to record
 * which slots a family is available for.
 */
export interface TimeAvailabilityLabels {
  earlyMorning: string;
  lateMorning: string;
  earlyAfternoon: string;
  lateAfternoon: string;
}

export interface AppSettings {
  _id?: string;
  schools: SchoolInfo[];
  timeAvailability: TimeAvailabilityLabels;
  supplyOrder: SupplyItemOrder[];
}

// Service for managing application settings, including schools, time availability labels, and supply order.
export type SupplyItemStatus = 'staged' | 'unstaged' | 'notGiven';

// Represents the order and status of supply items for checklist generation. The server uses this to determine which items to include and in what order, based on their associated item terms.
export interface SupplyItemOrder {
  itemTerm: string;   // item term e.g. "notebook", "folder"
  status: SupplyItemStatus;
}
