// ============================================
// Arc ⚡ Website - Interactive Components
// The token counter logic below was compiled
// from Arc source (see arc-src/interactive.arc)
// ============================================

// --- Arc-compiled token counting (from arc-src/interactive.arc) ---
// We inline the core functions here, compiled from Arc to JS
const ArcEngine = {
  // Arc's count_tokens function, compiled from:
  //   fn count_tokens(code) { code |> split(" ") |> filter(t => len(t) > 0) |> len() }
  count_tokens(code) {
    return code.split(" ").filter(t => t.length > 0).length;
  },
  // Arc's calc_savings function, compiled from:
  //   fn calc_savings(arc_count, js_count) { 100 - (arc_count * 100 / js_count) }
  calc_savings(arc_count, js_count) {
    return 100 - (arc_count * 100 / js_count);
  },
  format_pct(n) {
    return Math.round(n);
  }
};

// --- Typing effect ---
document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('tagline');
  const text = 'A programming language designed by AI agents, for AI agents.';
  let i = 0;
  el.innerHTML = '<span class="cursor"></span>';
  function type() {
    if (i < text.length) {
      el.innerHTML = text.slice(0, ++i) + '<span class="cursor"></span>';
      setTimeout(type, i === 1 ? 200 : 30 + Math.random() * 30);
    }
  }
  setTimeout(type, 600);

  // --- Mobile hamburger ---
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.querySelector('nav .links');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
      });
    });
  }

  // --- Scroll reveal ---
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        obs.unobserve(e.target);
      }
    });
  }, { threshold: 0.15 });
  document.querySelectorAll('.reveal').forEach(el => obs.observe(el));

  // --- Live token counter ---
  const arcInput = document.getElementById('arc-input');
  const jsInput = document.getElementById('js-input');
  const arcCount = document.getElementById('arc-count');
  const jsCount = document.getElementById('js-count');
  const savingsEl = document.getElementById('savings');

  function updateCounts() {
    if (!arcInput || !jsInput) return;
    const ac = ArcEngine.count_tokens(arcInput.value);
    const jc = ArcEngine.count_tokens(jsInput.value);
    arcCount.textContent = ac + ' tokens';
    jsCount.textContent = jc + ' tokens';
    if (jc > 0) {
      const pct = ArcEngine.format_pct(ArcEngine.calc_savings(ac, jc));
      savingsEl.textContent = pct + '% fewer tokens with Arc';
      savingsEl.style.color = pct > 0 ? '#00d4ff' : '#ff6b35';
    }
  }

  if (arcInput) {
    arcInput.addEventListener('input', updateCounts);
    jsInput.addEventListener('input', updateCounts);
    updateCounts();
  }

  // --- Animated stat counters ---
  const statNums = document.querySelectorAll('.stat-num');
  const statObs = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        animateCount(e.target);
        statObs.unobserve(e.target);
      }
    });
  }, { threshold: 0.5 });
  statNums.forEach(el => statObs.observe(el));

  function animateCount(el) {
    const target = parseInt(el.dataset.target || el.textContent);
    const suffix = el.dataset.suffix || '';
    const prefix = el.dataset.prefix || '';
    let current = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      current += step;
      if (current >= target) {
        current = target;
        clearInterval(timer);
      }
      el.textContent = prefix + current + suffix;
    }, 25);
  }

  // --- Savings Calculator ---
  const spendInput = document.getElementById('monthly-spend');
  const pctSlider = document.getElementById('savings-pct');
  const pctLabel = document.getElementById('savings-pct-label');
  const monthlySavingsEl = document.getElementById('monthly-savings');
  const annualSavingsEl = document.getElementById('annual-savings');
  const newMonthlyEl = document.getElementById('new-monthly');
  const scaleSolo = document.getElementById('scale-solo');
  const scaleTeam = document.getElementById('scale-team');
  const scaleStartup = document.getElementById('scale-startup');
  const scaleEnterprise = document.getElementById('scale-enterprise');

  function fmt(n) { return '$' + Math.round(n).toLocaleString(); }

  function updateCalc() {
    if (!spendInput || !pctSlider) return;
    const spend = parseFloat(spendInput.value) || 0;
    const pct = parseInt(pctSlider.value) || 27;
    pctLabel.textContent = pct + '%';
    const saved = spend * pct / 100;
    monthlySavingsEl.textContent = fmt(saved);
    annualSavingsEl.textContent = fmt(saved * 12);
    newMonthlyEl.textContent = fmt(spend - saved);
    scaleSolo.textContent = 'saves ' + fmt(500 * pct / 100 * 12) + '/yr';
    scaleTeam.textContent = 'saves ' + fmt(5000 * pct / 100 * 12) + '/yr';
    scaleStartup.textContent = 'saves ' + fmt(25000 * pct / 100 * 12) + '/yr';
    scaleEnterprise.textContent = 'saves ' + fmt(100000 * pct / 100 * 12) + '/yr';
  }

  if (spendInput) {
    spendInput.addEventListener('input', updateCalc);
    pctSlider.addEventListener('input', updateCalc);
    updateCalc();
  }

  // Log that Arc engine is running
  console.log('⚡ Arc Interactive Engine loaded — token counting powered by Arc');
});
