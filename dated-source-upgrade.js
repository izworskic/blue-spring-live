(() => {
  const q = s => document.querySelector(s);
  function formatObservedDate(iso) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso || ''))) return null;
    return new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric', timeZone:'UTC' });
  }
  function apply() {
    if (typeof state === 'undefined' || !state?.manatee || !state?.live) return false;
    const m = state.manatee;
    if (state.live.season !== 'manatee') return true;
    const label = formatObservedDate(m.observedDate);
    if (!label || !Number.isFinite(m.count)) return true;
    if (q('#heroTitle')) q('#heroTitle').textContent = `Latest Blue Spring roll call: ${m.count} manatees`;
    if (q('#primaryMetricLabel')) q('#primaryMetricLabel').textContent = 'DATED MORNING ROLL CALL';
    if (q('#primaryMetric')) q('#primaryMetric').textContent = String(m.count);
    if (q('#primaryMetricCaption')) q('#primaryMetricCaption').textContent = `Save the Manatee Club · ${label}`;
    if (q('#stripManatees')) q('#stripManatees').textContent = String(m.count);
    if (q('#manateeFreshness')) q('#manateeFreshness').textContent = `${label} · SMC roll call`;
    const sourceCard = [...document.querySelectorAll('.source-grid article')].find(el => /manatee observations/i.test(el.textContent || ''));
    if (sourceCard) {
      const p = sourceCard.querySelector('p');
      const a = sourceCard.querySelector('a');
      if (p) p.textContent = 'Save the Manatee Club publishes dated Blue Spring morning roll calls during manatee season. Blue Spring Live parses the report date, count and reported river temperature, then keeps that observation separate from live USGS water measurements. Blue Spring Adventures is fallback only if the dated report source is unavailable.';
      if (a) { a.href='https://savethemanatee.org/bssp-manatee-reports/'; a.textContent='Open dated reports ↗'; }
    }
    return true;
  }
  let tries=0;
  const timer=setInterval(()=>{tries+=1;try{if(apply()||tries>40)clearInterval(timer)}catch(e){if(tries>40)clearInterval(timer)}},300);
})();
