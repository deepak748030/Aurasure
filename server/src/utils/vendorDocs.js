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

function profileComplete(vendor) {
  const base =
    vendor.ownerName &&
    vendor.outletName &&
    vendor.address &&
    vendor.city &&
    vendor.pin &&
    vendor.pan &&
    vendor.bank?.accountNumber &&
    vendor.bank?.ifsc &&
    vendor.bank?.accountName;
  if (!base) return false;
  if (vendor.module === 'food') return Boolean(vendor.fssai);
  return Boolean(vendor.gstin || vendor.tradeLicense);
}

module.exports = { requiredDocuments, emptyDocs, docsComplete, allDocsVerified, profileComplete };
