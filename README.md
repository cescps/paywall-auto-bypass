# Paywall Bypass                                      

  Chrome extension that automatically detects paywalled   
  articles on major news sites and redirects to an
  archived version via archive.ph, archive.is, or 12ft.io 
  — full article, no subscription required.             

  ## Features

  - **Auto-detects paywalls** using DOM selectors         
  (Piano/tinypass, FT barrier, Bloomberg fence, NYT
  gateway) and phrase matching against known paywall copy 
  - **Jumps directly to newest snapshot** via `/newest/` —
   skips the archive listing page                         
  - **News sites only** — auto-bypass fires exclusively on
   a whitelist of 50+ publications; never triggers on     
  random sites                                          
  - **Homepage-safe** — skips root paths (`ft.com/`) and  
  only checks article URLs                                
  - **Per-site toggles** — enable/disable auto-bypass per
  publication from the popup Sites tab without visiting   
  the site first                                        
  - **Full-screen archive** — strips the archive.ph       
  toolbar via injected CSS + JS so the article fills the  
  entire viewport
  - **Right-click bypass** — context menu on any page or  
  link                                                    
  - **5 archive services** — archive.ph · archive.is ·
  archive.today · 12ft.io · outline.com (selectable)      
                                                        
  ## Supported publications

  FT, WSJ, NYT, Bloomberg, The Economist, Washington Post,
   The Atlantic, The Times, The Telegraph, Wired, El País,
   La Vanguardia, Ara, Le Monde, Der Spiegel, Die Zeit,   
  and 35+ more.                                         

  ## Install

  1. Clone or download this repo
  2. Open Chrome → `chrome://extensions/`
  3. Enable **Developer mode**                            
  4. Click **Load unpacked** → select this folder
                                                          
  ## How it works                                       
                                                          
  `content.js` runs on every page and checks for paywall  
  signals:
  1. Known DOM selectors (Piano `tp-*` classes, FT        
  `n-barrier`, Bloomberg `fence-body`, etc.)              
  2. Ultra-specific phrase matching against full body text
   — only phrases that physically cannot appear outside a 
  paywall modal (e.g. `"go further with an ft           
  subscription"`, `"months of standard digital"`)         
                                                        
  Detection retries at 1s, 2.5s, 4s, and 7s to catch      
  paywalls injected late by Piano.js.
                                                          
  On detection, `background.js` checks the per-site       
  settings and redirects to `archive.ph/newest/<url>`.
