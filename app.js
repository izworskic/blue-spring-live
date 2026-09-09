const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const state = { live:null, manatee:null, duration:'60', persona:'family', goal:'manatee' };
const fmt = (n,d=0) => Number.isFinite(n) ? n.toFixed(d) : '—';
const f = n => Number.isFinite(n) ? `${Math.round(n)}°F` : '—';
const now = () => new Date();
const localDate = iso => iso ? new Date(iso).toLocaleString('en-US',{timeZone:'America/New_York',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}) : 'Unknown time';

function floridaMonthDay(date=new Date()){
  const parts=new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',month:'numeric',day:'numeric'}).formatToParts(date);
  return {m:Number(parts.find(p=>p.type==='month')?.value),d:Number(parts.find(p=>p.type==='day')?.value)};
}
function floridaHour(iso){return Number(new Intl.DateTimeFormat('en-US',{timeZone:'America/New_York',hour:'2-digit',hour12:false}).format(new Date(iso)))}
function manateeSeason(date=new Date()){
  const {m,d}=floridaMonthDay(date);return (m===11&&d>=15)||m===12||m<=3;
}
function classify(score){ if(score>=85)return'EXCEPTIONAL'; if(score>=72)return'VERY GOOD'; if(score>=58)return'GOOD'; if(score>=42)return'FAIR'; return'POOR'; }
function dayScore(hourly, water, dateStr, season){
  const rows=hourly.filter(h=>h.startTime.slice(0,10)===dateStr);
  const dawn=rows.filter(h=>{const hr=floridaHour(h.startTime);return hr>=6&&hr<=10});
  const low=rows.length?Math.min(...rows.map(h=>h.temperature)):null;
  const rain=dawn.length?dawn.reduce((a,b)=>a+(b.precipitationProbability||0),0)/dawn.length:0;
  const comfort=dawn.length?dawn.reduce((a,b)=>a+Math.max(0,100-Math.abs(66-b.temperature)*2.2-(b.precipitationProbability||0)*.45),0)/dawn.length:55;
  if(!season) return Math.max(0,Math.min(100,Math.round(comfort*.64 + (rain<25?24:rain<50?12:2) + 8)));
  const river=water?.river?.temperatureF; const delta=water?.refugeDeltaF; const trend=water?.riverTrend24hF;
  let thermal=45;
  if(Number.isFinite(river)) thermal += Math.max(-25,Math.min(35,(68-river)*4));
  if(Number.isFinite(delta)) thermal += Math.max(-10,Math.min(25,(delta-2)*2.3));
  if(Number.isFinite(trend)) thermal += Math.max(-12,Math.min(12,-trend*2));
  if(Number.isFinite(low)) thermal += Math.max(-10,Math.min(15,(52-low)*.7));
  thermal=Math.max(0,Math.min(100,thermal));
  return Math.round(thermal*.78+comfort*.22);
}
function forecastDays(live){
  const hourly=live?.weather?.hourly||[]; const season=live?.season==='manatee';
  const dates=[...new Set(hourly.map(h=>h.startTime.slice(0,10)))].slice(0,7);
  const scores=dates.map(date=>({date,score:dayScore(hourly,live.water,date,season)}));
  return scores;
}
function confidence(live, manatee){
  let score=100;
  if(!live?.ok) return {label:'LOW',score:20};
  const ages=[live.water?.spring?.observedAt,live.water?.river?.observedAt].filter(Boolean).map(x=>(Date.now()-new Date(x).getTime())/3600000);
  if(!ages.length) score-=40; else if(Math.max(...ages)>6)score-=25; else if(Math.max(...ages)>2)score-=10;
  if(!live.weather?.hourly?.length)score-=30;
  if(live.season==='manatee' && (!manatee?.count || manatee.freshness==='published-undated'))score-=15;
  return {score,label:score>=80?'HIGH':score>=55?'MEDIUM':'LOW'};
}
function tonightLow(hourly){
  if(!hourly?.length)return null;
  const rows=hourly.slice(0,14).filter(h=>Number.isFinite(h.temperature));
  return rows.length?Math.min(...rows.map(x=>x.temperature)):null;
}
function currentWeather(hourly){return hourly?.[0]||null}
function renderHero(){
  const l=state.live,m=state.manatee,season=l?.season==='manatee';const conf=confidence(l,m); const days=forecastDays(l||{});const best=days.length?[...days].sort((a,b)=>b.score-a.score)[0]:null; const current=days[0];
  $('#seasonLabel').textContent=season?'MANATEE SEASON • BLUE SPRING LIVE':'SPRING DAY • BLUE SPRING LIVE';
  $('#heroFreshness').textContent=l?.ok?`Live water updated ${localDate(l.water?.river?.observedAt)}`:'Live sources partially unavailable';
  const score=current?.score??50; $('#decisionBadge').textContent=classify(score); $('#decisionLabel').textContent=season?"TODAY'S MANATEE VISIT OUTLOOK":"TODAY'S BLUE SPRING OUTLOOK"; $('#confidenceLabel').textContent=`Confidence: ${conf.label}`;
  if(season){
    $('#heroTitle').textContent=best?`${classify(best.score)} manatee opportunity ${new Date(best.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})}`:'Manatee conditions at Blue Spring';
    const rv=l?.water?.river?.temperatureF,sp=l?.water?.spring?.temperatureF,dt=l?.water?.refugeDeltaF;
    $('#heroReason').textContent=Number.isFinite(rv)&&Number.isFinite(sp)?`St. Johns ${f(rv)} • Blue Spring ${f(sp)} • thermal refuge advantage ${fmt(dt,1)}°F. ${best?'We rank the next mornings from these live conditions.':''}`:'Waiting for live thermal inputs.';
    $('#primaryMetricLabel').textContent='LATEST PUBLISHED COUNT';
    $('#primaryMetric').textContent=m?.count!=null?m.count:'—';
    $('#primaryMetricCaption').textContent=m?.count!=null?'Published count • observation date not exposed':'Published count unavailable right now';
  } else {
    $('#heroTitle').textContent=`${classify(score)} Blue Spring day`;
    const w=currentWeather(l?.weather?.hourly); $('#heroReason').textContent=w?`${w.temperature}°F now • ${w.shortForecast}. Swimming season is open through November 14, subject to park conditions.`:'Swimming season is open; live weather is loading.';
    $('#primaryMetricLabel').textContent='TODAY’S SPRING DAY SCORE'; $('#primaryMetric').textContent=String(score); $('#primaryMetricCaption').textContent='Weather + water + visitor comfort';
  }
  $('#springTemp').textContent=f(l?.water?.spring?.temperatureF);$('#riverTemp').textContent=f(l?.water?.river?.temperatureF);$('#thermalDelta').textContent=Number.isFinite(l?.water?.refugeDeltaF)?`${l.water.refugeDeltaF>=0?'+':''}${fmt(l.water.refugeDeltaF,1)}°F`:'—';$('#tonightLow').textContent=f(tonightLow(l?.weather?.hourly));
}
function renderStrip(){const l=state.live,m=state.manatee,w=currentWeather(l?.weather?.hourly);$('#stripManatees').textContent=l?.season==='manatee'?(m?.count??'Unavailable'):'Winter feed';$('#manateeFreshness').textContent=m?.count!=null?'Latest published • undated':'Count feed seasonal / unavailable';$('#stripRiver').textContent=f(l?.water?.river?.temperatureF); const tr=l?.water?.riverTrend24hF;$('#stripRiverTrend').textContent=Number.isFinite(tr)?`${tr>0?'↑':'↓'} ${Math.abs(tr).toFixed(1)}° / 24h`:'USGS';$('#stripSpring').textContent=f(l?.water?.spring?.temperatureF);$('#stripDelta').textContent=Number.isFinite(l?.water?.refugeDeltaF)?`${l.water.refugeDeltaF>=0?'+':''}${fmt(l.water.refugeDeltaF,1)}°F`:'—';$('#stripWeather').textContent=w?`${w.temperature}°F`:'—';$('#stripWeatherDetail').textContent=w?.shortForecast||'NWS'}
function renderOutlook(){const l=state.live;const days=forecastDays(l||{});const season=l?.season==='manatee';$('#outlookKicker').textContent=season?'BEST MORNING THIS WEEK':'BEST BLUE SPRING WINDOWS';$('#outlookTitle').textContent=season?'Which morning should you go?':'Pick the best day to visit';$('#outlookIntro').textContent=season?'This ranking is a thermal visit-opportunity outlook, not a predicted census count.':'Weather, rain and visitor comfort are combined into a simple day ranking.'; if(!days.length){$('#outlookCards').innerHTML='<div class="forecast-card"><b>Forecast unavailable</b><span class="forecast-detail">NWS data did not load.</span></div>';return}
  const best=[...days].sort((a,b)=>b.score-a.score)[0];$('#outlookCards').innerHTML=days.map(d=>{const dt=new Date(d.date+'T12:00:00');return `<article class="forecast-card ${d.date===best.date?'best':''}">${d.date===best.date?'<span class="best-tag">★ BEST</span>':'<span></span>'}<div><div class="forecast-day">${dt.toLocaleDateString('en-US',{weekday:'short'}).toUpperCase()}</div><div class="forecast-score">${d.score}</div><div class="forecast-class">${classify(d.score)}</div></div><div class="forecast-detail">${season?'Manatee opportunity':'Visit score'}</div></article>`}).join('');
  const water=l?.water;const cold=Number.isFinite(water?.river?.temperatureF)?water.river.temperatureF<68:false; const trend=water?.riverTrend24hF;$('#whyTitle').textContent=season?`${new Date(best.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})} currently ranks highest`:`${new Date(best.date+'T12:00:00').toLocaleDateString('en-US',{weekday:'long'})} looks best`;
  $('#whyText').textContent=season?'The ranking weights the river’s cold state, the spring’s thermal advantage, water-temperature trend, overnight air temperature and visitor weather.':'The ranking weights comfortable temperatures and lower rain risk while preserving the park’s seasonal rules.';
  const drivers=season?[["PRIMARY DRIVER",cold?`St. Johns is ${f(water?.river?.temperatureF)}`:`St. Johns is ${f(water?.river?.temperatureF)} — not strongly cold yet`],["THERMAL ADVANTAGE",Number.isFinite(water?.refugeDeltaF)?`${water.refugeDeltaF>=0?'+':''}${fmt(water.refugeDeltaF,1)}°F spring vs. river`:'Unavailable'],["24-HOUR TREND",Number.isFinite(trend)?`${trend<0?'Cooling':'Warming'} ${Math.abs(trend).toFixed(1)}°F`:'Unavailable']]:[["WEATHER",currentWeather(l?.weather?.hourly)?.shortForecast||'Forecast unavailable'],["SPRING WATER",f(water?.spring?.temperatureF)],["ACCESS",'Day-use reservation required']];$('#driverList').innerHTML=drivers.map(d=>`<div class="driver"><span>${d[0]}</span><b>${d[1]}</b></div>`).join('')
}

function renderConditionShift(){
  const l=state.live, hourly=l?.weather?.hourly||[], season=l?.season==='manatee';
  const kicker=$('#signalKicker'), title=$('#signalTitle'), text=$('#signalText'), stats=$('#signalStats');
  if(!hourly.length){title.textContent='Forecast shift unavailable';text.textContent='The NWS hourly forecast did not load, so no forward condition signal is shown.';stats.innerHTML='';return}
  const next48=hourly.slice(0,48).filter(h=>Number.isFinite(h.temperature));
  const current=next48[0]?.temperature;
  const coldest=next48.reduce((a,b)=>!a||b.temperature<a.temperature?b:a,null);
  const warmest=next48.reduce((a,b)=>!a||b.temperature>a.temperature?b:a,null);
  if(season){
    kicker.textContent='NEXT MANATEE-MOVING COLD SIGNAL';
    const drop=Number.isFinite(current)&&coldest?current-coldest.temperature:null;
    const strength=coldest?.temperature<=45&&drop>=8?'STRONG':(coldest?.temperature<=50||drop>=8?'MODERATE':'WEAK');
    title.textContent=`${strength} atmospheric cold signal`;
    text.textContent=`The coldest forecast hour is ${coldest?f(coldest.temperature):'—'} around ${coldest?localDate(coldest.startTime):'an unknown time'}. Air temperature is forcing, not the manatee response itself; the live St. Johns gauge confirms whether the river actually cools enough to strengthen the refuge signal.`;
    stats.innerHTML=`<div class="signal-stat"><span>48-HR LOW</span><b>${coldest?f(coldest.temperature):'—'}</b></div><div class="signal-stat"><span>AIR-TEMP DROP</span><b>${Number.isFinite(drop)?`${drop>0?'↓ ':''}${Math.abs(drop).toFixed(0)}°F`:'—'}</b></div><div class="signal-stat wide"><span>WHAT HAPPENS NEXT</span><b>Cold forcing → river response → dawn refuge opportunity</b></div>`;
  }else{
    kicker.textContent='NEXT SPRING-DAY CONDITION SHIFT';
    const rain=next48.reduce((a,b)=>a+(b.precipitationProbability||0),0)/Math.max(1,next48.length);
    title.textContent=rain<25?'Generally favorable next 48 hours':'Watch the rain windows';
    text.textContent=`The next 48 hours range from ${coldest?f(coldest.temperature):'—'} to ${warmest?f(warmest.temperature):'—'}. Off-season scoring emphasizes comfortable air temperatures and lower rain risk while keeping live spring conditions visible.`;
    stats.innerHTML=`<div class="signal-stat"><span>48-HR LOW</span><b>${coldest?f(coldest.temperature):'—'}</b></div><div class="signal-stat"><span>48-HR HIGH</span><b>${warmest?f(warmest.temperature):'—'}</b></div><div class="signal-stat wide"><span>AVG. HOURLY RAIN SIGNAL</span><b>${Math.round(rain)}%</b></div>`;
  }
}

function chart(){const hist=state.live?.water?.history;if(!hist?.river?.length||!hist?.spring?.length){return}const all=[...hist.river,...hist.spring].filter(x=>Number.isFinite(x.temperatureF)); if(!all.length)return;const min=Math.floor(Math.min(...all.map(x=>x.temperatureF))-2),max=Math.ceil(Math.max(...all.map(x=>x.temperatureF))+2),w=760,h=300,p=38;const t0=Math.min(...all.map(x=>new Date(x.time))),t1=Math.max(...all.map(x=>new Date(x.time)));const x=t=>p+(new Date(t)-t0)/(t1-t0||1)*(w-p*2),y=v=>h-p-(v-min)/(max-min||1)*(h-p*2);const path=arr=>arr.map((r,i)=>`${i?'L':'M'}${x(r.time).toFixed(1)},${y(r.temperatureF).toFixed(1)}`).join(' ');let g='';for(let v=Math.ceil(min/2)*2;v<=max;v+=2)g+=`<line x1="${p}" y1="${y(v)}" x2="${w-p}" y2="${y(v)}" stroke="#dce5e1"/><text x="2" y="${y(v)+4}" font-size="11" fill="#70878a">${v}°</text>`;$('#tempChart').innerHTML=`${g}<path d="${path(hist.spring)}" fill="none" stroke="#3caea3" stroke-width="4" stroke-linecap="round"/><path d="${path(hist.river)}" fill="none" stroke="#184b61" stroke-width="4" stroke-linecap="round"/><line x1="${p}" y1="${y(68)}" x2="${w-p}" y2="${y(68)}" stroke="#d4a84d" stroke-dasharray="7 6"/><text x="${w-p-110}" y="${y(68)-6}" font-size="10" fill="#8f6b25">68°F context</text>`;const r=state.live.water.river.temperatureF,s=state.live.water.spring.temperatureF;$('#chartSummary').textContent=`Latest: Blue Spring ${f(s)}, St. Johns ${f(r)}. Thermal difference ${Number.isFinite(s-r)?(s-r).toFixed(1)+'°F':'—'}.`}
const poi={entrance:['Park entrance','Day-use reservations are required. Have the reservation ready before arriving; park hours are 8 a.m. to sunset.','Best for: Arrival','When: Before 8 AM queue context'],thursby:['Thursby House','Historic 1872 house near the river. A good second stop after wildlife viewing, especially for a two-hour or half-day visit.','Best for: History','When: After spring run'],boardwalk:['Spring Run boardwalk','During manatee season, make this your first stop. The accessible boardwalk follows the spring run and gives elevated wildlife viewing without entering the refuge.','Best for: Manatee viewing','When: Early visit'],boil:['Blue Spring Boil','The headspring is the upstream end of the spring run. Continue here for the full spring-walk experience and a different perspective on the clear water.','Best for: Spring geology','When: After boardwalk'],cruise:['St. Johns River cruise','Blue Spring Adventures lists daily nature cruises. Verify current times and availability before building it into a tight itinerary.','Best for: Wildlife + river','When: Longer visits'],trail:['Pine Island Trail','A longer nature option through several habitat types. Better suited to a half-day visit than a short manatee stop.','Best for: Hiking','When: Half day']};
function bindMap(){ $$('.poi').forEach(b=>b.onclick=()=>{const v=poi[b.dataset.poi];$('#poiCard').innerHTML=`<p class="kicker">SELECTED STOP</p><h3>${v[0]}</h3><p>${v[1]}</p><div class="poi-meta"><span>${v[2]}</span><span>${v[3]}</span></div>`}) }
function plan(){const season=state.live?.season==='manatee';const dur=Number(state.duration);let steps=[];let headline='A focused Blue Spring visit';if(season){headline=state.persona==='photographer'?'Start with the spring run at opening light conditions':'Manatees first, everything else second';steps=[['8:00','Spring Run boardwalk','Go directly to the manatee viewing corridor while morning aggregation is strongest.'],['8:25','Continue toward the headspring','Work your way toward Blue Spring Boil for different viewing angles and context.']];if(dur>=120)steps.push(['9:00','Thursby House','Add the historic river story after your primary wildlife window.']);if(dur>=240)steps.push(['10:00','River experience or trail','Consider the St. Johns cruise or a nature trail after verifying current availability.'])}else{headline=state.goal==='spring'?'Use the spring early, then expand outward':'Start with the spring, then layer in the park';steps=[['8:00','Spring run / swimming area','Start early for cooler air and a calmer first part of the day.'],['9:00','Spring Walk','Walk the boardwalk to the headspring and take in the spring system.']];if(dur>=120)steps.push(['10:00','Thursby House','Add the park’s river and steamboat history.']);if(dur>=240)steps.push(['11:00','Cruise or Pine Island Trail','Choose river wildlife or a longer hike based on weather and energy.'])}if(state.persona==='mobility')steps=steps.map((s,i)=>i===0?s:[s[0],i===1?'Accessible Spring Run boardwalk':s[1],i===1?'Prioritize the accessible boardwalk and verified facilities; avoid adding a long trail unless appropriate.':s[2]]);if(state.persona==='photographer')steps[0][2]+=' Check cloud cover and keep wildlife disturbance low.';$('#planHeadline').textContent=headline;$('#planTime').textContent=dur===60?'60 MIN':dur===120?'2 HOURS':'HALF DAY';$('#planSteps').innerHTML=steps.map(s=>`<li><time>${s[0]}</time><b>${s[1]}</b><span>${s[2]}</span></li>`).join('')}
function bindPlanner(){ $$('.chips').forEach(group=>group.addEventListener('click',e=>{if(e.target.tagName!=='BUTTON')return;group.querySelectorAll('button').forEach(x=>x.classList.remove('selected'));e.target.classList.add('selected');state[group.dataset.group]=e.target.dataset.value;plan()})) }
async function load(){bindPlanner();bindMap();plan();try{const [l,m]=await Promise.all([fetch('/api/live').then(r=>r.json()),fetch('/api/manatee').then(r=>r.json())]);state.live=l;state.manatee=m}catch(e){state.live={ok:false,season:manateeSeason()?'manatee':'water-activity',weather:{hourly:[]},water:{}};state.manatee={count:null}}renderHero();renderStrip();renderOutlook();renderConditionShift();chart();plan()}
load();
