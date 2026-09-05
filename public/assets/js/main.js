/* ═══════════════════════════════════════════
   Sami Prompts — Core Interactive Engine
   ═══════════════════════════════════════════ */

(function () {
  'use strict';

  window.NP = {
    user: null,
    async init() {
      this.initTheme();
      await this.checkAuth();
      this.initHeader();
      this.initSlider();
      this.initLightbox();
      this.initCopyButtons();
      this.initShareButtons();
    },

    initTheme() {
      const stored = localStorage.getItem('sami_theme');
      const theme = stored || 'dark';
      this.applyTheme(theme, false);
      this.setupThemeToggle();
    },

    applyTheme(theme, animate = true) {
      if (animate) {
        document.documentElement.classList.add('theme-animating');
        clearTimeout(this._animTimer);
        this._animTimer = setTimeout(() => {
          document.documentElement.classList.remove('theme-animating');
        }, 350);
      }
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('sami_theme', theme);
      this.updateThemeButton(theme);
    },

    toggleTheme() {
      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      const next = current === 'dark' ? 'light' : 'dark';
      this.applyTheme(next, true);
      this.showToast(next === 'dark' ? '🌙 Dark Mode Activated' : '☀️ Light Mode Activated');
    },

    updateThemeButton(theme) {
      const btns = document.querySelectorAll('.theme-toggle-btn');
      btns.forEach(btn => {
        const text = btn.querySelector('.theme-text');
        if (text) {
          text.textContent = theme === 'dark' ? 'Dark' : 'Light';
        }
        btn.setAttribute('title', `Current: ${theme === 'dark' ? 'Dark' : 'Light'} Mode (Click to switch)`);
      });
    },

    setupThemeToggle() {
      const headerInner = document.querySelector('.header-inner');
      if (!headerInner) return;

      let wrap = headerInner.querySelector('.header-actions');
      if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'header-actions';
        wrap.innerHTML = `
          <button id="theme-toggle-btn" class="theme-toggle-btn" type="button" aria-label="Toggle Dark/Light Mode" title="Toggle Theme">
            <span class="theme-icon moon-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12.3 2a10 10 0 0 0-.19 20 10 10 0 0 0 8.09-4.11 1 1 0 0 0-1-1.49 8 8 0 1 1-8.39-14.3 1 1 0 0 0 .49-1.1 1 1 0 0 0-1-.02z"/></svg>
            </span>
            <span class="theme-icon sun-icon">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
            </span>
            <span class="theme-text">Theme</span>
          </button>
        `;
        headerInner.appendChild(wrap);
      }

      const current = document.documentElement.getAttribute('data-theme') || 'dark';
      this.updateThemeButton(current);

      document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.onclick = (e) => {
          e.preventDefault();
          this.toggleTheme();
        };
      });
    },

    async checkAuth() {
      try {
        const res = await fetch('/api/auth/me');
        const data = await res.json();
        this.user = data.user;
        this.updateNav();
      } catch (e) {
        this.user = null;
      }
    },

    updateNav() {
      const nav = document.getElementById('main-nav');
      if (!nav) return;

      const currentPath = window.location.pathname;

      if (this.user) {
        nav.innerHTML = `
          <a href="/" class="${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Home</a>
          <a href="/browse" class="${currentPath.includes('browse') ? 'active' : ''}">All Prompts</a>
          <a href="/community" class="${currentPath.includes('community') ? 'active' : ''}">Social Corner</a>
          ${this.user.role === 'admin' ? `
            <a href="/admin" class="${currentPath.includes('admin') ? 'active' : ''}" style="color:var(--primary);font-weight:700;">
              ⚡ Admin Studio
            </a>
          ` : ''}
          <a href="/account" class="${currentPath.includes('account') ? 'active' : ''}">My Account</a>
          <a href="#" id="logout-btn" class="nav-btn" style="background:#4B5563 !important;">Logout</a>
        `;

        document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
          e.preventDefault();
          await fetch('/api/auth/logout', { method: 'POST' });
          window.location.href = '/';
        });
      } else {
        nav.innerHTML = `
          <a href="/" class="${currentPath === '/' || currentPath.endsWith('index.html') ? 'active' : ''}">Home</a>
          <a href="/browse" class="${currentPath.includes('browse') ? 'active' : ''}">All Prompts</a>
          <a href="/community" class="${currentPath.includes('community') ? 'active' : ''}">Social Corner</a>
          <a href="/pricing" class="${currentPath.includes('pricing') ? 'active' : ''}">Join Community</a>
          <a href="/login" class="${currentPath.includes('login') ? 'active' : ''}">Login</a>
          <a href="/register" class="nav-btn">Get Started</a>
        `;
      }
    },

    initHeader() {
      const navToggle = document.getElementById('nav-toggle');
      if (navToggle) {
        document.querySelectorAll('.main-nav a').forEach(link => {
          link.addEventListener('click', () => { navToggle.checked = false; });
        });
      }
    },

    initSlider() {
      const slider = document.querySelector('.cover-slider');
      if (!slider) return;

      const slides = slider.querySelectorAll('.cover-slide');
      if (slides.length <= 1) return;

      const dotsWrap = document.createElement('div');
      dotsWrap.className = 'slider-dots';
      slides.forEach((_, i) => {
        const dot = document.createElement('span');
        dot.className = `slider-dot ${i === 0 ? 'active' : ''}`;
        dot.addEventListener('click', () => goToSlide(i));
        dotsWrap.appendChild(dot);
      });
      slider.appendChild(dotsWrap);

      let current = 0;
      let timer = null;

      function goToSlide(idx) {
        slides[current].classList.remove('active');
        dotsWrap.children[current].classList.remove('active');
        current = idx;
        slides[current].classList.add('active');
        dotsWrap.children[current].classList.add('active');
      }

      function nextSlide() {
        const next = (current + 1) % slides.length;
        goToSlide(next);
      }

      timer = setInterval(nextSlide, 4500);
      slider.addEventListener('mouseenter', () => clearInterval(timer));
      slider.addEventListener('mouseleave', () => { timer = setInterval(nextSlide, 4500); });
    },

    showToast(message = 'Action completed!') {
      const existing = document.querySelector('.copy-toast');
      if (existing) existing.remove();

      const toast = document.createElement('div');
      toast.className = 'copy-toast';
      toast.innerHTML = message;
      document.body.appendChild(toast);

      setTimeout(() => toast.classList.add('show'), 20);
      setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
      }, 2400);
    },

    initCopyButtons() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('#copy-btn, .copy-prompt-btn');
        if (!btn) return;

        const targetEl = document.getElementById('prompt-content') || document.querySelector(btn.dataset.target);
        if (!targetEl) return;

        const text = targetEl.innerText || targetEl.textContent;
        navigator.clipboard.writeText(text).then(() => {
          this.showToast('📋 Master Prompt copied to clipboard!');
          const promptId = btn.dataset.promptId;
          if (promptId) {
            fetch(`/api/prompts/${promptId}/copy`, { method: 'POST' });
          }
        }).catch(() => {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          this.showToast('📋 Master Prompt copied to clipboard!');
        });
      });
    },

    initShareButtons() {
      document.addEventListener('click', (e) => {
        const btn = e.target.closest('.share-btn');
        if (!btn) return;

        const link = btn.dataset.link || window.location.href;
        navigator.clipboard.writeText(link).then(() => {
          this.showToast('🔗 Link copied to clipboard!');
        }).catch(() => {
          prompt('Copy this link:', link);
        });
      });
    },

    initLightbox() {
      let lightbox = document.getElementById('lightbox');
      if (!lightbox) {
        lightbox = document.createElement('div');
        lightbox.id = 'lightbox';
        lightbox.className = 'lightbox';
        lightbox.innerHTML = '<img src="" alt="Zoomed view">';
        document.body.appendChild(lightbox);

        lightbox.addEventListener('click', () => {
          lightbox.classList.remove('open');
        });
      }

      document.addEventListener('click', (e) => {
        const img = e.target.closest('.lb-img, .gallery-item img');
        if (img) {
          const fullSrc = img.dataset.full || img.src;
          const lbImg = lightbox.querySelector('img');
          lbImg.src = fullSrc;
          lightbox.classList.add('open');
        }
      });
    },

    openCheckout() {
      if (!this.user) {
        window.location.href = '/login?next=/pricing';
        return;
      }

      let modal = document.getElementById('checkout-modal');
      if (!modal) {
        modal = document.createElement('div');
        modal.id = 'checkout-modal';
        modal.className = 'modal-overlay';
        modal.innerHTML = `
          <div class="modal-card">
            <button class="modal-close" onclick="NP.closeCheckout()">×</button>
            <div style="text-align:center;margin-bottom:20px;">
              <span class="price-badge">Instant Activation</span>
              <h2 style="font-size:22px;margin:12px 0 4px;">Join Sami Prompts Community</h2>
              <p style="color:var(--muted);font-size:14px;">$5.00 / month · Unlock all viral prompts & downloads</p>
            </div>

            <div style="background:#F8F7FC;border-radius:12px;padding:16px;margin-bottom:20px;font-size:13.5px;">
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span>Plan:</span><strong>Premium VIP Membership</strong>
              </div>
              <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
                <span>Account:</span><strong>${this.user.email}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span>Total Due:</span><strong style="color:var(--primary);font-size:16px;">$5.00 USD</strong>
              </div>
            </div>

            <div id="checkout-alert" class="alert-msg"></div>

            <form id="checkout-form" onsubmit="NP.processPayment(event)">
              <div class="fld">
                <label>Cardholder Name</label>
                <input type="text" id="pay-name" value="${this.user.name}" required>
              </div>
              <div class="fld">
                <label>Card Number (Simulation)</label>
                <input type="text" id="pay-card" value="4242 •••• •••• 4242" required>
              </div>
              <div style="display:flex;gap:12px;">
                <div class="fld" style="flex:1;">
                  <label>Expires</label>
                  <input type="text" value="12/28" required>
                </div>
                <div class="fld" style="flex:1;">
                  <label>CVC</label>
                  <input type="text" value="987" required>
                </div>
              </div>
              <button type="submit" id="pay-submit-btn" class="btn btn-primary btn-block btn-lg" style="margin-top:10px;">
                Pay $5.00 & Activate Access
              </button>
            </form>
            <p style="text-align:center;color:var(--muted);font-size:12px;margin-top:14px;">
              🔒 256-bit encrypted checkout simulator. Instant VIP upgrade.
            </p>
          </div>
        `;
        document.body.appendChild(modal);
      }
      modal.classList.add('open');
    },

    closeCheckout() {
      const modal = document.getElementById('checkout-modal');
      if (modal) modal.classList.remove('open');
    },

    async processPayment(e) {
      e.preventDefault();
      const btn = document.getElementById('pay-submit-btn');
      const alertBox = document.getElementById('checkout-alert');
      if (btn) {
        btn.disabled = true;
        btn.textContent = 'Verifying with payment gateway…';
      }

      try {
        const orderRes = await fetch('/api/checkout/create-order', { method: 'POST' });
        const orderData = await orderRes.json();

        const verifyRes = await fetch('/api/checkout/verify-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ order_id: orderData.order_id, payment_id: 'sim_pay_' + Date.now() })
        });
        const verifyData = await verifyRes.json();

        if (verifyData.success) {
          alertBox.className = 'alert-msg success';
          alertBox.textContent = '🎉 Payment Successful! VIP Membership activated.';
          alertBox.style.display = 'block';
          NP.showToast('✅ Premium Membership Activated!');
          setTimeout(() => {
            window.location.href = '/account';
          }, 1200);
        } else {
          throw new Error(verifyData.error || 'Payment verification failed');
        }
      } catch (err) {
        alertBox.className = 'alert-msg error';
        alertBox.textContent = err.message;
        alertBox.style.display = 'block';
        if (btn) {
          btn.disabled = false;
          btn.textContent = 'Pay $5.00 & Activate Access';
        }
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.NP.init();
  });
})();
