/**
 * Sami Prompts — Social Media Portfolio & Categorized Analytics Engine
 * Features:
 * - Dedicated Platform Category Hubs (TikTok, YouTube, Instagram, Facebook, X, etc.)
 * - Categorized sections for each social media network
 * - Per-platform aggregate metrics (Followers, Views, Avg. Engagement)
 * - 1-Click + Add [Platform] Account pre-selection
 * - Real-time growth charts (Chart.js), goals/milestones tracker, and live CRUD
 */

(function () {
  'use strict';

  // Platform styling, titles, descriptions, SVG icons, and URL templates
  const PLATFORM_CONFIG = {
    tiktok: {
      name: 'TikTok',
      title: 'TikTok Accounts Hub',
      desc: 'Viral short-form AI video reels, trending audio & sound effects',
      color: '#00F2FE',
      bgColor: 'rgba(0, 242, 254, 0.12)',
      category: 'video',
      urlPattern: 'https://tiktok.com/@',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64c.29 0 .58.04.86.12V9.4a6.33 6.33 0 0 0-.86-.06A6.34 6.34 0 0 0 3.1 15.68a6.34 6.34 0 0 0 10.82 4.48 6.3 6.3 0 0 0 1.9-4.49V8.62a8.27 8.27 0 0 0 4.88 1.58V6.75a4.85 4.85 0 0 1-1.11-.06z"/></svg>`
    },
    youtube: {
      name: 'YouTube',
      title: 'YouTube Channels Hub',
      desc: 'Long-form cinematic episodes, 4K storyboards & YouTube Shorts',
      color: '#FF0000',
      bgColor: 'rgba(255, 0, 0, 0.12)',
      category: 'video',
      urlPattern: 'https://youtube.com/@',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>`
    },
    instagram: {
      name: 'Instagram',
      title: 'Instagram Profiles Hub',
      desc: 'Visual cinematic art reels, carousel breakdowns & behind-the-scenes',
      color: '#E1306C',
      bgColor: 'rgba(225, 48, 108, 0.12)',
      category: 'social',
      urlPattern: 'https://instagram.com/',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`
    },
    facebook: {
      name: 'Facebook',
      title: 'Facebook Pages Hub',
      desc: 'Community video broadcasts, creator pages & viral shares',
      color: '#1877F2',
      bgColor: 'rgba(24, 119, 242, 0.12)',
      category: 'social',
      urlPattern: 'https://facebook.com/',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>`
    },
    twitter: {
      name: 'X (Twitter)',
      title: 'X (Twitter) Profiles Hub',
      desc: 'Viral prompt threads, industry news & AI breakdowns',
      color: '#38BDF8',
      bgColor: 'rgba(56, 189, 248, 0.12)',
      category: 'social',
      urlPattern: 'https://x.com/',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>`
    },
    linkedin: {
      name: 'LinkedIn',
      title: 'LinkedIn Professional Hub',
      desc: 'B2B filmmaker connections & AI video workflow case studies',
      color: '#0A66C2',
      bgColor: 'rgba(10, 102, 194, 0.12)',
      category: 'social',
      urlPattern: 'https://linkedin.com/in/',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>`
    },
    threads: {
      name: 'Threads',
      title: 'Threads Profiles Hub',
      desc: 'Micro-prompt ideas & interactive community conversations',
      color: '#10B981',
      bgColor: 'rgba(16, 185, 129, 0.12)',
      category: 'social',
      urlPattern: 'https://threads.net/@',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12.186 24h-.007C5.452 24 0 18.595 0 11.918 0 5.24 5.452-.164 12.179-.164c6.726 0 12.178 5.404 12.178 12.082 0 3.73-1.706 7.218-4.68 9.569l-1.579-2.02c2.404-1.898 3.784-4.717 3.784-7.549 0-5.353-4.37-9.708-9.703-9.708-5.332 0-9.702 4.355-9.702 9.708 0 5.353 4.37 9.709 9.702 9.709.006 0 .012 0 .018-.001 2.378-.02 4.606-.948 6.273-2.613l1.75 1.764c-2.115 2.112-4.945 3.287-7.955 3.313zm4.568-15.688c-.687-.417-1.583-.629-2.663-.629-2.316 0-3.957 1.157-4.444 3.161 1.01-.194 2.05-.294 3.093-.294.757 0 1.558.053 2.383.158-.29-1.282-.87-1.986-1.547-2.396zm-4.014 4.542c-2.585 0-4.687 2.088-4.687 4.654 0 2.566 2.102 4.654 4.687 4.654 2.08 0 3.864-1.353 4.448-3.237-.777-.107-1.559-.162-2.327-.162-1.393 0-2.825.176-4.256.523.364-1.074 1.378-1.838 2.57-1.838.647 0 1.258.219 1.769.635.421-.86.643-1.808.66-2.775-1.127-.29-2.285-.454-3.464-.454z"/></svg>`
    },
    pinterest: {
      name: 'Pinterest',
      title: 'Pinterest Boards Hub',
      desc: 'Cinematic moodboards, lighting references & palettes',
      color: '#E60023',
      bgColor: 'rgba(230, 0, 35, 0.12)',
      category: 'social',
      urlPattern: 'https://pinterest.com/',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0a12 12 0 0 0-4.37 23.17c-.05-.98-.1-2.48.02-3.55l1.45-6.14s-.37-.74-.37-1.84c0-1.73 1-3.02 2.25-3.02 1.06 0 1.57.8 1.57 1.75 0 1.07-.68 2.66-1.03 4.14-.3 1.24.62 2.26 1.84 2.26 2.21 0 3.91-2.33 3.91-5.69 0-2.98-2.14-5.06-5.2-5.06-3.54 0-5.62 2.66-5.62 5.4 0 1.07.41 2.22.93 2.84.1.12.12.23.09.35l-.34 1.4c-.06.23-.19.28-.43.17-1.61-.75-2.61-3.1-2.61-4.99 0-4.06 2.95-7.8 8.52-7.8 4.47 0 7.95 3.19 7.95 7.45 0 4.45-2.8 8.03-6.69 8.03-1.31 0-2.54-.68-2.96-1.48l-.81 3.08c-.29 1.12-1.08 2.53-1.61 3.39A12 12 0 1 0 12 0z"/></svg>`
    },
    twitch: {
      name: 'Twitch',
      title: 'Twitch Live Hub',
      desc: 'Live prompt engineering & AI filmmaking streams',
      color: '#9146FF',
      bgColor: 'rgba(145, 70, 255, 0.12)',
      category: 'video',
      urlPattern: 'https://twitch.tv/',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M2.149 0l-1.612 4.114v16.571h5.333v3.314l3.429-3.314h4.571l6.857-6.857v-13.829h-18.577zm16.457 12.343l-3.429 3.429h-4.571l-2.286 2.286v-2.286h-3.657v-13.714h13.943v10.286zm-8.229-6.857h-2.286v5.714h2.286v-5.714zm5.714 0h-2.286v5.714h2.286v-5.714z"/></svg>`
    },
    custom: {
      name: 'Custom Platform',
      title: 'Other / Custom Channels Hub',
      desc: 'Additional social profiles, creator blogs & websites',
      color: '#6366F1',
      bgColor: 'rgba(99, 102, 241, 0.12)',
      category: 'other',
      urlPattern: 'https://',
      icon: `<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>`
    }
  };

  const PLATFORMS_ORDER = [
    { key: 'tiktok', name: 'TikTok', iconKey: 'tiktok', title: 'TikTok Accounts Hub', desc: 'Viral short-form AI video reels, trending audio & sound effects' },
    { key: 'youtube', name: 'YouTube', iconKey: 'youtube', title: 'YouTube Channels Hub', desc: 'Long-form cinematic episodes, 4K storyboards & YouTube Shorts' },
    { key: 'instagram', name: 'Instagram', iconKey: 'instagram', title: 'Instagram Profiles Hub', desc: 'Visual cinematic art reels, carousel breakdowns & behind-the-scenes' },
    { key: 'facebook', name: 'Facebook', iconKey: 'facebook', title: 'Facebook Pages Hub', desc: 'Community video broadcasts, creator pages & viral shares' },
    { key: 'twitter', name: 'X (Twitter)', iconKey: 'twitter', title: 'X (Twitter) Profiles Hub', desc: 'Viral prompt threads, industry news & AI breakdowns' },
    { key: 'linkedin', name: 'LinkedIn', iconKey: 'linkedin', title: 'LinkedIn Professional Hub', desc: 'B2B filmmaker connections & AI video workflow case studies' },
    { key: 'threads', name: 'Threads', iconKey: 'threads', title: 'Threads Profiles Hub', desc: 'Micro-prompt ideas & interactive community conversations' },
    { key: 'pinterest', name: 'Pinterest', iconKey: 'pinterest', title: 'Pinterest Boards Hub', desc: 'Cinematic moodboards, lighting references & palettes' },
    { key: 'twitch', name: 'Twitch', iconKey: 'twitch', title: 'Twitch Live Hub', desc: 'Live prompt engineering & AI filmmaking streams' },
    { key: 'custom', name: 'Custom Platform', iconKey: 'custom', title: 'Other / Custom Channels Hub', desc: 'Additional social profiles, creator blogs & websites' }
  ];

  function normalizePlatform(p) {
    if (!p) return 'custom';
    const s = p.toLowerCase().trim();
    if (s === 'x') return 'twitter';
    if (PLATFORM_CONFIG[s]) return s;
    return 'custom';
  }

  // State
  let accountsData = [];
  let metricsData = {};
  let analyticsData = null;
  let activePlatform = 'all';
  let searchQuery = '';
  let sortBy = 'followers_desc';

  // Chart instances
  let growthChart = null;
  let shareChart = null;
  let viewsChart = null;

  // Formatting helpers
  function formatNumber(num) {
    if (num === null || num === undefined) return '0';
    const n = Number(num);
    if (isNaN(n)) return '0';
    if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return n.toLocaleString();
  }

  function getChartThemeColors() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      textColor: isDark ? '#94A3B8' : '#64748B',
      gridColor: isDark ? 'rgba(255, 255, 255, 0.07)' : 'rgba(0, 0, 0, 0.07)',
      tooltipBg: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.96)',
      tooltipText: isDark ? '#F8FAFC' : '#0F172A',
      tooltipBorder: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(79, 70, 229, 0.2)'
    };
  }

  // Toast feedback
  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = 'quick-toast';
    toast.style.position = 'fixed';
    toast.style.bottom = '24px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%) translateY(20px)';
    toast.style.background = type === 'success' ? 'var(--card-solid)' : '#EF4444';
    toast.style.color = 'var(--text)';
    toast.style.border = '1px solid ' + (type === 'success' ? 'var(--primary)' : '#EF4444');
    toast.style.boxShadow = 'var(--shadow-md)';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = 'var(--radius-pill)';
    toast.style.fontWeight = '700';
    toast.style.fontSize = '14px';
    toast.style.zIndex = '9999';
    toast.style.opacity = '0';
    toast.style.transition = 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)';
    toast.innerHTML = (type === 'success' ? '✓ ' : '⚠️ ') + message;

    document.body.appendChild(toast);
    requestAnimationFrame(() => {
      toast.style.opacity = '1';
      toast.style.transform = 'translateX(-50%) translateY(0)';
    });

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(10px)';
      setTimeout(() => toast.remove(), 250);
    }, 2800);
  }

  // Fetch API
  async function loadPortfolioData() {
    try {
      const [resPortfolio, resAnalytics] = await Promise.all([
        fetch('/api/portfolio'),
        fetch('/api/portfolio/analytics')
      ]);

      const pData = await resPortfolio.json();
      const aData = await resAnalytics.json();

      if (pData.success) {
        accountsData = pData.accounts || [];
        metricsData = pData.metrics || {};
        renderOmnichannelKPIs();
        renderMilestones();
        renderPlatformFilterTabs();
        renderCategorizedPlatforms();
      }

      if (aData.success) {
        analyticsData = aData;
        initOrUpdateCharts();
      }
    } catch (err) {
      console.error('Error loading portfolio:', err);
      showToast('Failed to load portfolio data.', 'error');
    }
  }

  // Render Top KPI Cards
  function renderOmnichannelKPIs() {
    const fEl = document.getElementById('metric-total-followers');
    const vEl = document.getElementById('metric-total-views');
    const eEl = document.getElementById('metric-avg-engagement');
    const aEl = document.getElementById('metric-total-accounts');
    const actEl = document.getElementById('metric-active-accounts');

    if (fEl) fEl.textContent = formatNumber(metricsData.total_followers || 0);
    if (vEl) vEl.textContent = formatNumber(metricsData.total_views || 0);
    if (eEl) eEl.textContent = (metricsData.avg_engagement || 0).toFixed(2) + '%';
    if (aEl) aEl.textContent = metricsData.total_accounts || 0;
    if (actEl) actEl.textContent = `${metricsData.active_accounts || 0} Platforms Active`;
  }

  // Render Charts using Chart.js
  function initOrUpdateCharts() {
    if (!analyticsData) return;
    const theme = getChartThemeColors();

    // 1. Growth Timeline Chart
    const growthCanvas = document.getElementById('growthLineChart');
    if (growthCanvas) {
      const months = analyticsData.months || ['Oct 2025', 'Nov 2025', 'Dec 2025', 'Jan 2026', 'Feb 2026', 'Mar 2026'];
      const rawDatasets = analyticsData.growthTimeline?.datasets || [];

      const datasets = rawDatasets.map(ds => ({
        label: ds.label,
        data: ds.data,
        borderColor: ds.color,
        backgroundColor: ds.color + '1A',
        borderWidth: 2.5,
        pointBackgroundColor: ds.color,
        pointBorderColor: '#fff',
        pointRadius: 4,
        pointHoverRadius: 6,
        tension: 0.35,
        fill: true
      }));

      // Aggregate Omnichannel Total line
      if (analyticsData.growthTimeline?.aggregateGrowth) {
        datasets.unshift({
          label: 'Omnichannel Total Reach',
          data: analyticsData.growthTimeline.aggregateGrowth,
          borderColor: '#F59E0B',
          backgroundColor: 'rgba(245, 158, 11, 0.08)',
          borderWidth: 3,
          borderDash: [5, 5],
          pointBackgroundColor: '#F59E0B',
          pointBorderColor: '#fff',
          pointRadius: 4,
          pointHoverRadius: 7,
          tension: 0.3,
          fill: false
        });
      }

      if (growthChart) {
        growthChart.destroy();
      }

      growthChart = new Chart(growthCanvas.getContext('2d'), {
        type: 'line',
        data: { labels: months, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: theme.textColor,
                font: { family: "'Plus Jakarta Sans', sans-serif", weight: 600, size: 12 },
                usePointStyle: true,
                pointStyle: 'circle'
              }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              padding: 12,
              callbacks: {
                label: function (ctx) {
                  return ` ${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)} followers`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { color: theme.gridColor },
              ticks: { color: theme.textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } }
            },
            y: {
              grid: { color: theme.gridColor },
              ticks: {
                color: theme.textColor,
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                callback: v => formatNumber(v)
              }
            }
          }
        }
      });
    }

    // 2. Platform Audience Share Doughnut Chart
    const shareCanvas = document.getElementById('platformShareChart');
    if (shareCanvas) {
      const shareData = analyticsData.platformShare || [];
      const labels = shareData.map(s => s.name || s.platform);
      const data = shareData.map(s => s.followers);
      const colors = shareData.map(s => s.color);

      if (shareChart) {
        shareChart.destroy();
      }

      shareChart = new Chart(shareCanvas.getContext('2d'), {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data,
            backgroundColor: colors,
            borderWidth: 2,
            borderColor: document.documentElement.getAttribute('data-theme') === 'light' ? '#FFFFFF' : '#0F172A',
            hoverOffset: 8
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '68%',
          plugins: {
            legend: {
              position: 'bottom',
              labels: {
                color: theme.textColor,
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11, weight: 600 },
                usePointStyle: true,
                padding: 14
              }
            },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              callbacks: {
                label: function (ctx) {
                  const val = ctx.parsed;
                  const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                  const pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                  return ` ${ctx.label}: ${formatNumber(val)} (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // 3. Video Views & Reach Bar Chart
    const viewsCanvas = document.getElementById('viewsBarChart');
    if (viewsCanvas) {
      const viewsData = analyticsData.viewsBreakdown || [];
      const labels = viewsData.map(v => v.name || v.platform);
      const views = viewsData.map(v => v.views);
      const colors = viewsData.map(v => v.color);

      if (viewsChart) {
        viewsChart.destroy();
      }

      viewsChart = new Chart(viewsCanvas.getContext('2d'), {
        type: 'bar',
        data: {
          labels,
          datasets: [{
            label: 'Video Views',
            data: views,
            backgroundColor: colors.map(c => c + 'CC'),
            hoverBackgroundColor: colors,
            borderRadius: 8,
            borderSkipped: false
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: theme.tooltipBg,
              titleColor: theme.tooltipText,
              bodyColor: theme.tooltipText,
              borderColor: theme.tooltipBorder,
              borderWidth: 1,
              callbacks: {
                label: ctx => ` Views: ${formatNumber(ctx.parsed.y)}`
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: theme.textColor, font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 } }
            },
            y: {
              grid: { color: theme.gridColor },
              ticks: {
                color: theme.textColor,
                font: { family: "'Plus Jakarta Sans', sans-serif", size: 11 },
                callback: v => formatNumber(v)
              }
            }
          }
        }
      });
    }
  }

  // Render Milestones & Goals
  function renderMilestones() {
    const container = document.getElementById('milestones-container');
    if (!container) return;

    if (accountsData.length === 0) {
      container.innerHTML = `<p style="color:var(--muted);font-size:13.5px;">No accounts added yet. Click "+ Add Social Account" to start tracking!</p>`;
      return;
    }

    container.innerHTML = accountsData.map(acc => {
      const cfg = PLATFORM_CONFIG[acc.platform.toLowerCase()] || PLATFORM_CONFIG.custom;
      const followers = Number(acc.followers_count || 0);
      const target = Number(acc.goal_target || 100000);
      const progress = Math.min(100, Math.round((followers / target) * 100));
      const remaining = Math.max(0, target - followers);

      return `
        <div class="milestone-item">
          <div class="milestone-head">
            <div class="milestone-platform">
              <span style="color:${cfg.color};display:inline-flex;">${cfg.icon}</span>
              <span>${acc.account_name}</span>
            </div>
            <span class="milestone-target-badge" style="background:${cfg.bgColor};color:${cfg.color};">
              Target: ${formatNumber(target)}
            </span>
          </div>
          <div class="milestone-progress-bar-bg">
            <div class="milestone-progress-fill" style="width:${progress}%;background:${cfg.color};"></div>
          </div>
          <div class="milestone-stats">
            <span>${formatNumber(followers)} / ${formatNumber(target)} (${progress}%)</span>
            <span>${remaining === 0 ? '🎉 Milestone reached!' : `${formatNumber(remaining)} left to goal`}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // Dynamic Platform Filter Tabs
  function renderPlatformFilterTabs() {
    const tabsContainer = document.getElementById('platform-filter-tabs');
    if (!tabsContainer) return;

    const counts = {};
    accountsData.forEach(acc => {
      const p = normalizePlatform(acc.platform);
      counts[p] = (counts[p] || 0) + 1;
    });

    const popularPlatforms = ['tiktok', 'youtube', 'instagram', 'facebook', 'twitter', 'linkedin', 'threads'];
    Object.keys(counts).forEach(k => {
      if (!popularPlatforms.includes(k) && k !== 'all') {
        popularPlatforms.push(k);
      }
    });

    let html = `
      <button type="button" class="filter-chip ${activePlatform === 'all' ? 'active' : ''}" data-platform="all">
        ✨ All Platforms <span class="filter-chip-count">${accountsData.length}</span>
      </button>
    `;

    popularPlatforms.forEach(k => {
      const cfg = PLATFORM_CONFIG[k] || PLATFORM_CONFIG.custom;
      const count = counts[k] || 0;
      html += `
        <button type="button" class="filter-chip ${activePlatform === k ? 'active' : ''}" data-platform="${k}">
          ${cfg.name} <span class="filter-chip-count">${count}</span>
        </button>
      `;
    });

    tabsContainer.innerHTML = html;

    tabsContainer.querySelectorAll('.filter-chip').forEach(btn => {
      btn.addEventListener('click', () => {
        tabsContainer.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activePlatform = btn.getAttribute('data-platform');
        renderCategorizedPlatforms();
      });
    });
  }

  // Render a single social media account card
  function renderSingleAccountCard(acc) {
    const cfg = PLATFORM_CONFIG[normalizePlatform(acc.platform)] || PLATFORM_CONFIG.custom;
    const statusClass = acc.status === 'active' ? 'active' : 'paused';
    const statusLabel = acc.status === 'active' ? 'Active' : 'Paused';
    const safeUrl = acc.profile_url || '#';

    return `
      <div class="social-card" style="--platform-accent:${cfg.color};--platform-accent-bg:${cfg.bgColor};" data-id="${acc.id}">
        <div>
          <div class="social-card-top">
            <div class="platform-icon-wrap">
              ${cfg.icon}
            </div>
            <div class="social-card-identity">
              <h3 class="social-card-name" title="${acc.account_name}">${acc.account_name}</h3>
              <div class="social-card-handle">${acc.handle || '@' + acc.platform}</div>
              <div class="social-card-tags">
                <span class="social-card-tag">${acc.category || 'Creator'}</span>
                <span class="social-status-pill ${statusClass}">${statusLabel}</span>
              </div>
            </div>
          </div>

          <!-- Mini 4-stat metrics grid -->
          <div class="social-card-metrics">
            <div class="social-metric-box">
              <span class="social-metric-lbl">Followers</span>
              <span class="social-metric-val">${formatNumber(acc.followers_count)}</span>
            </div>
            <div class="social-metric-box">
              <span class="social-metric-lbl">Video Views</span>
              <span class="social-metric-val">${formatNumber(acc.total_views)}</span>
            </div>
            <div class="social-metric-box">
              <span class="social-metric-lbl">Posts / Videos</span>
              <span class="social-metric-val">${formatNumber(acc.posts_count)}</span>
            </div>
            <div class="social-metric-box">
              <span class="social-metric-lbl">Engagement</span>
              <span class="social-metric-val" style="color:var(--green);">${Number(acc.engagement_rate || 0).toFixed(1)}%</span>
            </div>
          </div>

          <!-- Monthly growth badge -->
          <div class="social-card-growth">
            <span class="growth-badge">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
              ${acc.monthly_growth || '+5.0%'}
            </span>
            <span>Goal: ${formatNumber(acc.goal_target || 100000)}</span>
          </div>
        </div>

        <!-- Actions Footer: Visit link, Copy link, Edit, Delete -->
        <div class="social-card-actions">
          <a href="${safeUrl}" target="_blank" rel="noopener noreferrer" class="btn-visit-profile" title="Open ${cfg.name} Profile">
            <span>↗ Visit Profile</span>
          </a>
          <button type="button" class="btn-icon-action btn-copy-link" data-url="${safeUrl}" title="Copy Profile Link" aria-label="Copy Profile Link">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          </button>
          <button type="button" class="btn-icon-action btn-edit-account" data-id="${acc.id}" title="Edit Account" aria-label="Edit Account">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          </button>
          <button type="button" class="btn-icon-action btn-delete btn-delete-account" data-id="${acc.id}" data-name="${acc.account_name}" title="Remove Account" aria-label="Remove Account">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    `;
  }

  // Render Categorized Platform Sections
  function renderCategorizedPlatforms() {
    const container = document.getElementById('categorized-platforms-container');
    if (!container) return;

    // Filter accounts by search query
    let filtered = [...accountsData];
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filtered = filtered.filter(a =>
        (a.account_name && a.account_name.toLowerCase().includes(q)) ||
        (a.handle && a.handle.toLowerCase().includes(q)) ||
        (a.platform && a.platform.toLowerCase().includes(q)) ||
        (a.category && a.category.toLowerCase().includes(q)) ||
        (a.notes && a.notes.toLowerCase().includes(q))
      );
    }

    // Sort accounts
    filtered.sort((a, b) => {
      if (sortBy === 'followers_desc') return (b.followers_count || 0) - (a.followers_count || 0);
      if (sortBy === 'views_desc') return (b.total_views || 0) - (a.total_views || 0);
      if (sortBy === 'engagement_desc') return (b.engagement_rate || 0) - (a.engagement_rate || 0);
      if (sortBy === 'name_asc') return (a.account_name || '').localeCompare(b.account_name || '');
      return 0;
    });

    // Group accounts by platform
    const grouped = {};
    filtered.forEach(acc => {
      const p = normalizePlatform(acc.platform);
      if (!grouped[p]) grouped[p] = [];
      grouped[p].push(acc);
    });

    // Determine platforms to show
    let platformsToShow = [];
    if (activePlatform === 'all') {
      PLATFORMS_ORDER.forEach(item => {
        if (grouped[item.key] && grouped[item.key].length > 0) {
          platformsToShow.push(item);
        }
      });
      Object.keys(grouped).forEach(key => {
        if (!platformsToShow.find(item => item.key === key) && grouped[key].length > 0) {
          const cfg = PLATFORM_CONFIG[key] || PLATFORM_CONFIG.custom;
          platformsToShow.push({ key, name: cfg.name, iconKey: key, title: `${cfg.name} Hub`, desc: `Connected ${cfg.name} profiles` });
        }
      });
    } else {
      const item = PLATFORMS_ORDER.find(it => it.key === activePlatform) || {
        key: activePlatform,
        name: (PLATFORM_CONFIG[activePlatform] || PLATFORM_CONFIG.custom).name,
        iconKey: activePlatform,
        title: `${(PLATFORM_CONFIG[activePlatform] || PLATFORM_CONFIG.custom).name} Hub`,
        desc: `Connected ${(PLATFORM_CONFIG[activePlatform] || PLATFORM_CONFIG.custom).name} profiles`
      };
      platformsToShow.push(item);
    }

    // Global empty search or empty portfolio
    if (platformsToShow.length === 0 || (activePlatform === 'all' && filtered.length === 0)) {
      container.innerHTML = `
        <div style="text-align: center; padding: 64px 20px; background: var(--card); border: 1px dashed var(--border); border-radius: var(--radius-lg); margin-bottom: 40px;">
          <div style="font-size: 44px; margin-bottom: 12px;">🔍</div>
          <h3 style="font-size: 20px; font-weight: 800; color: var(--text); margin-bottom: 6px;">No Social Accounts Found</h3>
          <p style="color: var(--muted); font-size: 14px; max-width: 480px; margin: 0 auto 22px;">
            ${searchQuery.trim() ? `No accounts matched your search "${searchQuery}".` : 'No accounts added yet.'}
          </p>
          <button type="button" class="btn-add-account" id="empty-state-add-btn" style="margin: 0 auto;">
            + Add New Account
          </button>
        </div>
      `;
      document.getElementById('empty-state-add-btn')?.addEventListener('click', () => openAddModal(activePlatform !== 'all' ? activePlatform : 'tiktok'));
      return;
    }

    // Render each platform's dedicated section
    container.innerHTML = platformsToShow.map(plat => {
      const cfg = PLATFORM_CONFIG[plat.key] || PLATFORM_CONFIG.custom;
      const accList = grouped[plat.key] || [];

      const totalFollowers = accList.reduce((sum, a) => sum + (Number(a.followers_count) || 0), 0);
      const totalViews = accList.reduce((sum, a) => sum + (Number(a.total_views) || 0), 0);
      const totalEng = accList.reduce((sum, a) => sum + (Number(a.engagement_rate) || 0), 0);
      const avgEng = accList.length > 0 ? (totalEng / accList.length).toFixed(1) : '0.0';

      return `
        <section class="platform-category-section" style="--sec-accent:${cfg.color};" id="section-${plat.key}">
          <div class="platform-section-banner">
            <div class="platform-banner-left">
              <div class="platform-banner-icon" style="background:${cfg.bgColor};color:${cfg.color};">
                ${cfg.icon}
              </div>
              <div>
                <div class="platform-banner-tag-row">
                  <h2 class="platform-banner-title">${plat.title || cfg.name + ' Hub'}</h2>
                  <span class="platform-count-badge" style="border-color:${cfg.color}45;color:${cfg.color};">
                    ${accList.length} ${accList.length === 1 ? 'Account' : 'Accounts'}
                  </span>
                </div>
                <p class="platform-banner-sub">${plat.desc || 'Connected ' + cfg.name + ' profiles & analytics'}</p>
              </div>
            </div>

            <div class="platform-banner-right">
              <div class="platform-banner-stat-box">
                <span class="pstat-label">Total Followers</span>
                <span class="pstat-val">${formatNumber(totalFollowers)}</span>
              </div>
              <div class="platform-banner-stat-box">
                <span class="pstat-label">Total Views</span>
                <span class="pstat-val">${formatNumber(totalViews)}</span>
              </div>
              <div class="platform-banner-stat-box">
                <span class="pstat-label">Avg. Engagement</span>
                <span class="pstat-val" style="color:var(--green);">${avgEng}%</span>
              </div>
              <button type="button" class="btn-add-platform-account" data-platform="${plat.key}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                + Add ${cfg.name} Account
              </button>
            </div>
          </div>

          <!-- Cards Grid or Empty Notice -->
          ${accList.length > 0 ? `
            <div class="social-accounts-grid">
              ${accList.map(renderSingleAccountCard).join('')}
            </div>
          ` : `
            <div style="text-align: center; padding: 42px 20px; background: var(--card-solid); border: 1px dashed var(--border); border-radius: 14px;">
              <p style="color: var(--muted); font-size: 14px; margin-bottom: 14px;">No accounts added under ${cfg.name} yet.</p>
              <button type="button" class="btn-add-platform-account" data-platform="${plat.key}" style="margin: 0 auto;">
                + Add First ${cfg.name} Account
              </button>
            </div>
          `}
        </section>
      `;
    }).join('');

    // Attach card event listeners & section add buttons
    attachCardEvents();
    attachPlatformSectionAddButtons();
  }

  function attachCardEvents() {
    // Copy link buttons
    document.querySelectorAll('.btn-copy-link').forEach(btn => {
      btn.addEventListener('click', async () => {
        const url = btn.getAttribute('data-url');
        if (!url || url === '#') {
          showToast('No valid link specified.', 'error');
          return;
        }
        try {
          await navigator.clipboard.writeText(url);
          showToast('Profile link copied to clipboard!');
        } catch (e) {
          showToast('Failed to copy link.', 'error');
        }
      });
    });

    // Edit account buttons
    document.querySelectorAll('.btn-edit-account').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        openEditModal(id);
      });
    });

    // Delete account buttons
    document.querySelectorAll('.btn-delete-account').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = parseInt(btn.getAttribute('data-id'), 10);
        const name = btn.getAttribute('data-name');
        if (confirm(`Are you sure you want to remove "${name}" from your portfolio?`)) {
          await deleteAccount(id);
        }
      });
    });
  }

  function attachPlatformSectionAddButtons() {
    document.querySelectorAll('.btn-add-platform-account').forEach(btn => {
      btn.addEventListener('click', () => {
        const plat = btn.getAttribute('data-platform') || 'tiktok';
        openAddModal(plat);
      });
    });
  }

  // Modal open / close
  const modalBackdrop = document.getElementById('account-modal-backdrop');
  const accountForm = document.getElementById('social-account-form');
  const modalTitle = document.getElementById('modal-title');

  function openAddModal(preselectedPlatform = 'tiktok') {
    if (!modalBackdrop) return;
    const cleanPlat = normalizePlatform(preselectedPlatform);
    const cfg = PLATFORM_CONFIG[cleanPlat] || PLATFORM_CONFIG.custom;

    modalTitle.textContent = `Add ${cfg.name} Account`;
    accountForm.reset();
    document.getElementById('account-id-field').value = '';
    
    const platformField = document.getElementById('platform-field');
    if (platformField) {
      platformField.value = cleanPlat;
      const profileUrlField = document.getElementById('profile-url-field');
      if (profileUrlField) profileUrlField.placeholder = cfg.urlPattern + 'yourhandle';
    }
    modalBackdrop.classList.add('active');
  }

  function openEditModal(id) {
    const acc = accountsData.find(a => a.id === id);
    if (!acc || !modalBackdrop) return;

    modalTitle.textContent = `Edit Account: ${acc.account_name}`;
    document.getElementById('account-id-field').value = acc.id;
    document.getElementById('platform-field').value = normalizePlatform(acc.platform);
    document.getElementById('account-name-field').value = acc.account_name || '';
    document.getElementById('handle-field').value = acc.handle || '';
    document.getElementById('profile-url-field').value = acc.profile_url || '';
    document.getElementById('followers-field').value = acc.followers_count || 0;
    document.getElementById('following-field').value = acc.following_count || 0;
    document.getElementById('views-field').value = acc.total_views || 0;
    document.getElementById('posts-field').value = acc.posts_count || 0;
    document.getElementById('engagement-field').value = acc.engagement_rate || 0;
    document.getElementById('growth-field').value = acc.monthly_growth || '+5.0%';
    document.getElementById('goal-target-field').value = acc.goal_target || 100000;
    document.getElementById('category-field').value = acc.category || 'AI & Tech';
    document.getElementById('status-field').value = acc.status || 'active';
    document.getElementById('notes-field').value = acc.notes || '';

    modalBackdrop.classList.add('active');
  }

  function closeModal() {
    if (modalBackdrop) modalBackdrop.classList.remove('active');
  }

  // Handle modal submit
  async function handleAccountFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('account-id-field').value;
    const payload = {
      platform: document.getElementById('platform-field').value,
      account_name: document.getElementById('account-name-field').value.trim(),
      handle: document.getElementById('handle-field').value.trim(),
      profile_url: document.getElementById('profile-url-field').value.trim(),
      followers_count: parseInt(document.getElementById('followers-field').value, 10) || 0,
      following_count: parseInt(document.getElementById('following-field').value, 10) || 0,
      total_views: parseInt(document.getElementById('views-field').value, 10) || 0,
      posts_count: parseInt(document.getElementById('posts-field').value, 10) || 0,
      engagement_rate: parseFloat(document.getElementById('engagement-field').value) || 0,
      monthly_growth: document.getElementById('growth-field').value.trim() || '+5.0%',
      goal_target: parseInt(document.getElementById('goal-target-field').value, 10) || 100000,
      category: document.getElementById('category-field').value.trim() || 'AI & Tech',
      status: document.getElementById('status-field').value,
      notes: document.getElementById('notes-field').value.trim()
    };

    try {
      const url = id ? `/api/portfolio/${id}` : '/api/portfolio';
      const method = id ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Operation failed');
      }

      showToast(id ? 'Account updated successfully!' : 'New account added to portfolio!');
      closeModal();
      await loadPortfolioData();
    } catch (err) {
      console.error('Save account error:', err);
      showToast(err.message || 'Failed to save account.', 'error');
    }
  }

  // Delete account API
  async function deleteAccount(id) {
    try {
      const res = await fetch(`/api/portfolio/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to delete');
      }
      showToast('Account removed from portfolio.');
      await loadPortfolioData();
    } catch (err) {
      console.error('Delete error:', err);
      showToast(err.message || 'Failed to delete account.', 'error');
    }
  }

  // Export Portfolio JSON (Media Kit download)
  function exportPortfolioJson() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({
      creator: 'Sami Prompts Creator Portfolio',
      generated_at: new Date().toISOString(),
      metrics: metricsData,
      accounts: accountsData
    }, null, 2));

    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `sami_social_portfolio_${new Date().toISOString().slice(0,10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Media Kit JSON downloaded!');
  }

  // Initialize page and listeners
  function init() {
    loadPortfolioData();

    // Modal triggers
    document.getElementById('open-add-modal-btn')?.addEventListener('click', () => {
      openAddModal(activePlatform !== 'all' ? activePlatform : 'tiktok');
    });
    document.getElementById('close-modal-btn')?.addEventListener('click', closeModal);
    document.getElementById('cancel-modal-btn')?.addEventListener('click', closeModal);
    modalBackdrop?.addEventListener('click', (e) => {
      if (e.target === modalBackdrop) closeModal();
    });

    // Form submit
    accountForm?.addEventListener('submit', handleAccountFormSubmit);

    // Platform selector auto-placeholder update
    const platformSelect = document.getElementById('platform-field');
    const profileUrlField = document.getElementById('profile-url-field');
    platformSelect?.addEventListener('change', () => {
      const clean = normalizePlatform(platformSelect.value);
      const cfg = PLATFORM_CONFIG[clean] || PLATFORM_CONFIG.custom;
      if (profileUrlField && !profileUrlField.value) {
        profileUrlField.placeholder = cfg.urlPattern + 'yourhandle';
      }
    });

    // Toolbar search
    const searchInput = document.getElementById('account-search-input');
    searchInput?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderCategorizedPlatforms();
    });

    // Sort dropdown
    const sortSelect = document.getElementById('portfolio-sort-select');
    sortSelect?.addEventListener('change', (e) => {
      sortBy = e.target.value;
      renderCategorizedPlatforms();
    });

    // Export & Print
    document.getElementById('export-json-btn')?.addEventListener('click', exportPortfolioJson);
    document.getElementById('print-portfolio-btn')?.addEventListener('click', () => window.print());

    // Listen for theme toggle to re-render charts with appropriate contrast
    const themeBtn = document.getElementById('theme-toggle-btn');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        setTimeout(initOrUpdateCharts, 150);
      });
    }
  }

  // Run when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
