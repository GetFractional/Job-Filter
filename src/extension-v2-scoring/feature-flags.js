/**
 * Job Filter - Feature Flags
 *
 * Simple storage-backed flags for gated features.
 * Default is OFF for safety.
 */
(function initFeatureFlags(root) {
  const STORAGE_KEY = 'jh_feature_flags';
  const DEFAULT_FLAGS = {
    enableSidePanel: false,
    enableApplicationEvents: false,
    enableJobMetadataFields: false
  };

  function mergeWithDefaults(flags) {
    return { ...DEFAULT_FLAGS, ...(flags || {}) };
  }

  async function getFlags() {
    if (!chrome?.storage?.local) {
      return { ...DEFAULT_FLAGS };
    }
    const result = await chrome.storage.local.get([STORAGE_KEY]);
    return mergeWithDefaults(result[STORAGE_KEY]);
  }

  async function setFlags(nextFlags) {
    if (!chrome?.storage?.local) {
      return mergeWithDefaults(nextFlags);
    }
    const merged = mergeWithDefaults(nextFlags);
    await chrome.storage.local.set({ [STORAGE_KEY]: merged });
    return merged;
  }

  async function updateFlags(patch) {
    const current = await getFlags();
    const merged = { ...current, ...(patch || {}) };
    return setFlags(merged);
  }

  root.JobFilterFlags = {
    STORAGE_KEY,
    DEFAULT_FLAGS,
    mergeWithDefaults,
    getFlags,
    setFlags,
    updateFlags
  };
})(typeof self !== 'undefined' ? self : window);
