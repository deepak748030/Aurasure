'use strict';

const REQUIRED = [
  { key: 'aadhaar', label: 'Aadhaar Card' },
  { key: 'drivingLicense', label: 'Driving Licence' },
  { key: 'pan', label: 'PAN Card' },
  { key: 'vehicle', label: 'Vehicle Registration' },
  { key: 'photo', label: 'Profile Photo' },
];

function requiredDocuments() {
  return REQUIRED;
}

/**
 * Find a document entry regardless of whether the profile holds an array of
 * `{key,label,uri,verified,note}` rows or an object keyed by document name.
 */
function findDocument(rider, key) {
  const docs = rider?.documents || {};
  if (Array.isArray(docs)) return docs.find((d) => d.key === key) || null;
  return docs[key] || null;
}

function documentState(rider, key) {
  const doc = findDocument(rider, key);
  if (!doc) return 'missing';
  return doc.verified
    ? 'verified'
    : doc.status === 'pending'
      ? 'pending'
      : doc.uri
        ? 'submitted'
        : 'missing';
}

function allDocsVerified(rider) {
  return REQUIRED.every((d) => documentState(rider, d.key) === 'verified');
}

function missingDocuments(rider) {
  return REQUIRED.filter((d) => documentState(rider, d.key) !== 'verified').map((d) => d.key);
}

/** Initial empty document slots for a freshly-registered rider. */
function emptyDocs() {
  return REQUIRED.map((d) => ({
    key: d.key,
    label: d.label,
    uri: '',
    verified: false,
    note: '',
  }));
}

/**
 * All required documents have been uploaded (they do not need admin
 * verification yet; `allDocsVerified` is the stricter go-live check).
 */
function docsComplete(rider) {
  return REQUIRED.every((d) => documentState(rider, d.key) !== 'missing');
}

function profileComplete(rider) {
  if (!rider || !rider.name || !rider.phone) return false;
  if (!rider.city || !rider.pincode || !/^\d{6}$/.test(String(rider.pincode))) return false;
  if (!rider.address) return false;
  if (
    !rider.vehicleType ||
    !rider.vehicleNumber ||
    !rider.pan ||
    !rider.aadhaar ||
    !rider.drivingLicense ||
    !rider.rcNumber
  ) return false;
  if (
    !rider.bank ||
    !rider.bank.accountName ||
    !rider.bank.accountNumber ||
    !rider.bank.ifsc ||
    !rider.bank.bankName
  ) {
    return false;
  }
  return true;
}

function onboardingProgress(rider) {
  const checks = [
    { key: 'profile', label: 'Personal details', done: !!(rider.name && rider.phone) },
    { key: 'vehicle', label: 'Vehicle details', done: !!(rider.vehicleType && rider.vehicleNumber) },
    {
      key: 'bank',
      label: 'Bank details',
      done: !!(rider.bank && rider.bank.accountName && rider.bank.accountNumber && rider.bank.ifsc),
    },
    {
      key: 'documents',
      label: 'Documents',
      done: REQUIRED.every((d) => documentState(rider, d.key) === 'verified'),
    },
    {
      key: 'training',
      label: 'Onboarding & training',
      done: !!(rider.trainingCompleted && rider.quizCompleted),
    },
  ];
  const done = checks.filter((c) => c.done).length;
  return { checks, done, total: checks.length, percent: Math.round((done / checks.length) * 100) };
}

module.exports = {
  requiredDocuments,
  findDocument,
  documentState,
  emptyDocs,
  docsComplete,
  allDocsVerified,
  missingDocuments,
  profileComplete,
  onboardingProgress,
};
