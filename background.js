const ARCHIVE_SERVICES = [
  { name: 'archive.ph',    url: (u) => `https://archive.ph/newest/${encodeURIComponent(u)}` },
  { name: 'archive.is',    url: (u) => `https://archive.is/newest/${encodeURIComponent(u)}` },
  { name: 'archive.today', url: (u) => `https://archive.today/newest/${encodeURIComponent(u)}` },
  { name: '12ft.io',       url: (u) => `https://12ft.io/proxy?q=${encodeURIComponent(u)}` },
  { name: 'outline.com',   url: (u) => `https://outline.com/${encodeURIComponent(u)}` },
];

const SELF_DOMAINS = ['archive.ph', 'archive.is', 'archive.today', '12ft.io', 'outline.com'];

function isExcluded(url) {
  try {
    const { hostname, protocol } = new URL(url);
    if (protocol === 'chrome:' || protocol === 'chrome-extension:') return true;
    const host = hostname.replace(/^www\./, '');
    return SELF_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  } catch { return true; }
}

async function getSettings() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['autoBypass', 'serviceIndex', 'siteSettings'], (r) => {
      resolve({
        autoBypass:   r.autoBypass   ?? true,
        serviceIndex: r.serviceIndex ?? 0,
        siteSettings: r.siteSettings ?? {},
      });
    });
  });
}

// Returns true if auto-bypass is allowed for this host.
// siteSettings[host] === false → explicitly disabled by user.
// siteSettings[host] === true  → explicitly enabled.
// undefined → follow global autoBypass.
function isSiteEnabled(host, { autoBypass, siteSettings }) {
  if (siteSettings[host] === false) return false;
  if (siteSettings[host] === true)  return true;
  return autoBypass;
}

function getArchiveUrl(pageUrl, serviceIndex = 0) {
  const idx = Math.min(serviceIndex, ARCHIVE_SERVICES.length - 1);
  return ARCHIVE_SERVICES[idx].url(pageUrl);
}

chrome.runtime.onMessage.addListener(async (msg, sender) => {
  if (msg.type === 'PAYWALL_STATUS' && msg.detected) {
    if (isExcluded(msg.url)) return;

    const tabId = sender.tab?.id;
    chrome.action.setBadgeText({ text: '🔒', tabId });
    chrome.action.setBadgeBackgroundColor({ color: '#e53e3e', tabId });

    if (!msg.isNewsDomain) return;

    const settings = await getSettings();
    if (!isSiteEnabled(msg.host, settings)) return;

    chrome.tabs.update(tabId, { url: getArchiveUrl(msg.url, settings.serviceIndex) });
  }

  if (msg.type === 'BYPASS_NOW') {
    const settings = await getSettings();
    chrome.tabs.update(msg.tabId, { url: getArchiveUrl(msg.url, msg.serviceIndex ?? settings.serviceIndex) });
  }

  if (msg.type === 'SET_SITE') {
    const settings = await getSettings();
    settings.siteSettings[msg.host] = msg.enabled;
    chrome.storage.local.set({ siteSettings: settings.siteSettings });
  }
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== 'bypass-paywall') return;
  if (isExcluded(tab.url)) return;
  const { serviceIndex } = await getSettings();
  chrome.tabs.update(tab.id, { url: getArchiveUrl(tab.url, serviceIndex) });
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'bypass-paywall',
    title: 'Bypass Paywall',
    contexts: ['page', 'link'],
  });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === 'loading') {
    chrome.action.setBadgeText({ text: '', tabId });
  }
});
