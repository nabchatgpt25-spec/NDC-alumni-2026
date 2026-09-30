export interface OfficialNotice {
  id: string;
  refNo: string;
  title: string;
  category: 'Membership' | 'Reunion' | 'Scholarship' | 'General' | 'AGM';
  publishedDate: string;
  isUrgent?: boolean;
  summary: string;
  fullContent: string;
  pdfUrl?: string;
  fileSize?: string;
  signatory: {
    name: string;
    designation: string;
    organization: string;
  };
}

export const OFFICIAL_NOTICES: OfficialNotice[] = [
  {
    id: 'notice-2026-01',
    refNo: 'NDCAA/NOT-2026/041',
    title: 'Registration Open for Grand Reunion 2026 & 75th Platinum Jubilee Celebration',
    category: 'Reunion',
    publishedDate: '2026-09-15',
    isUrgent: true,
    summary: 'Online registration is now open for all alumni from Batch 01 (1949) to HSC 2026 for the 3-day Grand Reunion at Notre Dame College Campus, Motijheel.',
    fullContent: `This is to notify all esteemed Notredamians at home and abroad that the Central Organizing Committee of Notre Dame College Alumni Association (NDCAA) cordially invites all former students to register for the 75th Platinum Jubilee Grand Reunion 2026.\n\nDate: December 18-20, 2026\nVenue: Notre Dame College Ground, Motijheel, Dhaka-1000\n\nRegistration Fee includes:\n- Official Reunion Souvenir Book & Crest\n- Commemorative Polo Shirt & ID Badge\n- Full 3-day cultural banquet, dinner, and musical evening\n\nPlease complete your online registration with your NDC Student Roll/Batch ID before November 15, 2026 to ensure souvenir crest engraving.`,
    pdfUrl: '#',
    fileSize: '1.4 MB',
    signatory: {
      name: 'Dr. Shahabuddin Ahmed, Batch 78',
      designation: 'General Secretary',
      organization: 'Notre Dame College Alumni Association'
    }
  },
  {
    id: 'notice-2026-02',
    refNo: 'NDCAA/MEM-2026/028',
    title: 'Application Schedule & Verification for Life Membership Digital Smart Card',
    category: 'Membership',
    publishedDate: '2026-09-10',
    isUrgent: false,
    summary: 'Eligible alumni who have completed their HSC from NDC can now apply for the Life Membership RFID/QR Smart Card with lifelong access to college premises and sports club.',
    fullContent: `All regular alumni of Notre Dame College who have passed HSC or completed their intermediate studies are eligible to apply for Life Membership.\n\nRequired Documents:\n1. Copy of NDC College ID or HSC Transcript/Admit Card\n2. 2 Passport size photographs (digital upload)\n3. Life Membership Subscription: BDT 5,000 / USD 50 (for overseas alumni)\n\nSmart cards can be collected from the Alumni Secretariat, Room 102, Fr. Timm Building or requested for domestic courier delivery.`,
    pdfUrl: '#',
    fileSize: '890 KB',
    signatory: {
      name: 'Kazi Mahfuzur Rahman, Batch 86',
      designation: 'Convener, Membership Verification Committee',
      organization: 'Notre Dame College Alumni Association'
    }
  },
  {
    id: 'notice-2026-03',
    refNo: 'NDCAA/SCH-2026/014',
    title: 'Call for Nominations: Fr. Richard William Timm Memorial Scholarship 2026-27',
    category: 'Scholarship',
    publishedDate: '2026-09-02',
    isUrgent: true,
    summary: 'The Alumni Welfare Trust invites financial aid applications from currently enrolled 1st & 2nd Year HSC students of Notre Dame College.',
    fullContent: `In loving memory of legendary educator and scientist Rev. Fr. Richard William Timm, CSC, the NDCAA Trust Fund will disburse 120 full tuition scholarships for the academic year 2026-27.\n\nCriteria:\n- Demonstrated academic commitment with minimum GPA 4.5 in SSC\n- Verified household financial need or distress\n- College attendance record of at least 85%\n\nApplications can be submitted directly through the Alumni Welfare portal or handed in to Fr. Vice Principal office.`,
    pdfUrl: '#',
    fileSize: '1.1 MB',
    signatory: {
      name: 'Barrister Tanveer Hossain, Batch 92',
      designation: 'Trustee Secretary, Welfare & Education Trust',
      organization: 'Notre Dame College Alumni Association'
    }
  },
  {
    id: 'notice-2026-04',
    refNo: 'NDCAA/AGM-2026/009',
    title: 'Notice for 32nd Annual General Meeting (AGM) and Executive Committee Election',
    category: 'AGM',
    publishedDate: '2026-08-28',
    isUrgent: false,
    summary: 'The 32nd AGM of NDCAA will be held at Fr. Peixotto Auditorium, NDC Campus on Saturday, November 28, 2026 at 10:00 AM.',
    fullContent: `Notice is hereby given that the 32nd Annual General Meeting (AGM) of the General Members of Notre Dame College Alumni Association will be held on Saturday, November 28, 2026 at Fr. Peixotto Auditorium.\n\nAgenda:\n1. Confirmation of minutes of 31st AGM\n2. Presentation & adoption of Annual Activity Report\n3. Presentation of Audited Accounts for FY 2025-26\n4. Approval of Budget for FY 2026-27\n5. Announcement of Election Commission for Executive Committee 2027-29\n6. Address by Chief Patron, Rev. Fr. Dr. Hemanto Rozario, CSC\n\nAll Life Members and Registered General Members are cordially requested to attend.`,
    pdfUrl: '#',
    fileSize: '750 KB',
    signatory: {
      name: 'Engr. Masud Karim, Batch 74',
      designation: 'President',
      organization: 'Notre Dame College Alumni Association'
    }
  },
  {
    id: 'notice-2026-05',
    refNo: 'NDCAA/GEN-2026/017',
    title: 'Inter-Batch Cricket & Football Championship 2026 Tournament Fixtures',
    category: 'General',
    publishedDate: '2026-08-14',
    isUrgent: false,
    summary: 'Fixtures and rules announced for the annual winter sports tournament featuring 48 batch teams from Batch 80 to Batch 2025.',
    fullContent: `The Sports & Recreation Subcommittee has finalized team registrations and schedule for the Inter-Batch Winter Sports Carnival 2026.\n\nVenues: Notre Dame College Main Ground & Sports Pavilion\nInauguration: Friday, October 24, 2026\nFormat: 8-a-side Cricket Tournament & 7-a-side Football Cup.\n\nBatch captains are advised to collect their team kits from the Alumni office by October 18.`,
    pdfUrl: '#',
    fileSize: '2.2 MB',
    signatory: {
      name: 'Sadman Sakib, Batch 2012',
      designation: 'Secretary, Sports & Cultural Affairs',
      organization: 'Notre Dame College Alumni Association'
    }
  }
];

export const BANK_DONATION_INFO = {
  bankName: 'The City Bank Limited',
  branch: 'Motijheel Branch, Dhaka',
  accountTitle: 'Notre Dame College Alumni Association',
  accountNumber: '1102938475001',
  routingNumber: '225272341',
  swiftCode: 'CIBLBDDH',
  bKashMerchant: '01711-923250',
  nagadMerchant: '01819-232500',
  rocketAccount: '01711-923250-9',
  secretariatAddress: 'Alumni Secretariat, Ground Floor, Fr. Timm Building, Notre Dame College, Arambagh, Motijheel, Dhaka-1000, Bangladesh',
  helpline: '+880 2-7192325, +880 1711-923250',
  email: 'alumni@ndc.edu.bd',
};
