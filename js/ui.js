// Motigo UI View Builders & Dynamic Component Renderers (Master Build Prompt)

import { store, adminUserRegistry } from './state.js';
import { calculateVehicleStatus, formatDisplayDate, calculateMileageDelta } from './maintenanceEngine.js';
import { aiAssistant } from './aiAssistant.js';
import { calculateCostMetrics, formatCurrency } from './costAnalytics.js';
import { maintenanceTypeOptions, vehicleMakesList } from './mockData.js';

export class UIRenderer {
  constructor() {
    this.appRoot = document.getElementById('app-root');
    this.isAiTyping = false;
    this.uploadedFilePayload = null;
  }

  render() {
    this.appRoot = document.getElementById('app-root');
    if (!this.appRoot) return;

    const activeView = store.activeView;
    const activeVehicle = store.getActiveVehicle();

    // 0. Admin Portal — full-screen takeover, no sidebar
    if (store.isAdmin) {
      this.appRoot.innerHTML = this.renderAdminDashboardView();
      this.attachAdminListeners();
      return;
    }

    // Unauthenticated user routing guard
    if (!store.isLoggedIn && !['landing', 'login', 'register', 'verify-email'].includes(activeView)) {
      this.appRoot.innerHTML = this.renderLandingView();
      this.attachLandingListeners();
      return;
    }

    // 1. Standalone Full-Screen Views (Landing, Auth, Onboarding)
    if (activeView === 'landing') {
      this.appRoot.innerHTML = this.renderLandingView();
      this.attachLandingListeners();
      return;
    }

    if (activeView === 'register') {
      this.appRoot.innerHTML = this.renderRegisterView();
      this.attachAuthListeners();
      return;
    }

    if (activeView === 'login') {
      this.appRoot.innerHTML = this.renderLoginView();
      this.attachAuthListeners();
      return;
    }

    if (activeView === 'verify-email') {
      this.appRoot.innerHTML = this.renderVerifyEmailView();
      this.attachAuthListeners();
      return;
    }

    if (activeView === 'onboarding' || (store.onboarding && store.onboarding.isActive)) {
      this.appRoot.innerHTML = this.renderOnboardingWizard();
      this.attachOnboardingListeners();
      return;
    }

    // 2. Main Authenticated Application Shell
    this.appRoot.innerHTML = `
      <div class="ambient-glow glow-1"></div>
      <div class="ambient-glow glow-2"></div>
      <div class="sidebar-overlay" id="sidebar-overlay"></div>

      <!-- Sidebar Navigation -->
      <aside class="sidebar" id="app-sidebar">
        <div class="sidebar-header">
          <div class="brand-logo">🚗</div>
          <div class="brand-name-wrap">
            <h1>Motigo</h1>
            <p>Your car's personal maintenance assistant</p>
          </div>
        </div>

        <nav class="sidebar-nav">
          <div class="nav-section-title">Navigation</div>
          
          <a class="nav-item ${activeView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
            <span class="icon">🏠</span>
            <span>Dashboard</span>
          </a>

          <a class="nav-item ${activeView === 'vehicles' || activeView === 'vehicle-detail' ? 'active' : ''}" data-view="vehicles">
            <span class="icon">🚗</span>
            <span>My Vehicles</span>
            <span class="nav-badge" style="background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4);">${store.vehicles.length}</span>
          </a>

          <a class="nav-item ${activeView === 'maintenance' ? 'active' : ''}" data-view="maintenance">
            <span class="icon">🔧</span>
            <span>Maintenance</span>
          </a>

          <a class="nav-item ${activeView === 'ai-assistant' ? 'active' : ''}" data-view="ai-assistant">
            <span class="icon">🤖</span>
            <span>Motigo AI</span>
            <span class="nav-badge" style="background: #8b5cf6;">AI Live</span>
          </a>

          <a class="nav-item ${activeView === 'notifications' ? 'active' : ''}" data-view="notifications">
            <span class="icon">🔔</span>
            <span>Notifications</span>
            ${store.notifications.filter(n => !n.isRead).length > 0 ? `<span class="nav-badge">${store.notifications.filter(n => !n.isRead).length}</span>` : ''}
          </a>

          <div class="nav-section-title" style="margin-top: 12px;">Tools & Settings</div>

          <a class="nav-item ${activeView === 'settings' ? 'active' : ''}" data-view="settings">
            <span class="icon">⚙️</span>
            <span>Settings</span>
          </a>

          <a class="nav-item" id="nav-btn-landing">
            <span class="icon">✨</span>
            <span>Product Showcase</span>
          </a>
        </nav>

        <div class="sidebar-footer">
          <div class="nav-section-title" style="padding: 0 0 6px 0;">Active Vehicle</div>
          ${activeVehicle ? `
            <div class="active-vehicle-card" id="sidebar-active-veh-btn">
              <div class="active-vehicle-icon">🚗</div>
              <div class="active-vehicle-info">
                <div class="title">${activeVehicle.year} ${activeVehicle.make} ${activeVehicle.model}</div>
                <div class="sub">${Number(activeVehicle.currentMileage).toLocaleString()} ${store.user.distanceUnit} • ${activeVehicle.registrationNumber}</div>
              </div>
            </div>
          ` : `
            <button class="btn btn-secondary btn-sm" style="width: 100%;" id="sidebar-add-veh-btn">+ Add Vehicle</button>
          `}
        </div>
      </aside>

      <!-- Main Content Wrapper -->
      <div class="main-wrapper">
        <!-- Sticky Top Header -->
        <header class="top-header">
          <div class="header-left">
            <button class="mobile-menu-btn" id="mobile-toggle-btn">☰</button>
            <h2 class="page-title">${this.getViewTitle(activeView)}</h2>
          </div>

          <div class="header-right">
            <!-- Active Vehicle Switcher Dropdown -->
            ${store.vehicles.length > 0 ? `
              <select class="form-control" id="header-vehicle-select" style="width: 220px; font-size: 13px; font-weight: 600; padding: 6px 12px; cursor: pointer;">
                ${store.vehicles.map(v => `
                  <option value="${v.id}" ${v.id === store.activeVehicleId ? 'selected' : ''}>
                    ${v.year} ${v.make} ${v.model} (${v.registrationNumber})
                  </option>
                `).join('')}
              </select>
            ` : ''}

            <!-- Quick Action: Complete Service -->
            ${store.vehicles.length > 0 ? `
              <button class="btn btn-primary btn-sm" id="btn-quick-complete-service">
                <span>✓</span>
                <span>Mark Done</span>
              </button>
            ` : ''}

            <!-- Quick Action: Add Vehicle -->
            <button class="btn btn-secondary btn-sm" id="btn-quick-add-vehicle">
              <span>+</span>
              <span>Add Car</span>
            </button>

            <!-- Notification Bell Icon -->
            <button class="icon-btn" id="header-bell-btn" title="View Notifications">
              <span>🔔</span>
              ${store.notifications.filter(n => !n.isRead).length > 0 ? `<span style="position: absolute; top: 6px; right: 6px; width: 8px; height: 8px; border-radius: 50%; background: #ef4444;"></span>` : ''}
            </button>

            <!-- User Profile -->
            <div class="user-profile-btn" id="header-user-btn" title="User Settings">
              <img src="${store.user ? (store.user.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80') : 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80'}" alt="Avatar" class="user-avatar" />
              <span class="user-name">${store.user ? store.user.firstName : 'User'}</span>
            </div>
          </div>
        </header>

        <!-- Main View Container -->
        <main class="content-container">
          ${this.renderActiveView(activeView)}
        </main>
      </div>

      <!-- Modals Container -->
      <div id="modal-root">
        ${store.showWelcomeModal ? this.renderWelcomeEmailModal() : ''}
      </div>
    `;

    this.attachEventListeners();
    if (store.showWelcomeModal) {
      this.attachModalCloseListeners();
    }
  }

  getViewTitle(view) {
    switch (view) {
      case 'dashboard': return 'Dashboard';
      case 'vehicles': return 'My Vehicles';
      case 'vehicle-detail': return 'Vehicle Details';
      case 'maintenance': return 'Maintenance History & Schedule';
      case 'ai-assistant': return 'Motigo AI Assistant';
      case 'notifications': return 'Reminders & Notifications';
      case 'settings': return 'Settings';
      default: return 'Dashboard';
    }
  }

  renderActiveView(view) {
    switch (view) {
      case 'dashboard': return this.renderDashboard();
      case 'vehicles': return this.renderVehiclesView();
      case 'vehicle-detail': return this.renderVehicleDetailView();
      case 'maintenance': return this.renderMaintenanceView();
      case 'ai-assistant': return this.renderAiAssistantView();
      case 'notifications': return this.renderNotificationsView();
      case 'settings': return this.renderSettingsView();
      default: return this.renderDashboard();
    }
  }

  formatAiMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n\n/g, '<br/><br/>')
      .replace(/\n/g, '<br/>')
      .replace(/• /g, '&bull; ');
  }

  // =========================================================================
  // 1. LANDING PAGE (Section 6)
  // =========================================================================
  renderLandingView() {
    return `
      <div class="landing-page-wrapper">
        <header class="landing-nav">
          <div class="landing-brand">
            <div class="brand-logo" style="width: 38px; height: 38px; font-size: 20px;">🚗</div>
            <div class="brand-name-wrap">
              <h1 style="font-size: 20px; font-weight: 800; color: #ffffff;">Motigo</h1>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 14px;">
            <button class="btn btn-secondary btn-sm" id="btn-landing-login">Login</button>
            <button class="btn btn-primary btn-sm" id="btn-landing-get-started">Get Started</button>
          </div>
        </header>

        <section class="landing-hero">
          <div class="hero-pill">
            <span>✨</span>
            <span>Your car's personal maintenance assistant</span>
          </div>

          <h1 class="hero-title">
            Never miss your car's <br/>
            <span class="hero-gradient-text">next service.</span>
          </h1>

          <p class="hero-subtitle">
            Motigo helps you track your vehicle's maintenance, stay ahead of servicing and get personalized guidance from an AI car assistant.
          </p>

          <div class="hero-ctas">
            <button class="btn btn-primary" id="btn-hero-get-started" style="font-size: 16px; padding: 14px 32px;">
              <span>Get Started →</span>
            </button>
            <button class="btn btn-secondary" id="btn-hero-how-it-works" style="font-size: 16px; padding: 14px 28px;">
              <span>How It Works</span>
            </button>
          </div>

          <div class="landing-mockup-wrapper" style="margin-top: 50px;">
            <div class="landing-mockup-bar">
              <div style="display: flex; gap: 6px;">
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #ef4444;"></span>
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #fbbf24;"></span>
                <span style="width: 10px; height: 10px; border-radius: 50%; background: #34d399;"></span>
              </div>
              <span style="font-size: 12px; color: var(--text-muted); font-family: monospace;">motigo.app/dashboard</span>
              <span></span>
            </div>
            
            <div style="padding: 24px; text-align: left; background: #0f172a;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; flex-wrap: wrap; gap: 12px;">
                <div>
                  <h3 style="font-size: 20px; font-weight: 800; color: #ffffff;">Good morning, Christopher 👋</h3>
                  <p style="font-size: 13px; color: var(--text-muted);">Here's what's happening with your vehicles.</p>
                </div>
                <div style="display: flex; gap: 8px;">
                  <span class="status-badge status-ontrack">🟢 On Track</span>
                  <span class="status-badge status-duesoon">🟡 Due Soon</span>
                  <span class="status-badge status-overdue">🔴 Overdue</span>
                </div>
              </div>

              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px;">
                <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="font-weight: 700;">Toyota Camry</h4>
                    <span class="status-badge status-ontrack">🟢 On Track</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">2020 • Petrol • 82,000 km</p>
                  <div style="margin-top: 12px; font-size: 13px; color: #60a5fa; font-weight: 600;">Next: 12 January 2027</div>
                </div>

                <div style="background: var(--bg-card); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px;">
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <h4 style="font-weight: 700;">Lexus RX350</h4>
                    <span class="status-badge status-duesoon">🟡 Due Soon</span>
                  </div>
                  <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">2019 • Petrol • 91,200 km</p>
                  <div style="margin-top: 12px; font-size: 13px; color: #fbbf24; font-weight: 600;">Next: 03 October 2026</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="landing-section" id="section-benefits">
          <div class="section-badge">BENEFITS</div>
          <h2 class="section-heading">Designed around your car ownership journey</h2>
          
          <div class="features-grid">
            <div class="feature-box">
              <div class="feature-icon">📜</div>
              <h4 style="font-size: 18px; font-weight: 800; margin-bottom: 8px;">Track</h4>
              <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">Keep your vehicle's maintenance history, receipts, parts, and costs in one clean, secure digital timeline.</p>
            </div>

            <div class="feature-box">
              <div class="feature-icon">🔔</div>
              <h4 style="font-size: 18px; font-weight: 800; margin-bottom: 8px;">Remember</h4>
              <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">Get automated smart reminders 7 days before, 1 day before, and on the due date so you never miss a service.</p>
            </div>

            <div class="feature-box">
              <div class="feature-icon">🤖</div>
              <h4 style="font-size: 18px; font-weight: 800; margin-bottom: 8px;">Understand</h4>
              <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">Ask Motigo's AI assistant questions about strange noises, warning lights, fluid specs, or road-trip checks.</p>
            </div>

            <div class="feature-box">
              <div class="feature-icon">⚡</div>
              <h4 style="font-size: 18px; font-weight: 800; margin-bottom: 8px;">Stay Ahead</h4>
              <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">Receive personalized AI maintenance insights based on your car's actual mileage and service history.</p>
            </div>
          </div>
        </section>

        <section class="landing-section" id="section-how-it-works" style="background: rgba(16, 24, 39, 0.5); border-top: 1px solid var(--border-subtle); border-bottom: 1px solid var(--border-subtle);">
          <div class="section-badge">SIMPLE 4-STEP PROCESS</div>
          <h2 class="section-heading">How Motigo Keeps You on Track</h2>

          <div class="steps-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin: 40px 0;">
            <div class="step-card">
              <div class="step-number">1</div>
              <h4 style="font-weight: 700; margin-bottom: 6px;">Add your car</h4>
              <p style="font-size: 13px; color: var(--text-muted);">Enter make, model, year, and current odometer reading.</p>
            </div>

            <div class="step-card">
              <div class="step-number">2</div>
              <h4 style="font-weight: 700; margin-bottom: 6px;">Record your last service</h4>
              <p style="font-size: 13px; color: var(--text-muted);">Log what was done, or skip if you don't remember.</p>
            </div>

            <div class="step-card">
              <div class="step-number">3</div>
              <h4 style="font-weight: 700; margin-bottom: 6px;">Set your schedule</h4>
              <p style="font-size: 13px; color: var(--text-muted);">Choose time and/or mileage intervals (e.g. 6 months or 10,000 km).</p>
            </div>

            <div class="step-card">
              <div class="step-number">4</div>
              <h4 style="font-weight: 700; margin-bottom: 6px;">Let Motigo keep you on track</h4>
              <p style="font-size: 13px; color: var(--text-muted);">Receive timely reminders and instant AI diagnostic guidance.</p>
            </div>
          </div>

          <div style="text-align: center; margin-top: 30px;">
            <button class="btn btn-primary" id="btn-how-it-works-cta" style="font-size: 16px; padding: 14px 32px;">
              <span>Add Your Car Now →</span>
            </button>
          </div>
        </section>

        <footer class="landing-footer">
          <div style="display: flex; justify-content: space-between; align-items: center; max-width: 1000px; margin: 0 auto; flex-wrap: wrap; gap: 20px;">
            <div style="display: flex; align-items: center; gap: 8px;">
              <span style="font-size: 20px;">🚗</span>
              <span style="font-weight: 800; font-size: 16px; color: #ffffff;">Motigo</span>
              <span style="font-size: 13px; color: var(--text-muted);">— Your car's personal maintenance assistant.</span>
            </div>
            <div style="display: flex; gap: 16px; font-size: 13px; color: var(--text-muted);">
              <button id="btn-footer-demo" style="background: none; border: none; color: #60a5fa; cursor: pointer; font-weight: 600;">Launch Live Demo</button>
            </div>
          </div>
        </footer>
      </div>
    `;
  }

  attachLandingListeners() {
    const getStartedBtns = [
      document.getElementById('btn-landing-get-started'),
      document.getElementById('btn-hero-get-started'),
      document.getElementById('btn-how-it-works-cta')
    ];

    getStartedBtns.forEach(btn => {
      if (btn) btn.addEventListener('click', () => store.setView('register'));
    });

    const loginBtn = document.getElementById('btn-landing-login');
    if (loginBtn) loginBtn.addEventListener('click', () => store.setView('login'));

    const demoBtn = document.getElementById('btn-footer-demo');
    if (demoBtn) demoBtn.addEventListener('click', () => {
      store.loginUser('christopher@motigo.app');
    });

    const howItWorksBtn = document.getElementById('btn-hero-how-it-works');
    if (howItWorksBtn) {
      howItWorksBtn.addEventListener('click', () => {
        const target = document.getElementById('section-how-it-works');
        if (target) target.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }

  // =========================================================================
  // 2. AUTHENTICATION VIEWS (Register, Login, Email Verification)
  // =========================================================================
  renderRegisterView() {
    return `
      <div class="auth-page-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="brand-logo" style="width: 44px; height: 44px; font-size: 22px; margin: 0 auto 12px;">🚗</div>
            <h2 style="font-size: 24px; font-weight: 800; color: #ffffff;">Create your Motigo account</h2>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Set up in minutes and take control of your vehicle maintenance.</p>
          </div>

          <form id="form-register">
            <div class="form-row">
              <div class="form-group">
                <label class="form-label">First Name *</label>
                <input type="text" class="form-control" name="firstName" placeholder="e.g. Christopher" required />
              </div>
              <div class="form-group">
                <label class="form-label">Last Name *</label>
                <input type="text" class="form-control" name="lastName" placeholder="e.g. Okonkwo" required />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Email Address *</label>
              <input type="email" class="form-control" name="email" placeholder="name@domain.com" required />
            </div>

            <div class="form-group">
              <label class="form-label">Phone Number (Optional)</label>
              <input type="tel" class="form-control" name="phone" placeholder="+234 800 000 0000" />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Password *</label>
                <div style="position: relative;">
                  <input type="password" class="form-control" id="reg-password" name="password" placeholder="••••••••" required minlength="6" />
                  <button type="button" class="btn-toggle-pw" id="btn-toggle-pw1" style="position: absolute; right: 10px; top: 50%; transform: translateY(-50%); background: none; border: none; color: var(--text-muted); cursor: pointer;">👁️</button>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label">Confirm Password *</label>
                <input type="password" class="form-control" name="confirmPassword" placeholder="••••••••" required minlength="6" />
              </div>
            </div>

            <div style="margin: 16px 0;">
              <label style="display: flex; align-items: flex-start; gap: 10px; font-size: 12px; color: var(--text-secondary); cursor: pointer;">
                <input type="checkbox" required style="margin-top: 2px;" checked />
                <span>I agree to Motigo's Terms of Service and Privacy Policy.</span>
              </label>
            </div>

            <button type="submit" class="btn btn-primary" style="width: 100%; font-size: 15px; padding: 12px;">Create Account</button>

            <div style="text-align: center; margin-top: 18px; font-size: 13px; color: var(--text-muted);">
              Already have an account? <a id="link-to-login" style="color: #60a5fa; cursor: pointer; font-weight: 600;">Sign in here</a>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  renderLoginView() {
    return `
      <div class="auth-page-wrapper">
        <div class="auth-card">
          <div class="auth-header">
            <div class="brand-logo" style="width: 44px; height: 44px; font-size: 22px; margin: 0 auto 12px;">🚗</div>
            <h2 style="font-size: 24px; font-weight: 800; color: #ffffff;">Welcome back to Motigo</h2>
            <p style="font-size: 13px; color: var(--text-muted); margin-top: 4px;">Sign in to access your vehicles and maintenance schedule.</p>
          </div>

          <!-- Login Type Tab Toggle -->
          <div class="login-tab-group" id="login-tab-group">
            <button class="login-tab active" id="tab-user" data-tab="user">👤 User Login</button>
            <button class="login-tab" id="tab-admin" data-tab="admin">🛡️ Admin Login</button>
          </div>

          <!-- USER LOGIN FORM -->
          <form id="form-login" class="login-form-panel" data-panel="user">
            <div id="user-login-error" style="display:none; color:#fca5a5; font-size:13px; margin-bottom:12px; padding: 10px 12px; background: rgba(239,68,68,0.1); border-radius: 8px; border: 1px solid rgba(239,68,68,0.3);">
            </div>
            <div class="form-group">
              <label class="form-label">Email Address</label>
              <input type="email" class="form-control" name="email" value="christopher@motigo.app" required />
            </div>
            <div class="form-group">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <label class="form-label" style="margin-bottom: 0;">Password</label>
                <a id="link-forgot-pw" style="font-size: 12px; color: #60a5fa; cursor: pointer;">Forgot password?</a>
              </div>
              <input type="password" class="form-control" name="password" value="password123" required />
            </div>
            <button type="submit" id="btn-submit-user-login" class="btn btn-primary" style="width: 100%; font-size: 15px; padding: 12px; margin-top: 10px;">Sign In</button>
            <div style="text-align: center; margin-top: 18px; font-size: 13px; color: var(--text-muted);">
              Don't have an account? <a id="link-to-register" style="color: #60a5fa; cursor: pointer; font-weight: 600;">Create one now</a>
            </div>
          </form>

          <!-- ADMIN LOGIN FORM -->
          <form id="form-admin-login" class="login-form-panel" data-panel="admin" style="display:none;">
            <div class="admin-login-notice">
              🛡️ <strong>Restricted Area</strong> — Administrator access only. Unauthorised login attempts are logged.
            </div>
            <div class="form-group">
              <label class="form-label">Admin Email</label>
              <input type="email" class="form-control" name="adminEmail" placeholder="admin@motigo.app" required />
            </div>
            <div class="form-group">
              <label class="form-label">Admin Password</label>
              <input type="password" class="form-control" name="adminPassword" placeholder="Enter admin password" required />
            </div>
            <div id="admin-login-error" style="display:none; color:#fca5a5; font-size:13px; margin-bottom:10px; padding: 10px 12px; background: rgba(239,68,68,0.1); border-radius: 8px; border: 1px solid rgba(239,68,68,0.3);">
              ❌ Invalid admin credentials. Please try again.
            </div>
            <button type="submit" class="btn" style="width: 100%; font-size: 15px; padding: 12px; margin-top: 10px; background: linear-gradient(135deg, #d97706, #f59e0b); color: #000; font-weight: 700;">Access Admin Portal →</button>
          </form>
        </div>
      </div>
    `;
  }

  renderAdminDashboardView() {
    const users = adminUserRegistry;
    const totalUsers = users.length;
    const totalVehicles = users.reduce((s, u) => s + u.vehicleCount, 0);
    const overdueUsers = users.filter(u => u.vehicles.some(v => v.status === 'overdue')).length;
    const thisMonthUsers = users.filter(u => {
      const d = new Date(u.createdAt);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    const timeAgo = (isoStr) => {
      if (!isoStr) return '<span style="color:var(--text-muted)">Never logged in</span>';
      const diff = Date.now() - new Date(isoStr).getTime();
      const mins = Math.floor(diff / 60000);
      const hrs  = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);
      if (mins < 2)   return '<span style="color:#10b981">Just now</span>';
      if (mins < 60)  return `<span style="color:#10b981">${mins} min ago</span>`;
      if (hrs  < 24)  return `<span style="color:#60a5fa">${hrs} hr${hrs>1?'s':''} ago</span>`;
      if (days < 7)   return `<span style="color:#94a3b8">${days} day${days>1?'s':''} ago</span>`;
      return `<span style="color:#64748b">${new Date(isoStr).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</span>`;
    };

    const statusBadge = (status) => {
      if (status === 'overdue')  return '<span class="admin-veh-badge badge-overdue">Overdue</span>';
      if (status === 'due_soon') return '<span class="admin-veh-badge badge-duesoon">Due Soon</span>';
      return '<span class="admin-veh-badge badge-ontrack">On Track</span>';
    };

    const userRows = users.map((u, i) => `
      <tr class="admin-user-row" data-uid="${u.id}">
        <td style="padding: 14px 16px; color: var(--text-muted); font-size: 13px;">${i + 1}</td>
        <td style="padding: 14px 16px;">
          <div style="display:flex; align-items:center; gap: 12px;">
            <div style="width:38px;height:38px;border-radius:50%;background:${u.avatarColor};display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;color:#fff;flex-shrink:0;">${u.avatarInitials}</div>
            <div>
              <div style="font-weight:700;color:#fff;font-size:14px;">${u.firstName} ${u.lastName}</div>
              <div style="font-size:12px;color:var(--text-muted);">${u.phone}</div>
            </div>
          </div>
        </td>
        <td style="padding:14px 16px;font-size:13px;color:var(--text-secondary);">${u.email}</td>
        <td style="padding:14px 16px;text-align:center;">
          <span style="font-weight:800;font-size:16px;color:#60a5fa;">${u.vehicleCount}</span>
        </td>
        <td style="padding:14px 16px;font-size:13px;">${timeAgo(u.lastLoginAt)}</td>
        <td style="padding:14px 16px;">
          ${ u.isActive
            ? '<span class="admin-status-badge badge-active">● Active</span>'
            : '<span class="admin-status-badge badge-inactive">○ Inactive</span>' }
        </td>
        <td style="padding:14px 16px;">
          <div style="display:flex;gap:8px;align-items:center;">
            <button class="btn btn-sm btn-secondary admin-expand-btn" style="font-size:12px;" data-uid="${u.id}">View ▾</button>
            <button class="btn btn-sm admin-delete-user-btn" style="font-size:12px;background:rgba(239,68,68,0.15);color:#fca5a5;border:1px solid rgba(239,68,68,0.4);" data-uid="${u.id}" data-name="${u.firstName} ${u.lastName}">🗑️ Delete</button>
          </div>
        </td>
      </tr>
      <tr class="admin-vehicle-detail-row" id="detail-${u.id}" style="display:none;">
        <td colspan="7" style="padding:0 16px 16px 70px;">
          <div style="background:rgba(255,255,255,0.03);border:1px solid var(--border-subtle);border-radius:10px;padding:14px;">
            <div style="font-size:12px;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.8px;margin-bottom:10px;">Registered Vehicles</div>
            <div style="display:flex;flex-wrap:wrap;gap:10px;">
              ${u.vehicles.map(v => `
                <div style="display:flex;align-items:center;gap:10px;background:rgba(0,0,0,0.2);border:1px solid var(--border-subtle);border-radius:8px;padding:10px 14px;">
                  <span style="font-size:20px;">🚗</span>
                  <div>
                    <div style="font-weight:700;font-size:13px;color:#fff;">${v.year} ${v.make} ${v.model}</div>
                    <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">${v.plate} &nbsp;•&nbsp; ${statusBadge(v.status)}</div>
                  </div>
                </div>
              `).join('')}
            </div>
            <div style="margin-top:10px;font-size:12px;color:var(--text-muted);">Member since ${new Date(u.createdAt).toLocaleDateString('en-GB',{day:'2-digit',month:'short',year:'numeric'})}</div>
          </div>
        </td>
      </tr>
    `).join('');

    return `
      <div class="admin-portal-wrapper">
        <!-- Admin Top Bar -->
        <header class="admin-topbar">
          <div style="display:flex;align-items:center;gap:14px;">
            <div style="width:38px;height:38px;background:linear-gradient(135deg,#d97706,#f59e0b);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:20px;">🛡️</div>
            <div>
              <div style="font-weight:800;font-size:18px;color:#fff;">Motigo Admin Portal</div>
              <div style="font-size:12px;color:#f59e0b;">Super Administrator</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:16px;">
            <span style="font-size:13px;color:var(--text-muted);">admin@motigo.app</span>
            <button class="btn btn-secondary btn-sm" id="btn-admin-logout" style="border-color:rgba(245,158,11,0.4);color:#f59e0b;">Sign Out</button>
          </div>
        </header>

        <!-- Main Admin Content -->
        <main class="admin-main">
          <!-- Page Title -->
          <div style="margin-bottom:28px;">
            <h1 style="font-size:28px;font-weight:800;color:#fff;">User Management</h1>
            <p style="font-size:14px;color:var(--text-muted);margin-top:4px;">View and monitor all registered Motigo users, their vehicles and activity.</p>
          </div>

          <!-- Stats Row -->
          <div class="admin-stats-grid">
            <div class="admin-stat-card">
              <div class="admin-stat-icon" style="background:rgba(59,130,246,0.15);color:#60a5fa;">👥</div>
              <div class="admin-stat-value">${totalUsers}</div>
              <div class="admin-stat-label">Total Users</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-icon" style="background:rgba(16,185,129,0.15);color:#34d399;">🚗</div>
              <div class="admin-stat-value">${totalVehicles}</div>
              <div class="admin-stat-label">Active Vehicles</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-icon" style="background:rgba(239,68,68,0.15);color:#f87171;">⚠️</div>
              <div class="admin-stat-value">${overdueUsers}</div>
              <div class="admin-stat-label">Users with Overdue</div>
            </div>
            <div class="admin-stat-card">
              <div class="admin-stat-icon" style="background:rgba(245,158,11,0.15);color:#fbbf24;">🆕</div>
              <div class="admin-stat-value">${thisMonthUsers}</div>
              <div class="admin-stat-label">New This Month</div>
            </div>
          </div>

          <!-- User Table -->
          <div class="admin-table-card">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
              <h3 style="font-size:16px;font-weight:700;color:#fff;">Registered Users</h3>
              <span style="font-size:13px;color:var(--text-muted);">${totalUsers} users total</span>
            </div>
            <div style="overflow-x:auto;">
              <table class="admin-user-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>User</th>
                    <th>Email</th>
                    <th style="text-align:center;">Vehicles</th>
                    <th>Last Login</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${userRows}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    `;
  }

  renderVerifyEmailView() {
    return `
      <div class="auth-page-wrapper">
        <div class="auth-card" style="text-align: center;">
          <div style="font-size: 48px; margin-bottom: 12px;">✉️</div>
          <h2 style="font-size: 24px; font-weight: 800; color: #ffffff;">Verify your email</h2>
          <p style="font-size: 14px; color: var(--text-secondary); margin: 8px 0 24px;">
            We've sent a 6-digit confirmation code to <strong>${store.user.email}</strong>.
          </p>

          <div style="display: flex; justify-content: center; gap: 8px; margin-bottom: 24px;">
            <input type="text" class="form-control" value="8" style="width: 44px; text-align: center; font-size: 20px; font-weight: 700;" readonly />
            <input type="text" class="form-control" value="4" style="width: 44px; text-align: center; font-size: 20px; font-weight: 700;" readonly />
            <input type="text" class="form-control" value="2" style="width: 44px; text-align: center; font-size: 20px; font-weight: 700;" readonly />
            <input type="text" class="form-control" value="9" style="width: 44px; text-align: center; font-size: 20px; font-weight: 700;" readonly />
            <input type="text" class="form-control" value="1" style="width: 44px; text-align: center; font-size: 20px; font-weight: 700;" readonly />
            <input type="text" class="form-control" value="0" style="width: 44px; text-align: center; font-size: 20px; font-weight: 700;" readonly />
          </div>

          <button class="btn btn-primary" id="btn-confirm-verify" style="width: 100%; font-size: 15px; padding: 12px;">
            <span>Verify & Continue to Setup →</span>
          </button>
        </div>
      </div>
    `;
  }

  attachAuthListeners() {
    const regForm = document.getElementById('form-register');
    if (regForm) {
      regForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = regForm.querySelector('button[type="submit"]');
        const origText = btn ? btn.innerHTML : 'Create Account';
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Creating account...'; }
        try {
          const data = Object.fromEntries(new FormData(regForm).entries());
          await store.registerUser(data);
        } catch (err) {
          alert('Registration failed: ' + (err.message || 'Please check your information and try again.'));
          if (btn) { btn.disabled = false; btn.innerHTML = origText; }
        }
      });
    }

    const loginForm = document.getElementById('form-login');
    if (loginForm) {
      loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const errBox = document.getElementById('user-login-error');
        const btn = document.getElementById('btn-submit-user-login');
        if (errBox) errBox.style.display = 'none';
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Signing in...'; }

        try {
          const data = Object.fromEntries(new FormData(loginForm).entries());
          await store.loginUser(data.email, data.password);
        } catch (err) {
          if (errBox) {
            let msg = err.message || 'Invalid email or password.';
            if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
              msg = '❌ Invalid email or password. Please check your credentials.';
            } else if (err.code === 'auth/too-many-requests') {
              msg = '⚠️ Too many failed attempts. Please reset your password or try again later.';
            }
            errBox.innerHTML = msg;
            errBox.style.display = 'block';
          } else {
            alert('Login failed: ' + err.message);
          }
          if (btn) { btn.disabled = false; btn.innerHTML = 'Sign In'; }
        }
      });
    }

    // Admin login form
    const adminLoginForm = document.getElementById('form-admin-login');
    if (adminLoginForm) {
      adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email    = adminLoginForm.querySelector('[name="adminEmail"]').value;
        const password = adminLoginForm.querySelector('[name="adminPassword"]').value;
        const errBox   = document.getElementById('admin-login-error');
        const btn      = adminLoginForm.querySelector('button[type="submit"]');
        if (btn) { btn.disabled = true; btn.innerHTML = '⏳ Verifying admin access...'; }

        const success  = await store.adminLoginUser(email, password);
        if (!success) {
          if (errBox) {
            errBox.style.display = 'block';
            setTimeout(() => { errBox.style.display = 'none'; }, 4000);
          }
          if (btn) { btn.disabled = false; btn.innerHTML = 'Access Admin Portal →'; }
        }
      });
    }

    // Tab toggle: User ↔ Admin
    const tabGroup = document.getElementById('login-tab-group');
    if (tabGroup) {
      tabGroup.addEventListener('click', (e) => {
        const btn = e.target.closest('.login-tab');
        if (!btn) return;
        const tab = btn.dataset.tab;
        // Toggle active tab
        tabGroup.querySelectorAll('.login-tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        // Toggle form panels
        document.querySelectorAll('.login-form-panel').forEach(panel => {
          panel.style.display = panel.dataset.panel === tab ? 'block' : 'none';
        });
      });
    }

    const toLogin = document.getElementById('link-to-login');
    if (toLogin) toLogin.addEventListener('click', () => store.setView('login'));

    const toReg = document.getElementById('link-to-register');
    if (toReg) toReg.addEventListener('click', () => store.setView('register'));

    const confirmVerifyBtn = document.getElementById('btn-confirm-verify');
    if (confirmVerifyBtn) {
      confirmVerifyBtn.addEventListener('click', () => store.verifyEmail('842910'));
    }

    const togglePw1 = document.getElementById('btn-toggle-pw1');
    if (togglePw1) {
      togglePw1.addEventListener('click', () => {
        const pw = document.getElementById('reg-password');
        if (pw) pw.type = pw.type === 'password' ? 'text' : 'password';
      });
    }
  }

  attachAdminListeners() {
    // Sign out
    const logoutBtn = document.getElementById('btn-admin-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => store.logoutUser());
    }

    // Expandable vehicle detail rows
    document.querySelectorAll('.admin-expand-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const uid = btn.dataset.uid;
        const detailRow = document.getElementById(`detail-${uid}`);
        if (!detailRow) return;
        const isOpen = detailRow.style.display !== 'none';
        detailRow.style.display = isOpen ? 'none' : 'table-row';
        btn.textContent = isOpen ? 'View ▾' : 'Hide ▴';
        btn.style.color = isOpen ? '' : '#f59e0b';
      });
    });

    // Delete user handler
    document.querySelectorAll('.admin-delete-user-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const uid = btn.dataset.uid;
        const name = btn.dataset.name || 'this user';
        if (confirm(`Are you sure you want to permanently delete registered user "${name}" from Motigo?`)) {
          btn.disabled = true;
          btn.textContent = 'Deleting...';
          const success = await store.deleteUserByAdmin(uid);
          if (!success) {
            alert('Could not delete user. Please check database permissions.');
            btn.disabled = false;
            btn.textContent = '🗑️ Delete';
          }
        }
      });
    });
  }


  // =========================================================================
  // 3. 5-STEP GUIDED ONBOARDING WIZARD (Sections 9 - 14)
  // =========================================================================
  renderOnboardingWizard() {
    const step = store.onboarding.step || 1;
    const data = store.onboarding.data;

    return `
      <div class="onboarding-wrapper">
        <div class="onboarding-container">
          <div class="onboarding-progress-bar">
            <div class="progress-step-pill ${step >= 1 ? 'active' : ''}">1. Welcome</div>
            <div class="progress-step-pill ${step >= 2 ? 'active' : ''}">2. Add Car</div>
            <div class="progress-step-pill ${step >= 3 ? 'active' : ''}">3. Last Service</div>
            <div class="progress-step-pill ${step >= 4 ? 'active' : ''}">4. Schedule</div>
            <div class="progress-step-pill ${step >= 5 ? 'active' : ''}">5. Reminders</div>
          </div>

          <div class="onboarding-card">
            ${step === 1 ? this.renderOnboardingStep1() : ''}
            ${step === 2 ? this.renderOnboardingStep2(data) : ''}
            ${step === 3 ? this.renderOnboardingStep3(data) : ''}
            ${step === 4 ? this.renderOnboardingStep4(data) : ''}
            ${step === 5 ? this.renderOnboardingStep5(data) : ''}
            ${step === 6 ? this.renderOnboardingCompletion(data) : ''}
          </div>
        </div>
      </div>
    `;
  }

  renderOnboardingStep1() {
    return `
      <div style="text-align: center; padding: 20px 10px;">
        <div style="font-size: 52px; margin-bottom: 12px;">👋</div>
        <h2 style="font-size: 28px; font-weight: 800; color: #ffffff;">Welcome to Motigo</h2>
        <p style="font-size: 16px; color: var(--text-secondary); max-width: 480px; margin: 12px auto 28px; line-height: 1.6;">
          Let's get your car set up. It only takes a few minutes to configure your vehicle, track your maintenance, and start receiving smart reminders.
        </p>

        <button class="btn btn-primary" id="btn-onboarding-start" style="font-size: 16px; padding: 14px 36px;">
          <span>Let's Get Started →</span>
        </button>
      </div>
    `;
  }

  renderOnboardingStep2(data) {
    return `
      <div>
        <div class="onboarding-step-header">
          <span class="step-badge">Step 2 of 5</span>
          <h2 style="font-size: 24px; font-weight: 800; color: #ffffff; margin-top: 4px;">Tell us about your car</h2>
          <p style="font-size: 13px; color: var(--text-muted);">Enter the basic specifications of your primary vehicle.</p>
        </div>

        <form id="form-onboarding-step2">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Make *</label>
              <select class="form-control" name="make" required>
                ${vehicleMakesList.map(m => `<option value="${m}" ${m === data.make ? 'selected' : ''}>${m}</option>`).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">Model *</label>
              <input type="text" class="form-control" name="model" value="${data.model || ''}" placeholder="e.g. Camry, RX350, Civic" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Year *</label>
              <input type="number" class="form-control" name="year" value="${data.year || 2022}" min="1980" max="2027" required />
            </div>
            <div class="form-group">
              <label class="form-label">Engine / Fuel Type *</label>
              <select class="form-control" name="engineType" required>
                <option value="Petrol" ${data.engineType === 'Petrol' ? 'selected' : ''}>Petrol</option>
                <option value="Diesel" ${data.engineType === 'Diesel' ? 'selected' : ''}>Diesel</option>
                <option value="Hybrid" ${data.engineType === 'Hybrid' ? 'selected' : ''}>Hybrid</option>
                <option value="Plug-in Hybrid" ${data.engineType === 'Plug-in Hybrid' ? 'selected' : ''}>Plug-in Hybrid</option>
                <option value="Electric" ${data.engineType === 'Electric' ? 'selected' : ''}>Electric</option>
                <option value="Other" ${data.engineType === 'Other' ? 'selected' : ''}>Other</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Current Odometer Mileage (${store.user.distanceUnit}) *</label>
            <input type="number" class="form-control" name="currentMileage" value="${data.currentMileage || 45000}" placeholder="e.g. 45000" required />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Vehicle Nickname (Optional)</label>
              <input type="text" class="form-control" name="nickname" value="${data.nickname || ''}" placeholder="e.g. My Camry" />
            </div>
            <div class="form-group">
              <label class="form-label">Registration Number (Optional)</label>
              <input type="text" class="form-control" name="registrationNumber" value="${data.registrationNumber || ''}" placeholder="e.g. KJA-104-AB" />
            </div>
          </div>

          <div class="onboarding-actions">
            <button type="button" class="btn btn-secondary" id="btn-ob-back-1">Back</button>
            <button type="submit" class="btn btn-primary">Continue →</button>
          </div>
        </form>
      </div>
    `;
  }

  renderOnboardingStep3(data) {
    const today = new Date().toISOString().split('T')[0];

    return `
      <div>
        <div class="onboarding-step-header">
          <span class="step-badge">Step 3 of 5</span>
          <h2 style="font-size: 24px; font-weight: 800; color: #ffffff; margin-top: 4px;">When was your car last serviced?</h2>
          <p style="font-size: 13px; color: var(--text-muted);">Record your previous maintenance to establish an accurate baseline.</p>
        </div>

        <form id="form-onboarding-step3">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Last Maintenance Date</label>
              <input type="date" class="form-control" name="lastServiceDate" value="${data.lastServiceDate || today}" />
            </div>
            <div class="form-group">
              <label class="form-label">Mileage at Last Maintenance (${store.user.distanceUnit})</label>
              <input type="number" class="form-control" name="lastServiceMileage" value="${data.lastServiceMileage || data.currentMileage || 40000}" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">What was done? (Select all that apply)</label>
            <div class="onboarding-service-grid">
              ${maintenanceTypeOptions.slice(0, 12).map(item => `
                <label class="service-checkbox-card">
                  <input type="checkbox" name="serviceItems" value="${item}" ${data.serviceItems && data.serviceItems.includes(item) ? 'checked' : ''} />
                  <span>${item}</span>
                </label>
              `).join('')}
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">How much did you spend? (Optional, ₦)</label>
              <input type="number" class="form-control" name="serviceCost" value="${data.serviceCost || ''}" placeholder="e.g. 65000" />
            </div>
            <div class="form-group">
              <label class="form-label">Where was it serviced? (Optional)</label>
              <input type="text" class="form-control" name="serviceProvider" value="${data.serviceProvider || ''}" placeholder="e.g. Master AutoCare" />
            </div>
          </div>

          <div class="onboarding-actions" style="justify-content: space-between;">
            <button type="button" class="btn btn-secondary" id="btn-ob-skip-service" style="color: #93c5fd;">I don't remember (Skip)</button>
            <div style="display: flex; gap: 10px;">
              <button type="button" class="btn btn-secondary" id="btn-ob-back-2">Back</button>
              <button type="submit" class="btn btn-primary">Continue →</button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  renderOnboardingStep4(data) {
    return `
      <div>
        <div class="onboarding-step-header">
          <span class="step-badge">Step 4 of 5</span>
          <h2 style="font-size: 24px; font-weight: 800; color: #ffffff; margin-top: 4px;">When do you normally service your car?</h2>
          <p style="font-size: 13px; color: var(--text-muted);">Set your maintenance frequency schedule.</p>
        </div>

        <form id="form-onboarding-step4">
          <div class="form-group">
            <label class="form-label">Service Frequency (Time-based)</label>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;">
              <label class="frequency-radio-card">
                <input type="radio" name="frequencyMonths" value="3" ${data.frequencyMonths === 3 ? 'checked' : ''} />
                <span>Every 3 months</span>
              </label>
              <label class="frequency-radio-card">
                <input type="radio" name="frequencyMonths" value="6" ${data.frequencyMonths === 6 || !data.frequencyMonths ? 'checked' : ''} />
                <span>Every 6 months (Standard)</span>
              </label>
              <label class="frequency-radio-card">
                <input type="radio" name="frequencyMonths" value="12" ${data.frequencyMonths === 12 ? 'checked' : ''} />
                <span>Every 12 months</span>
              </label>
            </div>
          </div>

          <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.25); border-radius: 10px; padding: 16px; margin: 20px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div>
                <h4 style="font-size: 14px; font-weight: 700; color: #ffffff;">Track Odometer Mileage</h4>
                <p style="font-size: 12px; color: var(--text-muted);">Trigger maintenance reminders if you drive heavily before the calendar due date.</p>
              </div>
              <input type="checkbox" id="ob-track-mileage" ${data.trackMileage !== false ? 'checked' : ''} style="width: 18px; height: 18px; cursor: pointer;" />
            </div>

            <div id="ob-mileage-interval-wrap" style="margin-top: 14px; ${data.trackMileage === false ? 'display: none;' : ''}">
              <label class="form-label">Service every (${store.user.distanceUnit}):</label>
              <select class="form-control" name="mileageInterval">
                <option value="5000" ${data.mileageInterval === 5000 ? 'selected' : ''}>Every 5,000 km</option>
                <option value="8000" ${data.mileageInterval === 8000 ? 'selected' : ''}>Every 8,000 km</option>
                <option value="10000" ${data.mileageInterval === 10000 || !data.mileageInterval ? 'selected' : ''}>Every 10,000 km (Standard)</option>
                <option value="15000" ${data.mileageInterval === 15000 ? 'selected' : ''}>Every 15,000 km</option>
              </select>
            </div>
          </div>

          <div style="background: rgba(0,0,0,0.25); border-radius: 8px; padding: 12px; font-size: 12px; color: #93c5fd; border: 1px solid rgba(59, 130, 246, 0.2);">
            ℹ️ <strong>Dual-Threshold Rule:</strong> Motigo will remind you based on time or mileage, <em>whichever comes first</em>.
          </div>

          <div class="onboarding-actions">
            <button type="button" class="btn btn-secondary" id="btn-ob-back-3">Back</button>
            <button type="submit" class="btn btn-primary">Continue →</button>
          </div>
        </form>
      </div>
    `;
  }

  renderOnboardingStep5(data) {
    return `
      <div>
        <div class="onboarding-step-header">
          <span class="step-badge">Step 5 of 5</span>
          <h2 style="font-size: 24px; font-weight: 800; color: #ffffff; margin-top: 4px;">How should Motigo remind you?</h2>
          <p style="font-size: 13px; color: var(--text-muted);">Choose your notification cadence preferences.</p>
        </div>

        <form id="form-onboarding-step5">
          <div style="display: flex; flex-direction: column; gap: 12px; margin: 20px 0;">
            <label class="reminder-pref-card">
              <input type="checkbox" name="sevenDays" checked />
              <div>
                <strong>7 days before</strong>
                <p style="font-size: 12px; color: var(--text-muted);">Advance alert to help you schedule workshop appointments.</p>
              </div>
            </label>

            <label class="reminder-pref-card">
              <input type="checkbox" name="oneDay" checked />
              <div>
                <strong>1 day before</strong>
                <p style="font-size: 12px; color: var(--text-muted);">Final reminder the day before your service is due.</p>
              </div>
            </label>

            <label class="reminder-pref-card">
              <input type="checkbox" name="dueDate" checked />
              <div>
                <strong>On the due date</strong>
                <p style="font-size: 12px; color: var(--text-muted);">Notification when maintenance threshold is reached.</p>
              </div>
            </label>

            <label class="reminder-pref-card">
              <input type="checkbox" name="overdue" checked />
              <div>
                <strong>When maintenance becomes overdue</strong>
                <p style="font-size: 12px; color: var(--text-muted);">Gentle follow-ups with 1-click completion options.</p>
              </div>
            </label>
          </div>

          <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 24px;">
            Primary notification channel: <strong>Email (${store.user.email})</strong>
          </div>

          <div class="onboarding-actions">
            <button type="button" class="btn btn-secondary" id="btn-ob-back-4">Back</button>
            <button type="submit" class="btn btn-success" style="font-size: 15px;">Finish Setup 🎉</button>
          </div>
        </form>
      </div>
    `;
  }

  renderOnboardingCompletion(data) {
    const curMileage = Number(data.currentMileage) || 45000;
    const targetMileage = curMileage + (Number(data.mileageInterval) || 10000);
    const targetDate = new Date();
    targetDate.setMonth(targetDate.getMonth() + (Number(data.frequencyMonths) || 6));
    const formattedDate = targetDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    return `
      <div style="text-align: center; padding: 24px 10px;">
        <div style="font-size: 52px; margin-bottom: 12px;">🎉</div>
        <h2 style="font-size: 28px; font-weight: 800; color: #ffffff;">You're all set!</h2>
        <p style="font-size: 15px; color: var(--text-secondary); margin-top: 6px;">
          Your <strong>${data.year || 2022} ${data.make || 'Toyota'} ${data.model || 'Camry'}</strong> is ready in Motigo.
        </p>

        <div style="background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 20px; max-width: 440px; margin: 24px auto; text-align: left;">
          <div style="font-size: 11px; font-weight: 700; color: #34d399; text-transform: uppercase;">Next Scheduled Maintenance</div>
          <div style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 6px 0;">${formattedDate}</div>
          <div style="font-size: 14px; color: var(--text-secondary);">or at <strong>${targetMileage.toLocaleString()} km</strong></div>
          <div style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">Whichever comes first.</div>
        </div>

        <button class="btn btn-primary" id="btn-ob-go-dashboard" style="font-size: 16px; padding: 14px 36px;">
          <span>Go to My Dashboard →</span>
        </button>
      </div>
    `;
  }

  attachOnboardingListeners() {
    const startBtn = document.getElementById('btn-onboarding-start');
    if (startBtn) startBtn.addEventListener('click', () => store.setOnboardingStep(2));

    const form2 = document.getElementById('form-onboarding-step2');
    if (form2) {
      form2.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form2).entries());
        store.updateOnboardingData(data);
        store.setOnboardingStep(3);
      });
    }

    const back1 = document.getElementById('btn-ob-back-1');
    if (back1) back1.addEventListener('click', () => store.setOnboardingStep(1));

    const form3 = document.getElementById('form-onboarding-step3');
    if (form3) {
      form3.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form3);
        const serviceItems = formData.getAll('serviceItems');
        const data = Object.fromEntries(formData.entries());
        data.serviceItems = serviceItems;
        store.updateOnboardingData(data);
        store.setOnboardingStep(4);
      });
    }

    const skipServiceBtn = document.getElementById('btn-ob-skip-service');
    if (skipServiceBtn) {
      skipServiceBtn.addEventListener('click', () => {
        store.updateOnboardingData({ skipLastService: true });
        store.setOnboardingStep(4);
      });
    }

    const back2 = document.getElementById('btn-ob-back-2');
    if (back2) back2.addEventListener('click', () => store.setOnboardingStep(2));

    const form4 = document.getElementById('form-onboarding-step4');
    if (form4) {
      form4.addEventListener('submit', (e) => {
        e.preventDefault();
        const data = Object.fromEntries(new FormData(form4).entries());
        const trackCheckbox = document.getElementById('ob-track-mileage');
        data.trackMileage = trackCheckbox ? trackCheckbox.checked : true;
        store.updateOnboardingData(data);
        store.setOnboardingStep(5);
      });
    }

    const trackMileageCb = document.getElementById('ob-track-mileage');
    if (trackMileageCb) {
      trackMileageCb.addEventListener('change', (e) => {
        const wrap = document.getElementById('ob-mileage-interval-wrap');
        if (wrap) wrap.style.display = e.target.checked ? 'block' : 'none';
      });
    }

    const back3 = document.getElementById('btn-ob-back-3');
    if (back3) back3.addEventListener('click', () => store.setOnboardingStep(3));

    const form5 = document.getElementById('form-onboarding-step5');
    if (form5) {
      form5.addEventListener('submit', (e) => {
        e.preventDefault();
        store.setOnboardingStep(6);
      });
    }

    const back4 = document.getElementById('btn-ob-back-4');
    if (back4) back4.addEventListener('click', () => store.setOnboardingStep(4));

    const goDashBtn = document.getElementById('btn-ob-go-dashboard');
    if (goDashBtn) {
      goDashBtn.addEventListener('click', () => store.completeOnboarding());
    }
  }

  // =========================================================================
  // 4. DASHBOARD VIEW (Section 17)
  // =========================================================================
  renderDashboard() {
    if (store.vehicles.length === 0) {
      return `
        <div class="empty-state-card">
          <div style="font-size: 52px; margin-bottom: 12px;">🚗</div>
          <h3 style="font-size: 22px; font-weight: 800; color: #ffffff;">Your garage is empty</h3>
          <p style="font-size: 14px; color: var(--text-muted); max-width: 420px; margin: 8px auto 24px;">
            Add your first vehicle to start tracking maintenance, setting schedules, and getting personalized AI recommendations.
          </p>
          <button class="btn btn-primary" id="btn-empty-add-veh" style="font-size: 15px; padding: 12px 28px;">
            <span>+ Add Vehicle</span>
          </button>
        </div>
      `;
    }

    const overdueVehicles = store.vehicles.filter(v => calculateVehicleStatus(v).isOverdue);
    const activeVeh = store.getActiveVehicle();
    const nearestUpcoming = [...store.vehicles].sort((a, b) => new Date(a.schedule.nextDueDate) - new Date(b.schedule.nextDueDate))[0];
    const nearestStatus = nearestUpcoming ? calculateVehicleStatus(nearestUpcoming) : null;

    return `
      <div class="dashboard-grid">
        <div style="margin-bottom: 4px;">
          <h2 style="font-size: 24px; font-weight: 800; color: #ffffff;">Good morning, ${store.user.firstName} 👋</h2>
          <p style="font-size: 14px; color: var(--text-muted);">Here's what's happening with your vehicles.</p>
        </div>

        <!-- Overdue Interactive Prompt Banner (Section 22) -->
        ${overdueVehicles.length > 0 ? (() => {
            const ov = overdueVehicles[0];
            const ovStatus = calculateVehicleStatus(ov);
            const kmOver = ov.currentMileage - ov.schedule.nextDueMileage;
            const daysOver = Math.abs(ovStatus.daysRemaining);
            // Determine the primary trigger reason
            let overdueReason = '';
            if (ovStatus.triggerType === 'mileage') {
              overdueReason = `Your odometer has exceeded the scheduled threshold by <strong>${kmOver.toLocaleString()} km</strong> (current: ${Number(ov.currentMileage).toLocaleString()} km &nbsp;›&nbsp; threshold: ${Number(ov.schedule.nextDueMileage).toLocaleString()} km). The date trigger is ${formatDisplayDate(ov.schedule.nextDueDate)}.`;
            } else {
              overdueReason = `Scheduled date of <strong>${formatDisplayDate(ov.schedule.nextDueDate)}</strong> has passed by <strong>${daysOver} day${daysOver !== 1 ? 's' : ''}</strong>.`;
            }
            return `
          <div class="overdue-banner">
            <div class="overdue-banner-content">
              <div class="overdue-alert-icon">⚠️</div>
              <div class="overdue-banner-text">
                <h4 style="font-size: 16px; font-weight: 800;">Maintenance Needed: ${ov.year} ${ov.make} ${ov.model}</h4>
                <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">
                  ${overdueReason} <strong>Did you complete this maintenance?</strong>
                </p>
              </div>
            </div>
            <div class="overdue-prompt-actions">
              <button class="btn btn-success btn-sm btn-prompt-complete" data-id="${ov.id}">✓ Yes, I did</button>
              <button class="btn btn-secondary btn-sm btn-prompt-notyet" data-id="${ov.id}">Not yet</button>
              <button class="btn btn-secondary btn-sm btn-prompt-reschedule" data-id="${ov.id}">Reschedule</button>
              <button class="btn btn-secondary btn-sm btn-prompt-remindlater" data-id="${ov.id}">Remind me later</button>
            </div>
          </div>`;
          })() : ''}

        <!-- 2-Column Split: Vehicle Summary & Upcoming Maintenance -->
        <div class="dashboard-main-split">
          <!-- Column 1: Vehicle Summary Cards -->
          <div>
            <div class="section-header" style="margin-bottom: 14px;">
              <h3 class="section-title">
                <span>🚗</span>
                <span>Vehicle Summary</span>
              </h3>
              <button class="btn btn-secondary btn-sm" id="btn-add-car-section">+ Add Vehicle</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px;">
              ${store.vehicles.map(v => {
                const status = calculateVehicleStatus(v);
                return `
                  <div class="card" style="padding: 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
                    <div style="display: flex; align-items: center; gap: 16px;">
                      <div style="width: 48px; height: 48px; border-radius: 10px; background: rgba(59, 130, 246, 0.15); display: flex; align-items: center; justify-content: center; font-size: 24px;">🚗</div>
                      <div>
                        <div style="display: flex; align-items: center; gap: 8px;">
                          <h4 style="font-size: 16px; font-weight: 800;">${v.make} ${v.model}</h4>
                          <span class="status-badge ${status.badgeClass}">
                            <span class="dot"></span>
                            <span>${status.label}</span>
                          </span>
                        </div>
                        <p style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">
                          ${v.year} • ${v.engineType} • ${Number(v.currentMileage).toLocaleString()} ${store.user.distanceUnit}
                        </p>
                        <div style="font-size: 12px; color: ${status.color}; font-weight: 600; margin-top: 6px;">
                          Next maintenance: ${formatDisplayDate(v.schedule.nextDueDate)} or ${v.schedule.nextDueMileage.toLocaleString()} km
                        </div>
                      </div>
                    </div>

                    <div style="display: flex; gap: 8px;">
                      <button class="btn btn-secondary btn-sm btn-view-veh-detail" data-veh-id="${v.id}">View Vehicle</button>
                      <button class="btn btn-primary btn-sm btn-card-complete" data-veh-id="${v.id}">✓ Mark Done</button>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Column 2: Upcoming Service Widget & Quick Mileage Updater -->
          <div style="display: flex; flex-direction: column; gap: 20px;">
            ${nearestUpcoming ? `
              <div class="card" style="background: linear-gradient(135deg, rgba(59, 130, 246, 0.12) 0%, rgba(99, 102, 241, 0.05) 100%); border-color: rgba(59, 130, 246, 0.3);">
                <div class="section-header" style="margin-bottom: 8px;">
                  <span style="font-size: 11px; font-weight: 700; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.5px;">Upcoming Maintenance</span>
                  <span class="status-badge ${nearestStatus.badgeClass}">${nearestStatus.label}</span>
                </div>

                <h3 style="font-size: 20px; font-weight: 800; color: #ffffff;">${nearestUpcoming.make} ${nearestUpcoming.model}</h3>
                
                <div style="font-size: 22px; font-weight: 800; color: #60a5fa; margin: 8px 0 4px;">
                  ${formatDisplayDate(nearestUpcoming.schedule.nextDueDate)}
                </div>

                <p style="font-size: 13px; color: var(--text-secondary);">
                  ${nearestStatus.daysRemaining !== null ? `<strong>${Math.max(0, nearestStatus.daysRemaining)} days remaining</strong>` : ''} or at <strong>${nearestUpcoming.schedule.nextDueMileage.toLocaleString()} km</strong>
                </p>

                <div style="margin-top: 16px;">
                  <button class="btn btn-secondary btn-sm btn-view-veh-detail" data-veh-id="${nearestUpcoming.id}" style="width: 100%;">
                    View Details →
                  </button>
                </div>
              </div>
            ` : ''}

            <!-- Quick Mileage Updater (Section 24) -->
            <div class="quick-mileage-card">
              <div class="section-header" style="margin-bottom: 8px;">
                <h4 class="section-title" style="font-size: 15px;">
                  <span>⚡</span>
                  <span>Update Mileage (${activeVeh ? activeVeh.make + ' ' + activeVeh.model : 'Vehicle'})</span>
                </h4>
              </div>
              <p style="font-size: 12px; color: var(--text-muted);">
                Current reading: <strong>${activeVeh ? Number(activeVeh.currentMileage).toLocaleString() : 0} ${store.user.distanceUnit}</strong>
              </p>

              <div class="mileage-input-row">
                <input 
                  type="number" 
                  class="form-control" 
                  id="dashboard-odometer-input" 
                  placeholder="Enter new reading..." 
                  value="${activeVeh ? activeVeh.currentMileage : ''}"
                />
                <button class="btn btn-primary" id="btn-save-dashboard-mileage">Update</button>
              </div>

              <div id="mileage-delta-alert" style="display: none;"></div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  // =========================================================================
  // 5. MY VEHICLES VIEW (Section 18)
  // =========================================================================
  renderVehiclesView() {
    return `
      <div>
        <div class="section-header">
          <div>
            <h3 class="section-title">My Vehicles (${store.vehicles.length})</h3>
            <p style="font-size: 13px; color: var(--text-muted);">Manage your vehicle garage, view specifications, and track individual schedules.</p>
          </div>
          <button class="btn btn-primary" id="btn-add-vehicle-main">+ Add Vehicle</button>
        </div>

        <div class="vehicles-grid" style="margin-top: 20px;">
          ${store.vehicles.map(v => {
            const status = calculateVehicleStatus(v);
            const records = store.records.filter(r => r.vehicleId === v.id);

            return `
              <div class="card" style="padding: 0; overflow: hidden;">
                <div class="vehicle-card-image" style="background-image: url('${v.photoUrl}'); height: 180px;">
                  <div class="vehicle-status-tag">
                    <span class="status-badge ${status.badgeClass}">
                      <span class="dot"></span>
                      <span>${status.label}</span>
                    </span>
                  </div>
                </div>

                <div style="padding: 20px; display: flex; flex-direction: column; gap: 14px;">
                  <div class="vehicle-title-wrap">
                    <div>
                      <h4 style="font-size: 18px; font-weight: 800;">${v.year} ${v.make} ${v.model}</h4>
                      <span style="font-size: 12px; color: var(--text-muted);">${v.nickname} • ${v.engineType}</span>
                    </div>
                    <span class="vehicle-plate-pill">${v.registrationNumber}</span>
                  </div>

                  <div class="context-specs-list">
                    <div class="context-spec-row">
                      <span class="spec-k">Mileage</span>
                      <span class="spec-v">${Number(v.currentMileage).toLocaleString()} ${store.user.distanceUnit}</span>
                    </div>
                    <div class="context-spec-row">
                      <span class="spec-k">Next Service</span>
                      <span class="spec-v" style="color: ${status.color};">${formatDisplayDate(v.schedule.nextDueDate)}</span>
                    </div>
                    <div class="context-spec-row">
                      <span class="spec-k">Due Mileage</span>
                      <span class="spec-v">${v.schedule.nextDueMileage.toLocaleString()} km</span>
                    </div>
                    <div class="context-spec-row">
                      <span class="spec-k">History</span>
                      <span class="spec-v">${records.length} logged events</span>
                    </div>
                  </div>

                  <div style="display: flex; gap: 10px; margin-top: 6px;">
                    <button class="btn btn-secondary btn-sm btn-view-veh-detail" data-veh-id="${v.id}" style="flex: 1;">View Details</button>
                    <button class="btn btn-primary btn-sm btn-card-complete" data-veh-id="${v.id}" style="flex: 1;">Log Service</button>
                    <button class="btn btn-secondary btn-sm btn-delete-vehicle" data-id="${v.id}" style="color: #f87171;" title="Delete Vehicle">🗑️</button>
                  </div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 6. DEDICATED VEHICLE DETAILS PAGE (Section 19)
  // =========================================================================
  renderVehicleDetailView() {
    const veh = store.getSelectedVehicleDetail();
    if (!veh) return this.renderVehiclesView();

    const status = calculateVehicleStatus(veh);
    const records = store.records.filter(r => r.vehicleId === veh.id);
    const insightText = aiAssistant.getVehicleInsight(veh, records);

    return `
      <div>
        <div style="margin-bottom: 16px;">
          <button class="btn btn-secondary btn-sm" id="btn-back-to-vehicles">← Back to My Vehicles</button>
        </div>

        <div class="card" style="padding: 24px; margin-bottom: 24px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="display: flex; align-items: center; gap: 12px;">
                <h2 style="font-size: 28px; font-weight: 800; color: #ffffff;">${veh.year} ${veh.make} ${veh.model}</h2>
                <span class="status-badge ${status.badgeClass}">
                  <span class="dot"></span>
                  <span>${status.label}</span>
                </span>
              </div>
              <p style="font-size: 14px; color: var(--text-muted); margin-top: 4px;">
                ${veh.nickname} • ${veh.engineType} • ${Number(veh.currentMileage).toLocaleString()} ${store.user.distanceUnit} • ${veh.registrationNumber}
              </p>
            </div>

            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm btn-edit-vehicle" data-id="${veh.id}">⚙️ Edit Specs</button>
              <button class="btn btn-primary btn-sm btn-card-complete" data-veh-id="${veh.id}">✓ Mark as Completed</button>
            </div>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 20px 0;" />

          <!-- NEXT MAINTENANCE CARD -->
          <div style="background: rgba(59, 130, 246, 0.08); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 16px;">
            <div>
              <div style="font-size: 11px; font-weight: 700; color: #93c5fd; text-transform: uppercase; letter-spacing: 0.5px;">Next Maintenance</div>
              <div style="font-size: 22px; font-weight: 800; color: #ffffff; margin: 4px 0;">
                ${formatDisplayDate(veh.schedule.nextDueDate)} <span style="font-size: 14px; font-weight: normal; color: var(--text-muted);">or</span> ${veh.schedule.nextDueMileage.toLocaleString()} km
              </div>
              <div style="font-size: 12px; color: var(--text-secondary);">Whichever comes first. (Interval: Every ${veh.schedule.frequencyMonths} mo / ${veh.schedule.mileageInterval.toLocaleString()} km)</div>
            </div>

            <button class="btn btn-success btn-card-complete" data-veh-id="${veh.id}" style="font-size: 14px; padding: 10px 22px;">
              ✓ Mark as Completed
            </button>
          </div>

          <!-- MOTIGO INSIGHT BANNER (Section 29) -->
          <div style="background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(99, 102, 241, 0.05) 100%); border: 1px solid rgba(139, 92, 246, 0.3); border-radius: 12px; padding: 18px 22px; margin-top: 18px; display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px; font-size: 12px; font-weight: 700; color: #c084fc; text-transform: uppercase;">
                <span>🤖</span>
                <span>Motigo Insight</span>
              </div>
              <p style="font-size: 14px; color: var(--text-secondary); margin-top: 6px; line-height: 1.5; max-width: 680px;">
                ${insightText}
              </p>
            </div>

            <button class="btn btn-primary" id="btn-insight-ask-ai" style="background: linear-gradient(135deg, #8b5cf6 0%, #6366f1 100%); border: none;">
              Ask Motigo AI →
            </button>
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <h4 class="section-title" style="font-size: 16px;">
              <span>📜</span>
              <span>Maintenance History (${records.length})</span>
            </h4>
            <button class="btn btn-primary btn-sm btn-card-complete" data-veh-id="${veh.id}">+ Add Maintenance</button>
          </div>

          ${records.length === 0 ? `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
              <p style="font-size: 32px;">🔧</p>
              <h4 style="margin-top: 10px; color: var(--text-primary);">No Maintenance Records Yet</h4>
              <p style="font-size: 13px; margin-top: 4px;">Click "Add Maintenance" above to record previous or new service events.</p>
            </div>
          ` : `
            <div class="timeline-container">
              ${records.map(rec => `
                <div class="timeline-item">
                  <div class="timeline-node-icon">🔧</div>
                  <div class="timeline-card">
                    <div class="timeline-header">
                      <div>
                        <div class="timeline-service-name">${rec.maintenanceType}</div>
                        <div style="font-size: 12px; color: var(--text-muted);">${rec.serviceProvider || 'Auto Care Specialist'}</div>
                      </div>
                      <div style="text-align: right;">
                        <div class="timeline-cost-tag">${formatCurrency(rec.totalCost, store.user.currencySymbol)}</div>
                        <span class="timeline-mileage-badge">${Number(rec.mileage).toLocaleString()} ${store.user.distanceUnit}</span>
                      </div>
                    </div>

                    <div class="timeline-date-chip">
                      <span>📅</span>
                      <span>${formatDisplayDate(rec.date)}</span>
                    </div>

                    <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                      ${rec.description || 'Routine scheduled maintenance service performed.'}
                    </p>

                    ${rec.items && rec.items.length > 0 ? `
                      <div class="timeline-tags-list">
                        ${rec.items.map(item => `<span class="timeline-tag">${item}</span>`).join('')}
                      </div>
                    ` : ''}

                    ${rec.documentName ? `
                      <div class="timeline-meta-row">
                        <a class="timeline-doc-link btn-view-receipt" data-rec-id="${rec.id}">
                          <span>📎</span>
                          <span>${rec.documentName}</span>
                          <span style="font-size: 10px; background: rgba(255,255,255,0.15); padding: 1px 6px; border-radius: 4px;">View / Download</span>
                        </a>
                      </div>
                    ` : ''}
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 7. MAINTENANCE VIEW (Timeline, Cost Tracking)
  // =========================================================================
  renderMaintenanceView() {
    const activeVeh = store.getActiveVehicle();
    const records = activeVeh 
      ? store.records.filter(r => r.vehicleId === activeVeh.id)
      : store.records;
    const costMetrics = calculateCostMetrics(records, activeVeh ? activeVeh.id : null, store.user.currencySymbol);

    return `
      <div>
        <div class="section-header">
          <div>
            <h3 class="section-title">Maintenance History & Spending</h3>
            <p style="font-size: 13px; color: var(--text-muted);">
              Showing records for <strong>${activeVeh ? activeVeh.year + ' ' + activeVeh.make + ' ' + activeVeh.model : 'All Vehicles'}</strong>
            </p>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary btn-sm" id="btn-edit-schedule-modal">⚙️ Schedule Settings</button>
            <button class="btn btn-primary btn-sm" id="btn-open-complete-modal">+ Add Maintenance</button>
          </div>
        </div>

        <div class="cost-analytics-grid" style="margin-top: 20px;">
          <div class="cost-card">
            <div class="cost-card-title">Maintenance Spending (2026)</div>
            <div class="cost-card-amount" style="color: #34d399;">${costMetrics.formatted.currentYear}</div>
            <div class="cost-progress-bar">
              <div class="cost-progress-parts" style="width: 70%;"></div>
              <div class="cost-progress-labour" style="width: 30%;"></div>
            </div>
            <div class="cost-legend">
              <span>Parts: ${costMetrics.formatted.parts}</span>
              <span>Labour: ${costMetrics.formatted.labour}</span>
            </div>
          </div>

          <div class="cost-card">
            <div class="cost-card-title">Average Service Cost</div>
            <div class="cost-card-amount">${costMetrics.formatted.average}</div>
            <p style="font-size: 12px; color: var(--text-muted);">Across ${costMetrics.recordCount} recorded services</p>
          </div>

          <div class="cost-card">
            <div class="cost-card-title">Lifetime Total Spend</div>
            <div class="cost-card-amount" style="color: #60a5fa;">${costMetrics.formatted.total}</div>
            <p style="font-size: 12px; color: var(--text-muted);">Next service: ${activeVeh ? formatDisplayDate(activeVeh.schedule.nextDueDate) : 'N/A'}</p>
          </div>
        </div>

        <div class="card">
          <div class="section-header">
            <h4 class="section-title" style="font-size: 16px;">
              <span>📜</span>
              <span>Maintenance Timeline</span>
            </h4>
            <span style="font-size: 12px; color: var(--text-muted);">${records.length} entries recorded</span>
          </div>

          ${records.length === 0 ? `
            <div style="text-align: center; padding: 40px; color: var(--text-muted);">
              <p style="font-size: 32px;">🔧</p>
              <h4 style="margin-top: 10px; color: var(--text-primary);">No Maintenance Records Yet</h4>
              <p style="font-size: 13px; margin-top: 4px;">Click "Add Maintenance" above to record previous or new service events.</p>
            </div>
          ` : `
            <div class="timeline-container">
              ${records.map(rec => {
                const veh = store.vehicles.find(v => v.id === rec.vehicleId);
                return `
                  <div class="timeline-item">
                    <div class="timeline-node-icon">🔧</div>
                    <div class="timeline-card">
                      <div class="timeline-header">
                        <div>
                          <div class="timeline-service-name">${rec.maintenanceType}</div>
                          <div style="font-size: 12px; color: var(--text-muted);">${veh ? veh.year + ' ' + veh.make + ' ' + veh.model : ''} • ${rec.serviceProvider || 'AutoCare Workshop'}</div>
                        </div>
                        <div style="text-align: right;">
                          <div class="timeline-cost-tag">${formatCurrency(rec.totalCost, store.user.currencySymbol)}</div>
                          <span class="timeline-mileage-badge">${Number(rec.mileage).toLocaleString()} ${store.user.distanceUnit}</span>
                        </div>
                      </div>

                      <div class="timeline-date-chip">
                        <span>📅</span>
                        <span>${formatDisplayDate(rec.date)}</span>
                      </div>

                      <p style="font-size: 13px; color: var(--text-secondary); margin-top: 8px;">
                        ${rec.description || 'Routine preventative maintenance service performed.'}
                      </p>

                      ${rec.items && rec.items.length > 0 ? `
                        <div class="timeline-tags-list">
                          ${rec.items.map(item => `<span class="timeline-tag">${item}</span>`).join('')}
                        </div>
                      ` : ''}

                      ${rec.documentName ? `
                        <div class="timeline-meta-row">
                          <a class="timeline-doc-link btn-view-receipt" data-rec-id="${rec.id}">
                            <span>📎</span>
                            <span>${rec.documentName}</span>
                            <span style="font-size: 10px; background: rgba(255,255,255,0.15); padding: 1px 6px; border-radius: 4px;">View / Preview</span>
                          </a>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 8. MOTIGO AI CAR ASSISTANT VIEW (Sections 25 - 30)
  // =========================================================================
  renderAiAssistantView() {
    const activeVeh = store.getActiveVehicle();
    const history = activeVeh ? store.records.filter(r => r.vehicleId === activeVeh.id) : [];

    return `
      <div class="ai-container">
        <div class="ai-sidebar">
          <div class="ai-vehicle-context-card">
            <div class="context-header">
              <div class="ai-avatar-badge">🤖</div>
              <div>
                <h4 style="font-size: 14px; font-weight: 700;">Vehicle Context</h4>
                <p style="font-size: 11px; color: var(--text-muted);">Real-time diagnostic injection</p>
              </div>
            </div>

            ${activeVeh ? `
              <div class="context-specs-list">
                <div class="context-spec-row">
                  <span class="spec-k">Target Vehicle</span>
                  <span class="spec-v">${activeVeh.year} ${activeVeh.make} ${activeVeh.model}</span>
                </div>
                <div class="context-spec-row">
                  <span class="spec-k">Engine</span>
                  <span class="spec-v">${activeVeh.engineType}</span>
                </div>
                <div class="context-spec-row">
                  <span class="spec-k">Current Mileage</span>
                  <span class="spec-v">${Number(activeVeh.currentMileage).toLocaleString()} ${store.user.distanceUnit}</span>
                </div>
                <div class="context-spec-row">
                  <span class="spec-k">Next Service</span>
                  <span class="spec-v" style="color: #60a5fa;">${formatDisplayDate(activeVeh.schedule.nextDueDate)}</span>
                </div>
                <div class="context-spec-row">
                  <span class="spec-k">History</span>
                  <span class="spec-v">${history.length} logged events</span>
                </div>
              </div>
            ` : `<p style="font-size: 12px; color: var(--text-muted);">No active vehicle selected.</p>`}
          </div>

          <div class="symptom-chips-panel">
            <h4 style="font-size: 13px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Suggested Questions</h4>
            
            <div class="symptom-chips-list">
              <button class="symptom-chip-btn" data-query="What maintenance should I do next?">
                <span>🔧</span>
                <span>What maintenance should I do next?</span>
              </button>

              <button class="symptom-chip-btn" data-query="How often should I change my oil?">
                <span>🛢️</span>
                <span>How often should I change my oil?</span>
              </button>

              <button class="symptom-chip-btn" data-query="What should I check before a long road trip?">
                <span>🧳</span>
                <span>What should I check before a long trip?</span>
              </button>

              <button class="symptom-chip-btn" data-query="Why is my car overheating?">
                <span>🌡️</span>
                <span>Why is my car overheating?</span>
              </button>

              <button class="symptom-chip-btn" data-query="What could cause a clicking sound when turning?">
                <span>🔊</span>
                <span>Clicking sound when turning?</span>
              </button>

              <button class="symptom-chip-btn" data-query="What should I check at 100,000 km?">
                <span>🚗</span>
                <span>What should I check at 100,000 km?</span>
              </button>

              <button class="symptom-chip-btn" data-query="When is my next maintenance date?">
                <span>📅</span>
                <span>When is my next maintenance date?</span>
              </button>

              <button class="symptom-chip-btn" data-query="Which car is overdue for maintenance?">
                <span>⚠️</span>
                <span>Which car is overdue?</span>
              </button>
            </div>
          </div>
        </div>

        <div class="ai-chat-stage">
          <div class="ai-chat-header">
            <div style="display: flex; align-items: center; gap: 12px;">
              <div class="ai-avatar-badge" style="width: 34px; height: 34px; font-size: 16px;">🤖</div>
              <div>
                <h4 style="font-size: 15px; font-weight: 700;">Motigo AI</h4>
                <p style="font-size: 11px; color: #34d399; font-weight: 600;">● Online • Context Loaded for ${activeVeh ? activeVeh.make + ' ' + activeVeh.model : 'Vehicle'}</p>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <select class="form-control" id="ai-chat-vehicle-select" style="width: 190px; font-size: 12px; padding: 5px 10px; height: 32px;">
                ${store.vehicles.map(v => `
                  <option value="${v.id}" ${v.id === store.activeVehicleId ? 'selected' : ''}>
                    ${v.year} ${v.make} ${v.model}
                  </option>
                `).join('')}
              </select>
              <button class="btn btn-secondary btn-sm" id="btn-clear-chat" title="Clear conversation history">Clear</button>
            </div>
          </div>

          <div class="ai-chat-messages" id="chat-messages-scroll">
            ${store.aiChatHistory.map(msg => {
              if (msg.sender === 'user') {
                return `
                  <div class="chat-msg msg-user">
                    <div class="msg-avatar">👤</div>
                    <div class="msg-bubble">${msg.text}</div>
                  </div>
                `;
              } else {
                return `
                  <div class="chat-msg msg-ai" id="msg-${msg.id}">
                    <div class="msg-avatar">🤖</div>
                    <div class="msg-bubble">
                      <div class="msg-body-content">
                        ${this.formatAiMarkdown(msg.text)}
                      </div>

                      ${msg.diagnostic ? `
                        <div class="diagnostic-framework-card">
                          <div class="diagnostic-card-header">
                            <h4>${msg.diagnostic.title}</h4>
                            <span class="urgency-badge ${msg.diagnostic.urgency.badgeClass}">
                              <span>${msg.diagnostic.urgency.icon}</span>
                              <span>${msg.diagnostic.urgency.label}</span>
                            </span>
                          </div>

                          <div class="diagnostic-body">
                            <div class="diag-section cause">
                              <div class="diag-section-title">1. Possible Causes</div>
                              <div class="diag-section-text">${this.formatAiMarkdown(msg.diagnostic.possibleCause)}</div>
                            </div>

                            <div class="diag-section action">
                              <div class="diag-section-title">2. What to do / check</div>
                              <div class="diag-section-text">${this.formatAiMarkdown(msg.diagnostic.recommendedAction)}</div>
                            </div>

                            <div class="diag-section" style="border-color: #a855f7;">
                              <div class="diag-section-title">3. Urgency</div>
                              <div class="diag-section-text"><strong>${msg.diagnostic.urgency.label}</strong> — Prioritize addressing to avoid collateral powertrain wear.</div>
                            </div>

                            <div class="disclaimer-box">
                              <span>ℹ️</span>
                              <div><strong>Important:</strong> ${msg.diagnostic.disclaimer}</div>
                            </div>
                          </div>
                        </div>
                      ` : ''}

                      ${msg.actions && msg.actions.length > 0 ? `
                        <div class="ai-actions-bar">
                          ${msg.actions.map(act => `
                            <button class="ai-action-btn" data-action="${act.action}" data-veh-id="${act.vehicleId || store.activeVehicleId}">
                              ${act.label}
                            </button>
                          `).join('')}
                          <button class="ai-speak-btn" data-text="${encodeURIComponent(msg.text)}" title="Listen with voice synthesizer">
                            <span>🔊 Read Aloud</span>
                          </button>
                        </div>
                      ` : `
                        <div style="margin-top: 10px; display: flex; justify-content: flex-end;">
                          <button class="ai-speak-btn" data-text="${encodeURIComponent(msg.text)}" title="Listen with voice synthesizer">
                            <span>🔊 Read Aloud</span>
                          </button>
                        </div>
                      `}

                      ${msg.suggestions && msg.suggestions.length > 0 ? `
                        <div class="ai-suggestions-container">
                          <div class="ai-suggestions-label">Suggested Questions:</div>
                          <div class="ai-suggestions-list">
                            ${msg.suggestions.map(s => `
                              <button class="ai-suggestion-chip" data-query="${s}">
                                ${s} →
                              </button>
                            `).join('')}
                          </div>
                        </div>
                      ` : ''}
                    </div>
                  </div>
                `;
              }
            }).join('')}

            <div id="ai-typing-indicator-node" style="display: none;" class="chat-msg msg-ai">
              <div class="msg-avatar">🤖</div>
              <div class="ai-typing-indicator">
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
                <div class="typing-dot"></div>
              </div>
            </div>
          </div>

          <div class="ai-chat-footer">
            <form id="ai-chat-form" class="chat-input-box">
              <textarea 
                id="ai-chat-input" 
                rows="1" 
                placeholder="Ask Motigo anything about your car (symptoms, sounds, service dates, costs)..."
              ></textarea>
              <button type="submit" class="btn btn-primary" id="btn-send-ai">
                <span>Ask Motigo AI</span>
                <span>→</span>
              </button>
            </form>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 9. NOTIFICATIONS VIEW & EMAIL SIMULATOR (Sections 31 - 33)
  // =========================================================================
  renderNotificationsView() {
    return `
      <div>
        <div class="section-header">
          <div>
            <h3 class="section-title">Automated Reminders & Notifications</h3>
            <p style="font-size: 13px; color: var(--text-muted);">
              Automated email reminders calculated at 7 days before, 1 day before, due date, and overdue alerts.
            </p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap;">
            <button class="btn btn-primary btn-sm" id="btn-simulate-welcome-email">🎉 Preview Welcome Email</button>
            <button class="btn btn-secondary btn-sm" id="btn-simulate-email">📧 Preview Reminder Template</button>
            <button class="btn btn-secondary btn-sm" id="btn-mark-all-read">Mark All Read</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1.5fr 1fr; gap: 24px; margin-top: 20px;">
          <div class="card">
            <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 16px;">Notification Feed</h4>

            <div style="display: flex; flex-direction: column; gap: 12px;">
              ${store.notifications.map(n => {
                const veh = store.vehicles.find(v => v.id === n.vehicleId);
                const isOverdue = n.type === 'overdue';
                const isDueSoon = n.type === 'due_soon';

                return `
                  <div style="background: rgba(0,0,0,0.25); border: 1px solid ${isOverdue ? 'var(--status-overdue-border)' : 'var(--border-subtle)'}; border-radius: 10px; padding: 16px; display: flex; align-items: flex-start; justify-content: space-between; gap: 14px;">
                    <div style="display: flex; align-items: flex-start; gap: 12px;">
                      <div style="font-size: 20px; margin-top: 2px;">
                        ${isOverdue ? '🔴' : isDueSoon ? '🟡' : '🟢'}
                      </div>
                      <div>
                        <h5 style="font-size: 14px; font-weight: 700; color: ${isOverdue ? '#fca5a5' : 'var(--text-primary)'};">${n.title}</h5>
                        <p style="font-size: 13px; color: var(--text-secondary); margin-top: 4px;">${n.message}</p>
                        <div style="font-size: 11px; color: var(--text-muted); margin-top: 6px;">
                          ${veh ? veh.year + ' ' + veh.make + ' ' + veh.model : ''} • ${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>

                    ${n.actionRequired ? `
                      <button class="btn btn-primary btn-sm btn-notif-action" data-veh-id="${n.vehicleId}" style="flex-shrink: 0;">
                        Update Maintenance
                      </button>
                    ` : ''}
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="card">
            <h4 style="font-size: 15px; font-weight: 700; margin-bottom: 12px;">Automated Email Cadence</h4>
            <p style="font-size: 13px; color: var(--text-secondary); line-height: 1.6;">
              Motigo automatically sends email notifications based on calendar elapsed days and recorded mileage progression:
            </p>

            <div style="margin-top: 16px; display: flex; flex-direction: column; gap: 12px; font-size: 12px;">
              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;">
                <strong>1. 7 Days Before</strong>
                <p style="color: var(--text-muted); margin-top: 2px;">"Your Toyota Camry is due for maintenance soon"</p>
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;">
                <strong>2. 1 Day Before</strong>
                <p style="color: var(--text-muted); margin-top: 2px;">"Your Toyota Camry is scheduled for maintenance tomorrow"</p>
              </div>

              <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 12px;">
                <strong>3. Due Date</strong>
                <p style="color: var(--text-muted); margin-top: 2px;">"Your Toyota Camry's maintenance is due today"</p>
              </div>

              <div style="background: rgba(239,68,68,0.1); border: 1px solid var(--status-overdue-border); border-radius: 8px; padding: 12px;">
                <strong style="color: #fca5a5;">4. Overdue</strong>
                <p style="color: var(--text-secondary); margin-top: 2px;">"Your Toyota Camry's maintenance is overdue" with 1-click update link.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // 10. SETTINGS VIEW (Section 37)
  // =========================================================================
  renderSettingsView() {
    return `
      <div style="max-width: 800px; margin: 0 auto;">
        <div class="section-header">
          <div>
            <h3 class="section-title">Settings & Preferences</h3>
            <p style="font-size: 13px; color: var(--text-muted);">Manage your account, vehicle preferences, notification channels, and data.</p>
          </div>
        </div>

        <div class="card" style="margin-top: 20px;">
          <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Account</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">First Name</label>
              <input type="text" class="form-control" value="${store.user.firstName}" readonly />
            </div>
            <div class="form-group">
              <label class="form-label">Last Name</label>
              <input type="text" class="form-control" value="${store.user.lastName}" readonly />
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">Email Address</label>
            <input type="email" class="form-control" value="${store.user.email}" readonly />
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 24px 0;" />

          <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Vehicle Preferences</h4>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">Mileage Unit</label>
              <select class="form-control" id="settings-unit-select">
                <option value="km" ${store.user.distanceUnit === 'km' ? 'selected' : ''}>Kilometres (km)</option>
                <option value="mi" ${store.user.distanceUnit === 'mi' ? 'selected' : ''}>Miles (mi)</option>
              </select>
            </div>

            <div class="form-group">
              <label class="form-label">Currency</label>
              <select class="form-control" id="settings-currency-select">
                <option value="NGN,₦" ${store.user.currencySymbol === '₦' ? 'selected' : ''}>NGN (₦) Nigerian Naira</option>
                <option value="USD,$" ${store.user.currencySymbol === '$' ? 'selected' : ''}>USD ($) US Dollar</option>
                <option value="EUR,€" ${store.user.currencySymbol === '€' ? 'selected' : ''}>EUR (€) Euro</option>
                <option value="GBP,£" ${store.user.currencySymbol === '£' ? 'selected' : ''}>GBP (£) British Pound</option>
              </select>
            </div>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 24px 0;" />

          <h4 style="font-size: 16px; font-weight: 700; margin-bottom: 16px;">Notification Preferences</h4>
          <div style="display: flex; flex-direction: column; gap: 14px; font-size: 14px;">
            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked />
              <span>Email Notifications (${store.user.email})</span>
            </label>

            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked />
              <span>7 days before reminder</span>
            </label>

            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked />
              <span>1 day before reminder</span>
            </label>

            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked />
              <span>Due date reminder</span>
            </label>

            <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
              <input type="checkbox" checked />
              <span>Overdue reminder</span>
            </label>
          </div>

          <hr style="border: 0; border-top: 1px solid var(--border-subtle); margin: 24px 0;" />

          <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;">
            <div>
              <button class="btn btn-secondary btn-sm" id="btn-settings-restart-onboarding" style="color: #60a5fa;">
                ✨ Re-run Onboarding Wizard
              </button>
            </div>

            <div style="display: flex; gap: 10px;">
              <button class="btn btn-secondary btn-sm" id="btn-settings-logout">Logout</button>
              <button class="btn btn-secondary btn-sm" id="btn-reset-demo" style="color: #f87171;">Reset Demo Data</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  // =========================================================================
  // EVENT LISTENERS & MODAL HANDLERS
  // =========================================================================
  attachEventListeners() {
    const sidebar = document.getElementById('app-sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    const closeMobileSidebar = () => {
      if (sidebar) sidebar.classList.remove('open');
      if (overlay) overlay.classList.remove('active');
    };

    document.querySelectorAll('.nav-item').forEach(el => {
      el.addEventListener('click', () => {
        const view = el.getAttribute('data-view');
        if (view) store.setView(view);
        closeMobileSidebar();
      });
    });

    const navLandingBtn = document.getElementById('nav-btn-landing');
    if (navLandingBtn) navLandingBtn.addEventListener('click', () => {
      store.setView('landing');
      closeMobileSidebar();
    });

    const mobileBtn = document.getElementById('mobile-toggle-btn');
    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.toggle('open');
        if (overlay) {
          if (isOpen) overlay.classList.add('active');
          else overlay.classList.remove('active');
        }
      });
    }

    if (overlay) {
      overlay.addEventListener('click', closeMobileSidebar);
    }

    const vehSelect = document.getElementById('header-vehicle-select');
    if (vehSelect) {
      vehSelect.addEventListener('change', (e) => {
        store.setActiveVehicle(e.target.value);
      });
    }

    const aiVehSelect = document.getElementById('ai-chat-vehicle-select');
    if (aiVehSelect) {
      aiVehSelect.addEventListener('change', (e) => {
        store.setActiveVehicle(e.target.value);
      });
    }

    const quickAddBtn = document.getElementById('btn-quick-add-vehicle');
    if (quickAddBtn) quickAddBtn.addEventListener('click', () => this.showAddVehicleModal());

    const quickCompBtn = document.getElementById('btn-quick-complete-service');
    if (quickCompBtn) quickCompBtn.addEventListener('click', () => this.showCompleteMaintenanceModal(store.activeVehicleId));

    const bellBtn = document.getElementById('header-bell-btn');
    if (bellBtn) bellBtn.addEventListener('click', () => store.setView('notifications'));

    const userBtn = document.getElementById('header-user-btn');
    if (userBtn) userBtn.addEventListener('click', () => store.setView('settings'));

    const addCarSectionBtn = document.getElementById('btn-add-car-section');
    if (addCarSectionBtn) addCarSectionBtn.addEventListener('click', () => this.showAddVehicleModal());

    const addCarMainBtn = document.getElementById('btn-add-vehicle-main');
    if (addCarMainBtn) addCarMainBtn.addEventListener('click', () => this.showAddVehicleModal());

    const emptyAddBtn = document.getElementById('btn-empty-add-veh');
    if (emptyAddBtn) emptyAddBtn.addEventListener('click', () => this.showAddVehicleModal());

    const backToVehiclesBtn = document.getElementById('btn-back-to-vehicles');
    if (backToVehiclesBtn) backToVehiclesBtn.addEventListener('click', () => store.setView('vehicles'));

    const insightAskAiBtn = document.getElementById('btn-insight-ask-ai');
    if (insightAskAiBtn) insightAskAiBtn.addEventListener('click', () => store.setView('ai-assistant'));

    document.querySelectorAll('.btn-view-veh-detail').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vehId = btn.getAttribute('data-veh-id');
        if (vehId) store.viewVehicleDetail(vehId);
      });
    });

    document.querySelectorAll('.btn-card-complete').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vehId = btn.getAttribute('data-veh-id');
        this.showCompleteMaintenanceModal(vehId);
      });
    });

    document.querySelectorAll('.btn-prompt-complete').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.showCompleteMaintenanceModal(id);
      });
    });

    document.querySelectorAll('.btn-prompt-notyet').forEach(btn => {
      btn.addEventListener('click', () => {
        alert('Acknowledged. Motigo will keep tracking this service until recorded.');
      });
    });

    document.querySelectorAll('.btn-prompt-reschedule').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.showScheduleModal(id);
      });
    });

    document.querySelectorAll('.btn-prompt-remindlater').forEach(btn => {
      btn.addEventListener('click', () => {
        alert('Reminder snoozed for 3 days.');
      });
    });

    const saveMileageBtn = document.getElementById('btn-save-dashboard-mileage');
    if (saveMileageBtn) {
      saveMileageBtn.addEventListener('click', () => {
        const input = document.getElementById('dashboard-odometer-input');
        const alertBox = document.getElementById('mileage-delta-alert');
        if (!input || !input.value) return;

        const result = store.updateMileage(store.activeVehicleId, input.value);
        if (result && alertBox) {
          const deltaInfo = calculateMileageDelta(result.previousMileage, result.newMileage, store.user.distanceUnit);
          alertBox.style.display = 'block';
          alertBox.className = 'mileage-calc-feedback';
          
          if (result.isLower) {
            alertBox.innerHTML = `⚠️ <strong>Validation Notice:</strong> New odometer reading (${result.newMileage.toLocaleString()} km) is lower than previous (${result.previousMileage.toLocaleString()} km). Reading updated.`;
          } else {
            alertBox.innerHTML = `✓ Odometer updated to ${result.newMileage.toLocaleString()} ${store.user.distanceUnit}. <strong>${deltaInfo.message}</strong>`;
          }
        }
      });
    }

    const openCompModalBtn = document.getElementById('btn-open-complete-modal');
    if (openCompModalBtn) {
      openCompModalBtn.addEventListener('click', () => this.showCompleteMaintenanceModal(store.activeVehicleId));
    }

    const editScheduleBtn = document.getElementById('btn-edit-schedule-modal');
    if (editScheduleBtn) {
      editScheduleBtn.addEventListener('click', () => this.showScheduleModal(store.activeVehicleId));
    }

    document.querySelectorAll('.btn-view-receipt').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const recId = link.getAttribute('data-rec-id');
        this.showDocumentPreviewModal(recId);
      });
    });

    document.querySelectorAll('.btn-edit-vehicle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        this.showEditVehicleModal(id);
      });
    });

    document.querySelectorAll('.btn-delete-vehicle').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.getAttribute('data-id');
        if (confirm('Are you sure you want to remove this vehicle from Motigo?')) {
          store.deleteVehicle(id);
        }
      });
    });

    const aiForm = document.getElementById('ai-chat-form');
    if (aiForm) {
      aiForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = document.getElementById('ai-chat-input');
        if (!input || !input.value.trim() || this.isAiTyping) return;

        const query = input.value.trim();
        input.value = '';
        this.processAiQuery(query);
      });
    }

    document.querySelectorAll('.symptom-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isAiTyping) return;
        const query = btn.getAttribute('data-query');
        if (query) this.processAiQuery(query);
      });
    });

    document.querySelectorAll('.ai-suggestion-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.isAiTyping) return;
        const query = btn.getAttribute('data-query');
        if (query) this.processAiQuery(query);
      });
    });

    document.querySelectorAll('.ai-action-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        const vehId = btn.getAttribute('data-veh-id');

        if (action === 'complete_service') {
          this.showCompleteMaintenanceModal(vehId);
        } else if (action === 'open_schedule') {
          this.showScheduleModal(vehId);
        } else if (action === 'view_timeline') {
          store.setView('maintenance');
        } else if (action === 'open_dashboard') {
          store.setView('dashboard');
        } else if (action === 'view_vehicles') {
          store.setView('vehicles');
        } else if (action === 'ask_next_service') {
          this.processAiQuery('When is my next maintenance date?');
        } else if (action === 'ask_overdue') {
          this.processAiQuery('Which car is overdue for maintenance?');
        }
      });
    });

    document.querySelectorAll('.ai-speak-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!('speechSynthesis' in window)) {
          alert('Speech synthesis is not supported in this browser.');
          return;
        }

        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
          btn.classList.remove('speaking');
          btn.innerHTML = '<span>🔊 Read Aloud</span>';
          return;
        }

        const rawText = decodeURIComponent(btn.getAttribute('data-text') || '');
        const cleanSpeech = rawText.replace(/[*#•_]/g, ' ').replace(/\n+/g, '. ');

        const utterance = new SpeechSynthesisUtterance(cleanSpeech);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        btn.classList.add('speaking');
        btn.innerHTML = '<span>⏹️ Stop Speaking</span>';

        utterance.onend = () => {
          btn.classList.remove('speaking');
          btn.innerHTML = '<span>🔊 Read Aloud</span>';
        };

        utterance.onerror = () => {
          btn.classList.remove('speaking');
          btn.innerHTML = '<span>🔊 Read Aloud</span>';
        };

        window.speechSynthesis.speak(utterance);
      });
    });

    const clearChatBtn = document.getElementById('btn-clear-chat');
    if (clearChatBtn) clearChatBtn.addEventListener('click', () => store.clearAiChat());

    const simWelcomeEmailBtn = document.getElementById('btn-simulate-welcome-email');
    if (simWelcomeEmailBtn) simWelcomeEmailBtn.addEventListener('click', () => this.showWelcomeEmailModal());

    const simEmailBtn = document.getElementById('btn-simulate-email');
    if (simEmailBtn) simEmailBtn.addEventListener('click', () => this.showEmailPreviewModal());

    const markAllReadBtn = document.getElementById('btn-mark-all-read');
    if (markAllReadBtn) markAllReadBtn.addEventListener('click', () => store.markAllNotificationsRead());

    document.querySelectorAll('.btn-notif-action').forEach(btn => {
      btn.addEventListener('click', () => {
        const vehId = btn.getAttribute('data-veh-id');
        this.showCompleteMaintenanceModal(vehId);
      });
    });

    const currSelect = document.getElementById('settings-currency-select');
    if (currSelect) {
      currSelect.addEventListener('change', (e) => {
        const [code, symbol] = e.target.value.split(',');
        store.updateUserPreferences({ currency: code, currencySymbol: symbol });
      });
    }

    const unitSelect = document.getElementById('settings-unit-select');
    if (unitSelect) {
      unitSelect.addEventListener('change', (e) => {
        store.updateUserPreferences({ distanceUnit: e.target.value });
      });
    }

    const resetDemoBtn = document.getElementById('btn-reset-demo');
    if (resetDemoBtn) {
      resetDemoBtn.addEventListener('click', () => {
        if (confirm('Reset fleet data back to original demo specifications?')) {
          store.resetToDefaults();
        }
      });
    }

    const restartOnboardingBtn = document.getElementById('btn-settings-restart-onboarding');
    if (restartOnboardingBtn) {
      restartOnboardingBtn.addEventListener('click', () => store.startOnboarding());
    }

    const logoutBtn = document.getElementById('btn-settings-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => store.logoutUser());
  }

  // =========================================================================
  // REAL-TIME INTERACTIVE MOTIGO AI QUERY PROCESSOR
  // =========================================================================
  processAiQuery(query) {
    if (this.isAiTyping) return;

    const activeVeh = store.getActiveVehicle();
    const history = activeVeh ? store.records.filter(r => r.vehicleId === activeVeh.id) : [];

    store.addChatMessage('user', query);

    this.isAiTyping = true;
    const typingNode = document.getElementById('ai-typing-indicator-node');
    const scrollEl = document.getElementById('chat-messages-scroll');
    
    if (typingNode) {
      typingNode.style.display = 'flex';
      if (scrollEl) scrollEl.scrollTop = scrollEl.scrollHeight;
    }

    const responseObj = aiAssistant.generateResponse(query, activeVeh, history, store.vehicles);

    setTimeout(() => {
      if (typingNode) typingNode.style.display = 'none';
      this.isAiTyping = false;

      let msgText = '';
      let diagnostic = null;

      if (responseObj.type === 'diagnostic') {
        msgText = responseObj.intro || `Here is the diagnostic assessment for your ${activeVeh ? activeVeh.make + ' ' + activeVeh.model : 'vehicle'}:`;
        diagnostic = responseObj.diagnostic;
      } else {
        msgText = responseObj.text;
      }

      const newMsg = {
        id: 'msg-' + Date.now(),
        sender: 'ai',
        text: msgText,
        diagnostic: diagnostic,
        actions: responseObj.actions || [],
        suggestions: responseObj.suggestions || [],
        timestamp: new Date().toISOString()
      };

      store.aiChatHistory.push(newMsg);
      store.saveState();

      setTimeout(() => {
        const scroller = document.getElementById('chat-messages-scroll');
        if (scroller) scroller.scrollTop = scroller.scrollHeight;
      }, 50);
    }, 450);
  }

  // =========================================================================
  // MODALS: COMPLETE MAINTENANCE, SCHEDULE, DOCUMENT PREVIEW, EDIT SPECS
  // =========================================================================
  showCompleteMaintenanceModal(vehicleId) {
    const veh = store.vehicles.find(v => v.id === vehicleId) || store.getActiveVehicle();
    if (!veh) return;

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    const today = new Date().toISOString().split('T')[0];
    this.uploadedFilePayload = null;

    modalRoot.innerHTML = `
      <div class="modal-backdrop active" id="modal-complete-maint">
        <div class="modal-box" style="max-width: 620px;">
          <div class="modal-header">
            <h3 class="modal-title">✓ Record Completed Maintenance</h3>
            <button class="icon-btn modal-close-btn">✕</button>
          </div>

          <form id="form-complete-maint">
            <input type="hidden" name="vehicleId" value="${veh.id}" />

            <div class="modal-body">
              <div style="background: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 8px; padding: 12px; margin-bottom: 16px; font-size: 13px;">
                Logging maintenance for <strong>${veh.year} ${veh.make} ${veh.model}</strong> (${veh.registrationNumber}).
                Recording this service will automatically reset overdue alerts and compute your next maintenance cycle.
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Service Type *</label>
                  <select class="form-control" name="maintenanceType" required>
                    ${maintenanceTypeOptions.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Completion Date *</label>
                  <input type="date" class="form-control" name="date" value="${today}" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">New Odometer Mileage (${store.user.distanceUnit}) *</label>
                  <input type="number" class="form-control" name="mileage" value="${veh.currentMileage}" required />
                  <div class="form-hint">Previous recorded: ${veh.currentMileage.toLocaleString()} ${store.user.distanceUnit}</div>
                </div>
                <div class="form-group">
                  <label class="form-label">Service Provider / Workshop (Optional)</label>
                  <input type="text" class="form-control" name="serviceProvider" placeholder="e.g. Master AutoCare Ltd" />
                </div>
              </div>

              <h5 style="font-size: 13px; font-weight: 700; color: var(--text-muted); margin: 16px 0 10px;">COST TRACKING (Optional)</h5>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Total Cost (${store.user.currencySymbol})</label>
                  <input type="number" class="form-control" name="totalCost" placeholder="e.g. 75000" />
                </div>
                <div class="form-group">
                  <label class="form-label">Parts Cost (${store.user.currencySymbol})</label>
                  <input type="number" class="form-control" name="partsCost" placeholder="e.g. 50000" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Work Description / Mechanic Notes (Optional)</label>
                <textarea class="form-control" name="description" rows="2" placeholder="Synthetic oil replaced, filter renewed, brake fluid topped up..."></textarea>
              </div>

              <div class="form-group" style="margin-bottom: 0;">
                <label class="form-label">Attach Receipt / Invoice / Service Document (Optional)</label>
                
                <div class="file-upload-container">
                  <input 
                    type="file" 
                    id="receipt-file-input" 
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" 
                    style="display: none;" 
                  />

                  <div class="file-upload-dropzone" id="receipt-dropzone">
                    <div class="dropzone-icon">📎</div>
                    <div class="dropzone-title">Click to upload receipt, or drag and drop</div>
                    <div class="dropzone-subtitle">Supported formats: PDF, PNG, JPG, JPEG (Max 10MB)</div>
                    <div class="dropzone-btn">📁 Browse Files</div>
                  </div>

                  <div class="file-preview-card" id="receipt-preview-card" style="display: none;">
                    <div class="file-preview-left">
                      <div class="file-preview-icon" id="preview-icon">📄</div>
                      <img id="preview-image" class="file-preview-thumbnail" style="display: none;" />
                      <div class="file-preview-meta">
                        <div class="file-preview-name" id="preview-filename">document.pdf</div>
                        <div class="file-preview-sub">
                          <span>✓ Ready for upload</span>
                          <span id="preview-filesize" style="color: var(--text-muted); font-weight: normal;">• 0 KB</span>
                        </div>
                      </div>
                    </div>
                    <button type="button" class="file-preview-remove-btn" id="btn-remove-file" title="Remove file">✕</button>
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-success">✓ Save & Schedule Next Service</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const dropzone = document.getElementById('receipt-dropzone');
    const fileInput = document.getElementById('receipt-file-input');
    const previewCard = document.getElementById('receipt-preview-card');
    const previewName = document.getElementById('preview-filename');
    const previewSize = document.getElementById('preview-filesize');
    const previewImg = document.getElementById('preview-image');
    const previewIcon = document.getElementById('preview-icon');
    const removeBtn = document.getElementById('btn-remove-file');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });

      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFileSelected(e.dataTransfer.files[0], dropzone, previewCard, previewName, previewSize, previewImg, previewIcon);
        }
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFileSelected(e.target.files[0], dropzone, previewCard, previewName, previewSize, previewImg, previewIcon);
        }
      });

      if (removeBtn) {
        removeBtn.addEventListener('click', () => {
          this.uploadedFilePayload = null;
          fileInput.value = '';
          previewCard.style.display = 'none';
          dropzone.style.display = 'flex';
        });
      }
    }

    const form = document.getElementById('form-complete-maint');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        if (this.uploadedFilePayload) {
          data.documentName = this.uploadedFilePayload.name;
          data.documentData = this.uploadedFilePayload.dataUrl;
          data.documentSize = this.uploadedFilePayload.size;
          data.documentType = this.uploadedFilePayload.type;
        }

        const result = store.completeMaintenance(data);
        this.closeModal();

        if (result) {
          alert(`Maintenance completed 🎉\n\nYour next service is scheduled for ${formatDisplayDate(result.nextDueDate)} or ${result.nextDueMileage.toLocaleString()} km, whichever comes first.`);
        }
      });
    }

    this.attachModalCloseListeners();
  }

  handleFileSelected(file, dropzone, previewCard, previewName, previewSize, previewImg, previewIcon) {
    const reader = new FileReader();
    const isImage = file.type.startsWith('image/');
    const formattedSize = file.size > 1024 * 1024 
      ? (file.size / (1024 * 1024)).toFixed(2) + ' MB'
      : (file.size / 1024).toFixed(1) + ' KB';

    reader.onload = (e) => {
      const dataUrl = e.target.result;
      this.uploadedFilePayload = {
        name: file.name,
        size: formattedSize,
        type: file.type || 'application/pdf',
        dataUrl: dataUrl
      };

      previewName.textContent = file.name;
      previewSize.textContent = `• ${formattedSize}`;

      if (isImage) {
        previewImg.src = dataUrl;
        previewImg.style.display = 'block';
        previewIcon.style.display = 'none';
      } else {
        previewImg.style.display = 'none';
        previewIcon.style.display = 'flex';
        previewIcon.textContent = file.name.endsWith('.pdf') ? '📄' : '📝';
      }

      dropzone.style.display = 'none';
      previewCard.style.display = 'flex';
    };

    reader.readAsDataURL(file);
  }

  showDocumentPreviewModal(recordId) {
    const record = store.records.find(r => r.id === recordId);
    if (!record || !record.documentName) return;

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    const veh = store.vehicles.find(v => v.id === record.vehicleId);

    modalRoot.innerHTML = `
      <div class="modal-backdrop active" id="modal-doc-preview">
        <div class="modal-box" style="max-width: 600px;">
          <div class="modal-header">
            <h3 class="modal-title">📎 Attached Service Receipt / Invoice</h3>
            <button class="icon-btn modal-close-btn">✕</button>
          </div>

          <div class="modal-body" style="padding: 24px;">
            <div style="background: rgba(0,0,0,0.3); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 20px; text-align: center;">
              ${record.documentData && record.documentData.startsWith('data:image/') ? `
                <img src="${record.documentData}" alt="Receipt Preview" style="max-width: 100%; max-height: 320px; border-radius: 8px; border: 1px solid var(--border-subtle); object-fit: contain; margin-bottom: 16px;" />
              ` : `
                <div style="font-size: 48px; margin-bottom: 12px;">📄</div>
              `}
              
              <h4 style="font-size: 16px; font-weight: 700; color: #93c5fd;">${record.documentName}</h4>
              <p style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                Verified service record for <strong>${veh ? veh.year + ' ' + veh.make + ' ' + veh.model : 'Vehicle'}</strong>
              </p>

              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 18px; text-align: left; font-size: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); padding: 12px; border-radius: 8px;">
                <div><strong>Service:</strong> ${record.maintenanceType}</div>
                <div><strong>Date:</strong> ${formatDisplayDate(record.date)}</div>
                <div><strong>Mileage:</strong> ${Number(record.mileage).toLocaleString()} ${store.user.distanceUnit}</div>
                <div><strong>Total Cost:</strong> ${formatCurrency(record.totalCost, store.user.currencySymbol)}</div>
                <div style="grid-column: span 2;"><strong>Provider:</strong> ${record.serviceProvider || 'Certified AutoCare'}</div>
              </div>

              <div style="margin-top: 20px; display: flex; justify-content: center; gap: 12px;">
                <a href="${record.documentData || '#'}" download="${record.documentName}" class="btn btn-primary btn-sm" ${!record.documentData ? 'onclick="alert(\'Document is a verified digital receipt record.\'); return false;"' : ''}>
                  ⬇️ Download / Save Invoice
                </a>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-close-btn">Close</button>
          </div>
        </div>
      </div>
    `;

    this.attachModalCloseListeners();
  }

  showAddVehicleModal() {
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-backdrop active" id="modal-add-vehicle">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">🚗 Add Vehicle</h3>
            <button class="icon-btn modal-close-btn">✕</button>
          </div>

          <form id="form-add-vehicle">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Make *</label>
                  <select class="form-control" name="make" required>
                    ${vehicleMakesList.map(m => `<option value="${m}">${m}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Model *</label>
                  <input type="text" class="form-control" name="model" placeholder="e.g. Camry, Civic, X5" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Year *</label>
                  <input type="number" class="form-control" name="year" value="2022" min="1980" max="2027" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Engine / Fuel Type *</label>
                  <select class="form-control" name="engineType" required>
                    <option value="Petrol">Petrol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Hybrid">Hybrid</option>
                    <option value="Plug-in Hybrid">Plug-in Hybrid</option>
                    <option value="Electric">Electric</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Current Odometer Mileage (${store.user.distanceUnit}) *</label>
                <input type="number" class="form-control" name="currentMileage" placeholder="e.g. 45000" required />
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Registration / Plate Number</label>
                  <input type="text" class="form-control" name="registrationNumber" placeholder="e.g. KJA-104-AB" />
                </div>
                <div class="form-group">
                  <label class="form-label">Vehicle Nickname</label>
                  <input type="text" class="form-control" name="nickname" placeholder="e.g. Commuter Car" />
                </div>
              </div>

              <h5 style="font-size: 13px; font-weight: 700; color: var(--text-muted); margin: 18px 0 12px;">SERVICE SCHEDULE INTERVAL</h5>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Time Interval</label>
                  <select class="form-control" name="frequencyMonths">
                    <option value="3">Every 3 Months</option>
                    <option value="6" selected>Every 6 Months (Standard)</option>
                    <option value="12">Every 12 Months</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">Mileage Interval</label>
                  <select class="form-control" name="mileageInterval">
                    <option value="5000">Every 5,000 km</option>
                    <option value="8000">Every 8,000 km</option>
                    <option value="10000" selected>Every 10,000 km (Standard)</option>
                    <option value="15000">Every 15,000 km</option>
                  </select>
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Vehicle</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('form-add-vehicle');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        store.addVehicle(data);
        this.closeModal();
      });
    }

    this.attachModalCloseListeners();
  }

  showScheduleModal(vehicleId) {
    const veh = store.vehicles.find(v => v.id === vehicleId) || store.getActiveVehicle();
    if (!veh) return;

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-backdrop active" id="modal-schedule">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">⚙️ Maintenance Schedule Settings</h3>
            <button class="icon-btn modal-close-btn">✕</button>
          </div>

          <form id="form-edit-schedule">
            <div class="modal-body">
              <p style="font-size: 13px; color: var(--text-secondary); margin-bottom: 16px;">
                Configure service frequency for <strong>${veh.year} ${veh.make} ${veh.model}</strong>. Motigo triggers maintenance when time or mileage threshold occurs first.
              </p>

              <div class="form-group">
                <label class="form-label">Time-Based Interval</label>
                <select class="form-control" name="frequencyMonths">
                  <option value="3" ${veh.schedule.frequencyMonths === 3 ? 'selected' : ''}>Every 3 Months</option>
                  <option value="6" ${veh.schedule.frequencyMonths === 6 ? 'selected' : ''}>Every 6 Months</option>
                  <option value="12" ${veh.schedule.frequencyMonths === 12 ? 'selected' : ''}>Every 12 Months</option>
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Mileage-Based Interval (${store.user.distanceUnit})</label>
                <select class="form-control" name="mileageInterval">
                  <option value="5000" ${veh.schedule.mileageInterval === 5000 ? 'selected' : ''}>Every 5,000 km</option>
                  <option value="8000" ${veh.schedule.mileageInterval === 8000 ? 'selected' : ''}>Every 8,000 km</option>
                  <option value="10000" ${veh.schedule.mileageInterval === 10000 ? 'selected' : ''}>Every 10,000 km</option>
                  <option value="15000" ${veh.schedule.mileageInterval === 15000 ? 'selected' : ''}>Every 15,000 km</option>
                </select>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Next Target Due Date</label>
                  <input type="date" class="form-control" name="nextDueDate" value="${veh.schedule.nextDueDate}" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Next Target Odometer</label>
                  <input type="number" class="form-control" name="nextDueMileage" value="${veh.schedule.nextDueMileage}" required />
                </div>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Save Schedule</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('form-edit-schedule');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        store.updateSchedule(veh.id, data);
        this.closeModal();
      });
    }

    this.attachModalCloseListeners();
  }

  showEmailPreviewModal() {
    const activeVeh = store.getActiveVehicle();
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot || !activeVeh) return;

    modalRoot.innerHTML = `
      <div class="modal-backdrop active" id="modal-email-preview">
        <div class="modal-box" style="max-width: 600px; background: #0f172a;">
          <div class="modal-header">
            <h3 class="modal-title">📧 Email Reminder Template</h3>
            <button class="icon-btn modal-close-btn">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px;">
            <div class="email-mockup-wrapper">
              <div class="email-mockup-header">
                <div class="email-brand">🚗 Motigo</div>
                <span class="email-badge">Automated Reminder</span>
              </div>

              <div class="email-mockup-body">
                <h3>Your ${activeVeh.make} ${activeVeh.model} is due for maintenance soon</h3>
                <p>
                  Your ${activeVeh.year} ${activeVeh.make} ${activeVeh.model} is scheduled for maintenance in 7 days.
                </p>

                <div class="email-details-box">
                  <div><strong>Vehicle:</strong> ${activeVeh.year} ${activeVeh.make} ${activeVeh.model} (${activeVeh.registrationNumber})</div>
                  <div style="margin-top: 4px;"><strong>Scheduled Date:</strong> ${formatDisplayDate(activeVeh.schedule.nextDueDate)}</div>
                  <div style="margin-top: 4px;"><strong>Target Mileage:</strong> ${activeVeh.schedule.nextDueMileage.toLocaleString()} km</div>
                  <div style="margin-top: 4px;"><strong>Current Odometer:</strong> ${activeVeh.currentMileage.toLocaleString()} km</div>
                </div>

                <p style="font-size: 13px; color: #475569;">
                  Stay ahead of your vehicle's maintenance. Click below to review your service details or record completion:
                </p>

                <div style="text-align: center; margin-top: 18px;">
                  <button class="btn btn-primary email-cta-btn" id="btn-email-1click-done" data-veh-id="${activeVeh.id}">
                    Review Maintenance
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-close-btn">Close Preview</button>
          </div>
        </div>
      </div>
    `;

    const oneClickBtn = document.getElementById('btn-email-1click-done');
    if (oneClickBtn) {
      oneClickBtn.addEventListener('click', () => {
        const id = oneClickBtn.getAttribute('data-veh-id');
        this.closeModal();
        this.showCompleteMaintenanceModal(id);
      });
    }

    this.attachModalCloseListeners();
  }

  showWelcomeEmailModal() {
    const activeVeh = store.getActiveVehicle();
    const vehName = activeVeh ? `${activeVeh.year} ${activeVeh.make} ${activeVeh.model}` : 'Vehicle';
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-backdrop active" id="modal-welcome-email-preview">
        <div class="modal-box" style="max-width: 600px; background: #0f172a;">
          <div class="modal-header">
            <h3 class="modal-title">📧 Welcome Email Notification</h3>
            <button class="icon-btn modal-close-btn">✕</button>
          </div>

          <div class="modal-body" style="padding: 20px;">
            <div class="email-mockup-wrapper">
              <div class="email-mockup-header">
                <div class="email-brand">🚗 Motigo</div>
                <span class="email-badge" style="background: #ecfdf5; color: #047857;">Welcome Email</span>
              </div>

              <div class="email-mockup-body">
                <div style="font-size: 12px; color: #64748b; margin-bottom: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">
                  <strong>Subject:</strong> Welcome to Motigo! 🚗
                </div>

                <h3 style="font-size: 18px; color: #0f172a; margin-bottom: 12px;">Hi ${store.user.firstName || 'there'},</h3>

                <p style="font-size: 14px; color: #334155; margin-bottom: 16px;">
                  Welcome to Motigo — your car's personal maintenance assistant.
                </p>

                <p style="font-size: 14px; color: #334155; margin-bottom: 12px; font-weight: 600;">
                  You're all set! Motigo will help you:
                </p>

                <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #1e293b; background: #f8fafc; border: 1px solid #e2e8f0; padding: 14px; border-radius: 8px; margin-bottom: 16px;">
                  <div>🔧 Keep track of your car's maintenance history</div>
                  <div>📅 Know when your next service is due</div>
                  <div>🔔 Get timely maintenance reminders</div>
                  <div>🤖 Ask our AI assistant questions about your car</div>
                </div>

                <p style="font-size: 14px; color: #334155; margin-bottom: 20px;">
                  Your <strong>${vehName}</strong> is now set up and ready to track.
                </p>

                <div style="text-align: center; margin: 20px 0;">
                  <button class="btn btn-primary email-cta-btn" id="btn-welcome-email-goto-dashboard" style="background: #2563eb; color: #ffffff !important; font-weight: 700; padding: 12px 28px; border-radius: 8px; font-size: 14px;">
                    Go to My Dashboard →
                  </button>
                </div>

                <p style="font-size: 13px; color: #475569; margin-top: 20px; font-style: italic;">
                  Here's to smarter maintenance and fewer surprises on the road.
                </p>

                <div style="margin-top: 18px; font-size: 13px; color: #0f172a; font-weight: 600;">
                  Welcome to Motigo!<br/>
                  <span style="font-weight: 400; color: #64748b;">Your car's personal maintenance assistant.</span><br/><br/>
                  <strong style="color: #2563eb;">The Motigo Team</strong>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary modal-close-btn">Close Preview</button>
          </div>
        </div>
      </div>
    `;

    const gotoDashBtn = document.getElementById('btn-welcome-email-goto-dashboard');
    if (gotoDashBtn) {
      gotoDashBtn.addEventListener('click', () => {
        this.closeModal();
        store.setView('dashboard');
      });
    }

    this.attachModalCloseListeners();
  }

  showEditVehicleModal(vehicleId) {
    const veh = store.vehicles.find(v => v.id === vehicleId);
    if (!veh) return;

    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) return;

    modalRoot.innerHTML = `
      <div class="modal-backdrop active">
        <div class="modal-box">
          <div class="modal-header">
            <h3 class="modal-title">Edit Vehicle Specifications</h3>
            <button class="icon-btn modal-close-btn">✕</button>
          </div>

          <form id="form-edit-vehicle">
            <div class="modal-body">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Make</label>
                  <input type="text" class="form-control" name="make" value="${veh.make}" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Model</label>
                  <input type="text" class="form-control" name="model" value="${veh.model}" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Year</label>
                  <input type="number" class="form-control" name="year" value="${veh.year}" required />
                </div>
                <div class="form-group">
                  <label class="form-label">Engine / Fuel</label>
                  <input type="text" class="form-control" name="engineType" value="${veh.engineType}" required />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">Plate Number</label>
                  <input type="text" class="form-control" name="registrationNumber" value="${veh.registrationNumber}" />
                </div>
                <div class="form-group">
                  <label class="form-label">Nickname</label>
                  <input type="text" class="form-control" name="nickname" value="${veh.nickname}" />
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Current Odometer (${store.user.distanceUnit})</label>
                <input type="number" class="form-control" name="currentMileage" value="${veh.currentMileage}" required />
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary modal-close-btn">Cancel</button>
              <button type="submit" class="btn btn-primary">Update Vehicle</button>
            </div>
          </form>
        </div>
      </div>
    `;

    const form = document.getElementById('form-edit-vehicle');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        store.updateVehicle(veh.id, data);
        this.closeModal();
      });
    }

    this.attachModalCloseListeners();
  }

  closeModal() {
    store.showWelcomeModal = false;
    const modalRoot = document.getElementById('modal-root');
    if (modalRoot) modalRoot.innerHTML = '';
  }

  attachModalCloseListeners() {
    document.querySelectorAll('.modal-close-btn').forEach(btn => {
      btn.addEventListener('click', () => this.closeModal());
    });
  }

  renderWelcomeEmailModal() {
    const user = store.user || { firstName: 'Vehicle Owner', email: 'user@motigo.app' };
    const subject = encodeURIComponent('Welcome to Motigo — Your Car\'s Personal Maintenance Assistant 🚗');
    const body = encodeURIComponent(`Hi ${user.firstName},\n\nWelcome to Motigo! We’re thrilled to help you keep your vehicle running smoothly, safely, and cost-effectively.\n\nWith Motigo, you can:\n- Never miss a service with automated date and mileage-based reminders\n- Access personalized vehicle specs and AI-powered diagnostic guidance\n- Maintain a complete service history for higher resale value\n\nGet started by adding your first vehicle to your garage!\n\nBest regards,\nThe Motigo Team`);
    const mailtoUrl = `mailto:${user.email || ''}?subject=${subject}&body=${body}`;

    return `
      <div class="modal-backdrop" style="display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.85); position:fixed; top:0; left:0; width:100vw; height:100vh; z-index:99999;">
        <div class="modal-card" style="max-width:540px; width:90%; background:#0f172a; border:1px solid rgba(59,130,246,0.3); border-radius:16px; padding:0; overflow:hidden; box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="background:linear-gradient(135deg, #1e3a8a, #2563eb); padding:24px; text-align:center; color:#fff; position:relative;">
            <button class="modal-close-btn" style="position:absolute; top:16px; right:16px; background:rgba(255,255,255,0.15); border:none; color:#fff; width:32px; height:32px; border-radius:50%; font-size:18px; cursor:pointer;">&times;</button>
            <div style="font-size:42px; margin-bottom:8px;">📧</div>
            <h2 style="font-size:22px; font-weight:800; margin:0;">Automated Welcome Email</h2>
            <p style="font-size:13px; color:#93c5fd; margin-top:4px;">Sent to: <strong>${user.email}</strong></p>
          </div>

          <div style="padding:24px; color:#e2e8f0; font-size:14px; line-height:1.6; background:#0b0f19;">
            <div style="background:rgba(255,255,255,0.03); border:1px solid var(--border-subtle); border-radius:10px; padding:18px; margin-bottom:20px;">
              <div style="font-size:12px; color:#60a5fa; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; margin-bottom:8px;">Subject: Welcome to Motigo 🚗</div>
              <p style="margin-top:0;">Hi <strong>${user.firstName}</strong>,</p>
              <p>Welcome to <strong>Motigo</strong>! We’re thrilled to help you keep your vehicle running smoothly, safely, and cost-effectively.</p>
              <p style="font-weight:700; color:#fff; margin-bottom:6px;">With Motigo, you can:</p>
              <ul style="padding-left:20px; margin-top:0; color:#cbd5e1;">
                <li>⏰ Never miss a service with automated date & mileage reminders</li>
                <li>🤖 Access personalized specs & AI-powered diagnostic guidance</li>
                <li>📜 Maintain a complete service history for higher resale value</li>
              </ul>
              <p style="margin-bottom:0;">Get started by adding your first vehicle to your garage!</p>
            </div>

            <div style="display:flex; gap:12px; justify-content:flex-end; flex-wrap:wrap;">
              <a href="${mailtoUrl}" class="btn btn-secondary" style="font-size:13px; text-decoration:none; display:inline-flex; align-items:center; gap:6px;">
                <span>📩 Send to My Email Inbox</span>
              </a>
              <button class="btn btn-primary modal-close-btn" style="font-size:13px;">
                <span>Go to My Dashboard →</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }
}
