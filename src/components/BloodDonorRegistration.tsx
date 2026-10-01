import React, { useState, useEffect } from 'react';
import {
  Heart,
  ShieldCheck,
  MapPin,
  Calendar,
  Bell,
  Plus,
  Trash2,
  CheckCircle2,
  Lock,
  AlertCircle,
  Clock,
  Save,
} from 'lucide-react';
import {
  BloodAlertPreference,
  BloodDonationHistoryItem,
  BloodDonorAvailability,
  BloodDonorProfile,
  BloodGroup,
  BLOOD_GROUPS_LIST,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  DONATION_AREAS_LIST,
  getDonorProfileByUserId,
  sanitizeInputText,
  upsertBloodDonorProfile,
} from '../utils/bloodDonationService';
import {
  getDonorIntervalInfo,
  HOSPITAL_ELIGIBILITY_DISCLAIMER,
} from '../utils/bloodMatching';

interface BloodDonorRegistrationProps {
  onSaved?: (donorProfile: BloodDonorProfile) => void;
  compact?: boolean;
}

export const BloodDonorRegistration: React.FC<BloodDonorRegistrationProps> = ({
  onSaved,
  compact = false,
}) => {
  const { currentUser, updateProfile } = useAuth();
  const existingRecord = getDonorProfileByUserId(currentUser.id);

  const [isRegisteredDonor, setIsRegisteredDonor] = useState<boolean>(
    existingRecord?.isRegisteredDonor ?? currentUser.bloodDonorProfile?.isRegisteredDonor ?? true
  );
  const [bloodGroup, setBloodGroup] = useState<BloodGroup>(
    existingRecord?.bloodGroup || currentUser.bloodGroup || 'O+'
  );
  const [availability, setAvailability] = useState<BloodDonorAvailability>(
    existingRecord?.availability || currentUser.bloodDonorProfile?.availability || 'available'
  );
  const [preferredArea, setPreferredArea] = useState<string>(
    existingRecord?.preferredArea ||
      currentUser.bloodDonorProfile?.preferredArea ||
      DONATION_AREAS_LIST[0]
  );
  const [customArea, setCustomArea] = useState<string>('');
  const [lastDonationDate, setLastDonationDate] = useState<string>(
    existingRecord?.lastDonationDate || currentUser.bloodDonorProfile?.lastDonationDate || ''
  );
  const [emergencyAlertPreference, setEmergencyAlertPreference] = useState<BloodAlertPreference>(
    existingRecord?.emergencyAlertPreference ||
      currentUser.bloodDonorProfile?.emergencyAlertPreference ||
      'all_urgent'
  );
  const [donationHistory, setDonationHistory] = useState<BloodDonationHistoryItem[]>(
    existingRecord?.donationHistory || currentUser.bloodDonorProfile?.donationHistory || []
  );

  // New donation history entry form state
  const [newHistDate, setNewHistDate] = useState('');
  const [newHistHospital, setNewHistHospital] = useState('');
  const [newHistLocation, setNewHistLocation] = useState('');
  const [newHistNotes, setNewHistNotes] = useState('');

  const [saveNotice, setSaveNotice] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const rec = getDonorProfileByUserId(currentUser.id);
    if (rec) {
      setIsRegisteredDonor(rec.isRegisteredDonor);
      setBloodGroup(rec.bloodGroup);
      setAvailability(rec.availability);
      if (DONATION_AREAS_LIST.includes(rec.preferredArea)) {
        setPreferredArea(rec.preferredArea);
        setCustomArea('');
      } else {
        setPreferredArea('Custom Area');
        setCustomArea(rec.preferredArea);
      }
      setLastDonationDate(rec.lastDonationDate || '');
      setEmergencyAlertPreference(rec.emergencyAlertPreference);
      setDonationHistory(rec.donationHistory || []);
    }
  }, [currentUser.id]);

  const intervalInfo = getDonorIntervalInfo(lastDonationDate);

  const handleAddHistoryEntry = () => {
    const cleanHospital = sanitizeInputText(newHistHospital, 100);
    if (!newHistDate || !cleanHospital) {
      setErrorMsg('Please enter both donation date and hospital name to add a history entry.');
      return;
    }
    setErrorMsg(null);
    const entry: BloodDonationHistoryItem = {
      id: `dh-${Date.now()}`,
      date: newHistDate,
      hospital: cleanHospital,
      location: sanitizeInputText(newHistLocation || currentUser.city || 'Dhaka', 80),
      units: 1,
      notes: sanitizeInputText(newHistNotes, 140) || undefined,
    };
    const nextHistory = [entry, ...donationHistory];
    setDonationHistory(nextHistory);
    if (!lastDonationDate || newHistDate > lastDonationDate) {
      setLastDonationDate(newHistDate);
    }
    setNewHistDate('');
    setNewHistHospital('');
    setNewHistLocation('');
    setNewHistNotes('');
  };

  const handleRemoveHistoryEntry = (id: string) => {
    setDonationHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const resolvedArea =
      preferredArea === 'Custom Area' ? sanitizeInputText(customArea, 120) : preferredArea;

    if (!resolvedArea) {
      setErrorMsg('Please specify your preferred donation area.');
      return;
    }

    try {
      const saved = upsertBloodDonorProfile(currentUser, {
        bloodGroup,
        isRegisteredDonor,
        availability,
        preferredArea: resolvedArea,
        lastDonationDate: lastDonationDate || undefined,
        emergencyAlertPreference,
        donationHistory,
      });

      updateProfile({
        bloodGroup,
        bloodDonorProfile: {
          isRegisteredDonor,
          availability,
          preferredArea: resolvedArea,
          lastDonationDate: lastDonationDate || undefined,
          emergencyAlertPreference,
          donationHistory,
        },
      });

      setSaveNotice(
        isRegisteredDonor
          ? `Blood Donor Profile (${bloodGroup}) saved and synced with your Notredamian Profile.`
          : 'Your Blood Donor status has been updated (currently opted out of active listing).'
      );
      setTimeout(() => setSaveNotice(null), 4000);
      if (onSaved) onSaved(saved);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Could not save blood donor profile.');
    }
  };

  return (
    <div
      className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-xs ${
        compact ? 'p-4 sm:p-5' : 'p-5 sm:p-6'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-200/70 dark:border-rose-800/70">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white tracking-tight">
              Notredamian Blood Donor Profile & Privacy Settings
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Configure your blood group, preferred hospital corridor, and emergency alert settings.
            </p>
          </div>
        </div>

        {/* Opt-In Toggle */}
        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none self-start sm:self-auto px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
          <input
            type="checkbox"
            checked={isRegisteredDonor}
            onChange={(e) => setIsRegisteredDonor(e.target.checked)}
            className="w-4 h-4 rounded accent-rose-600 cursor-pointer"
          />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Active in Blood Donor Registry
          </span>
        </label>
      </div>

      {/* Strict Privacy & Medical Notice */}
      <div className="mt-4 p-3.5 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/70 dark:border-blue-900/50 flex items-start gap-2.5 text-xs text-slate-700 dark:text-slate-300">
        <Lock className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="font-bold text-slate-900 dark:text-white">
            Zero Private Contact Exposure Guarantee
          </div>
          <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
            Your mobile phone number, personal email, and home address are <strong>never publicly exposed</strong> in the Blood Network. Only your name, batch year, blood group, general hospital area, and availability are shown for coordination.
          </p>
        </div>
      </div>

      {saveNotice && (
        <div className="mt-4 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveNotice}</span>
        </div>
      )}

      {errorMsg && (
        <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 flex items-center gap-2 text-xs font-bold text-rose-700 dark:text-rose-300">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* 1. Blood Group Selector */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
            1. Your Blood Group *
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
            {BLOOD_GROUPS_LIST.map((bg) => {
              const selected = bloodGroup === bg;
              return (
                <button
                  key={bg}
                  type="button"
                  onClick={() => setBloodGroup(bg)}
                  className={`py-2.5 px-3 rounded-xl font-black text-xs sm:text-sm border transition-all cursor-pointer ${
                    selected
                      ? 'bg-rose-600 text-white border-rose-600 shadow-sm shadow-rose-600/20'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-rose-400'
                  }`}
                >
                  {bg}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Availability & Last Donation Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              2. Donor Availability Status
            </label>
            <select
              value={availability}
              onChange={(e) => setAvailability(e.target.value as BloodDonorAvailability)}
              className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="available">Available Now (Ready to Coordinate)</option>
              <option value="on_cooldown">On Cooldown (Recently Donated)</option>
              <option value="unavailable">Temporarily Unavailable</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              3. Last Blood Donation Date (Optional)
            </label>
            <div className="relative">
              <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="date"
                value={lastDonationDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setLastDonationDate(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <Clock className="w-3 h-3 text-blue-500 shrink-0" />
              <span>{intervalInfo.label}</span>
            </div>
          </div>
        </div>

        {/* 3. Preferred Donation Area & Alert Preference */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              4. Preferred Hospital / Donation Area *
            </label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={preferredArea}
                onChange={(e) => setPreferredArea(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {DONATION_AREAS_LIST.map((area) => (
                  <option key={area} value={area}>
                    {area}
                  </option>
                ))}
                <option value="Custom Area">Other Area / Custom Hospital Zone...</option>
              </select>
            </div>
            {preferredArea === 'Custom Area' && (
              <input
                type="text"
                placeholder="Enter general area or city (e.g. Comilla / Mymensingh)..."
                value={customArea}
                onChange={(e) => setCustomArea(e.target.value)}
                className="mt-2 w-full px-3.5 py-2 text-xs bg-white dark:bg-slate-800 border border-blue-400 dark:border-blue-500 rounded-xl text-slate-900 dark:text-slate-100"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              5. Emergency Alert Preference
            </label>
            <div className="relative">
              <Bell className="w-3.5 h-3.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={emergencyAlertPreference}
                onChange={(e) => setEmergencyAlertPreference(e.target.value as BloodAlertPreference)}
                className="w-full pl-9 pr-3.5 py-2.5 text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all_urgent">All Matching Urgent & Critical Requests</option>
                <option value="same_area_only">Only Requests in My Preferred Area</option>
                <option value="critical_only">Life-Threatening Critical Emergencies Only</option>
                <option value="paused">Pause Emergency Notifications</option>
              </select>
            </div>
          </div>
        </div>

        {/* 4. Optional Donation History Log */}
        <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
              6. Optional Donation History ({donationHistory.length})
            </label>
            <span className="text-[11px] text-slate-400">
              Track your past hospital donations
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/70">
            <div className="sm:col-span-3">
              <input
                type="date"
                value={newHistDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setNewHistDate(e.target.value)}
                className="w-full px-2.5 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-4">
              <input
                type="text"
                placeholder="Hospital / Blood Bank (e.g. DMCH)"
                value={newHistHospital}
                onChange={(e) => setNewHistHospital(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-3">
              <input
                type="text"
                placeholder="Notes (optional)"
                value={newHistNotes}
                onChange={(e) => setNewHistNotes(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100"
              />
            </div>
            <div className="sm:col-span-2">
              <button
                type="button"
                onClick={handleAddHistoryEntry}
                className="w-full h-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {donationHistory.length > 0 && (
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {donationHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/70 dark:border-slate-800 text-xs"
                >
                  <div className="min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">
                      {item.hospital}{' '}
                      <span className="font-normal text-slate-500">· {item.date}</span>
                    </div>
                    {item.notes && (
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {item.notes}
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveHistoryEntry(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                    title="Remove entry"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-xl">
            {HOSPITAL_ELIGIBILITY_DISCLAIMER}
          </p>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-600/20 transition-all cursor-pointer shrink-0"
          >
            <Save className="w-4 h-4" />
            <span>Save Donor Settings</span>
          </button>
        </div>
      </form>
    </div>
  );
};
