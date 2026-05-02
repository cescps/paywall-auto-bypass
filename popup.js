const SERVICES = ['archive.ph', 'archive.is', 'archive.today', '12ft.io', 'outline.com'];

// Curated list shown in the Sites tab — grouped for readability
const SITE_LIST = [
  { host: 'ft.com',               label: 'Financial Times',       group: 'Business' },
  { host: 'wsj.com',              label: 'Wall Street Journal',   group: 'Business' },
  { host: 'bloomberg.com',        label: 'Bloomberg',             group: 'Business' },
  { host: 'economist.com',        label: 'The Economist',         group: 'Business' },
  { host: 'hbr.org',              label: 'Harvard Business Review', group: 'Business' },
  { host: 'nytimes.com',          label: 'New York Times',        group: 'News' },
  { host: 'washingtonpost.com',   label: 'Washington Post',       group: 'News' },
  { host: 'theatlantic.com',      label: 'The Atlantic',          group: 'News' },
  { host: 'newyorker.com',        label: 'New Yorker',            group: 'News' },
  { host: 'thetimes.co.uk',       label: 'The Times',             group: 'News' },
  { host: 'telegraph.co.uk',      label: 'The Telegraph',         group: 'News' },
  { host: 'politico.com',         label: 'Politico',              group: 'News' },
  { host: 'foreignaffairs.com',   label: 'Foreign Affairs',       group: 'News' },
  { host: 'wired.com',            label: 'Wired',                 group: 'Tech' },
  { host: 'technologyreview.com', label: 'MIT Tech Review',       group: 'Tech' },
  { host: 'theinformation.com',   label: 'The Information',       group: 'Tech' },
  { host: 'elpais.com',           label: 'El País',               group: 'ES/CA' },
  { host: 'elmundo.es',           label: 'El Mundo',              group: 'ES/CA' },
  { host: 'expansion.com',        label: 'Expansión',             group: 'ES/CA' },
  { host: 'lavanguardia.com',     label: 'La Vanguardia',         group: 'ES/CA' },
  { host: 'elconfidencial.com',   label: 'El Confidencial',       group: 'ES/CA' },
  { host: 'ara.cat',              label: 'Ara',                   group: 'ES/CA' },
  { host: 'vilaweb.cat',          label: 'VilaWeb',               group: 'ES/CA' },
  { host: 'lemonde.fr',           label: 'Le Monde',              group: 'FR/DE' },
  { host: 'lefigaro.fr',          label: 'Le Figaro',             group: 'FR/DE' },
  { host: 'spiegel.de',           label: 'Der Spiegel',           group: 'FR/DE' },
  { host: 'zeit.de',              label: 'Die Zeit',              group: 'FR/DE' },
  { host: 'handelsblatt.com',     label: 'Handelsblatt',          group: 'FR/DE' },
];

let currentTabId = null;
let currentUrl   = null;
let currentHost  = null;
let selectedService = 0;
let siteSettings = {};

async function load(keys) {
  return new Promise(r => chrome.storage.local.get(keys, r));
}
async function save(obj) {
  return new Promise(r => chrome.storage.local.set(obj, r));
}

function setStatus(type, text) {
  document.getElementById('statusDot').className = `dot ${type}`;
  document.getElementById('statusText').textContent = text;
}

function isSiteEnabled(host, globalDefault) {
  if (siteSettings[host] !== undefined) return siteSettings[host];
  return globalDefault;
}

function makeToggle(checked, onChange) {
  const label = document.createElement('label');
  label.className = 'toggle';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = checked;
  input.addEventListener('change', () => onChange(input.checked));
  const span = document.createElement('span');
  span.className = 'slider';
  label.appendChild(input);
  label.appendChild(span);
  return label;
}

function renderServices(activeIdx) {
  const grid = document.getElementById('serviceGrid');
  grid.innerHTML = '';
  SERVICES.forEach((name, i) => {
    const btn = document.createElement('button');
    btn.className = `svc${i === activeIdx ? ' active' : ''}`;
    btn.textContent = name;
    btn.addEventListener('click', async () => {
      selectedService = i;
      await save({ serviceIndex: i });
      renderServices(i);
    });
    grid.appendChild(btn);
  });
}

function renderSitesList(globalDefault) {
  const list = document.getElementById('sitesList');
  list.innerHTML = '';

  SITE_LIST.forEach(({ host, label, group }) => {
    const enabled = isSiteEnabled(host, globalDefault);

    const row = document.createElement('div');
    row.className = 'site-row';

    const info = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'site-name';
    name.textContent = label;
    const sub = document.createElement('div');
    sub.className = 'site-group';
    sub.textContent = `${host} · ${group}`;
    info.appendChild(name);
    info.appendChild(sub);

    const toggle = makeToggle(enabled, async (val) => {
      siteSettings[host] = val;
      await save({ siteSettings });
      chrome.runtime.sendMessage({ type: 'SET_SITE', host, enabled: val });
    });

    row.appendChild(info);
    row.appendChild(toggle);
    list.appendChild(row);
  });
}

async function init() {
  // Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');
    });
  });

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;
  currentUrl = tab.url;

  const stored = await load(['autoBypass', 'serviceIndex', 'siteSettings']);
  const globalDefault = stored.autoBypass ?? true;
  selectedService = stored.serviceIndex ?? 0;
  siteSettings = stored.siteSettings ?? {};

  renderServices(selectedService);
  renderSitesList(globalDefault);

  // Global toggle (settings tab)
  const autoToggle = document.getElementById('autoToggle');
  autoToggle.checked = globalDefault;
  autoToggle.addEventListener('change', async (e) => {
    await save({ autoBypass: e.target.checked });
    renderSitesList(e.target.checked);
  });

  // Bypass button
  document.getElementById('bypassNow').addEventListener('click', () => {
    if (!currentUrl || !currentTabId) return;
    chrome.runtime.sendMessage({ type: 'BYPASS_NOW', url: currentUrl, tabId: currentTabId, serviceIndex: selectedService });
    window.close();
  });

  // Current site info
  let pageInfo = null;
  try {
    pageInfo = await chrome.tabs.sendMessage(tab.id, { type: 'CHECK_PAYWALL' });
  } catch {}

  currentHost = pageInfo?.host ?? (() => { try { return new URL(tab.url).hostname.replace(/^www\./, ''); } catch { return '—'; } })();
  document.getElementById('currentHost').textContent = currentHost;

  // Per-site toggle (main tab)
  const sitePref = isSiteEnabled(currentHost, globalDefault);
  const siteToggle = document.getElementById('siteToggle');
  siteToggle.checked = sitePref;
  siteToggle.addEventListener('change', async (e) => {
    siteSettings[currentHost] = e.target.checked;
    await save({ siteSettings });
    chrome.runtime.sendMessage({ type: 'SET_SITE', host: currentHost, enabled: e.target.checked });
  });

  // Status
  if (!pageInfo) {
    setStatus('unknown', 'Open a news article to check');
  } else if (pageInfo.detected && pageInfo.isNewsDomain && isSiteEnabled(currentHost, globalDefault)) {
    setStatus('paywall', 'Paywall — will auto-bypass');
  } else if (pageInfo.detected) {
    setStatus('paywall', 'Paywall detected — click to bypass');
  } else if (pageInfo.isNewsDomain) {
    setStatus('clear', 'News site — no paywall');
  } else {
    setStatus('unknown', 'Not a known news site');
  }
}

init();
