/**
 * Risk scoring.
 *
 * risk_score = probability * impact (each 1..5), so scores range 1..25.
 *
 * Levels are derived from the score:
 *   CRITICAL >= 16   (e.g. 4x4, 4x5, 5x4, 5x5)
 *   HIGH     8..15   (e.g. 2x4, 3x3, 3x4, ...)
 *   MEDIUM   4..7    (e.g. 2x2, 1x4, ...)
 *   LOW      1..3    (e.g. 1x1, 1x2, 1x3)
 */
function riskScore(probability, impact) {
  return probability * impact;
}

function riskLevel(score) {
  if (score >= 16) return 'CRITICAL';
  if (score >= 8) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  return 'LOW';
}

module.exports = { riskScore, riskLevel };
