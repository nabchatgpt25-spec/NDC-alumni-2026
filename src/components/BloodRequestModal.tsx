import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  Heart,
  MapPin,
  Clock,
  Building2,
  ShieldCheck,
  Users,
  AlertCircle,
  Send,
} from 'lucide-react';
import {
  BloodContactMethod,
  BloodDonorProfile,
  BloodEmergencyLevel,
  BloodEmergencyRequest,
  BloodGroup,
  BLOOD_GROUPS_LIST,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  createEmergencyBloodRequest,
  DONATION_AREAS_LIST,
} from '../utils/bloodDonationService';
import { HOSPITAL_ELIGIBILITY_DISCLAIMER } from '../utils/bloodMatching';

interface BloodRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialBloodGroup?: BloodGroup;
  donors: BloodDonorProfile[];
  onCreated: (newRequest: BloodEmergencyRequest, matchedCount: number) => void;
}

export const BloodRequestModal: React.FC<BloodRequestModalProps> = ({
  isOpen,
  onClose,
  initialBloodGroup = 'O+',
  donors,
  onCreated,
}) => {
  const { currentUser } = useAuth();

  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(initialBloodGroup);
  const [unitsRequired, setUnitsRequired] = useState<number>(1);
  const [hospitalName, setHospitalName] = useState<string>('');
  const [hospitalArea, setHospitalArea] = useState<string>(DONATION_AREAS_LIST[0]);
  const [customHospitalArea, setCustomHospitalArea] = useState<string>('');
  const [requiredDateTime, setRequiredDateTime] = useState<string>('Today, within 6 hours');
  const [emergencyLevel, setEmergencyLevel] = useState<BloodEmergencyLevel>('urgent');
  const [contactMethod, setContactMethod] = useState<BloodContactMethod>(
    'Portal Secure Coordination'
  );
  const [coordinationRef, setCoordinationRef] = useState<string>('');
  const [patientRelation, setPatientRelation] = useState<string>(
    `Batch ${currentUser.batchYear} Alumnus / Family Member`
  );
  const [description, setDescription] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (initialBloodGroup) {
      setBloodGroup(initialBloodGroup);
    }
  }, [initialBloodGroup]);

  const matchingGroupDonorsCount = useMemo(() => {
    return donors.filter(
      (d) => d.isRegisteredDonor && d.bloodGroup === bloodGroup && d.availability !== 'unavailable'
    ).length;
  }, [donors, bloodGroup]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const resolvedArea =
      hospitalArea === 'Custom Area' ? customHospitalArea.trim() : hospitalArea;

    try {
      const { request, matchedDonorsCount } = createEmergencyBloodRequest(currentUser, {
        bloodGroup,
        unitsRequired,
        hospitalName,
        hospitalArea: resolvedArea,
        city: currentUser.city || 'Dhaka',
        requiredDateTime,
        emergencyLevel,
        contactMethod,
        coordinationRef,
        description,
        patientRelation,
      });

      onCreated(request, matchedDonorsCount);
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Please check all required fields.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-rose-700 via-rose-800 to-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 border border-white/20">
              <Heart className="w-5 h-5 text-rose-200" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-200 block">
                Notre Dame Alumni Emergency Blood Network
              </span>
              <h3 className="font-black text-base sm:text-lg tracking-tight leading-tight">
                Post Emergency Blood Request
              </h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {/* Requester Verification Banner */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2.5">
              <img
                src={currentUser.avatarUrl}
                alt={currentUser.fullName}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div>
                <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <span>Requester: {currentUser.fullName}</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  Batch {currentUser.batchYear} ·{' '}
                  {(currentUser.verificationStatus || 'verified') === 'verified'
                    ? 'Instant Active Broadcast Enabled'
                    : 'Will enter Pending Verification Queue'}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
              <Users className="w-3.5 h-3.5" />
              <span>
                {matchingGroupDonorsCount} {bloodGroup} Alumni Donor(s) in Registry
              </span>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* 1. Blood Group & Units */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
            <div className="sm:col-span-8">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Blood Group Required *
              </label>
              <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                {BLOOD_GROUPS_LIST.map((bg) => (
                  <button
                    key={bg}
                    type="button"
                    onClick={() => setBloodGroup(bg)}
                    className={`py-2 rounded-xl font-black text-xs border transition-all cursor-pointer ${
                      bloodGroup === bg
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Units Required (Bags) *
              </label>
              <select
                value={unitsRequired}
                onChange={(e) => setUnitsRequired(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'Unit (Bag)' : 'Units (Bags)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 2. Emergency Level & Required Date/Time */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Emergency Priority Level *
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: 'critical', label: 'Critical' },
                    { id: 'urgent', label: 'Urgent' },
                    { id: 'standard', label: 'Standby' },
                  ] as const
                ).map((lvl) => (
                  <button
                    key={lvl.id}
                    type="button"
                    onClick={() => setEmergencyLevel(lvl.id)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      emergencyLevel === lvl.id
                        ? lvl.id === 'critical'
                          ? 'bg-rose-600 text-white border-rose-600'
                          : lvl.id === 'urgent'
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Required Date / Time *
              </label>
              <div className="relative">
                <Clock className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Today by 6:00 PM / Tomorrow 9:00 AM"
                  value={requiredDateTime}
                  onChange={(e) => setRequiredDateTime(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 3. Hospital Name & Hospital Area */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Hospital / Blood Bank Name *
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. Dhaka Medical College Hospital (DMCH)"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Hospital Location / Corridor *
              </label>
              <div className="relative">
                <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={hospitalArea}
                  onChange={(e) => setHospitalArea(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DONATION_AREAS_LIST.map((area) => (
                    <option key={area} value={area}>
                      {area}
                    </option>
                  ))}
                  <option value="Custom Area">Other Hospital Location...</option>
                </select>
              </div>
              {hospitalArea === 'Custom Area' && (
                <input
                  type="text"
                  placeholder="Enter hospital area and city..."
                  value={customHospitalArea}
                  onChange={(e) => setCustomHospitalArea(e.target.value)}
                  className="mt-2 w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-blue-400 rounded-xl text-slate-900 dark:text-slate-100"
                />
              )}
            </div>
          </div>

          {/* 4. Contact Method & Hospital Coordination Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Preferred Coordination Method *
              </label>
              <select
                value={contactMethod}
                onChange={(e) => setContactMethod(e.target.value as BloodContactMethod)}
                className="w-full px-3.5 py-2 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Portal Secure Coordination">Portal Secure Coordination</option>
                <option value="Hospital Blood Bank Desk">Hospital Blood Bank Desk</option>
                <option value="Batch Coordinator Relay">Batch Coordinator Relay</option>
                <option value="Attendant Emergency Line">Attendant Emergency Line</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Patient Relation & Ward / Blood Bank Ref
              </label>
              <input
                type="text"
                placeholder="e.g. Cabin #402 / Transfusion Desk Counter #2"
                value={coordinationRef}
                onChange={(e) => setCoordinationRef(e.target.value)}
                className="w-full px-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* 5. Short Request Description */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Short Request Description & Clinical Context *
            </label>
            <textarea
              rows={3}
              placeholder="Briefly describe the procedure/need (e.g. Emergency cardiac bypass surgery for Batch 52 alumnus father; cross-matching desk open at DMCH Transfusion Dept)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Medical Disclaimer */}
          <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/60 flex items-start gap-2 text-[11px] text-amber-800 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{HOSPITAL_ELIGIBILITY_DISCLAIMER}</span>
          </div>

          {/* Submit Footer */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md shadow-rose-600/20 transition-all cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Publish Blood Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
