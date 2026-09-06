'use strict';

/** Required KYC slots — food vs shop. Admin verifies each before approval. */
function requiredDocuments(module) {
  const common = [
    { key: 'aadhaar', label: 'Owner Aadhaar (front + back)' },
    { key: 'pan', label: 'PAN card' },
    { key: 'gst', label: 'GST certificate (or declaration if unregistered)' },
    { key: 'bank', label: 'Cancelled cheque / bank passbook' },
    { key: 'outlet', label: 'Outlet / storefront photo' },
    { key: 'interior', label: 'Kitchen or shop floor photo' },
  ];
  if (module === 'food') {
    return [
      ...common,
      { key: 'fssai', label: 'FSSAI license' },
      { key: 'menu', label: 'Current menu photo' },
    ];
  }
  return [
    ...common,
    { key: 'trade', label: 'Trade / shop license' },
    { key: 'inventory', label: 'Inventory / aisle photo' },
  ];
}

function emptyDocs(module) {
  return requiredDocuments(module).map((d) => ({ ...d, uri: '', verified: false, note: '' }));
}

function docsComplete(vendor) {
  const needed = requiredDocuments(vendor.module);
  const byKey = new Map((vendor.documents || []).map((d) => [d.key, d]));
  return needed.every((slot) => {
    const doc = byKey.get(slot.key);
    return doc && String(doc.uri || '').trim().length > 8;
  });
}

function allDocsVerified(vendor) {
  const needed = requiredDocuments(vendor.module);
  const byKey = new Map((vendor.documents || []).map((d) => [d.key, d]));
  return needed.every((slot) => byKey.get(slot.key)?.verified === true);
}

const has = (value) => String(value ?? '').trim().length > 0;

/**
 * Which required profile fields are still empty.
 *
 * Returned as labels so `submit` can tell the vendor exactly what to fix
 * instead of a blanket "fill outlet, KYC and bank details", which left them
 * tapping a button that silently did nothing.
 */
function missingProfileFields(vendor) {
  const missing = [];
  // `ownerName` is set at registration and has no field on the onboarding
  // form, so fall back to the account name rather than blocking submission.
  if (!has(vendor.ownerName) && !has(vendor.name)) missing.push('Owner name');
  if (!has(vendor.outletName)) missing.push('Outlet name');
  if (!has(vendor.address)) missing.push('Street address');
  if (!has(vendor.city)) missing.push('City');
  if (!has(vendor.pin)) missing.push('PIN code');
  if (!has(vendor.pan)) missing.push('PAN');
  if (!has(vendor.bank?.accountName)) missing.push('Bank account holder');
  if (!has(vendor.bank?.accountNumber)) missing.push('Bank account number');
  if (!has(vendor.bank?.ifsc)) missing.push('IFSC');
  if (vendor.module === 'food') {
    if (!has(vendor.fssai)) missing.push('FSSAI license number');
  } else if (!has(vendor.gstin) && !has(vendor.tradeLicense)) {
    missing.push('GSTIN or trade license');
  }
  return missing;
}

function profileComplete(vendor) {
  return missingProfileFields(vendor).length === 0;
}

/** Labels of the required document slots that have no upload yet. */
function missingDocumentLabels(vendor) {
  const byKey = new Map((vendor.documents || []).map((d) => [d.key, d]));
  return requiredDocuments(vendor.module)
    .filter((slot) => {
      const doc = byKey.get(slot.key);
      return !doc || String(doc.uri || '').trim().length <= 8;
    })
    .map((slot) => slot.label);
}

module.exports = {
  requiredDocuments,
  emptyDocs,
  docsComplete,
  allDocsVerified,
  profileComplete,
  missingProfileFields,
  missingDocumentLabels,
};
