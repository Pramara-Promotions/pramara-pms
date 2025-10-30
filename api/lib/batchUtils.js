// Batch utilities for Phase 2 implementation
// Implements: batch code generator, weight calculator, handover sheet generator

/**
 * Generate a unique batch code
 * Format: PRJ-{projectCode}-SKU-{skuCode}-{YYYYMMDD}-{seq}
 */
function generateBatchCode(projectCode, skuCode, sequenceNumber) {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const seq = String(sequenceNumber).padStart(3, '0');
  return `PRJ-${projectCode}-SKU-${skuCode}-${date}-${seq}`;
}

/**
 * Calculate quantity from weight
 * Returns: { calculatedQty, method: 'weighed' }
 */
function calculateQuantityFromWeight(totalWeight, containerWeight, unitWeight) {
  if (typeof totalWeight !== 'number' || typeof containerWeight !== 'number' || typeof unitWeight !== 'number' || unitWeight === 0) {
    throw new Error('Invalid weight parameters');
  }
  const calculatedQty = Math.round((totalWeight - containerWeight) / unitWeight);
  return { calculatedQty, method: 'weighed' };
}

/**
 * Generate handover sheet (stub)
 * Returns: URL to printable handover sheet
 */
function generateHandoverSheet(batch, station) {
  // In real implementation, generate PDF and return URL
  return `/api/batches/${batch.id}/handover-sheet`;
}

module.exports = {
  generateBatchCode,
  calculateQuantityFromWeight,
  generateHandoverSheet
};
