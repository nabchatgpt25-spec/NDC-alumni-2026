import {
  BloodDonorProfile,
  BloodEmergencyRequest,
  BloodGroup,
} from '../types';

/**
 * Mandatory coordination disclaimer:
 * This system only facilitates alumni donor discovery and coordination.
 * It does NOT make medical eligibility or transfusion compatibility decisions.
 */
export const HOSPITAL_ELIGIBILITY_DISCLAIMER =
  'Coordination match only. The hospital or licensed blood bank must perform cross-matching and confirm donor medical eligibility and blood compatibility prior to any donation.';

export const STANDARD_DONATION_INTERVAL_DAYS = 90;

export interface DonorIntervalInfo {
  daysSince: number | null;
  meetsStandardInterval: boolean;
  daysUntilStandardWindow: number;
  label: string;
}

export interface MatchedDonorResult {
  donor: BloodDonorProfile;
  matchScore: number;
  isExactBloodGroup: boolean;
  isSameArea: boolean;
  isSameCity: boolean;
  isAvailableNow: boolean;
  meetsDonationInterval: boolean;
  matchesAlertPreference: boolean;
  matchReasons: string[];
  intervalInfo: DonorIntervalInfo;
}

/**
 * Calculate days elapsed since the donor's last recorded blood donation date.
 */
export function getDaysSinceLastDonation(lastDonationDate?: string): number | null {
  if (!lastDonationDate || !lastDonationDate.trim()) return null;
  const parsed = new Date(lastDonationDate);
  if (isNaN(parsed.getTime())) return null;
  const now = new Date();
  const diffMs = now.getTime() - parsed.getTime();
  if (diffMs < 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Summarize the time interval since last donation for coordination awareness (not medical clearance).
 */
export function getDonorIntervalInfo(lastDonationDate?: string): DonorIntervalInfo {
  const daysSince = getDaysSinceLastDonation(lastDonationDate);
  if (daysSince === null) {
    return {
      daysSince: null,
      meetsStandardInterval: true,
      daysUntilStandardWindow: 0,
      label: 'No recent donation logged (Interval Ready)',
    };
  }

  if (daysSince >= STANDARD_DONATION_INTERVAL_DAYS) {
    return {
      daysSince,
      meetsStandardInterval: true,
      daysUntilStandardWindow: 0,
      label: `${daysSince} days since last donation (90+ day interval met)`,
    };
  }

  const remaining = Math.max(1, STANDARD_DONATION_INTERVAL_DAYS - daysSince);
  return {
    daysSince,
    meetsStandardInterval: false,
    daysUntilStandardWindow: remaining,
    label: `Donated ${daysSince}d ago (${remaining}d left in 90-day rest window)`,
  };
}

/**
 * Normalize area/location strings to check zone proximity (e.g., Motijheel / Shahbagh / Ramna, Dhanmondi / Panthapath, Uttara / Banani).
 */
const DHAKA_ZONE_CLUSTERS: string[][] = [
  ['motijheel', 'shahbagh', 'ramna', 'paltan', 'kakrail', 'mugda', 'dmc', 'bsmmu', 'birdem'],
  ['dhanmondi', 'panthapath', 'kalabagan', 'green road', 'mohammadpur', 'lalmatia', 'shyamoli', 'square'],
  ['gulshan', 'banani', 'baridhara', 'bashundhara', 'badda', 'evercare', 'united'],
  ['uttara', 'airport', 'tongi', 'kurmitola', 'nikunja'],
  ['mirpur', 'agargaon', 'sher-e-bangla', 'kazipara', 'pallabi', 'nicvd', 'nikdu'],
];

export function evaluateAreaMatch(
  donorArea: string,
  donorCity: string,
  requestArea: string,
  requestCity: string
): { isSameArea: boolean; isAdjacentZone: boolean; isSameCity: boolean } {
  const dArea = (donorArea || '').toLowerCase();
  const rArea = (requestArea || '').toLowerCase();
  const dCity = (donorCity || '').toLowerCase().trim();
  const rCity = (requestCity || '').toLowerCase().trim();

  const isSameCity = Boolean(dCity && rCity && (dCity === rCity || dCity.includes(rCity) || rCity.includes(dCity)));

  // Direct substring match on area tokens
  const rTokens = rArea
    .split(/[,/\-\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 3 && t !== 'dhaka' && t !== 'area' && t !== 'hospital');

  const isSameArea = rTokens.some((tok) => dArea.includes(tok));

  if (isSameArea) {
    return { isSameArea: true, isAdjacentZone: true, isSameCity: true };
  }

  // Check if donor and hospital belong to the same Dhaka hospital/neighborhood cluster
  const isAdjacentZone = DHAKA_ZONE_CLUSTERS.some(
    (cluster) =>
      cluster.some((z) => dArea.includes(z)) && cluster.some((z) => rArea.includes(z))
  );

  return { isSameArea: false, isAdjacentZone, isSameCity };
}

/**
 * Modular Donor Matching Service:
 * Ranks registered alumni blood donors for a given emergency blood request using:
 * 1. Blood group (exact match required for primary coordination)
 * 2. Area / location proximity
 * 3. Donor availability status
 * 4. Last donation date (90-day interval awareness)
 * 5. Emergency priority & donor alert preference
 *
 * NOTE: Does NOT perform medical eligibility or transfusion compatibility decisions.
 */
export function matchDonorsForRequest(
  request: BloodEmergencyRequest,
  donors: BloodDonorProfile[],
  options?: { includeCooldownDonors?: boolean; exactBloodGroupOnly?: boolean }
): MatchedDonorResult[] {
  const includeCooldown = options?.includeCooldownDonors ?? false;
  const exactOnly = options?.exactBloodGroupOnly ?? true;

  const results: MatchedDonorResult[] = [];

  for (const donor of donors) {
    if (!donor.isRegisteredDonor) continue;
    if (donor.userId === request.requesterId) continue;

    const isExactBloodGroup = donor.bloodGroup === request.bloodGroup;
    if (exactOnly && !isExactBloodGroup) continue;

    const intervalInfo = getDonorIntervalInfo(donor.lastDonationDate);
    const isAvailableNow = donor.availability === 'available' && intervalInfo.meetsStandardInterval;

    if (!includeCooldown && donor.availability === 'unavailable') {
      continue;
    }

    const { isSameArea, isAdjacentZone, isSameCity } = evaluateAreaMatch(
      donor.preferredArea,
      donor.city,
      `${request.hospitalArea} ${request.hospitalName}`,
      request.city
    );

    // Check emergency alert preference alignment
    let matchesAlertPreference = true;
    if (donor.emergencyAlertPreference === 'paused') {
      matchesAlertPreference = false;
    } else if (donor.emergencyAlertPreference === 'critical_only') {
      matchesAlertPreference = request.emergencyLevel === 'critical';
    } else if (donor.emergencyAlertPreference === 'same_area_only') {
      matchesAlertPreference = isSameArea || isAdjacentZone;
    }

    // Compute transparent coordination score
    let score = 0;
    const matchReasons: string[] = [];

    if (isExactBloodGroup) {
      score += 50;
      matchReasons.push(`Exact ${request.bloodGroup} Group`);
    }

    if (isAvailableNow) {
      score += 25;
      matchReasons.push('Available Now');
    } else if (donor.availability === 'on_cooldown' || !intervalInfo.meetsStandardInterval) {
      score += 5;
      matchReasons.push('In Cooldown Window');
    }

    if (isSameArea) {
      score += 20;
      matchReasons.push(`Same Area (${donor.preferredArea})`);
    } else if (isAdjacentZone) {
      score += 14;
      matchReasons.push('Nearby Hospital Corridor');
    } else if (isSameCity) {
      score += 8;
      matchReasons.push(`Same City (${donor.city})`);
    }

    if (intervalInfo.meetsStandardInterval) {
      score += 10;
      matchReasons.push('90+ Day Interval Ready');
    }

    if (request.emergencyLevel === 'critical' && matchesAlertPreference) {
      score += 10;
      matchReasons.push('Critical Alert Opt-In');
    }

    results.push({
      donor,
      matchScore: score,
      isExactBloodGroup,
      isSameArea: isSameArea || isAdjacentZone,
      isSameCity,
      isAvailableNow,
      meetsDonationInterval: intervalInfo.meetsStandardInterval,
      matchesAlertPreference,
      matchReasons,
      intervalInfo,
    });
  }

  return results.sort((a, b) => b.matchScore - a.matchScore);
}

/**
 * Find active emergency requests that match a specific donor's blood group and area preferences.
 */
export function findMatchingRequestsForDonor(
  donor: BloodDonorProfile,
  requests: BloodEmergencyRequest[]
): BloodEmergencyRequest[] {
  if (!donor.isRegisteredDonor) return [];

  return requests
    .filter((req) => {
      if (req.status !== 'Active' && req.status !== 'Donor Found') return false;
      if (req.bloodGroup !== donor.bloodGroup) return false;
      if (donor.emergencyAlertPreference === 'paused') return false;
      if (donor.emergencyAlertPreference === 'critical_only' && req.emergencyLevel !== 'critical') {
        return false;
      }
      if (donor.emergencyAlertPreference === 'same_area_only') {
        const { isSameArea, isAdjacentZone } = evaluateAreaMatch(
          donor.preferredArea,
          donor.city,
          `${req.hospitalArea} ${req.hospitalName}`,
          req.city
        );
        return isSameArea || isAdjacentZone;
      }
      return true;
    })
    .sort((a, b) => {
      const priorityRank = { critical: 3, urgent: 2, standard: 1 };
      return priorityRank[b.emergencyLevel] - priorityRank[a.emergencyLevel];
    });
}

/**
 * Aggregate blood group overview statistics across all registered donors and active requests.
 */
export function getBloodGroupOverviewStats(
  donors: BloodDonorProfile[],
  requests: BloodEmergencyRequest[]
): {
  bloodGroup: BloodGroup;
  totalDonors: number;
  availableDonors: number;
  activeRequests: number;
  unitsNeeded: number;
}[] {
  const groups: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  return groups.map((bg) => {
    const groupDonors = donors.filter((d) => d.isRegisteredDonor && d.bloodGroup === bg);
    const availableDonors = groupDonors.filter(
      (d) => d.availability === 'available' && getDonorIntervalInfo(d.lastDonationDate).meetsStandardInterval
    ).length;
    const activeGroupReqs = requests.filter(
      (r) => (r.status === 'Active' || r.status === 'Donor Found') && r.bloodGroup === bg
    );
    const unitsNeeded = activeGroupReqs.reduce(
      (sum, r) => sum + Math.max(0, r.unitsRequired - (r.unitsFulfilled || 0)),
      0
    );

    return {
      bloodGroup: bg,
      totalDonors: groupDonors.length,
      availableDonors,
      activeRequests: activeGroupReqs.length,
      unitsNeeded,
    };
  });
}
