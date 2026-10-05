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
      this.showToast(next === 'dark' ? '🌙 Cyber Dark Mode Activated' : '☀️ Studio Light Mode Activated');
    },

    updateThemeButton(theme) {
      const btns = document.querySelectorAll('.theme-toggle-btn');
      btns.forEach(btn => {
        const text = btn.querySelector('.theme-text');
        if (text) {
          text.textContent = theme === 'dark' ? 'Dark' : 'Light';
        }
        btn.setAttribute('title', theme === 'dark' ? 'Switch to Studio Light Mode' : 'Switch to Cyber Dark Mode');
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
          <a href="/portfolio" class="${currentPath.includes('portfolio') ? 'active' : ''}">📊 Social Portfolio</a>
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
          <a href="/portfolio" class="${currentPath.includes('portfolio') ? 'active' : ''}">📊 Social Portfolio</a>
          <a href="/community" class="${currentPath.includes('community') ? 'active' : ''}">Social Corner</a>
          <a href="/pricing" class="${currentPath.includes('pricing') ? 'active' : ''}">👑 VIP Pass</a>
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
      document.addEventListener('click', async (e) => {
        const quickBtn = e.target.closest('.quick-copy-btn');
        if (quickBtn) {
          e.preventDefault();
          e.stopPropagation();
          const pid = quickBtn.dataset.promptId;
          const origHtml = quickBtn.innerHTML;
          quickBtn.innerHTML = '⏳ Copying…';
          quickBtn.disabled = true;

          try {
            const res = await fetch(`/api/prompts/${pid}`);
            if (!res.ok) throw new Error();
            const data = await res.json();
            if (data.is_unlocked && data.prompt_content) {
              await navigator.clipboard.writeText(data.prompt_content);
              quickBtn.classList.add('copied');
              quickBtn.innerHTML = '✓ Copied!';
              this.showToast(`📋 Copied "${data.title.substring(0, 30)}…" to clipboard!`);
              fetch(`/api/prompts/${pid}/copy`, { method: 'POST' });
              setTimeout(() => {
                quickBtn.classList.remove('copied');
                quickBtn.innerHTML = origHtml;
                quickBtn.disabled = false;
              }, 2000);
            } else {
              this.openCheckout();
              quickBtn.innerHTML = origHtml;
              quickBtn.disabled = false;
            }
          } catch (err) {
            quickBtn.innerHTML = origHtml;
            quickBtn.disabled = false;
            this.showToast('⚠️ Could not copy prompt');
          }
          return;
        }

        const btn = e.target.closest('#copy-btn, .copy-prompt-btn, .copy-master-btn');
        if (!btn) return;

        const targetEl = document.getElementById('prompt-content') || document.querySelector(btn.dataset.target || '');
        if (!targetEl) return;

        const text = targetEl.innerText || targetEl.textContent;
        const origHtml = btn.innerHTML;

        const onSuccess = () => {
          btn.classList.add('copied');
          btn.innerHTML = '✓ Copied to Clipboard!';
          this.showToast('📋 Master Prompt copied to clipboard!');
          const promptId = btn.dataset.promptId;
          if (promptId) {
            fetch(`/api/prompts/${promptId}/copy`, { method: 'POST' });
          }
          setTimeout(() => {
            btn.classList.remove('copied');
            btn.innerHTML = origHtml;
          }, 2400);
        };

        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
            const ta = document.createElement('textarea');
            ta.value = text;
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            ta.remove();
            onSuccess();
          });
        } else {
          const ta = document.createElement('textarea');
          ta.value = text;
          document.body.appendChild(ta);
          ta.select();
          document.execCommand('copy');
          ta.remove();
          onSuccess();
        }
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

    paymentSettings: {
      price_pkr: '999',
      price_usd: '5',
      easypaisa_number: '03119405981',
      easypaisa_title: 'Abdul sami shahid',
      sadapay_number: '03275693976',
      sadapay_title: 'Abdul sami shahid',
      meezan_title: 'Abdul sami shahid',
      meezan_account: 'Contact on WhatsApp',
      meezan_iban: 'PK... (Available on WhatsApp)',
      whatsapp_number: '923119405981'
    },
    activePayMethod: 'easypaisa',

    async openCheckout() {
      if (!this.user) {
        window.location.href = '/login?next=/pricing';
        return;
      }

      // Fetch latest settings from server
      try {
        const res = await fetch('/api/payment/settings');
        const data = await res.json();
        if (data.settings) {
          this.paymentSettings = { ...this.paymentSettings, ...data.settings };
        }
      } catch (err) {
        console.warn('Using default payment settings:', err);
      }

      let modal = document.getElementById('checkout-modal');
      if (modal) modal.remove();

      modal = document.createElement('div');
      modal.id = 'checkout-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-card checkout-modal-card">
          <button class="modal-close" onclick="NP.closeCheckout()">×</button>
          
          <div style="text-align:center;margin-bottom:18px;">
            <span class="price-badge" style="background:rgba(16,185,129,0.15);color:#10B981;border:1px solid rgba(16,185,129,0.3);padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;">
              ⚡ Instant 30-Day VIP Activation
            </span>
            <h2 style="font-size:24px;font-weight:900;margin:10px 0 4px;color:var(--text);">Join Sami Prompts Community</h2>
            <p style="color:var(--muted);font-size:14px;">Rs ${this.paymentSettings.price_pkr} / month · Unlock 319+ viral prompts & downloads</p>
          </div>

          <!-- Payment Tabs -->
          <div class="payment-tabs">
            <button type="button" class="payment-tab-btn tab-easypaisa active" id="tab-btn-easypaisa" onclick="NP.switchPaymentTab('easypaisa')">
              <span style="font-size:18px;">📱</span>
              <span>EasyPaisa</span>
            </button>
            <button type="button" class="payment-tab-btn tab-sadapay" id="tab-btn-sadapay" onclick="NP.switchPaymentTab('sadapay')">
              <span style="font-size:18px;">🟣</span>
              <span>SadaPay</span>
            </button>
            <button type="button" class="payment-tab-btn tab-meezan" id="tab-btn-meezan" onclick="NP.switchPaymentTab('meezan')">
              <span style="font-size:18px;">🏦</span>
              <span>Meezan</span>
            </button>
            <button type="button" class="payment-tab-btn tab-whatsapp" id="tab-btn-whatsapp" onclick="NP.switchPaymentTab('whatsapp')">
              <span style="font-size:18px;">💬</span>
              <span>WhatsApp</span>
            </button>
          </div>

          <!-- Dynamic Account Details Box -->
          <div id="checkout-account-box" class="account-info-box">
            <!-- Injected by switchPaymentTab -->
          </div>

          <div id="checkout-alert" class="alert-msg" style="display:none;margin-bottom:16px;"></div>

          <!-- Proof Submission Form -->
          <form id="checkout-form" onsubmit="NP.submitPaymentProof(event)">
            <input type="hidden" id="selected-payment-method" value="easypaisa">
            
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;" class="pay-inputs-grid">
              <div class="fld">
                <label>Your Account Name</label>
                <input type="text" id="pay-sender-name" value="${this.user.name || ''}" placeholder="e.g. Ali Khan" required>
              </div>
              <div class="fld">
                <label>Sender Mobile / Account</label>
                <input type="text" id="pay-sender-number" placeholder="e.g. 0300 1234567" required>
              </div>
            </div>

            <div class="fld">
              <label>Transaction ID (TID) / Reference <span style="color:var(--red);">*</span></label>
              <input type="text" id="pay-tid" placeholder="e.g. 19283746520 or Ref#" required style="font-weight:700;letter-spacing:0.5px;">
            </div>

            <div class="fld">
              <label>Screenshot / Receipt Slip (Optional but recommended)</label>
              <input type="file" id="pay-screenshot" accept="image/*" style="padding:8px 10px;font-size:13px;">
            </div>

            <button type="submit" id="pay-submit-btn" class="btn btn-primary btn-block btn-lg" style="margin-top:14px;justify-content:center;">
              Submit Payment Proof (Rs ${this.paymentSettings.price_pkr})
            </button>
          </form>

          <!-- WhatsApp Direct Alternative -->
          <div id="checkout-whatsapp-view" style="display:none;text-align:center;padding:10px 0;">
            <p style="color:var(--text);font-size:15px;margin-bottom:16px;">
              Prefer direct payment or having any questions? Connect with Sami directly on WhatsApp:
            </p>
            <a href="https://wa.me/${this.paymentSettings.whatsapp_number}?text=Hi%20Sami%2C%20I%20want%20to%20activate%20VIP%20Access%20for%20my%20account%20(${encodeURIComponent(this.user.email)})%20via%20EasyPaisa%20or%20SadaPay." target="_blank" class="btn btn-lg btn-block" style="background:#22C55E;color:#fff;font-weight:700;justify-content:center;gap:8px;">
              💬 Chat on WhatsApp (+92 311 9405981)
            </a>
          </div>

          <!-- Simulation toggle for instant test -->
          <div style="margin-top:16px;text-align:center;">
            <button type="button" onclick="NP.processPayment(event)" style="background:none;border:none;color:var(--muted);font-size:11.5px;cursor:pointer;text-decoration:underline;">
              ⚡ Or Instant Card Simulation (Test Mode)
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      this.switchPaymentTab('easypaisa');
      modal.classList.add('open');
    },

    closeCheckout() {
      const modal = document.getElementById('checkout-modal');
      if (modal) modal.classList.remove('open');
    },

    switchPaymentTab(method) {
      this.activePayMethod = method;
      document.querySelectorAll('.payment-tab-btn').forEach(b => b.classList.remove('active'));
      const activeBtn = document.getElementById(`tab-btn-${method}`);
      if (activeBtn) activeBtn.classList.add('active');

      const hiddenMethod = document.getElementById('selected-payment-method');
      if (hiddenMethod) hiddenMethod.value = method;

      const box = document.getElementById('checkout-account-box');
      const form = document.getElementById('checkout-form');
      const waView = document.getElementById('checkout-whatsapp-view');
      const s = this.paymentSettings;

      if (method === 'whatsapp') {
        if (box) box.style.display = 'none';
        if (form) form.style.display = 'none';
        if (waView) waView.style.display = 'block';
        return;
      }

      if (box) box.style.display = 'block';
      if (form) form.style.display = 'block';
      if (waView) waView.style.display = 'none';

      let detailsHtml = '';
      if (method === 'easypaisa') {
        detailsHtml = `
          <div class="account-info-row">
            <span style="color:var(--muted);">Payment Method:</span>
            <span class="account-info-val" style="color:#10B981;">📱 EasyPaisa (Mobile Account)</span>
          </div>
          <div class="account-info-row">
            <span style="color:var(--muted);">Account Title:</span>
            <span class="account-info-val">${s.easypaisa_title}</span>
          </div>
          <div class="account-info-row">
            <span style="color:var(--muted);">Account Number:</span>
            <span class="account-info-val">
              <strong style="font-size:16px;letter-spacing:0.5px;">${s.easypaisa_number}</strong>
              <button type="button" class="copy-chip-btn" onclick="NP.copyNumber('${s.easypaisa_number}', this)">📋 Copy</button>
            </span>
          </div>
          <div class="account-info-row">
            <span style="color:var(--muted);">Amount Due:</span>
            <span class="account-info-val" style="color:var(--primary);font-size:16px;">Rs ${s.price_pkr} PKR</span>
          </div>
        `;
      } else if (method === 'sadapay') {
        detailsHtml = `
          <div class="account-info-row">
            <span style="color:var(--muted);">Payment Method:</span>
            <span class="account-info-val" style="color:#EC4899;">🟣 SadaPay Wallet / Account</span>
          </div>
          <div class="account-info-row">
            <span style="color:var(--muted);">Account Title:</span>
            <span class="account-info-val">${s.sadapay_title}</span>
          </div>
          <div class="account-info-row">
            <span style="color:var(--muted);">Account Number:</span>
            <span class="account-info-val">
              <strong style="font-size:16px;letter-spacing:0.5px;">${s.sadapay_number}</strong>
              <button type="button" class="copy-chip-btn" onclick="NP.copyNumber('${s.sadapay_number}', this)">📋 Copy</button>
            </span>
          </div>
          <div class="account-info-row">
            <span style="color:var(--muted);">Amount Due:</span>
            <span class="account-info-val" style="color:var(--primary);font-size:16px;">Rs ${s.price_pkr} PKR</span>
          </div>
        `;
      } else if (method === 'meezan') {
        detailsHtml = `
          <div class="account-info-row">
            <span style="color:var(--muted);">Bank Name:</span>
            <span class="account-info-val" style="color:#0284C7;">🏦 Meezan Bank Ltd</span>
          </div>
          <div class="account-info-row">
            <span style="color:var(--muted);">Account Title:</span>
            <span class="account-info-val">${s.meezan_title}</span>
          </div>
          <div class="account-info-row">
            <span style="color:var(--muted);">Account / IBAN:</span>
            <span class="account-info-val">
              <span>${s.meezan_account}</span>
              <a href="https://wa.me/${s.whatsapp_number}?text=Hi%20Sami%2C%20please%20send%20Meezan%20Bank%20IBAN%20for%20VIP%20payment." target="_blank" class="copy-chip-btn">Ask IBAN</a>
            </span>
          </div>
          <div class="account-info-row">
            <span style="color:var(--muted);">Amount Due:</span>
            <span class="account-info-val" style="color:var(--primary);font-size:16px;">Rs ${s.price_pkr} PKR</span>
          </div>
        `;
      }
      box.innerHTML = detailsHtml;
    },

    copyNumber(text, btn) {
      navigator.clipboard.writeText(text).then(() => {
        const old = btn.textContent;
        btn.textContent = '✓ Copied!';
        btn.style.background = '#10B981';
        btn.style.color = '#fff';
        setTimeout(() => {
          btn.textContent = old;
          btn.style.background = '';
          btn.style.color = '';
        }, 2000);
      }).catch(() => {
        prompt('Copy this account number:', text);
      });
    },

    async submitPaymentProof(e) {
      e.preventDefault();
      const btn = document.getElementById('pay-submit-btn');
      const alertBox = document.getElementById('checkout-alert');
      const method = document.getElementById('selected-payment-method').value;
      const tid = document.getElementById('pay-tid').value.trim();
      const senderName = document.getElementById('pay-sender-name').value.trim();
      const senderNumber = document.getElementById('pay-sender-number').value.trim();
      const fileInput = document.getElementById('pay-screenshot');

      if (!tid) {
        alertBox.className = 'alert-msg error';
        alertBox.textContent = 'Please enter your Transaction ID (TID).';
        alertBox.style.display = 'block';
        return;
      }

      btn.disabled = true;
      btn.textContent = 'Submitting Proof…';
      alertBox.style.display = 'none';

      try {
        const formData = new FormData();
        formData.append('payment_method', method);
        formData.append('transaction_id', tid);
        formData.append('sender_name', senderName);
        formData.append('sender_number', senderNumber);
        if (fileInput && fileInput.files[0]) {
          formData.append('screenshot', fileInput.files[0]);
        }

        const res = await fetch('/api/payment/submit', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();

        if (data.success) {
          const card = document.querySelector('.checkout-modal-card');
          const s = this.paymentSettings;
          card.innerHTML = `
            <div style="text-align:center;padding:20px 10px;">
              <div style="font-size:54px;margin-bottom:12px;">🎉</div>
              <h2 style="font-size:24px;font-weight:900;color:var(--text);margin-bottom:8px;">Payment Proof Submitted!</h2>
              <p style="color:var(--muted);font-size:15px;line-height:1.6;max-width:440px;margin:0 auto 20px;">
                Thank you! Your Transaction ID <strong>${tid}</strong> has been received. Your VIP access will be verified and activated within 5–15 minutes.
              </p>
              
              <div style="background:var(--card-solid);border:1px solid var(--border);border-radius:12px;padding:14px;margin-bottom:24px;font-size:14px;">
                <div>Account: <strong>${this.user.email}</strong></div>
                <div>Method: <strong>${method.toUpperCase()}</strong></div>
                <div>Amount: <strong>Rs ${s.price_pkr} PKR</strong></div>
              </div>

              <a href="https://wa.me/${s.whatsapp_number}?text=Hi%20Sami%2C%20I%20have%20submitted%20Rs%20${s.price_pkr}%20payment%20via%20${method.toUpperCase()}%20for%20VIP%20Access.%0AAccount%3A%20${encodeURIComponent(this.user.email)}%0ATID%3A%20${encodeURIComponent(tid)}" target="_blank" class="btn btn-lg btn-block" style="background:#22C55E;color:#fff;justify-content:center;gap:8px;margin-bottom:12px;">
                💬 Message on WhatsApp for Instant Activation
              </a>

              <button type="button" class="btn btn-outline btn-block" onclick="NP.closeCheckout(); window.location.href='/account';">
                View My Account Status
              </button>
            </div>
          `;
          NP.showToast('✅ Payment proof submitted successfully!');
        } else {
          throw new Error(data.error || 'Failed to submit payment.');
        }
      } catch (err) {
        alertBox.className = 'alert-msg error';
        alertBox.textContent = err.message;
        alertBox.style.display = 'block';
        btn.disabled = false;
        btn.textContent = `Submit Payment Proof (Rs ${this.paymentSettings.price_pkr})`;
      }
    },

    async processPayment(e) {
      if (e) e.preventDefault();
      const alertBox = document.getElementById('checkout-alert');

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
          NP.showToast('✅ VIP Membership Activated!');
          setTimeout(() => {
            window.location.href = '/account';
          }, 1000);
        } else {
          throw new Error(verifyData.error || 'Payment verification failed');
        }
      } catch (err) {
        if (alertBox) {
          alertBox.className = 'alert-msg error';
          alertBox.textContent = err.message;
          alertBox.style.display = 'block';
        }
      }
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    window.NP.init();
  });
})();
