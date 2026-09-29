(() => {
  const q = (s) => document.querySelector(s);
  const fmt = (n, digits = 0) => Number.isFinite(n) ? Number(n).toFixed(digits) : '—';
  const temp = (n) => Number.isFinite(n) ? `${Math.round(n)}°F` : '—';

  function floridaParts(date = new Date()) {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York', year: 'numeric', month: 'numeric', day: 'numeric'
    }).formatToParts(date);
    return {
      y: Number(parts.find(p => p.type === 'year')?.value),
      m: Number(parts.find(p => p.type === 'month')?.value),
      d: Number(parts.find(p => p.type === 'day')?.value)
    };
  }

  function daysToNov15(date = new Date()) {
    const { y, m, d } = floridaParts(date);
    const inSeason = (m === 11 && d >= 15) || m === 12 || m <= 3;
    if (inSeason) return 0;
    const start = Date.UTC(y, 10, 15, 12);
    const today = Date.UTC(y, m - 1, d, 12);
    return Math.max(0, Math.ceil((start - today) / 86400000));
  }

  function refugeSignal(live) {
    const w = live?.water || {};
    const river = w?.river?.temperatureF;
    const delta = w?.refugeDeltaF;
    const trend = w?.riverTrend24hF;
    const hours68 = w?.hoursRiverBelow68F24h;
    if (!Number.isFinite(river)) return { label: 'UNKNOWN', detail: 'Current St. Johns River temperature is unavailable.' };
    if (river <= 64 || (Number.isFinite(hours68) && hours68 >= 18 && Number.isFinite(delta) && delta >= 4)) {
      return { label: 'STRONG', detail: 'The St. Johns is well into cold-refuge territory, which favors concentration in the warmer spring.' };
    }
    if (river < 68 && ((Number.isFinite(trend) && trend < -0.5) || (Number.isFinite(hours68) && hours68 >= 6) || (Number.isFinite(delta) && delta >= 3))) {
      return { label: 'BUILDING', detail: 'The river is below the 68°F context line and the thermal refuge signal is strengthening.' };
    }
    if (river < 70 && Number.isFinite(delta) && delta >= 2) {
      return { label: 'MODERATE', detail: 'The spring is warmer than the river, but the refuge signal is not especially strong.' };
    }
    return { label: 'LIMITED', detail: 'Current river temperature does not indicate a strong cold-driven refuge event.' };
  }

  function visitLabel(score, manateeMode) {
    if (manateeMode) {
      if (score >= 72) return 'STRONG';
      if (score >= 58) return 'FAVORABLE';
      if (score >= 42) return 'MIXED';
      return 'LIMITED';
    }
    if (score >= 72) return 'COMFORTABLE';
    if (score >= 58) return 'GOOD';
    if (score >= 42) return 'MIXED';
    return 'LESS IDEAL';
  }

  function installStaticUpgrades() {
    const ctas = q('.cta-row');
    if (ctas) {
      const links = ctas.querySelectorAll('a');
      if (links[0]) {
        links[0].textContent = 'Check day-use reservation';
        links[0].href = 'https://reserve.floridastateparks.org/';
        links[0].target = '_blank';
        links[0].rel = 'noopener';
      }
      if (links[1]) {
        links[1].textContent = 'Open live manatee cam';
        links[1].href = 'https://www.floridastateparks.org/learn/webcam-watch-manatees-blue-spring';
      }
    }

    const liveStrip = q('.live-strip');
    if (liveStrip && !q('.benchmark-webcam')) {
      liveStrip.insertAdjacentHTML('afterend', `
        <section class="section wrap benchmark-webcam" aria-labelledby="cameraDecisionTitle">
          <div class="benchmark-webcam-card">
            <div>
              <p class="kicker">LOOK BEFORE YOU DRIVE</p>
              <h2 id="cameraDecisionTitle">See the spring run, then decide</h2>
              <p>Florida State Parks' Blue Spring webcam is live during the winter manatee season and shows highlights the rest of the year. Use it as a visual check alongside the measured river and spring temperatures.</p>
            </div>
            <div class="benchmark-actions">
              <a class="btn primary" target="_blank" rel="noopener" href="https://www.floridastateparks.org/learn/webcam-watch-manatees-blue-spring">Open official webcam</a>
              <a class="btn secondary" target="_blank" rel="noopener" href="https://reserve.floridastateparks.org/">Check reservation</a>
            </div>
          </div>
        </section>`);
    }

    const briefing = q('.briefing-section');
    if (briefing) {
      const kicker = briefing.querySelector('.section-head .kicker');
      const heading = briefing.querySelector('.section-head h2');
      const intro = briefing.querySelector('.section-head > p');
      if (kicker) kicker.textContent = 'VISITOR BRIEFING';
      if (heading) heading.textContent = 'Before you leave home';
      if (intro) intro.textContent = 'A practical read on when to arrive, where to go first, and what the live conditions actually mean.';
    }

    if (!q('#benchmarkUpgradeStyles')) {
      const style = document.createElement('style');
      style.id = 'benchmarkUpgradeStyles';
      style.textContent = `
        .benchmark-webcam{padding-top:42px;padding-bottom:42px}
        .benchmark-webcam-card{display:grid;grid-template-columns:1.25fr .75fr;gap:28px;align-items:center;background:#fff;border:1px solid var(--line);border-radius:var(--radius);padding:28px;box-shadow:var(--shadow)}
        .benchmark-webcam-card h2{font-size:clamp(28px,3.5vw,44px);margin:0 0 10px}
        .benchmark-webcam-card p:not(.kicker){margin:0;color:var(--muted);max-width:720px}
        .benchmark-actions{display:flex;gap:10px;justify-content:flex-end;flex-wrap:wrap}
        .forecast-card .forecast-score.benchmark-signal{font-size:20px;letter-spacing:-.01em;line-height:1.1;margin-top:8px}
        .forecast-card .forecast-class.benchmark-explain{font-size:11px;color:var(--muted);margin-top:5px}
        .model-clarifier{font-size:12px;color:var(--muted);margin-top:12px}
        @media(max-width:760px){.benchmark-webcam-card{grid-template-columns:1fr}.benchmark-actions{justify-content:flex-start}.benchmark-actions .btn{width:100%}}
      `;
      document.head.appendChild(style);
    }
  }

  function patchLiveExperience() {
    if (typeof state === 'undefined' || !state.live) return false;
    const live = state.live;
    const manatee = state.manatee || {};
    const inSeason = live.season === 'manatee';
    const water = live.water || {};
    const river = water?.river?.temperatureF;
    const spring = water?.spring?.temperatureF;
    const delta = water?.refugeDeltaF;
    const trend = water?.riverTrend24hF;
    const days = typeof forecastDays === 'function' ? forecastDays(live) : [];

    installStaticUpgrades();

    if (inSeason) {
      const signal = refugeSignal(live);
      if (q('#seasonLabel')) q('#seasonLabel').textContent = 'MANATEE SEASON • LIVE CONDITIONS';
      if (q('#decisionBadge')) q('#decisionBadge').textContent = signal.label;
      if (q('#decisionLabel')) q('#decisionLabel').textContent = 'MANATEE REFUGE SIGNAL';
      if (q('#heroTitle')) q('#heroTitle').textContent = manatee?.count != null
        ? `Latest published Blue Spring count: ${manatee.count} manatees`
        : 'Are manatees gathering at Blue Spring today?';
      if (q('#heroReason')) q('#heroReason').textContent = Number.isFinite(river) && Number.isFinite(spring)
        ? `${signal.detail} St. Johns ${temp(river)} · Blue Spring ${temp(spring)} · refuge advantage ${Number.isFinite(delta) ? `${delta >= 0 ? '+' : ''}${fmt(delta, 1)}°F` : 'unavailable'}. The published count may come from an earlier survey morning.`
        : 'Current thermal data are incomplete, so the tool will not imply a strong or weak manatee day from missing measurements.';
      if (q('#primaryMetricLabel')) q('#primaryMetricLabel').textContent = 'LATEST PUBLISHED COUNT';
      if (q('#primaryMetric')) q('#primaryMetric').textContent = manatee?.count ?? '—';
      if (q('#primaryMetricCaption')) q('#primaryMetricCaption').textContent = manatee?.count != null
        ? 'Observation date is not exposed reliably by the source'
        : 'No current published count available';
      if (q('#stripManatees')) q('#stripManatees').textContent = manatee?.count ?? 'Unavailable';
      if (q('#manateeFreshness')) q('#manateeFreshness').textContent = manatee?.count != null ? 'Latest published · date unavailable' : 'No published count';
    } else {
      const daysAway = daysToNov15();
      if (q('#seasonLabel')) q('#seasonLabel').textContent = 'WARM SEASON • MANATEES RETURN NOV. 15';
      if (q('#decisionBadge')) q('#decisionBadge').textContent = 'OFF SEASON';
      if (q('#decisionLabel')) q('#decisionLabel').textContent = 'MANATEE SEASON';
      if (q('#confidenceLabel')) q('#confidenceLabel').textContent = 'Winter refuge season: Nov. 15–Mar. 31';
      if (q('#heroTitle')) q('#heroTitle').textContent = 'Manatee season returns November 15';
      if (q('#heroReason')) q('#heroReason').textContent = `There are ${daysAway} days until the winter refuge season. Swimming season remains open through Nov. 14. Today's water and weather below are for planning a park visit, not evidence of a winter manatee gathering.`;
      if (q('#primaryMetricLabel')) q('#primaryMetricLabel').textContent = 'DAYS TO MANATEE SEASON';
      if (q('#primaryMetric')) q('#primaryMetric').textContent = String(daysAway);
      if (q('#primaryMetricCaption')) q('#primaryMetricCaption').textContent = 'Winter refuge season begins Nov. 15';
      if (q('#stripManatees')) q('#stripManatees').textContent = `${daysAway} days`;
      if (q('#manateeFreshness')) q('#manateeFreshness').textContent = 'Manatee season begins Nov. 15';
    }

    if (days.length && q('#outlookCards')) {
      const best = [...days].sort((a, b) => b.score - a.score)[0];
      q('#outlookCards').innerHTML = days.map(d => {
        const dt = new Date(`${d.date}T12:00:00`);
        const label = visitLabel(d.score, inSeason);
        return `<article class="forecast-card ${d.date === best.date ? 'best' : ''}">
          ${d.date === best.date ? '<span class="best-tag">BEST WINDOW</span>' : '<span></span>'}
          <div>
            <div class="forecast-day">${dt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</div>
            <div class="forecast-score benchmark-signal">${label}</div>
            <div class="forecast-class benchmark-explain">${inSeason ? 'Modeled refuge signal' : 'Visitor conditions'}</div>
          </div>
          <div class="forecast-detail">Ranked from measured water conditions + NWS forecast</div>
        </article>`;
      }).join('');
      if (!q('#outlookCards')?.nextElementSibling?.classList?.contains('model-clarifier')) {
        q('#outlookCards').insertAdjacentHTML('afterend', '<p class="model-clarifier">These labels rank relative visit conditions. They are not a probability of seeing manatees and they do not predict an exact animal count.</p>');
      }
    }

    if (q('#outlookKicker')) q('#outlookKicker').textContent = inSeason ? 'BEST MANATEE MORNING' : 'BEST VISIT WINDOW';
    if (q('#outlookTitle')) q('#outlookTitle').textContent = inSeason ? 'Which morning has the strongest refuge signal?' : 'Pick the most comfortable time to visit';
    if (q('#outlookIntro')) q('#outlookIntro').textContent = inSeason
      ? 'Compare upcoming mornings using measured St. Johns River temperature, the spring’s thermal advantage, recent cooling and the weather forecast.'
      : 'Manatee aggregation is off-season. These windows rank ordinary park comfort while the tool continues tracking live water and weather.';

    const briefing = q('.briefing-section');
    if (briefing) {
      const outerKicker = briefing.querySelector('.section-head .kicker');
      const outerHeading = briefing.querySelector('.section-head h2');
      if (outerKicker) outerKicker.textContent = 'VISITOR BRIEFING';
      if (outerHeading) outerHeading.textContent = 'Before you leave home';
    }
    if (q('#briefingTitle')) q('#briefingTitle').textContent = inSeason ? 'How to use today’s manatee signal' : 'How to use today’s park conditions';
    if (q('#briefingLead')) {
      if (inSeason) {
        const signal = refugeSignal(live);
        q('#briefingLead').textContent = `${signal.label} refuge signal. ${signal.detail} Use the latest published count as an observation, then use the river temperature and trend to understand what is happening now.`;
      } else {
        q('#briefingLead').textContent = `This is not manatee season. Use the live spring temperature, weather and reservation status to plan today's visit; the winter manatee decision mode returns Nov. 15.`;
      }
    }

    if (inSeason && q('#driverList')) {
      const hours = water?.hoursRiverBelow68F24h;
      const drivers = [
        ['ST. JOHNS NOW', temp(river)],
        ['REFUGE ADVANTAGE', Number.isFinite(delta) ? `${delta >= 0 ? '+' : ''}${fmt(delta, 1)}°F` : 'Unavailable'],
        ['BELOW 68°F · 24H', Number.isFinite(hours) ? `${fmt(hours, 1)} hours` : 'Unavailable'],
        ['24-HOUR TREND', Number.isFinite(trend) ? `${trend < 0 ? 'Cooling' : trend > 0 ? 'Warming' : 'Steady'} ${fmt(Math.abs(trend), 1)}°F` : 'Unavailable']
      ];
      q('#driverList').innerHTML = drivers.map(d => `<div class="driver"><span>${d[0]}</span><b>${d[1]}</b></div>`).join('');
    }

    return true;
  }

  installStaticUpgrades();
  let attempts = 0;
  const timer = window.setInterval(() => {
    attempts += 1;
    try {
      if (patchLiveExperience() || attempts > 40) window.clearInterval(timer);
    } catch (error) {
      if (attempts > 40) window.clearInterval(timer);
    }
  }, 250);
})();
