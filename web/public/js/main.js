// ── STORY DATA ──
const stories = [];
async function loadStories() {
  try {
    const data = await new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('GET', './assets/universes.json', true);
      xhr.onload = () => xhr.status === 0 || xhr.status === 200
        ? resolve(JSON.parse(xhr.responseText))
        : reject(new Error(xhr.statusText));
      xhr.onerror = reject;
      xhr.send();
    });

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

function handleAuth(e, type) {
  e.preventDefault();
  // Redirect to app — replace with real auth endpoint
  window.location.href = '/app';
}

function handleSocial(provider) {
  // Hook into OAuth — replace with real OAuth URL
  window.location.href = `/auth/${provider}`;
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
