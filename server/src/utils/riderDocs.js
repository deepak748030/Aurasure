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

/**
 * Which required profile fields are still empty, as human labels, so the
 * submit endpoint can say exactly what is blocking instead of a vague
 * "fill personal, vehicle and bank details".
 */
function missingProfileFields(rider) {
  const missing = [];
  if (!rider) return ['Profile'];
  const has = (value) => String(value ?? '').trim().length > 0;
  if (!has(rider.name)) missing.push('Full name');
  if (!has(rider.phone)) missing.push('Phone number');
  if (!has(rider.city)) missing.push('City');
  if (!/^\d{6}$/.test(String(rider.pincode ?? ''))) missing.push('6-digit PIN code');
  if (!has(rider.address)) missing.push('Home address');
  if (!has(rider.vehicleType)) missing.push('Vehicle type');
  if (!has(rider.vehicleNumber)) missing.push('Registration number');
  if (!has(rider.pan)) missing.push('PAN');
  if (!has(rider.aadhaar)) missing.push('Aadhaar');
  if (!has(rider.drivingLicense)) missing.push('Driving licence');
  if (!has(rider.rcNumber)) missing.push('RC number');
  if (!has(rider.bank?.accountName)) missing.push('Bank account holder');
  if (!has(rider.bank?.accountNumber)) missing.push('Bank account number');
  if (!has(rider.bank?.ifsc)) missing.push('IFSC');
  if (!has(rider.bank?.bankName)) missing.push('Bank name');
  return missing;
}

function profileComplete(rider) {
  return missingProfileFields(rider).length === 0;
}

/** Labels of required document slots with no upload yet. */
function missingDocumentLabels(rider) {
  return REQUIRED.filter((d) => documentState(rider, d.key) === 'missing').map((d) => d.label);
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
  missingDocumentLabels,
  missingProfileFields,
  profileComplete,
  onboardingProgress,
};
