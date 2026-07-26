/* QuantumShield Platform — unified security client */
let scanId = null, poll = null, eventSource = null, seenThreatIds = new Set();
let currentStandard = 'iso27001', currentReportContent = '', reportStandards = [];
let securityTab = 'phishing', annualBilling = false;
let lastDisplayProgress = { overall: 0, fuzz: 0 };
const SPHERE_CIRC = 326.73;

const PLANS = {
  starter: {
    id: 'starter', name: 'Starter', icon: '🌱',
    monthly: 0, annual: 0,
    desc: 'Perfect for personal sites and small projects.',
    features: ['1 domain', 'Basic dashboard', '5 scans / month', 'Web scanner (lite)', 'Email alerts'],
    limits: { scans: 5, modules: ['web_scanner'], reports: false, darkweb: false, cspm: false, api: false, phishing: false },
  },
  professional: {
    id: 'professional', name: 'Professional', icon: '⚡', popular: true,
    monthly: 49, annual: 39,
    desc: 'For growing businesses that need full protection.',
    features: ['5 domains', 'Full dashboard', 'Unlimited scans', 'All 6 security modules', 'Compliance reports', 'Dark web monitoring', 'Priority support'],
    limits: { scans: -1, modules: 'all', reports: true, darkweb: true, cspm: true, api: true, phishing: true },
  },
  enterprise: {
    id: 'enterprise', name: 'Enterprise', icon: '🏢',
    monthly: 199, annual: 159,
    desc: 'For large teams with advanced compliance needs.',
    features: ['Unlimited domains', 'SSO & team roles', 'Unlimited everything', 'Custom integrations', 'Dedicated account manager', 'SLA guarantee', 'White-label reports'],
    limits: { scans: -1, modules: 'all', reports: true, darkweb: true, cspm: true, api: true, phishing: true },
  },
};

const COMPARE_ROWS = [
  { label: 'Domains', starter: '1', pro: '5', enterprise: 'Unlimited' },
  { label: 'Monthly scans', starter: '5', pro: 'Unlimited', enterprise: 'Unlimited' },
  { label: 'Web scanner', starter: '✓', pro: '✓', enterprise: '✓' },
  { label: 'Phishing simulation', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'Dark web monitoring', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'Cloud CSPM', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'API security', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'Compliance reports', starter: '—', pro: '✓', enterprise: '✓' },
  { label: 'Team members', starter: '1', pro: '10', enterprise: 'Unlimited' },
  { label: 'Support', starter: 'Community', pro: 'Priority', enterprise: 'Dedicated' },
];

const MODULE_NAV = [
  { id: 'dashboard', label: 'Home' },
  { id: 'scanner', label: 'Scanner' },
  { id: 'security', label: 'Tools' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'reports', label: 'Reports' },
  { id: 'plans', label: 'Plans' },
];

const MODULE_LABELS = {
  web_scanner: { label: 'Web Scanner', icon: '🔍' },
  phishing_awareness: { label: 'Phishing', icon: '🎣' },
  darkweb_monitor: { label: 'Dark Web', icon: '🌑' },
  cloud_security: { label: 'Cloud', icon: '☁️' },
  api_security: { label: 'API', icon: '🔌' },
  compliance: { label: 'Compliance', icon: '📋' },
};

const MODULE_ICONS = { web_scanner:'🔍', phishing_awareness:'🎣', darkweb_monitor:'🌑', cloud_security:'☁️', api_security:'🔌', compliance:'📋' };

const PLATFORM_FEATURES = [
  { icon:'🔍', title:'Web Vulnerability Scanner', desc:'Enterprise-grade scanner with 1M+ parallel fuzzing, 150 workers, AI exploitation, OWASP deep hunter, Nuclei templates, and live SSE threat streaming.',
    points:['1M+ parallel fuzz checks','150 concurrent workers','AI active exploitation','OWASP Top 10 deep hunter','Nuclei template engine','Real-time threat SSE stream','Exploit verification ≥75%','False positive killer'] },
  { icon:'🎣', title:'Phishing Simulation', desc:'Train your team to spot fake emails before real attackers succeed. Launch safe phishing campaigns and track awareness scores.',
    points:['Ready-made email templates','Employee click-rate tracking','Awareness scorecards','Difficulty-based campaigns'] },
  { icon:'🌑', title:'Dark Web Monitoring', desc:'Continuously monitor breach databases for leaked emails and credentials tied to your domain.',
    points:['Breach database scanning','Email exposure alerts','Monitor safety score','Instant breach notifications'] },
  { icon:'☁️', title:'Cloud Security (CSPM)', desc:'Detect misconfigurations across AWS, Azure, and GCP before they become costly breaches.',
    points:['Multi-cloud support','Public bucket detection','Security group audits','Remediation guidance'] },
  { icon:'🔌', title:'API Security', desc:'Discover hidden API endpoints and test authentication, authorization, and data exposure risks.',
    points:['Endpoint discovery','Auth bypass testing','Rate limit checks','Anomaly detection'] },
  { icon:'📋', title:'Compliance Automation', desc:'Track ISO 27001, SOC 2, and GDPR requirements with automated task management and progress scoring.',
    points:['ISO 27001 / SOC 2 / GDPR','Task prioritization','Progress tracking','Audit-ready checklists'] },
  { icon:'📄', title:'Compliance Reports', desc:'Generate professional reports in 11 international standards — ISO, NIST, CVSS, PCI DSS, GDPR, and more.',
    points:['11 report standards','TXT & HTML export','Bug bounty submissions','USA & global formats'] },
];

const REVIEWS = [
  { stars:5, text:'QuantumShield found 3 critical vulnerabilities we missed for months. The live threat feed during scanning is incredible — we fixed everything before our audit.', name:'Sarah Chen', role:'CTO, TechFlow Inc.', initials:'SC' },
  { stars:5, text:'We switched from 4 separate security tools to QuantumShield. One domain input, one dashboard, everything in one place. Saved us $2,000/month.', name:'Marcus Johnson', role:'IT Director, RetailMax', initials:'MJ' },
  { stars:5, text:'The phishing simulation alone paid for itself. Our click rate dropped from 34% to 8% in two months. Employees actually thank us for the training now.', name:'Elena Rodriguez', role:'CISO, HealthBridge', initials:'ER' },
  { stars:5, text:'Compliance reports generated automatically after each scan — ISO 27001 and SOC 2 ready. Our auditors were impressed with the detail and formatting.', name:'James Park', role:'Compliance Lead, FinSecure', initials:'JP' },
  { stars:5, text:'Dark web monitoring caught our CEO\'s email in a breach within hours. We reset passwords before any damage. This platform is essential.', name:'Aisha Patel', role:'Security Manager, CloudNine', initials:'AP' },
  { stars:5, text:'The API security module discovered 12 undocumented endpoints our dev team forgot about. Two had no authentication. Absolute lifesaver.', name:'David Kim', role:'DevOps Lead, APIStack', initials:'DK' },
];

const SCAN_PHASES = [
  { id:'subdomain_discovery', label:'Subdomains', icon:'🌐' },
  { id:'ai_prioritization', label:'AI Ranking', icon:'🤖' },
  { id:'source_crawl', label:'Source Crawl', icon:'📥' },
  { id:'source_analysis', label:'Line Analysis', icon:'🔬' },
  { id:'ai_inference', label:'AI Inference', icon:'🧠' },
  { id:'ai_exploitation', label:'AI Exploit', icon:'⚡' },
  { id:'deep_scanning', label:'Deep Scan', icon:'🔍' },
  { id:'deep_attack_hunt', label:'OWASP Hunt', icon:'🎯' },
  { id:'elite_exploits', label:'Elite Suite', icon:'💀' },
  { id:'mega_1m_checks', label:'1M Fuzzing', icon:'🚀' },
  { id:'nuclei_checks', label:'Nuclei', icon:'📋' },
  { id:'exploit_verification', label:'Verify', icon:'✅' },
  { id:'complete', label:'Done', icon:'🏁' },
];

const PARAM_TYPES = [
  { id:'sqli', label:'SQLi', color:'#ef4444' },
  { id:'xss', label:'XSS', color:'#f59e0b' },
  { id:'ssrf', label:'SSRF', color:'#8b5cf6' },
  { id:'ssti', label:'SSTI', color:'#ec4899' },
  { id:'lfi', label:'LFI', color:'#06b6d4' },
  { id:'redirect', label:'Redirect', color:'#3b82f6' },
  { id:'file', label:'File Upload', color:'#22c55e' },
];

const ELITE_TECHNIQUES = [
  { icon:'🔑', name:'JWT Attacks', desc:'None-alg, JWKS exposure, claim tampering' },
  { icon:'🔗', name:'OAuth Abuse', desc:'Redirect URI bypass, token reflection' },
  { icon:'☠️', name:'Cache Poisoning', desc:'HTTP cache deception & poisoning' },
  { icon:'📂', name:'LDAP Injection', desc:'Directory traversal via LDAP filters' },
  { icon:'🗂️', name:'XPath Injection', desc:'XML query manipulation attacks' },
  { icon:'📄', name:'Advanced LFI', desc:'PHP filter chains, path traversal' },
  { icon:'🧪', name:'SSTI Polyglot', desc:'Server-side template injection' },
  { icon:'🔐', name:'Password Reset', desc:'Host header poisoning on reset flows' },
  { icon:'👤', name:'Username Enum', desc:'Account enumeration via responses' },
  { icon:'💣', name:'Deserialization', desc:'Unsafe object deserialization probes' },
  { icon:'◈', name:'GraphQL Abuse', desc:'Introspection & depth limit bypass' },
  { icon:'📤', name:'File Upload Bypass', desc:'Extension & MIME type evasion' },
  { icon:'🆔', name:'BOLA / IDOR', desc:'Broken object-level authorization' },
  { icon:'🔢', name:'Type Juggling', desc:'PHP loose comparison exploits' },
  { icon:'📁', name:'Directory Listing', desc:'Exposed directory indexes' },
  { icon:'⚠️', name:'Error Disclosure', desc:'Stack traces & debug info leaks' },
  { icon:'🛡️', name:'SAML Metadata', desc:'SAML configuration exposure' },
  { icon:'⏱️', name:'Rate Limit Bypass', desc:'Header-based rate limit evasion' },
  { icon:'↪️', name:'SSRF Chains', desc:'Open redirect to SSRF chains' },
  { icon:'🍪', name:'Cookie Security', desc:'Missing Secure/HttpOnly/SameSite' },
  { icon:'🔓', name:'API Key in URL', desc:'Credentials exposed in query strings' },
  { icon:'🌍', name:'Subdomain Takeover', desc:'Dangling DNS & CNAME hijacking' },
  { icon:'🏁', name:'Race Conditions', desc:'Auth endpoint race soft probes' },
];

const SCAN_ENGINES = [
  { icon:'🚀', name:'Mega Fuzz Engine', desc:'1M+ parallel vulnerability checks with 150 concurrent workers and continuous worker pool.' },
  { icon:'🤖', name:'AI Active Exploitation', desc:'ML-powered vulnerability inference and active exploitation with confidence scoring.' },
  { icon:'🎯', name:'OWASP Deep Hunter', desc:'Deep attack hunting across OWASP Top 10 — injection, broken auth, XSS, SSRF, and more.' },
  { icon:'💀', name:'Elite Exploit Suite', desc:'21 advanced red-team techniques — JWT, OAuth, cache poison, LDAP, GraphQL, BOLA.' },
  { icon:'📋', name:'Nuclei Templates', desc:'Thousands of community Nuclei templates for CVE and misconfiguration detection.' },
  { icon:'🔬', name:'Source Line Analysis', desc:'Downloads and analyzes page source line-by-line for hidden vulnerabilities.' },
  { icon:'🌐', name:'Subdomain Discovery', desc:'Enumerates subdomains and checks for takeover opportunities.' },
  { icon:'✅', name:'Exploit Verification', desc:'Confirms findings with ≥75% confidence before reporting as verified.' },
  { icon:'🛡️', name:'False Positive Killer', desc:'Multi-stage validation eliminates noise — only real threats surface.' },
  { icon:'📡', name:'Live Threat Stream', desc:'Server-sent events push threats to your dashboard in real time.' },
  { icon:'📊', name:'Param Coverage Heatmap', desc:'Tracks SQLi, XSS, SSRF, SSTI, LFI, redirect, and file upload coverage.' },
  { icon:'📄', name:'Bug Bounty Reports', desc:'Auto-generates submission-ready reports for verified exploits.' },
];

function esc(s) { const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }
function fmtN(n) { return typeof n === 'number' ? n.toLocaleString() : (n || '—'); }

function getPlan() {
  return localStorage.getItem('quantumshield_plan')
    || localStorage.getItem('cybershield_plan')
    || 'starter';
}
function setPlan(id) {
  localStorage.setItem('quantumshield_plan', id);
  updatePlanUI();
  toast('You\'re now on the ' + PLANS[id].name + ' plan!', 'ok');
}

function planHas(feature) {
  const p = PLANS[getPlan()];
  if (!p?.limits) return true;
  const l = p.limits;
  if (feature === 'reports') return l.reports;
  if (feature === 'darkweb') return l.darkweb;
  if (feature === 'cspm') return l.cspm;
  if (feature === 'api') return l.api;
  if (feature === 'phishing') return l.phishing;
  return true;
}

function updatePlanUI() {
  const id = getPlan();
  const p = PLANS[id];
  const pill = document.getElementById('planPill');
  if (!pill) return;
  pill.textContent = p.name + (p.monthly ? '' : ' · Free');
  pill.className = 'plan-pill' + (id === 'professional' ? ' pro' : id === 'enterprise' ? ' enterprise' : '');
}

let scannerParticleAnim = null;

function initScannerParticles() {
  const canvas = document.getElementById('scannerParticles');
  if (!canvas || !document.body.classList.contains('scanner-active')) return;
  if (scannerParticleAnim) cancelAnimationFrame(scannerParticleAnim);
  const ctx = canvas.getContext('2d');
  const particles = [];
  const n = 48;
  const resize = () => {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
  };
  resize();
  for (let i = 0; i < n; i++) {
    particles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.8 + 0.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: (Math.random() - 0.5) * 0.35,
      a: Math.random() * 0.5 + 0.15,
    });
  }
  const draw = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach((p, i) => {
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
      if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0,240,255,${p.a})`;
      ctx.fill();
      for (let j = i + 1; j < particles.length; j++) {
        const q = particles[j];
        const dx = p.x - q.x, dy = p.y - q.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 100) {
          ctx.strokeStyle = `rgba(0,240,255,${0.08 * (1 - dist / 100)})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    });
    scannerParticleAnim = requestAnimationFrame(draw);
  };
  draw();
  window.addEventListener('resize', resize, { once: false });
}

function initScannerPanelMotion() {
  if (!document.body.classList.contains('scanner-active')) return;
  document.querySelectorAll('#page-scanner .glass-panel').forEach((el, i) => {
    el.style.animationDelay = (i * 0.06) + 's';
  });
  document.querySelectorAll('.tech-chip').forEach((el, i) => {
    el.style.animationDelay = (0.05 + i * 0.03) + 's';
  });
}

function resolveScanProgress(s) {
  if (!s) return 0;
  const raw = [s.progress, s.overall_pct, s.overall, s.pct];
  let best = 0;
  for (const v of raw) {
    const n = Number(v);
    if (Number.isFinite(n) && n > best) best = n;
  }
  if (best > 0) return best;
  if (s.current_phase) return phaseEstimatePct(s.current_phase);
  return 0;
}

function phaseEstimatePct(phaseId) {
  const phases = SCAN_PHASES.map(p => p.id);
  const idx = phases.indexOf(phaseId);
  if (idx < 0) return 0;
  return Math.round((idx / Math.max(phases.length - 1, 1)) * 100);
}

function paintScanProgress(overall, fuzz) {
  overall = Math.max(0, Math.min(100, Number(overall) || 0));
  fuzz = Math.max(0, Math.min(100, Number(fuzz) || 0));
  lastDisplayProgress = { overall, fuzz };
  const rounded = Math.round(overall);
  const pctText = rounded + '%';
  const fuzzText = fuzz.toFixed(1) + '%';

  const wrap = document.getElementById('hologramWrap');
  if (wrap) wrap.dataset.progress = String(rounded);

  const num = document.getElementById('spherePctNum');
  if (num) {
    num.textContent = String(rounded);
    num.setAttribute('data-value', String(rounded));
  }

  const ring = document.getElementById('sphereRingFill');
  if (ring) ring.setAttribute('stroke-dashoffset', String(SPHERE_CIRC * (1 - overall / 100)));

  document.querySelectorAll('[data-progress-text="overall"]').forEach(el => {
    el.textContent = el.dataset.progressRole === 'hero-num' ? String(rounded) : pctText;
  });

  document.querySelectorAll('[data-progress-bar="overall"]').forEach(el => {
    el.style.width = overall + '%';
  });
  document.querySelectorAll('[data-progress-bar="fuzz"]').forEach(el => {
    el.style.width = fuzz + '%';
  });

  const fl = document.getElementById('fuzzPctLabel');
  if (fl) fl.textContent = fuzzText;
  const fd = document.getElementById('fuzzPctDisplay');
  if (fd) fd.textContent = fuzzText;

  if (wrap && rounded > 0) {
    wrap.classList.remove('pct-bump');
    void wrap.offsetWidth;
    wrap.classList.add('pct-bump');
  }
}

function updateSphereProgress(pct) {
  paintScanProgress(pct, lastDisplayProgress.fuzz);
}

function toast(msg, type) {
  const wrap = document.getElementById('toastWrap');
  const el = document.createElement('div');
  el.className = 'toast' + (type ? ' ' + type : '');
  el.textContent = msg;
  wrap.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 300); }, 3500);
}

function getDomainInput() {
  const onDash = document.getElementById('page-dashboard')?.classList.contains('active');
  const onScanner = document.body.classList.contains('scanner-active');
  if (onScanner) return document.getElementById('scannerHeaderDomain') || document.getElementById('pageDomainInput');
  return document.getElementById(onDash ? 'heroDomain' : 'pageDomainInput') || document.getElementById('pageDomainInput');
}

function syncDomains(val) {
  const v = val != null ? val : (getDomainInput()?.value || '');
  ['heroDomain', 'pageDomainInput', 'scannerHeaderDomain'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = v;
  });
  updateScannerUI();
}

function setScanType(v) {
  document.querySelectorAll('#heroScanType, #pageScanType, #scannerHeaderScanType').forEach(el => { if (el) el.value = v; });
}

function syncDomainAndAnalyze() {
  const header = document.getElementById('scannerHeaderDomain');
  const page = document.getElementById('pageDomainInput');
  const hero = document.getElementById('heroDomain');
  const src = (document.body.classList.contains('scanner-active') && header?.value)
    ? header.value
    : (hero?.value || page?.value || header?.value || '');
  syncDomains(src);
  if (document.body.classList.contains('scanner-active')) {
    startMega();
    return;
  }
  analyzeAll();
}

function getDomain() {
  const input = getDomainInput();
  const v = input?.value.trim();
  if (!v) { input?.focus(); toast('Please enter your website domain first', 'warn'); return null; }
  return v.replace(/^https?:\/\//, '').split('/')[0];
}

let autoScanTimer = null;
let autoScanCountdown = null;

function cancelAutoScan() {
  if (autoScanTimer) clearTimeout(autoScanTimer);
  if (autoScanCountdown) clearInterval(autoScanCountdown);
  autoScanTimer = null;
  autoScanCountdown = null;
  document.getElementById('autoScanBanner')?.remove();
}

function updateAutoScanBanner(msg) {
  const el = document.getElementById('autoScanBanner');
  if (el) { const s = el.querySelector('span'); if (s) s.textContent = msg; }
}

function scheduleAutoScan() {
  if (autoScanTimer) clearTimeout(autoScanTimer);
  if (autoScanCountdown) clearInterval(autoScanCountdown);
  if (scanId && poll) return;
  let secs = 3;
  updateAutoScanBanner(`Full security scan starting in ${secs}s…`);
  autoScanCountdown = setInterval(() => {
    secs--;
    if (secs > 0) updateAutoScanBanner(`Full security scan starting in ${secs}s…`);
    else { clearInterval(autoScanCountdown); autoScanCountdown = null; }
  }, 1000);
  autoScanTimer = setTimeout(async () => {
    autoScanTimer = null;
    document.getElementById('autoScanBanner')?.remove();
    const v = getDomainInput()?.value.trim();
    if (!v) return;
    if (scanId && poll) return;
    toast('Launching full security scan…', 'ok');
    await startMega();
  }, 3000);
}

function setStatus(msg) {
  const el = document.getElementById('statusPill');
  if (el) el.textContent = msg;
}

function setScanStatus(state, text) {
  const chip = document.getElementById('scanStatusChip');
  const txt = document.getElementById('scanStatusText');
  if (!chip || !txt) return;
  chip.className = 'scan-status-chip' + (state ? ' ' + state : '');
  txt.textContent = text;
}

function toggleUserMenu() {
  document.getElementById('userMenuDropdown')?.classList.toggle('open');
}

document.addEventListener('click', e => {
  if (!e.target.closest('.user-menu-wrap')) {
    document.getElementById('userMenuDropdown')?.classList.remove('open');
  }
});

function navPage(page) {
  document.querySelectorAll('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.page === page));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page)?.classList.add('active');
  document.body.classList.toggle('scanner-active', page === 'scanner');
  document.querySelector('.main')?.classList.toggle('full-width', page === 'dashboard' || page === 'scanner');
  document.getElementById('pageSearch')?.classList.toggle('show', page !== 'dashboard' && page !== 'scanner');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  if (page === 'dashboard') { loadDashboard(); setTimeout(initScrollAnimations, 200); }
  if (page === 'scanner') {
    initScannerUI();
    updateScannerUI();
    setTimeout(initScannerParticles, 50);
    setTimeout(initScannerPanelMotion, 80);
    if (scanId) pollScan();
    else paintScanProgress(0, 0);
  }
  if (page === 'security') loadSecurityTab(securityTab);
  if (page === 'compliance') loadCompliance();
  if (page === 'reports') { loadStandards(); if (scanId) loadReport(currentStandard); }
  if (page === 'plans') renderPlans();
  const heroInp = document.getElementById('heroDomain');
  const pageInp = document.getElementById('pageDomainInput');
  const scanInp = document.getElementById('scannerHeaderDomain');
  const v = heroInp?.value || pageInp?.value || scanInp?.value || '';
  if (v) syncDomains(v);
}

function secTab(tab) {
  securityTab = tab;
  document.querySelectorAll('.sec-tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  document.querySelectorAll('.sec-panel').forEach(p => p.classList.toggle('active', p.id === 'sec-' + tab));
  loadSecurityTab(tab);
}

function scanSubTab(tab) {
  document.querySelectorAll('.scan-sub').forEach(t => t.classList.toggle('active', t.dataset.sub === tab));
  document.querySelectorAll('.scan-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('scan-' + tab)?.classList.add('active');
}

function focusDomain() {
  const el = document.getElementById('heroDomain') || document.getElementById('pageDomainInput');
  el?.focus();
  el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

const TICKER_ITEMS = [
  '🔍 1M+ Parallel Fuzzing', '🤖 AI Active Exploitation', '🎯 OWASP Deep Hunter', '💀 21 Elite Techniques',
  '🔑 JWT & OAuth Attacks', '☁️ Cloud Metadata SSRF', '📋 Nuclei Templates', '✅ Exploit Verification',
  '🌐 Subdomain Discovery', '📡 Live Threat Stream', '🔬 Source Line Analysis', '🛡️ False Positive Killer',
  '◈ GraphQL Depth Abuse', '📂 LDAP & XPath Injection', '🧪 SSTI Polyglot', '↪️ SSRF Chain Attacks',
  '🌍 Subdomain Takeover', '🏁 Race Condition Probes', '📊 Param Coverage Heatmap', '📄 ISO/NIST Reports',
];

function initFeatureTicker() {
  const track = document.getElementById('tickerTrack');
  if (!track) return;
  const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
  track.innerHTML = items.map((t, i) =>
    `<div class="ticker-item ${i % 4 === 0 ? 'active' : ''}">${esc(t)}</div>`
  ).join('');
}

function initParticles() {
  const container = document.getElementById('particles');
  if (!container || container.children.length) return;
  for (let i = 0; i < 60; i++) {
    const p = document.createElement('div');
    const isCube = i % 3 === 0;
    p.className = isCube ? 'float-cube' : 'particle';
    const x = Math.random() * 100, y = Math.random() * 100;
    const sz = 8 + Math.random() * 24;
    p.style.cssText = `left:${x}%;top:${y}%;--dur:${5 + Math.random() * 8}s;--delay:${Math.random() * 5}s;--dx:${(Math.random()-.5)*40}px;--dy:${-20-Math.random()*40}px;--z:${Math.random()*60}px`;
    if (isCube) p.style.setProperty('--sz', sz + 'px');
    else { p.style.width = sz/2 + 'px'; p.style.height = sz/2 + 'px'; }
    container.appendChild(p);
  }
}

let canvasAnim = null;

function initCanvasNetwork() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  if (canvasAnim) cancelAnimationFrame(canvasAnim);

  const ctx = canvas.getContext('2d');
  const hero = canvas.closest('.landing-hero');
  let w, h, mouse = { x: -9999, y: -9999 };
  const pts = [];
  const N = Math.min(90, Math.floor(window.innerWidth / 18));

  function resize() {
    const r = hero?.getBoundingClientRect();
    w = canvas.width = r?.width || window.innerWidth;
    h = canvas.height = r?.height || window.innerHeight;
    if (!pts.length) {
      for (let i = 0; i < N; i++) {
        pts.push({
          x: Math.random() * w, y: Math.random() * h,
          vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4,
          r: 1 + Math.random() * 1.5
        });
      }
    }
  }
  resize();
  window.addEventListener('resize', resize);
  hero?.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = e.clientX - r.left;
    mouse.y = e.clientY - r.top;
  });
  hero?.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

  function draw() {
    ctx.clearRect(0, 0, w, h);
    const linkDist = Math.min(160, w * .12);
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i];
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0 || p.x > w) p.vx *= -1;
      if (p.y < 0 || p.y > h) p.vy *= -1;
      const dx = mouse.x - p.x, dy = mouse.y - p.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 140) { p.x -= dx * .008; p.y -= dy * .008; }
      for (let j = i + 1; j < pts.length; j++) {
        const q = pts[j];
        const d = Math.hypot(p.x - q.x, p.y - q.y);
        if (d < linkDist) {
          const a = (1 - d / linkDist) * .35;
          ctx.strokeStyle = `rgba(37,99,235,${a})`;
          ctx.lineWidth = .8;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(37,99,235,.55)';
      ctx.fill();
    }
    canvasAnim = requestAnimationFrame(draw);
  }
  draw();
}

function initParallax() {
  const hero = document.querySelector('.landing-hero');
  if (!hero || hero.dataset.parallax) return;
  hero.dataset.parallax = '1';
  window.addEventListener('scroll', () => {
    const y = window.scrollY;
    const visual = document.querySelector('.hero-visual');
    const stats = document.querySelector('.hero-stats');
    const scene = document.querySelector('.hero-3d-scene');
    if (visual) visual.style.transform = `translateY(${y * 0.06}px)`;
    if (stats) stats.style.transform = `translateY(${y * 0.03}px)`;
    if (scene) scene.style.transform = `translateY(${y * 0.02}px)`;
  }, { passive: true });
}
function init3DEffects() {
  const search3d = document.getElementById('search3d');
  if (search3d) {
    let raf;
    search3d.addEventListener('mousemove', e => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = null;
        const rect = search3d.getBoundingClientRect();
        const dx = (e.clientX - rect.left - rect.width / 2) / rect.width;
        const dy = (e.clientY - rect.top - rect.height / 2) / rect.height;
        search3d.style.transform = `rotateX(${-dy * 6}deg) rotateY(${dx * 8}deg)`;
      });
    });
    search3d.addEventListener('mouseleave', () => { search3d.style.transform = ''; });
  }

  const mockup3d = document.getElementById('mockup3d');
  if (mockup3d) {
    mockup3d.addEventListener('mousemove', e => {
      const r = mockup3d.getBoundingClientRect();
      const dx = (e.clientX - r.left - r.width / 2) / r.width;
      const dy = (e.clientY - r.top - r.height / 2) / r.height;
      mockup3d.style.animation = 'none';
      mockup3d.style.transform = `rotateX(${8 - dy * 12}deg) rotateY(${-4 + dx * 12}deg)`;
    });
    mockup3d.addEventListener('mouseleave', () => { mockup3d.style.animation = ''; mockup3d.style.transform = ''; });
  }

  document.addEventListener('mouseover', e => {
    const card = e.target.closest('.feat-card, .engine-card, .mockup-card');
    if (!card) return;
    card.addEventListener('mousemove', onCardMove);
    card.addEventListener('mouseleave', onCardLeave);
  });

  function onCardMove(ev) {
    const card = ev.currentTarget;
    const r = card.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width;
    const y = (ev.clientY - r.top) / r.height;
    card.style.setProperty('--mx', (x * 100) + '%');
    card.style.setProperty('--my', (y * 100) + '%');
    const rotY = (x - 0.5) * 10;
    const rotX = -(y - 0.5) * 10;
    card.style.transform = `perspective(800px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px)`;
  }
  function onCardLeave(ev) {
    const card = ev.currentTarget;
    card.style.transform = '';
    card.removeEventListener('mousemove', onCardMove);
    card.removeEventListener('mouseleave', onCardLeave);
  }
}

function renderLanding() {
  document.getElementById('dashLanding').innerHTML = `
    <section class="landing-hero">
      <div class="hero-3d-scene">
        <canvas id="heroCanvas" class="hero-canvas"></canvas>
        <div class="hero-aurora"></div>
        <div class="hero-scanline"></div>
        <div class="hero-side-glow left"></div>
        <div class="hero-side-glow right"></div>
        <div class="hero-beam"></div><div class="hero-beam"></div><div class="hero-beam"></div>
        <div class="hero-orbs"><div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div></div>
        <div class="hero-floor"></div>
        <div class="hero-grid"></div>
        <div class="particles" id="particles"></div>
      </div>
      <div class="hero-content">
        <div class="hero-badge"><span class="dot"></span> 7 security products · 1 unified platform</div>
        <h1>Protect your business with<br/><span class="gradient">enterprise-grade security</span></h1>
        <p class="hero-sub">Enter your domain below to scan for vulnerabilities, monitor breaches, and secure your entire stack — instantly.</p>

        <div class="hero-search-wrap" id="search3d">
          <div class="search-shell">
            <div class="search-box">
              <span class="search-prefix">https://</span>
              <input id="heroDomain" type="text" placeholder="yourcompany.com" autocomplete="off" spellcheck="false"
                onkeydown="if(event.key==='Enter')analyzeAll()" oninput="syncDomains(this.value)"/>
              <select class="scan-type-select" id="heroScanType" onchange="setScanType(this.value)">
                <option value="mega">⚡ Mega 1M+</option>
                <option value="super">🔬 Super Deep</option>
              </select>
              <button class="search-btn" onclick="analyzeAll()">Analyze →</button>
            </div>
          </div>
          <div class="hero-search-hints">
            <span>150 parallel workers</span><span>·</span>
            <span>Live threat stream</span><span>·</span>
            <span>21 elite techniques</span>
          </div>
        </div>

        <div class="hero-stats">
          <div class="hero-stat"><b data-count="12000">0</b><span>Websites protected</span></div>
          <div class="hero-stat"><b data-count="1000000">0</b><span>Vulnerability checks</span></div>
          <div class="hero-stat"><b data-count="99">0</b><span>Uptime SLA</span></div>
          <div class="hero-stat"><b data-count="11">0</b><span>Report standards</span></div>
        </div>
        <div class="hero-visual">
          <div class="hero-mockup-wrap" id="mockup3d">
            <div class="hero-mockup">
              <div class="mockup-bar"><i></i><i></i><i></i></div>
              <div class="mockup-body">
                <div class="mockup-card" style="--z:20px"><div class="icon">🔍</div><strong>Web Scanner</strong><span>1M+ vulnerability checks · Live SSE stream</span></div>
                <div class="mockup-card" style="--z:35px"><div class="icon">🌑</div><strong>Dark Web Monitor</strong><span>Breach alerts · Email exposure scan</span></div>
                <div class="mockup-card" style="--z:25px"><div class="icon">☁️</div><strong>Cloud CSPM</strong><span>AWS · Azure · GCP posture</span></div>
                <div class="mockup-card mockup-card-wide" style="--z:30px"><div class="icon">🔐</div><strong>API Security</strong><span>OWASP API Top 10 · Auth bypass detection</span></div>
                <div class="mockup-score"><div class="mockup-ring">87</div><div><strong style="font-size:1rem">Security Score</strong><br/><span style="font-size:.78rem;color:#94a3b8">Grade B+ · 3 critical alerts · 21 techniques active</span></div></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <div class="ticker-bar"><div class="feature-ticker" id="tickerTrack"></div></div>

    <div class="trust-bar anim">
      <div class="trust-inner">
        <div class="trust-item"><b>ISO 27001</b>Certified platform</div>
        <div class="trust-item"><b>SOC 2</b>Type II compliant</div>
        <div class="trust-item"><b>GDPR</b>Ready reports</div>
        <div class="trust-item"><b>24/7</b>Threat monitoring</div>
      </div>
    </div>

    <div class="dash-inner">
      <section class="section anim">
        <div class="section-head">
          <div class="section-tag">All-in-one platform</div>
          <h2>Everything you need to stay secure</h2>
          <p>7 powerful security modules working together — replace your entire security stack with one platform.</p>
        </div>
        <div class="features-grid">${PLATFORM_FEATURES.map((f, i) => `
          <div class="feat-card anim delay-${(i % 3) + 1}">
            <div class="feat-icon">${f.icon}</div>
            <h3>${esc(f.title)}</h3>
            <p>${esc(f.desc)}</p>
            <ul class="feat-list">${f.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
            <div style="margin-top:12px;padding:6px 12px;background:rgba(34,197,94,.08);border:1px solid rgba(34,197,94,.2);border-radius:8px;font-size:.7rem;color:#22c55e;font-weight:700;display:inline-flex;align-items:center;gap:6px">
              <span style="width:6px;height:6px;border-radius:50%;background:#22c55e;animation:blink 1s infinite"></span> Active & running
            </div>
          </div>`).join('')}
        </div>
      </section>

      <section class="section anim">
        <div class="section-head">
          <div class="section-tag">Scan engine</div>
          <h2>12 scan engines working in parallel</h2>
          <p>From 1M+ fuzzing to AI exploitation — every scan runs the full pipeline automatically.</p>
        </div>
        <div class="engine-grid">${SCAN_ENGINES.map((e, i) => `
          <div class="engine-card anim delay-${(i % 3) + 1}">
            <div class="e-icon">${e.icon}</div>
            <h4>${esc(e.name)}</h4>
            <p>${esc(e.desc)}</p>
          </div>`).join('')}
        </div>
      </section>

      <section class="section anim">
        <div class="section-head">
          <div class="section-tag">Elite exploits</div>
          <h2>21 advanced attack techniques</h2>
          <p>Red-team grade exploitation — JWT, OAuth, cache poison, GraphQL, BOLA, and more.</p>
        </div>
        <div class="tech-grid">${ELITE_TECHNIQUES.slice(0, 12).map(t => `
          <div class="tech-chip"><span class="t-icon">${t.icon}</span><div><strong>${esc(t.name)}</strong><span>${esc(t.desc)}</span></div></div>`).join('')}
        </div>
        <div style="text-align:center;margin-top:16px">
          <button class="btn ghost" onclick="navPage('scanner')">See all 21 techniques →</button>
        </div>
      </section>

      <section class="section anim">
        <div class="section-head">
          <div class="section-tag">Simple process</div>
          <h2>Secure your website in 4 steps</h2>
          <p>No installation, no agents, no complex setup. Just enter your domain and go.</p>
        </div>
        <div class="steps-row">
          <div class="step-card anim delay-1"><div class="step-num">1</div><h4>Enter domain</h4><p>Type your website address in the bar above</p></div>
          <div class="step-card anim delay-2"><div class="step-num">2</div><h4>Click Analyze</h4><p>Get your unified security score instantly</p></div>
          <div class="step-card anim delay-3"><div class="step-num">3</div><h4>Run deep scan</h4><p>Find real vulnerabilities with live threat feed</p></div>
          <div class="step-card anim delay-4"><div class="step-num">4</div><h4>Fix & report</h4><p>Follow recommendations and download compliance reports</p></div>
        </div>
      </section>

      <section class="section anim">
        <div class="section-head">
          <div class="section-tag">Customer love</div>
          <h2>Trusted by security teams worldwide</h2>
          <p>See why thousands of companies rely on QuantumShield every day.</p>
        </div>
        <div class="reviews-grid">${REVIEWS.map((r, i) => `
          <div class="review-card anim delay-${(i % 3) + 1}">
            <div class="review-stars">${'★'.repeat(r.stars)}</div>
            <p class="review-text">"${esc(r.text)}"</p>
            <div class="review-author">
              <div class="review-avatar">${esc(r.initials)}</div>
              <div><strong>${esc(r.name)}</strong><span>${esc(r.role)}</span></div>
            </div>
          </div>`).join('')}
        </div>
      </section>

      <section class="section anim">
        <div class="cta-band">
          <h2>Ready to secure your website?</h2>
          <p>Join 12,000+ businesses protecting their digital assets with QuantumShield.</p>
          <button class="btn lg" style="background:#fff;color:var(--accent)" onclick="focusDomain()">Start your free check →</button>
        </div>
      </section>
    </div>`;
  setTimeout(() => { initScrollAnimations(); animateCounters(); init3DEffects(); initParticles(); initCanvasNetwork(); initParallax(); }, 100);
}

function initScrollAnimations() {
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); obs.unobserve(e.target); } });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.anim').forEach(el => obs.observe(el));
}

function animateCounters() {
  document.querySelectorAll('[data-count]').forEach(el => {
    const target = parseInt(el.dataset.count, 10);
    const suffix = target >= 1000000 ? 'M+' : target >= 1000 ? 'K+' : target === 99 ? '%' : '+';
    const display = target >= 1000000 ? 1 : target >= 1000 ? 12 : target;
    let cur = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      cur = Math.min(cur + step, target);
      if (target >= 1000000) el.textContent = (cur >= 1000000 ? '1' : '0') + 'M+';
      else if (target >= 1000) el.textContent = Math.min(Math.floor(cur / 1000), display) + 'K+';
      else el.textContent = Math.min(cur, target) + suffix;
      if (cur >= target) clearInterval(timer);
    }, 30);
  });
}

function scoreMessage(score) {
  if (score >= 80) return 'Great job! Your security is in good shape.';
  if (score >= 60) return 'Decent, but there\'s room to improve.';
  if (score >= 40) return 'Several issues need your attention.';
  return 'Your site needs urgent security fixes.';
}

/* ── Plans ─────────────────────────────────────────────────── */
function toggleBilling() {
  annualBilling = !annualBilling;
  document.getElementById('billingToggle').classList.toggle('on', annualBilling);
  document.getElementById('lblMonthly').classList.toggle('on', !annualBilling);
  document.getElementById('lblAnnual').classList.toggle('on', annualBilling);
  renderPlans();
}

function renderPlans() {
  const current = getPlan();
  const grid = document.getElementById('plansGrid');
  grid.innerHTML = Object.values(PLANS).map(p => {
    const price = annualBilling ? p.annual : p.monthly;
    const isCurrent = p.id === current;
    return `<div class="plan-card ${p.popular ? 'popular' : ''} ${isCurrent ? 'current-plan' : ''}">
      ${p.popular ? '<div class="plan-badge">Most popular</div>' : ''}
      <h3>${p.icon} ${esc(p.name)}</h3>
      <div class="plan-price">${price === 0 ? 'Free' : '$' + price}<small>${price === 0 ? '' : '/mo'}</small></div>
      <div class="plan-desc">${esc(p.desc)}</div>
      <ul class="plan-features">${p.features.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      <button class="btn ${isCurrent ? 'ghost' : 'primary'} block" onclick="selectPlan('${p.id}')" ${isCurrent ? 'disabled' : ''}>
        ${isCurrent ? '✓ Current plan' : p.monthly === 0 ? 'Get started free' : 'Upgrade now'}
      </button>
    </div>`;
  }).join('');

  document.getElementById('compareTable').innerHTML = `
    <thead><tr><th>Feature</th><th>Starter</th><th>Professional</th><th>Enterprise</th></tr></thead>
    <tbody>${COMPARE_ROWS.map(r => `<tr><td>${esc(r.label)}</td><td>${esc(r.starter)}</td><td>${esc(r.pro)}</td><td>${esc(r.enterprise)}</td></tr>`).join('')}</tbody>`;
}

function selectPlan(id) {
  if (id === 'starter') { setPlan(id); renderPlans(); return; }
  setPlan(id);
  renderPlans();
  navPage('dashboard');
}

function planHint(feature) {
  if (planHas(feature)) return '';
  return `<div class="hint-bar">🔒 This feature requires <b>Professional</b> or higher. <a href="#" onclick="navPage('plans');return false" style="color:var(--accent);font-weight:700">Upgrade →</a></div>`;
}

/* ── Dashboard ─────────────────────────────────────────────── */
async function analyzeAll() {
  const d = getDomain(); if (!d) return;
  syncDomains(d);
  cancelAutoScan();
  setStatus('Analyzing ' + d + '…');
  toast('Analyzing ' + d + '…');
  document.querySelectorAll('.nav-link').forEach(n => n.classList.toggle('active', n.dataset.page === 'dashboard'));
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-dashboard')?.classList.add('active');
  document.querySelector('.main')?.classList.add('full-width');
  document.getElementById('pageSearch')?.classList.remove('show');
  window.scrollTo({ top: 0, behavior: 'smooth' });
  const tasks = [loadDashboard()];
  if (planHas('darkweb')) tasks.push(runDarkwebScan(true));
  if (planHas('cspm')) tasks.push(runCspmScan(true));
  if (planHas('api')) tasks.push(runApiScan(true));
  await Promise.all(tasks);
  loadCompliance();
  setStatus('Done! Score updated');
  toast('Analysis complete!', 'ok');
  scheduleAutoScan();
}

async function loadDashboard() {
  const resultsEl = document.getElementById('dashResults');
  const landingEl = document.getElementById('dashLanding');
  const d = getDomain();
  if (!d) {
    resultsEl.style.display = 'none';
    resultsEl.innerHTML = '';
    cancelAutoScan();
    if (landingEl) landingEl.style.display = '';
    if (!landingEl?.innerHTML) {
      renderLanding();
    } else {
      initCanvasNetwork();
    }
    return;
  }
  if (landingEl) landingEl.style.display = 'none';
  try {
    const r = await (await fetch('/api/platform/dashboard?domain=' + encodeURIComponent(d))).json();
    const score = r.overall_score || 0;
    const color = score >= 70 ? 'var(--ok)' : score >= 50 ? 'var(--warn)' : 'var(--bad)';
    const bgColor = score >= 70 ? 'var(--ok-soft)' : score >= 50 ? 'var(--warn-soft)' : 'var(--bad-soft)';
    resultsEl.style.display = 'block';
    resultsEl.innerHTML = `<div class="dash-inner">
      <div class="auto-scan-banner" id="autoScanBanner">
        <div class="spinner"></div>
        <div><strong>Analysis complete for ${esc(d)}</strong><br/><span>Full security scan starting in 3s…</span></div>
      </div>
      <div class="hero-score anim visible">
        <div class="score-circle" style="--sc:${color};border-color:${color}40">
          <span class="num">${score}</span><span class="lbl">Security Score</span>
        </div>
        <div class="hero-meta">
          <div class="grade-badge" style="background:${bgColor};border:1px solid ${color}40;color:${color}">Grade ${r.grade || '—'}</div>
          <h2>${esc(d)}</h2>
          <p class="muted">${scoreMessage(score)}</p>
          <div class="quick-actions">
            <button class="btn primary" onclick="cancelAutoScan();startMega()">▶ Run full scan now</button>
            <button class="btn ghost" onclick="cancelAutoScan();analyzeAll()">↻ Refresh all</button>
          </div>
        </div>
      </div>
      <h4 style="margin:24px 0 12px;font-size:.95rem;font-weight:700;color:var(--text)">Your security modules — click to explore</h4>
      <div class="module-grid">${Object.entries(r.module_scores || {}).map(([k, v]) => {
        const m = MODULE_LABELS[k] || { label: k };
        const locked = (k === 'phishing_awareness' && !planHas('phishing')) || (k === 'darkweb_monitor' && !planHas('darkweb'))
          || (k === 'cloud_security' && !planHas('cspm')) || (k === 'api_security' && !planHas('api'));
        return `<div class="module-card" onclick="goModule('${k}')">
          <div class="mc-icon">${MODULE_ICONS[k] || '🔒'}</div>
          <div class="mc-head"><span>${m.label}${locked ? '<span class="locked-badge">Pro</span>' : ''}</span><strong>${v}</strong></div>
          <div class="mc-bar"><i style="width:${v}%"></i></div>
        </div>`;
      }).join('')}</div>
      <div class="two-col">
        <div class="card"><h3>⚠️ Needs attention</h3><div>${renderAlerts(r.alerts)}</div></div>
        <div class="card"><h3>💡 What to do next</h3><div class="rec-list">${(r.recommendations || []).map(x => `<p>→ ${esc(x)}</p>`).join('') || '<p class="muted">All good — no urgent actions.</p>'}</div></div>
      </div>
    </div>`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  } catch {
    setStatus('Could not load dashboard');
    toast('Dashboard error — try again', 'warn');
  }
}

function renderAlerts(alerts) {
  if (!alerts?.length) return '<p class="muted">✅ No urgent alerts right now.</p>';
  return alerts.map(a => `<div class="alert-row ${a.severity}"><span class="tag">${esc(a.module)}</span>${esc(a.message)}</div>`).join('');
}

function goModule(k) {
  const locked = (k === 'phishing_awareness' && !planHas('phishing')) || (k === 'darkweb_monitor' && !planHas('darkweb'))
    || (k === 'cloud_security' && !planHas('cspm')) || (k === 'api_security' && !planHas('api'));
  if (locked) { toast('Upgrade to Professional to unlock this module', 'warn'); navPage('plans'); return; }
  const map = {
    web_scanner: 'scanner',
    phishing_awareness: () => { navPage('security'); secTab('phishing'); },
    darkweb_monitor: () => { navPage('security'); secTab('darkweb'); },
    cloud_security: () => { navPage('security'); secTab('cspm'); },
    api_security: () => { navPage('security'); secTab('api'); },
    compliance: 'compliance',
  };
  const fn = map[k];
  if (typeof fn === 'function') fn(); else if (fn) navPage(fn);
}

/* ── Security Tools ────────────────────────────────────────── */
function loadSecurityTab(tab) {
  const map = { phishing: 'phishing', darkweb: 'darkweb', cspm: 'cspm', api: 'api' };
  if (!planHas(map[tab])) return;
  if (tab === 'phishing') loadPhishing();
  if (tab === 'darkweb' && getDomain()) runDarkwebScan(true);
  if (tab === 'cspm' && getDomain()) runCspmScan(true);
  if (tab === 'api' && getDomain()) runApiScan(true);
}

async function loadPhishing() {
  const d = getDomain(); if (!d) return;
  const el = document.getElementById('phishContent');
  if (!planHas('phishing')) { el.innerHTML = planHint('phishing'); return; }
  const [ov, tmpl] = await Promise.all([
    fetch('/api/platform/phishing/overview?domain=' + encodeURIComponent(d)).then(r => r.json()),
    fetch('/api/platform/phishing/templates').then(r => r.json()),
  ]);
  el.innerHTML = `
    <div class="mini-stats">
      <div><b>${ov.awareness_score || 0}</b><span>Awareness</span></div>
      <div><b>${ov.click_rate_pct || 0}%</b><span>Click rate</span></div>
      <div><b>${ov.employees || 0}</b><span>Employees</span></div>
    </div>
    <h4>Launch a test campaign</h4>
    <p class="muted" style="margin-bottom:10px;font-size:.82rem">Pick a template to send a safe phishing test to your team.</p>
    <div class="tpl-grid">${(tmpl.templates || []).map(t => `
      <div class="tpl" onclick="launchPhish('${t.id}')"><strong>${esc(t.name)}</strong><span>${esc(t.category)} · ${t.difficulty}</span></div>`).join('')}</div>`;
  const sc = await fetch('/api/platform/phishing/scorecard?domain=' + encodeURIComponent(d)).then(r => r.json());
  document.getElementById('phishScore').innerHTML = (sc.employees || []).length
    ? `<table class="data"><tr><th>Employee</th><th>Score</th><th>Trained</th></tr>
      ${sc.employees.map(e => `<tr><td>${esc(e.email)}</td><td>${e.phish_score}</td><td>${e.trained ? '✅' : '—'}</td></tr>`).join('')}</table>`
    : '<p class="muted">No employees added yet.</p>';
}

async function launchPhish(tid) {
  if (!planHas('phishing')) { navPage('plans'); return; }
  const d = getDomain(); if (!d) return;
  const j = await (await fetch(`/api/platform/phishing/launch?domain=${encodeURIComponent(d)}&template_id=${tid}`, { method: 'POST' })).json();
  toast(j.message || 'Campaign launched!', 'ok');
  loadPhishing();
}

async function runDarkwebScan(silent) {
  const d = getDomain(); if (!d) return;
  const el = document.getElementById('darkwebContent');
  if (!planHas('darkweb')) { el.innerHTML = planHint('darkweb'); return; }
  if (!silent) el.innerHTML = '<p class="muted">Searching breach databases…</p>';
  const r = await (await fetch('/api/platform/darkweb/scan?domain=' + encodeURIComponent(d), { method: 'POST' })).json();
  el.innerHTML = `
    <div class="mini-stats">
      <div><b class="bad">${r.breaches_found}</b><span>Breaches</span></div>
      <div><b>${r.emails_checked}</b><span>Emails checked</span></div>
      <div><b>${r.monitor_score}</b><span>Safety score</span></div>
    </div>
    ${(r.email_breaches || []).map(b => `<div class="finding"><span class="tag crit">${esc(b.severity)}</span><strong>${esc(b.email)}</strong> — ${esc(b.breach_name)}</div>`).join('')}
    ${!r.breaches_found ? '<p class="muted">✅ Good news — no breaches found for your domain emails.</p>' : ''}`;
}

async function runCspmScan(silent) {
  const d = getDomain(); if (!d) return;
  const el = document.getElementById('cspmContent');
  if (!planHas('cspm')) { el.innerHTML = planHint('cspm'); return; }
  const p = document.getElementById('cspmProvider')?.value || 'aws';
  if (!silent) el.innerHTML = '<p class="muted">Checking cloud configuration…</p>';
  const r = await (await fetch(`/api/platform/cspm/scan?domain=${encodeURIComponent(d)}&provider=${p}`, { method: 'POST' })).json();
  el.innerHTML = `
    <div class="mini-stats">
      <div><b>${r.posture_score}</b><span>Score (${r.grade})</span></div>
      <div><b class="bad">${r.critical_findings}</b><span>Critical issues</span></div>
    </div>
    ${(r.findings || []).map(f => `<div class="finding"><span class="tag">${esc(f.severity)}</span><strong>${esc(f.title)}</strong><p class="muted">${esc(f.remediation)}</p></div>`).join('')}`;
}

async function runApiScan(silent) {
  const d = getDomain(); if (!d) return;
  const el = document.getElementById('apiContent');
  if (!planHas('api')) { el.innerHTML = planHint('api'); return; }
  if (!silent) el.innerHTML = '<p class="muted">Discovering API endpoints…</p>';
  const r = await (await fetch('/api/platform/api/scan?domain=' + encodeURIComponent(d), { method: 'POST' })).json();
  el.innerHTML = `
    <div class="mini-stats">
      <div><b>${r.api_score}</b><span>API score</span></div>
      <div><b>${r.endpoints_discovered}</b><span>Endpoints</span></div>
      <div><b class="bad">${r.anomalies}</b><span>Issues found</span></div>
    </div>
    ${(r.findings || []).map(f => `<div class="finding"><span class="tag crit">${esc(f.severity)}</span><strong>${esc(f.title)}</strong><p class="muted">${esc(f.target)}</p></div>`).join('')}`;
}

/* ── Compliance ────────────────────────────────────────────── */
async function loadCompliance() {
  const d = getDomain(); if (!d) return;
  const fw = document.getElementById('compFramework')?.value || 'iso27001';
  const [ov, tasks] = await Promise.all([
    fetch('/api/platform/compliance/overview?domain=' + encodeURIComponent(d)).then(r => r.json()),
    fetch('/api/platform/compliance/tasks?framework=' + fw).then(r => r.json()),
  ]);
  document.getElementById('compOverview').innerHTML = `
    <div class="mini-stats">
      <div><b>${ov.compliance_score}</b><span>Score</span></div>
      <div><b>${ov.tasks_done}/${ov.tasks_total}</b><span>Complete</span></div>
      <div><b class="warn">${ov.tasks_pending}</b><span>Still to do</span></div>
    </div>`;
  document.getElementById('compTasks').innerHTML = `<table class="data"><tr><th>Task</th><th>Priority</th><th>Status</th><th></th></tr>
    ${(tasks.tasks || []).map(t => `<tr><td>${esc(t.title)}</td><td>${esc(t.priority)}</td><td>${t.status === 'done' ? '✅ Done' : '⏳ Pending'}</td>
    <td>${t.status !== 'done' ? `<button class="btn sm ghost" onclick="markTask('${fw}','${t.id}')">Mark done</button>` : ''}</td></tr>`).join('')}</table>`;
}

async function markTask(fw, tid) {
  const d = getDomain(); if (!d) return;
  await fetch(`/api/platform/compliance/tasks/${tid}?domain=${encodeURIComponent(d)}&framework=${fw}&status=done`, { method: 'PATCH' });
  toast('Task marked as done!', 'ok');
  loadCompliance();
}

/* ── Scanner ───────────────────────────────────────────────── */
function initScannerUI() {
  const pipe = document.getElementById('scanPipeline');
  if (pipe && !pipe.children.length) {
    pipe.innerHTML = SCAN_PHASES.map(p =>
      `<div class="pipe-step" data-phase="${p.id}" id="pipe-${p.id}">
        <div class="pipe-dot">${p.icon}</div><span>${esc(p.label)}</span>
      </div>`).join('');
  }
  const pg = document.getElementById('paramGrid');
  if (pg && !pg.children.length) {
    pg.innerHTML = PARAM_TYPES.map(p =>
      `<div class="param-item"><label>${p.label}<b id="param-${p.id}">0%</b></label>
        <div class="param-bar"><i id="parambar-${p.id}" style="background:${p.color}"></i></div></div>`).join('');
  }
  const eg = document.getElementById('eliteTechGrid');
  if (eg && !eg.children.length) {
    eg.innerHTML = ELITE_TECHNIQUES.map(t =>
      `<div class="tech-chip"><span class="t-icon">${t.icon}</span><div><strong>${esc(t.name)}</strong><span>${esc(t.desc)}</span></div></div>`).join('');
  }
  const ep = document.getElementById('enginesPanel');
  if (ep && !ep.innerHTML.trim()) {
    ep.innerHTML = `<div class="engine-grid">${SCAN_ENGINES.map(e =>
      `<div class="engine-card"><div class="e-icon">${e.icon}</div><h4>${esc(e.name)}</h4><p>${esc(e.desc)}</p></div>`).join('')}</div>`;
  }
}

function updatePipeline(currentPhase) {
  if (!currentPhase) return;
  const phases = SCAN_PHASES.map(p => p.id);
  const idx = phases.indexOf(currentPhase);
  const phase = SCAN_PHASES.find(p => p.id === currentPhase);
  const iconEl = document.getElementById('phaseIcon');
  if (iconEl && phase) iconEl.textContent = phase.icon;
  let activeEl = null;
  document.querySelectorAll('.pipe-step').forEach(el => {
    const pi = phases.indexOf(el.dataset.phase);
    const isActive = el.dataset.phase === currentPhase;
    el.classList.toggle('active', isActive);
    el.classList.toggle('done', pi >= 0 && pi < idx);
    if (isActive) activeEl = el;
  });
  if (activeEl) activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateParamCoverage(cov) {
  if (!cov) return;
  const pct = cov.param_coverage_pct || cov;
  PARAM_TYPES.forEach(p => {
    const v = pct[p.id] ?? 0;
    const el = document.getElementById('param-' + p.id);
    const bar = document.getElementById('parambar-' + p.id);
    if (el) el.textContent = (typeof v === 'number' ? v.toFixed(0) : v) + '%';
    if (bar) bar.style.width = Math.min(100, v) + '%';
  });
}

function updateScanMeta(s) {
  const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? '—'; };
  const eta = s.eta_formatted || (s.eta_seconds ? s.eta_seconds + 's' : '—');
  const elapsed = s.elapsed_formatted || (s.elapsed_seconds ? s.elapsed_seconds + 's' : '—');
  const workers = s.workers || '150';
  const speed = s.checks_per_sec ? fmtN(s.checks_per_sec) + '/s' : '—';
  set('scanEta', eta);
  set('scanElapsed', elapsed);
  set('scanWorkers', workers);
  set('scanQueue', s.queue_size != null ? fmtN(s.queue_size) : '—');
  set('fcpWorkers', workers);
  set('fcpSpeed', speed);
  set('fcpEta', eta);
  const fcpEl = document.getElementById('fcpElapsed');
  if (fcpEl) fcpEl.textContent = 'Elapsed ' + elapsed;
  if (s.current_phase) updatePipeline(s.current_phase);
  if (s.param_coverage || s.param_coverage_pct) updateParamCoverage(s);
}

function getScanType() {
  return document.getElementById('heroScanType')?.value
    || document.getElementById('pageScanType')?.value
    || document.getElementById('scannerHeaderScanType')?.value || 'mega';
}
function updateScannerUI() {
  const d = getDomainInput()?.value.trim();
  const el = document.getElementById('scannerDomain');
  if (el) el.textContent = d || 'Enter domain above to scan';
}

function setBars(overall, fuzz) {
  paintScanProgress(overall, fuzz);
}

function refreshProgressUI() {
  if (scanId) { pollScan(); return; }
  paintScanProgress(lastDisplayProgress.overall, lastDisplayProgress.fuzz);
}

function applyScanState(s) {
  if (!s || s.error) return;
  const overall = resolveScanProgress(s);
  const fuzz = Math.max(Number(s.fuzz_pct) || 0, 0);
  paintScanProgress(overall, fuzz);
  if (s.phase_label || s.current_phase) {
    document.getElementById('phaseLabel').textContent = s.phase_label || s.current_phase || 'Scanning…';
  }
  if (s.phase_detail != null) {
    document.getElementById('phaseDetail').textContent = s.phase_detail || '';
  }
  if (s.current_phase) updatePipeline(s.current_phase);
  if (s.status === 'running' || s.status === 'queued') {
    setScanButtonsDisabled(true);
    setScanStatus('running', s.phase_label || s.current_phase || 'Scanning…');
  } else if (s.status === 'cancelled') {
    setScanButtonsDisabled(false);
    setScanStatus('', 'Stopped');
    document.getElementById('phaseLabel').textContent = 'Scan stopped';
    document.getElementById('phaseDetail').textContent = s.phase_detail || 'You stopped this scan.';
  }
  document.getElementById('scanChecks').textContent = s.checks_done ? fmtN(s.checks_done) : '—';
  const speedTxt = s.checks_per_sec ? fmtN(s.checks_per_sec) + '/s' : '—';
  document.getElementById('scanSpeed').textContent = speedTxt;
  const fcpSpeed = document.getElementById('fcpSpeed');
  if (fcpSpeed) fcpSpeed.textContent = speedTxt;
  updateScanMeta(s);
  if (s.threat_summary || s.live_threats) updateThreatRadar(s.threat_summary, s.live_threats);
  const st = s.stats || {};
  document.getElementById('scanFindings').textContent = s.findings_count ?? st.total_analyzed ?? '—';
  document.getElementById('scanVerified').textContent = st.verified_exploitable ?? s.verified_count ?? '—';
}

function setScanButtonsDisabled(running) {
  const scanBtn = document.getElementById('scanBtn');
  const fcpRun = document.getElementById('fcpScanBtn');
  const fcpStop = document.getElementById('fcpStopBtn');
  const heroStop = document.getElementById('scanStopBtn');
  if (scanBtn) scanBtn.disabled = running;
  if (fcpRun) {
    fcpRun.disabled = running;
    fcpRun.style.display = running ? 'none' : 'block';
  }
  if (fcpStop) fcpStop.style.display = running ? 'block' : 'none';
  if (heroStop) heroStop.style.display = running ? 'inline-flex' : 'none';
}

function threatSeverityIcon(sev, verified) {
  if (verified) return '✓';
  const s = (sev || '').toLowerCase();
  if (s === 'critical' || s === 'crit') return '☠️';
  if (s === 'high') return '🔥';
  if (s === 'medium' || s === 'med') return '⚠️';
  if (s === 'info') return 'ℹ️';
  return '🔍';
}

function bumpThreatCounter(id) {
  const el = document.getElementById(id)?.closest('.threat-counter-card');
  if (!el) return;
  el.classList.remove('counter-bump');
  void el.offsetWidth;
  el.classList.add('counter-bump');
}

function setThreatStreamStatus(on, text) {
  const el = document.getElementById('threatStreamStatus');
  const badge = document.getElementById('threatLiveBadge');
  if (el) {
    el.innerHTML = on
      ? '<span class="pulse-dot"></span> Streaming live'
      : `<span class="pulse-dot" style="background:#484f58"></span> ${esc(text || 'Offline')}`;
  }
  if (badge) badge.style.opacity = on ? '1' : '.5';
}

function updateThreatRadar(summary, threats) {
  summary = summary || {};
  threats = threats || [];
  const prev = {
    crit: Number(document.getElementById('tcCrit')?.textContent) || 0,
    high: Number(document.getElementById('tcHigh')?.textContent) || 0,
    ver: Number(document.getElementById('tcVer')?.textContent) || 0,
    total: Number(document.getElementById('tcTotal')?.textContent) || 0,
  };
  const crit = summary.critical || 0;
  const high = summary.high || 0;
  const ver = summary.verified || 0;
  const total = summary.total || 0;
  document.getElementById('tcCrit').textContent = crit;
  document.getElementById('tcHigh').textContent = high;
  document.getElementById('tcVer').textContent = ver;
  document.getElementById('tcTotal').textContent = total;
  if (crit > prev.crit) bumpThreatCounter('tcCrit');
  if (high > prev.high) bumpThreatCounter('tcHigh');
  if (ver > prev.ver) bumpThreatCounter('tcVer');
  if (total > prev.total) bumpThreatCounter('tcTotal');
  if (!threats.length) return;
  const feed = document.getElementById('threatFeed');
  threats.slice().reverse().forEach(t => {
    if (seenThreatIds.has(t.event_id)) return;
    seenThreatIds.add(t.event_id);
    if (feed.querySelector('.scan-empty')) feed.innerHTML = '';
    const sev = (t.severity || 'medium').toLowerCase();
    const cls = t.verified ? 'ok' : (sev === 'critical' ? 'critical' : sev);
    const div = document.createElement('div');
    div.className = 'threat compact ' + cls;
    const time = t.ts ? new Date(t.ts).toLocaleTimeString() : '';
    div.innerHTML = `
      <div class="sev-icon">${threatSeverityIcon(sev, t.verified)}</div>
      <div class="threat-body">
        <strong>${t.verified ? '✓ ' : ''}${esc(t.title)}</strong>
        <span>${esc(t.category || 'Threat')}${t.target ? ' · ' + esc(t.target) : ''}${time ? ' · ' + time : ''}</span>
      </div>
      <span class="threat-badge">${esc(t.verified ? 'verified' : sev)}</span>`;
    feed.insertBefore(div, feed.firstChild);
    while (feed.children.length > 50) feed.removeChild(feed.lastChild);
  });
}

function connectThreatStream() {
  if (eventSource) eventSource.close();
  if (!scanId) return;
  document.getElementById('liveDot')?.classList.add('on');
  setThreatStreamStatus(true);
  eventSource = new EventSource(`/api/scan/${scanId}/stream`);
  eventSource.onmessage = e => {
    try {
      const d = JSON.parse(e.data);
      if (d.type === 'snapshot' || d.type === 'complete') updateThreatRadar(d.summary, d.threats);
      else {
        updateThreatRadar(null, [d]);
        if (d.type === 'phase_change' && d.phase) {
          updatePipeline(d.phase);
          const est = phaseEstimatePct(d.phase);
          const cur = lastDisplayProgress.overall;
          const fuzz = lastDisplayProgress.fuzz;
          if (est > cur) setBars(est, fuzz);
        }
      }
      pollScan(true);
    } catch {}
  };
  eventSource.onerror = () => {
    document.getElementById('liveDot')?.classList.remove('on');
    setThreatStreamStatus(false, 'Stream disconnected');
  };
}

function disconnectThreatStream() {
  if (eventSource) { eventSource.close(); eventSource = null; }
  document.getElementById('liveDot')?.classList.remove('on');
  setThreatStreamStatus(false, 'Scan idle');
}

let pollInflight = false;
let lastPollAt = 0;

async function pollScan(force) {
  if (!scanId) return;
  if (pollInflight && !force) return;
  pollInflight = true;
  try {
    const s = await (await fetch(`/api/scan/${scanId}`)).json();
    if (s.error) return;
    applyScanState(s);
    lastPollAt = Date.now();

    if (s.status === 'completed') {
      clearInterval(poll); poll = null; disconnectThreatStream();
      rememberScanId(null);
      setScanButtonsDisabled(false);
      setScanStatus('done', 'Complete');
      setStatus('Scan complete!');
      toast('Scan finished — check your results', 'ok');
      const r = s.result || {};
      renderFindings(r.findings, (r.verified_findings || []).map(f => f.id));
      renderVerified(r.verified_findings || []);
      renderSubmit(r.submittable_reports || []);
      loadDashboard();
    } else if (s.status === 'failed') {
      clearInterval(poll); poll = null; disconnectThreatStream();
      setScanButtonsDisabled(false);
      setScanStatus('', 'Failed');
      setStatus('Scan failed');
      toast('Scan failed — please try again', 'warn');
    } else if (s.status === 'cancelled') {
      clearInterval(poll); poll = null; disconnectThreatStream();
      rememberScanId(null);
      setScanButtonsDisabled(false);
      setScanStatus('', 'Stopped');
      setStatus('Scan stopped');
      document.getElementById('phaseLabel').textContent = 'Scan stopped';
      document.getElementById('phaseDetail').textContent = s.phase_detail || 'You stopped this scan.';
    } else if (s.status === 'running' || s.status === 'queued') {
      setScanButtonsDisabled(true);
    }
  } catch {} finally { pollInflight = false; }
}

function renderFindings(findings, vids) {
  const el = document.getElementById('findingsList');
  if (!findings?.length) { el.innerHTML = '<div class="scan-empty"><div class="empty-icon">🔎</div><p>No issues found yet.</p></div>'; return; }
  const vset = new Set(vids || []);
  el.innerHTML = findings.slice(0, 80).map(f => {
    const v = vset.has(f.id) || f.submission_ready;
    return `<div class="finding ${v ? 'ok' : ''}"><span class="tag ${f.severity === 'critical' ? 'crit' : ''}">${f.severity || 'info'}</span>
      ${v ? '<span class="tag ok-tag">verified</span>' : ''}<strong>${esc(f.title)}</strong><p class="muted">${esc(f.target)}</p></div>`;
  }).join('');
}

function renderVerified(list) {
  const el = document.getElementById('verifiedList');
  if (!list?.length) { el.innerHTML = '<div class="scan-empty"><div class="empty-icon">✅</div><p>No confirmed vulnerabilities yet.</p></div>'; return; }
  el.innerHTML = list.map(f => `<div class="finding ok"><span class="tag ok-tag">verified</span><strong>${esc(f.title)}</strong><p class="muted">${esc(f.target)}</p><pre>${esc(f.evidence)}</pre></div>`).join('');
}

function renderSubmit(reports) {
  const el = document.getElementById('submitList');
  if (!el) return;
  if (!planHas('reports')) { el.innerHTML = planHint('reports'); return; }
  if (!reports?.length) { el.innerHTML = '<p class="muted">No submission-ready reports yet.</p>'; return; }
  el.innerHTML = reports.map(r => `<div class="finding ok"><strong>${esc(r.title)}</strong><pre>${esc(r.report)}</pre>
    <button class="btn sm ghost" onclick="navigator.clipboard.writeText(this.previousElementSibling.textContent);toast('Copied!','ok')">Copy report</button></div>`).join('');
}

function rememberScanId(id) {
  scanId = id;
  if (id) sessionStorage.setItem('qs_scan_id', id);
  else sessionStorage.removeItem('qs_scan_id');
}

async function resolveActiveScanId() {
  const tryId = async (id) => {
    if (!id) return null;
    try {
      const d = await (await fetch(`/api/scan/${encodeURIComponent(id)}`)).json();
      if (d.error) return null;
      if (['running', 'queued'].includes(d.status)) {
        rememberScanId(id);
        return id;
      }
    } catch {}
    return null;
  };

  let id = await tryId(scanId);
  if (id) return id;

  id = await tryId(sessionStorage.getItem('qs_scan_id'));
  if (id) return id;

  try {
    const latest = await (await fetch('/api/scan/latest')).json();
    id = await tryId(latest.scan_id);
    if (id) return id;
  } catch {}

  return null;
}

async function stopScan() {
  const id = await resolveActiveScanId();
  if (!id) {
    toast('No active scan to stop', 'warn');
    setScanButtonsDisabled(false);
    return;
  }
  const fcpStop = document.getElementById('fcpStopBtn');
  const heroStop = document.getElementById('scanStopBtn');
  const stopLabel = '■ Stop Scan';
  if (fcpStop) { fcpStop.disabled = true; fcpStop.textContent = 'Stopping…'; }
  if (heroStop) { heroStop.disabled = true; heroStop.textContent = 'Stopping…'; }
  setScanStatus('running', 'Stopping…');
  setStatus('Stopping scan…');
  try {
    let r = await fetch(`/api/scan/stop?scan_id=${encodeURIComponent(id)}`, { method: 'POST' });
    if (r.status === 404) {
      r = await fetch(`/api/scan/${encodeURIComponent(id)}/stop`, { method: 'POST' });
    }
    const d = await r.json();
    if (!r.ok || d.ok === false) {
      toast(d.message || d.detail || d.error || 'Could not stop scan', 'warn');
      if (id) setScanButtonsDisabled(true);
      return;
    }
    clearInterval(poll); poll = null;
    disconnectThreatStream();
    rememberScanId(null);
    applyScanState(d);
    setScanButtonsDisabled(false);
    setStatus('Scan stopped');
    toast(d.message || 'Scan stopped', 'ok');
  } catch (e) {
    toast(e.message, 'warn');
    if (id) setScanButtonsDisabled(true);
  } finally {
    if (fcpStop) { fcpStop.disabled = false; fcpStop.textContent = stopLabel; }
    if (heroStop) { heroStop.disabled = false; heroStop.textContent = stopLabel; }
  }
}

async function startMega() {
  const domain = getDomain(); if (!domain) return;
  if (autoScanTimer) clearTimeout(autoScanTimer);
  if (autoScanCountdown) clearInterval(autoScanCountdown);
  autoScanTimer = null;
  autoScanCountdown = null;
  document.getElementById('autoScanBanner')?.remove();
  syncDomains(domain);
  setScanButtonsDisabled(true);
  seenThreatIds.clear();
  document.getElementById('threatFeed').innerHTML = '<div class="scan-empty"><div class="empty-icon">📡</div><p>Listening for threats…</p></div>';
  setThreatStreamStatus(false, 'Connecting…');
  setStatus('Starting scan…');
  setScanStatus('running', 'Starting…');
  toast('Scan started — this may take a few minutes');
  try {
    const scanType = getScanType();
    const r = await fetch(`/api/scan?scan_type=${scanType}&domain=` + encodeURIComponent(domain), { method: 'POST' });
    const d = await r.json();
    if (!r.ok) { toast(d.detail || 'Could not start scan', 'warn'); setScanButtonsDisabled(false); setScanStatus('', 'Ready'); return; }
    scanId = d.scan_id;
    rememberScanId(scanId);
    navPage('scanner');
    connectThreatStream();
    if (poll) clearInterval(poll);
    poll = setInterval(pollScan, 250);
    pollScan();
  } catch (e) { toast(e.message, 'warn'); setScanButtonsDisabled(false); setScanStatus('', 'Ready'); }
}

/* ── Reports ───────────────────────────────────────────────── */
async function loadStandards() {
  const d = await (await fetch('/api/reports/standards')).json();
  reportStandards = d.standards || [];
  document.getElementById('stdGrid').innerHTML = reportStandards.map(s =>
    `<div class="std ${s.id === currentStandard ? 'active' : ''}" data-std="${s.id}" onclick="selectStandard('${s.id}')"><strong>${esc(s.name)}</strong><span>${esc(s.region)}</span></div>`).join('');
}

function selectStandard(id) {
  if (!planHas('reports')) { toast('Upgrade to Professional for compliance reports', 'warn'); navPage('plans'); return; }
  currentStandard = id;
  document.querySelectorAll('.std').forEach(s => s.classList.toggle('active', s.dataset.std === id));
  loadReport(id);
}

async function loadReport(std) {
  if (!planHas('reports')) { document.getElementById('reportBody').innerHTML = planHint('reports'); return; }
  if (!scanId) { document.getElementById('reportBody').innerHTML = '<p class="muted">Run a web scan first to generate reports.</p>'; return; }
  const r = await (await fetch(`/api/reports/${scanId}?standard=${std}&format=json`)).json();
  if (r.error) { document.getElementById('reportBody').textContent = r.error; return; }
  currentReportContent = r.content || '';
  document.getElementById('reportBody').textContent = currentReportContent;
  document.getElementById('reportActions').style.display = 'flex';
}

function copyReport() {
  if (!currentReportContent) return;
  navigator.clipboard.writeText(currentReportContent);
  toast('Report copied to clipboard!', 'ok');
}

function downloadReport(fmt) {
  if (!scanId) return;
  if (!planHas('reports')) { navPage('plans'); return; }
  window.open(`/api/reports/${scanId}?standard=${currentStandard}&format=${fmt === 'html' ? 'html' : 'text'}`, '_blank');
}

/* ── Boot ────────────────────────────────────────────────────── */
async function boot() {
  MODULE_NAV.forEach(m => {
    const el = document.createElement('button');
    el.className = 'nav-link' + (m.id === 'dashboard' ? ' active' : '');
    el.dataset.page = m.id;
    el.textContent = m.label;
    el.onclick = () => navPage(m.id);
    document.getElementById('mainNav').appendChild(el);
  });

  document.getElementById('pageDomainInput')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') syncDomainAndAnalyze();
  });
  document.getElementById('scannerHeaderDomain')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') syncDomainAndAnalyze();
  });

  setStatus('Ready — enter your domain to begin');

  updatePlanUI();
  document.querySelector('.main')?.classList.add('full-width');
  renderLanding();
  initFeatureTicker();

  try {
    const b = await (await fetch('/api/boot')).json();
    document.getElementById('verPill').textContent = 'v' + (b.version || '7');
    if (b.scan?.status === 'running' || b.scan?.status === 'queued') {
      rememberScanId(b.latest_scan_id || b.scan?.scan_id);
      setScanButtonsDisabled(true);
      setScanStatus('running', 'Scanning…');
      navPage('scanner');
      connectThreatStream();
      poll = setInterval(pollScan, 250);
      pollScan();
    }
  } catch {}
  loadStandards();
  initScannerUI();
  updateScannerUI();
  if (document.getElementById('page-scanner')?.classList.contains('active')) {
    document.body.classList.add('scanner-active');
  }
}

document.addEventListener('DOMContentLoaded', boot);
