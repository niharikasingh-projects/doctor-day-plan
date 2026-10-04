// Simulated integration with an external medical licensing authority.
//
// In production this would call the real registry's verification API (e.g. an
// NMC/state medical council endpoint) with the license number and return
// whether it is on record. No such public API exists for this demo, so the
// dummy implementation below only validates the license number FORMAT and
// reports it as the authority's verdict. Swap `callLicensingAuthority` for a
// real HTTP call when a live endpoint is available — the response shape
// { valid, message, authority, referenceId } should stay the same so callers
// do not need to change.
const { isValidLicenseNumber } = require('./validators');

const AUTHORITY_NAME = 'National Medical Registry (Demo)';

// Simulates network latency so the frontend's "Verifying..." state is visible.
const simulateNetworkDelay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const callLicensingAuthority = async (licenseNumber) => {
  await simulateNetworkDelay(400);

  const trimmed = String(licenseNumber || '').trim();
  if (!isValidLicenseNumber(trimmed)) {
    return {
      valid: false,
      message: 'License number is invalid.',
      authority: AUTHORITY_NAME,
    };
  }

  return {
    valid: true,
    message: 'License number verified successfully.',
    authority: AUTHORITY_NAME,
    referenceId: `DEMO-VERIFY-${trimmed.toUpperCase()}`,
  };
};

module.exports = { callLicensingAuthority, AUTHORITY_NAME };
