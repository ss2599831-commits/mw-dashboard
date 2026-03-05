function money(n) {
  const v = Math.round(Number(n || 0));
  return v.toLocaleString("zh-TW");
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { money };
}
