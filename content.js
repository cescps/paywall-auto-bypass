(() => {
  const NEWS_DOMAINS = [
    'ft.com', 'wsj.com', 'nytimes.com', 'bloomberg.com',
    'economist.com', 'washingtonpost.com', 'theatlantic.com',
    'newyorker.com', 'wired.com', 'businessinsider.com',
    'thetimes.co.uk', 'telegraph.co.uk', 'theguardian.com',
    'independent.co.uk', 'spectator.co.uk', 'newstatesman.com',
    'latimes.com', 'bostonglobe.com', 'chicagotribune.com',
    'sfchronicle.com', 'seattletimes.com', 'denverpost.com',
    'usatoday.com', 'politico.com', 'thehill.com',
    'foreignaffairs.com', 'foreignpolicy.com',
    'hbr.org', 'scientificamerican.com', 'nature.com', 'science.org',
    'technologyreview.com', 'axios.com', 'theinformation.com',
    'theathletic.com', 'medium.com', 'substack.com',
    'elpais.com', 'elmundo.es', 'expansion.com',
    'elconfidencial.com', 'larazon.es', 'abc.es', 'elperiodico.com',
    'lavanguardia.com', 'eldiario.es', 'infolibre.es', 'eleconomista.es',
    'ara.cat', 'naciodigital.cat', 'vilaweb.cat', 'elnacional.cat', 'elpuntavui.cat',
    'lemonde.fr', 'lefigaro.fr', 'lesechos.fr', 'liberation.fr',
    'mediapart.fr', 'lexpress.fr', 'lepoint.fr',
    'spiegel.de', 'zeit.de', 'faz.net', 'handelsblatt.com', 'welt.de',
    'corriere.it', 'repubblica.it', 'sole24ore.com',
    'nrc.nl', 'dn.se', 'aftenposten.no', 'hs.fi',
  ];

  function getHostname() {
    return window.location.hostname.replace(/^www\./, '');
  }

  function isNewsDomain() {
    const host = getHostname();
    return NEWS_DOMAINS.some(d => host === d || host.endsWith('.' + d));
  }

  // Tier 1: ultra-specific phrases — safe to scan full body text.
  // These physically cannot appear on a homepage or nav/footer.
  const PAYWALL_PHRASES_STRICT = [
    // FT (from real paywall HTML)
    'go further with an ft subscription',
    'months of standard digital',
    'months of premium digital',
    'standard digital for was',
    'essential digital access to trusted ft',
    'ft edit',                              // FT's specific product name in paywall
    // WSJ
    'continue reading with a wsj',
    'wsj membership',
    // Generic hard gates
    'subscribe to continue', 'subscribe to read',
    'subscribe for full access', 'subscribe to unlock',
    'sign up to read', 'sign in to read',
    'unlock this article', 'unlock full access',
    'this content is for subscribers',
    'for subscribers only', 'subscribers only',
    'paid subscribers only', 'metered paywall',
    'keep reading with',
    'months for $', 'months for €', 'months for £',
  ];

  const PAYWALL_SELECTORS = [
    // Generic
    '[class*="paywall"]', '[id*="paywall"]', '[data-paywall]',
    '[class*="subscribe-wall"]', '[class*="subscription-wall"]',
    '[class*="premium-wall"]', '[class*="meter-wall"]', '[class*="access-wall"]',
    '[class*="regwall"]',
    // Piano / tinypass (FT, many others)
    '[class*="tp-modal"]', '[class*="tp-backdrop"]',
    '[class*="tp-container"]', '[class*="tp-iframe"]',
    '#tp-container', '.piano-offer', '#piano-offer',
    // FT — Piano barrier + Origami overlay component + data attribute
    '[class*="n-barrier"]', '[class*="ft-barrier"]',
    '.barrier', '[class="barrier"]',
    '[data-trackable="barrier"]', '[data-trackable*="barrier"]',
    '.o-overlay',                         // FT uses Origami overlay
    '[class*="o-overlay"]',
    // WSJ
    '[class*="article-wrap--limited"]',
    '[class*="regwall"]',
    // NYT
    '[class*="gateway-container"]',
    // Bloomberg
    '[class*="paywall-fence"]', '[class*="fence-body"]',
    // Article-body truncation
    '[class*="ArticleBody--fade"]', '[class*="article-body--fade"]',
    '[class*="article-fade"]', '[class*="article-truncated"]',
    '[class*="content-blur"]',
    // Compound gates
    '[class*="article-gate"]', '[class*="content-gate"]',
    '[class*="access-gate"]', '[class*="registration-gate"]',
  ];

  // Don't fire on the root homepage — only on article/content pages.
  // ft.com/ → skip. ft.com/content/uuid → check.
  function isArticlePage() {
    return window.location.pathname.length > 1;
  }

  function detectByDOM() {
    return PAYWALL_SELECTORS.some(sel => {
      try { return !!document.querySelector(sel); } catch { return false; }
    });
  }

  // Scan full body text but only for ultra-specific phrases that cannot appear
  // on a homepage or in a nav. FT's paywall is inline (not fixed-position), so
  // we must search the whole document — but the phrase list is tight enough to
  // avoid false positives on subscription landing pages or navbars.
  function detectByText() {
    const text = (document.body.innerText || '').toLowerCase();
    return PAYWALL_PHRASES_STRICT.some(kw => text.includes(kw));
  }

  function isPaywalled() {
    if (!isArticlePage()) return false;
    return detectByDOM() || detectByText();
  }

  let reported = false;

  function checkAndReport() {
    if (reported) return;
    if (!isPaywalled()) return;
    reported = true;
    chrome.runtime.sendMessage({
      type: 'PAYWALL_STATUS',
      detected: true,
      url: window.location.href,
      host: getHostname(),
      isNewsDomain: isNewsDomain(),
    });
  }

  checkAndReport();

  const observer = new MutationObserver(() => checkAndReport());
  observer.observe(document.body, { childList: true, subtree: true });

  // Piano on FT typically injects 1–4s after page load; retry at multiple points
  setTimeout(checkAndReport, 1000);
  setTimeout(checkAndReport, 2500);
  setTimeout(checkAndReport, 4000);
  setTimeout(() => { checkAndReport(); observer.disconnect(); }, 7000);

  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg.type === 'CHECK_PAYWALL') {
      sendResponse({ detected: isPaywalled(), url: window.location.href, host: getHostname(), isNewsDomain: isNewsDomain() });
    }
    if (msg.type === 'GET_URL') {
      sendResponse({ url: window.location.href });
    }
  });
})();
