// ── STORY DATA ──
const stories = [];
async function loadStories() {
  try {
    const res = await fetch('/universes.json', { credentials: 'same-origin' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    stories.push(...data);
    document.getElementById('universe-count').textContent = stories.length;
    updateBook(0, false);
  } catch (error) {
    console.error('Failed to load stories:', error);
  }
}

loadStories();


let current = 0;
let autoTimer;

// ── BOOK CAROUSEL ──
function updateBook(index, animated = true) {
  const s = stories[index];
  const book = document.getElementById('openBook');

  if (animated) {
    book.classList.add('page-transition');
    setTimeout(() => book.classList.remove('page-transition'), 450);
  }

  // Update left page
  // document.getElementById('leftTitle').textContent = s.title;
  document.getElementById('chapterTitle').textContent = s.title;
  document.getElementById('chapterText').textContent = s.leftText;

  // Update image
  const img = document.getElementById('storyImage');
  img.src = s.image;
  img.alt = s.imageAlt;

  // Update right page
  // document.getElementById('rightGenre').textContent = s.genre;
  document.getElementById('genreTag').textContent = s.genreTag;
  document.getElementById('chapterTextRight').textContent = s.rightText;
  // document.getElementById('authorPrompt').textContent = s.quote;

  // Update dots
  document.querySelectorAll('.carousel-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
    dot.setAttribute('aria-selected', i === index);
  });
}

function goTo(index) {
  current = (index + stories.length) % stories.length;
  updateBook(current);
  resetTimer();
}

function resetTimer() {
  clearInterval(autoTimer);
  autoTimer = setInterval(() => goTo(current + 1), 5000);
}

// ── AUTH TABS ──
function switchTab(tab) {
  const isLogin = tab === 'login';
  document.getElementById('tabLogin').classList.toggle('active', isLogin);
  document.getElementById('tabSignup').classList.toggle('active', !isLogin);
  document.getElementById('tabLogin').setAttribute('aria-selected', isLogin);
  document.getElementById('tabSignup').setAttribute('aria-selected', !isLogin);
  document.getElementById('panelLogin').style.display = isLogin ? '' : 'none';
  document.getElementById('panelSignup').style.display = isLogin ? 'none' : '';
}

// ── AUTH WIRING ──
// Talks to the same NextAuth + /api/auth/register endpoints used by the
// dynamic React forms in components/auth/. CSRF token is fetched on demand;
// for credentials we POST as JSON (NextAuth's callback supports json:'true')
// and for OAuth we submit a hidden form so NextAuth performs the redirect chain.

async function fetchCsrfToken() {
  const res = await fetch('/api/auth/csrf', { credentials: 'same-origin' });
  const data = await res.json();
  return data.csrfToken;
}

function setError(el, msg) {
  if (!el) return;
  if (!msg) { el.hidden = true; el.textContent = ''; return; }
  el.textContent = msg;
  el.hidden = false;
}

function setLoading(form, loading, defaultLabel) {
  const btn = form.querySelector('button[type="submit"]');
  if (!btn) return;
  btn.disabled = loading;
  if (loading) btn.dataset.label = btn.textContent;
  btn.textContent = loading ? 'Please wait…' : (defaultLabel || btn.dataset.label || btn.textContent);
}

async function credentialsSignIn(email, password) {
  const csrfToken = await fetchCsrfToken();
  const body = new URLSearchParams({
    csrfToken, email, password,
    captchaToken: '',
    callbackUrl: '/',
    json: 'true',
  });
  const res = await fetch('/api/auth/callback/credentials', {
    method:      'POST',
    credentials: 'same-origin',
    headers:     { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:        body.toString(),
    redirect:    'follow',
  });
  if (!res.ok) return { ok: false, error: 'Sign-in failed.' };
  // NextAuth returns { url } on success; an error returns { url: '...?error=...' }
  let payload = null;
  try { payload = await res.json(); } catch {}
  if (payload && typeof payload.url === 'string' && payload.url.includes('error=')) {
    return { ok: false, error: 'Incorrect email or password.' };
  }
  return { ok: true, url: (payload && payload.url) || '/' };
}

async function oauthSignIn(provider) {
  const csrfToken = await fetchCsrfToken();
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = `/api/auth/signin/${encodeURIComponent(provider)}`;
  const fields = { csrfToken, callbackUrl: '/' };
  for (const [name, value] of Object.entries(fields)) {
    const input = document.createElement('input');
    input.type = 'hidden';
    input.name = name;
    input.value = value;
    form.appendChild(input);
  }
  document.body.appendChild(form);
  form.submit();
}

async function registerUser({ displayName, email, password }) {
  const res = await fetch('/api/auth/register', {
    method:      'POST',
    credentials: 'same-origin',
    headers:     { 'Content-Type': 'application/json' },
    body:        JSON.stringify({ displayName, email, password, captchaToken: '' }),
  });
  if (!res.ok) {
    let msg = 'Registration failed.';
    try { msg = (await res.json()).error || msg; } catch {}
    throw new Error(msg);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  const form  = e.currentTarget;
  const error = document.getElementById('loginError');
  setError(error, '');
  setLoading(form, true);
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    const res  = await credentialsSignIn(String(data.email || ''), String(data.password || ''));
    if (!res.ok) throw new Error(res.error);
    window.location.href = res.url || '/';
  } catch (err) {
    setError(error, err && err.message ? err.message : 'Sign-in failed.');
    setLoading(form, false, 'Enter the Universe →');
  }
}

async function handleSignup(e) {
  e.preventDefault();
  const form  = e.currentTarget;
  const error = document.getElementById('signupError');
  setError(error, '');
  const data = Object.fromEntries(new FormData(form).entries());
  const displayName = String(data.displayName || '').trim();
  const email       = String(data.email || '').trim();
  const password    = String(data.password || '');
  const confirm     = String(data.confirm || '');
  if (password !== confirm) { setError(error, 'Passwords do not match.'); return; }
  if (password.length < 8)  { setError(error, 'Password must be at least 8 characters.'); return; }
  setLoading(form, true);
  try {
    await registerUser({ displayName, email, password });
    const res = await credentialsSignIn(email, password);
    if (!res.ok) throw new Error(res.error);
    window.location.href = res.url || '/';
  } catch (err) {
    setError(error, err && err.message ? err.message : 'Could not create account.');
    setLoading(form, false, 'Begin Your Story →');
  }
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', () => {
  // TODO: Load universe from API — replace with real API call

  // Universe count
  document.getElementById('universe-count').textContent = stories.length;
  
  // Carousel buttons
  document.getElementById('prevBtn').addEventListener('click', () => goTo(current - 1));
  document.getElementById('nextBtn').addEventListener('click', () => goTo(current + 1));

  // Dot navigation
  document.querySelectorAll('.carousel-dot').forEach(dot => {
    dot.addEventListener('click', () => goTo(parseInt(dot.dataset.index)));
  });

  // Touch swipe on book
  let touchStartX = 0;
  const book = document.getElementById('openBook');
  book.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  book.addEventListener('touchend', e => {
    const delta = touchStartX - e.changedTouches[0].clientX;
    if (Math.abs(delta) > 40) goTo(delta > 0 ? current + 1 : current - 1);
  });

  // Auth tabs
  document.getElementById('tabLogin').addEventListener('click', () => switchTab('login'));
  document.getElementById('tabSignup').addEventListener('click', () => switchTab('signup'));

  // Auth forms
  document.getElementById('loginForm').addEventListener('submit', handleLogin);
  document.getElementById('signupForm').addEventListener('submit', handleSignup);

  // Social auth
  document.querySelectorAll('.social-btn[data-provider]').forEach(btn => {
    btn.addEventListener('click', () => oauthSignIn(btn.dataset.provider));
  });

  // Hamburger nav
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  hamburger.addEventListener('click', () => {
    const open = navLinks.classList.toggle('open');
    hamburger.setAttribute('aria-expanded', open);
  });

  // Start carousel
  resetTimer();
});
