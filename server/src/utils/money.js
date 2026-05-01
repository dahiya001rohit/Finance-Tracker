function toCents(value) {
  const normalized = Number(value);
  if (!Number.isFinite(normalized)) return NaN;
  return Math.round(normalized * 100);
}

function fromCents(cents) {
  return (Number(cents || 0) / 100).toFixed(2);
}

module.exports = { toCents, fromCents };
