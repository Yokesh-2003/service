/**
 * SentiPay AI - Behavioral Threat Detection Engine Frontend Controller
 * Implements SPA navigation, state manager, Audio synthesizers, and canvas charts.
 */

// Global Application State
const state = {
  activeView: 'view-landing',          // view-landing, view-workspace
  activeSubview: 'subview-dashboard',   // subview-dashboard, subview-risk-analysis, subview-assistant, subview-admin
  currentRole: 'user',                  // user, admin
  demoStep: 1,                          // 1: Normal, 2: Trigger Alert, 3: Resolved
  isDemoMinimised: false,
  
  // Simulated DB
  transactions: [
    { id: 'TXN-9023', merchant: 'Amazon India', amount: '₹1,299', time: '10 mins ago', status: 'Completed', risk: 'Safe (8%)', riskClass: 'safe' },
    { id: 'TXN-8991', merchant: 'Swiggy Delivery', amount: '₹450', time: '2 hours ago', status: 'Completed', risk: 'Safe (4%)', riskClass: 'safe' },
    { id: 'TXN-8942', merchant: 'Uber Ride', amount: '₹380', time: '5 hours ago', status: 'Completed', risk: 'Safe (9%)', riskClass: 'safe' },
    { id: 'TXN-8910', merchant: 'Zomato Payment', amount: '₹920', time: '1 day ago', status: 'Completed', risk: 'Safe (11%)', riskClass: 'safe' },
    { id: 'TXN-8740', merchant: 'Reliance Digital', amount: '₹42,500', time: '3 days ago', status: 'Completed', risk: 'Safe (14%)', riskClass: 'safe' }
  ],
  logins: [
    { datetime: 'Today, 07:44 PM', device: 'iPhone 15 Pro', ip: '182.74.88.21', location: 'Chennai, India', status: 'Trusted', statusClass: 'safe' },
    { datetime: 'Yesterday, 09:12 AM', device: 'iPhone 15 Pro', ip: '182.74.88.21', location: 'Chennai, India', status: 'Trusted', statusClass: 'safe' },
    { datetime: '3 days ago, 02:30 PM', device: 'Macbook Pro Chrome', ip: '182.74.88.21', location: 'Chennai, India', status: 'Trusted', statusClass: 'safe' },
    { datetime: '5 days ago, 11:15 AM', device: 'iPhone 15 Pro', ip: '182.74.88.21', location: 'Chennai, India', status: 'Trusted', statusClass: 'safe' }
  ],
  adminUsers: [
    { id: 'USR-8821', name: 'Cheran', location: 'Chennai, IN', device: 'iPhone 15 Pro', risk: 12, status: 'Safe', statusClass: 'safe' },
    { id: 'USR-1082', name: 'Aarav ', location: 'Mumbai, IN', device: 'OnePlus 11', risk: 18, status: 'Safe', statusClass: 'safe' },
    { id: 'USR-4091', name: 'Ishita', location: 'Delhi, IN', device: 'MacBook Air Safari', risk: 85, status: 'High Risk', statusClass: 'danger' },
    { id: 'USR-6623', name: 'Karan ', location: 'Bangalore, IN', device: 'Windows Edge', risk: 42, status: 'Medium', statusClass: 'warning' },
    { id: 'USR-9021', name: 'Diya ', location: 'Kochi, IN', device: 'iPad Pro', risk: 5, status: 'Safe', statusClass: 'safe' }
  ],
  adminAlerts: [],
  
  // Audio alarm state
  audioCtx: null,
  alarmOscillator: null,
  alarmGain: null,
  alarmIntervalId: null,
  isAlarmPlaying: false
};

// --- INITIALIZATION ---
// Polyfill roundRect for older browsers/environments to prevent crashes
if (typeof CanvasRenderingContext2D.prototype.roundRect !== 'function') {
  CanvasRenderingContext2D.prototype.roundRect = function (x, y, w, h, radii) {
    this.rect(x, y, w, h);
  };
}

function init() {
  setupSPAEvents();
  setupDemoEvents();
  setupAIResponses();
  renderDashboardTables();
  renderAdminUsersTable();
  drawCharts();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// --- SPA VIEW ROUTING ---
function setupSPAEvents() {
  // Brand Logo clicks return to Landing Page (reset role)
  document.getElementById('btn-brand').addEventListener('click', () => {
    switchView('view-landing');
    document.getElementById('header-user-menu').classList.add('hidden');
    stopEmergencyAlarm();
  });

  // Entry buttons
  document.getElementById('btn-start-user').addEventListener('click', () => {
    state.currentRole = 'user';
    switchView('view-workspace');
    switchSubview('subview-dashboard');
    document.getElementById('header-user-menu').classList.remove('hidden');
    
    // Hide Admin sidebar item from general user
    document.querySelectorAll('.admin-nav-only').forEach(el => el.classList.add('hidden'));
    
    // Force redraw of canvas since it was hidden
    setTimeout(drawCharts, 50);
  });

  document.getElementById('btn-start-admin').addEventListener('click', () => {
    state.currentRole = 'admin';
    switchView('view-workspace');
    switchSubview('subview-admin');
    document.getElementById('header-user-menu').classList.remove('hidden');
    
    // Show Admin navigation sidebar
    document.querySelectorAll('.admin-nav-only').forEach(el => el.classList.remove('hidden'));
    
    setTimeout(drawCharts, 50);
  });

  // Split view toggle button in User Dashboard
  document.getElementById('btn-quick-switch-admin').addEventListener('click', () => {
    state.currentRole = 'admin';
    document.querySelectorAll('.admin-nav-only').forEach(el => el.classList.remove('hidden'));
    switchSubview('subview-admin');
  });

  // Sidebar item switching
  document.querySelectorAll('.nav-item').forEach(button => {
    button.addEventListener('click', () => {
      const targetSubview = button.getAttribute('data-subview');
      switchSubview(targetSubview);
    });
  });

  // Log Out Nav button
  document.getElementById('btn-logout-nav').addEventListener('click', () => {
    switchView('view-landing');
    document.getElementById('header-user-menu').classList.add('hidden');
    stopEmergencyAlarm();
    resetDemoSimulation();
  });

  // Header/Action listeners for alert resolutions
  document.getElementById('btn-alert-freeze').addEventListener('click', () => resolveThreat('freeze'));
  document.getElementById('btn-alert-block-device').addEventListener('click', () => resolveThreat('block'));
  document.getElementById('btn-alert-logout').addEventListener('click', () => resolveThreat('logout'));
  document.getElementById('btn-alert-report').addEventListener('click', () => resolveThreat('report'));

  // Mobile modal resolution buttons
  document.getElementById('btn-mobile-no').addEventListener('click', () => resolveThreat('freeze'));
  document.getElementById('btn-mobile-yes').addEventListener('click', () => {
    document.getElementById('mobile-notification-container').classList.add('hidden');
    stopEmergencyAlarm();
    // Keep it medium/high score but dismiss notification
  });

  // Search input in Admin Panel
  document.getElementById('admin-user-search').addEventListener('input', (e) => {
    renderAdminUsersTable(e.target.value);
  });
}

function switchView(viewId) {
  state.activeView = viewId;
  document.querySelectorAll('.app-view').forEach(view => {
    view.classList.remove('active');
    view.classList.add('hidden');
  });
  const targetView = document.getElementById(viewId);
  targetView.classList.remove('hidden');
  targetView.classList.add('active');
}

function switchSubview(subviewId) {
  state.activeSubview = subviewId;
  document.querySelectorAll('.subview').forEach(subview => {
    subview.classList.remove('active');
  });
  document.getElementById(subviewId).classList.add('active');

  // Sync Sidebar Active states
  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
    if (item.getAttribute('data-subview') === subviewId) {
      item.classList.add('active');
    }
  });

  // Redraw charts if we enter dashboard
  if (subviewId === 'subview-dashboard') {
    setTimeout(drawCharts, 50);
  }
  // Redraw speedometer if we enter risk center
  if (subviewId === 'subview-risk-analysis') {
    setTimeout(updateSpeedometer, 50);
  }
}

// --- RENDER DYNAMIC TABLES ---
function renderDashboardTables() {
  // 1. Transactions Table
  const tTableBody = document.querySelector('#transactions-table tbody');
  tTableBody.innerHTML = '';
  state.transactions.forEach(tx => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="text-muted font-mono">${tx.id}</span></td>
      <td><strong>${tx.merchant}</strong></td>
      <td><strong>${tx.amount}</strong></td>
      <td><span class="text-secondary">${tx.time}</span></td>
      <td><span class="row-badge ${tx.status === 'Completed' ? 'bg-success' : 'bg-warning'}">${tx.status}</span></td>
      <td><span class="row-badge ${tx.riskClass === 'safe' ? 'bg-success' : 'bg-danger'}">${tx.risk}</span></td>
    `;
    tTableBody.appendChild(row);
  });

  // 2. Logins Table
  const lTableBody = document.querySelector('#logins-table tbody');
  lTableBody.innerHTML = '';
  state.logins.forEach(log => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="text-secondary">${log.datetime}</span></td>
      <td><strong>${log.device}</strong></td>
      <td><span class="font-mono text-muted">${log.ip}</span></td>
      <td><span class="text-accent">${log.location}</span></td>
      <td><span class="row-badge ${log.statusClass === 'safe' ? 'bg-success' : 'bg-danger'}">${log.status}</span></td>
    `;
    lTableBody.appendChild(row);
  });
}

function renderAdminUsersTable(filterText = '') {
  const uTableBody = document.querySelector('#admin-users-table tbody');
  uTableBody.innerHTML = '';
  
  const searchVal = filterText.toLowerCase().trim();
  const filteredUsers = state.adminUsers.filter(u => 
    u.id.toLowerCase().includes(searchVal) || 
    u.name.toLowerCase().includes(searchVal) || 
    u.location.toLowerCase().includes(searchVal)
  );

  filteredUsers.forEach(u => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><span class="text-muted font-mono">${u.id}</span></td>
      <td><strong>${u.name}</strong></td>
      <td><span class="text-secondary">${u.location}</span></td>
      <td><span class="text-secondary">${u.device}</span></td>
      <td><strong>${u.risk}%</strong></td>
      <td><span class="row-badge ${u.statusClass === 'safe' ? 'bg-success' : (u.statusClass === 'warning' ? 'bg-warning' : 'bg-danger')}">${u.status}</span></td>
    `;
    uTableBody.appendChild(row);
  });
}

function renderAdminAlertsFeed() {
  const feedContainer = document.getElementById('admin-alerts-feed');
  const placeholder = document.getElementById('no-alerts-placeholder');
  
  if (state.adminAlerts.length === 0) {
    placeholder.classList.remove('hidden');
    // Remove dynamic alert items if any
    document.querySelectorAll('.feed-alert-item').forEach(el => el.remove());
    return;
  }
  
  placeholder.classList.add('hidden');
  
  // Clear any existing alert items
  document.querySelectorAll('.feed-alert-item').forEach(el => el.remove());

  state.adminAlerts.forEach(al => {
    const alertEl = document.createElement('div');
    alertEl.className = `feed-alert-item ${al.resolved ? 'resolved' : ''}`;
    alertEl.innerHTML = `
      <div class="feed-alert-icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          ${al.resolved ? '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>' : '<polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>'}
        </svg>
      </div>
      <div class="feed-alert-details">
        <h4>${al.title}</h4>
        <p>${al.reason}</p>
        <div class="feed-alert-meta">
          <span class="feed-alert-time">${al.time}</span>
          <span class="feed-alert-badge ${al.resolved ? 'bg-success' : 'bg-danger'}">${al.status}</span>
        </div>
      </div>
    `;
    // Insert at beginning of feed (newest first)
    feedContainer.insertBefore(alertEl, feedContainer.firstChild);
  });
}

// --- CANVAS-BASED CHARTS SYSTEM ---
function drawCharts() {
  drawRiskTrendChart();
  drawLoginLocationsChart();
}

function drawRiskTrendChart() {
  const canvas = document.getElementById('chart-risk-trend');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Set dimensions
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  
  // Clear
  ctx.clearRect(0, 0, width, height);

  // Setup data based on state
  let dataPoints = [14, 12, 18, 15, 11, 13, 12]; // Normal trend
  
  if (state.demoStep === 2) {
    // High risk triggered
    dataPoints = [14, 12, 18, 15, 11, 13, 94];
  } else if (state.demoStep === 3) {
    // Threat resolved/frozen
    dataPoints = [14, 12, 18, 15, 11, 13, 94, 2];
  }

  // Draw Grid Lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 4; i++) {
    const y = 30 + (i * (height - 60) / 3);
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
    
    // Grid labels
    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Inter';
    ctx.fillText(`${100 - i * 30}%`, 5, y + 3);
  }

  // Calculate coordinates
  const paddingX = 40;
  const paddingY = 30;
  const chartWidth = width - paddingX - 20;
  const chartHeight = height - paddingY - 30;
  
  const points = dataPoints.map((val, idx) => {
    const x = paddingX + (idx * (chartWidth / (dataPoints.length - 1)));
    const y = paddingY + chartHeight - (val / 100 * chartHeight);
    return { x, y };
  });

  // Draw Area Gradient under path
  const areaGradient = ctx.createLinearGradient(0, paddingY, 0, paddingY + chartHeight);
  if (state.demoStep === 2) {
    areaGradient.addColorStop(0, 'rgba(239, 68, 68, 0.25)');
    areaGradient.addColorStop(1, 'rgba(239, 68, 68, 0)');
  } else {
    areaGradient.addColorStop(0, 'rgba(59, 130, 246, 0.25)');
    areaGradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, paddingY + chartHeight);
  points.forEach(p => ctx.lineTo(p.x, p.y));
  ctx.lineTo(points[points.length - 1].x, paddingY + chartHeight);
  ctx.closePath();
  ctx.fillStyle = areaGradient;
  ctx.fill();

  // Draw Trend Line
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    // Curving (Bézier calculation)
    const xc = (points[i - 1].x + points[i].x) / 2;
    const yc = (points[i - 1].y + points[i].y) / 2;
    ctx.quadraticCurveTo(points[i - 1].x, points[i - 1].y, xc, yc);
  }
  ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  
  ctx.strokeStyle = state.demoStep === 2 ? '#ef4444' : '#3b82f6';
  ctx.lineWidth = 3;
  ctx.shadowColor = state.demoStep === 2 ? 'rgba(239, 68, 68, 0.5)' : 'rgba(59, 130, 246, 0.5)';
  ctx.shadowBlur = 10;
  ctx.stroke();
  ctx.shadowBlur = 0; // reset shadow

  // Draw Point circles
  points.forEach((p, idx) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 4, 0, Math.PI * 2);
    ctx.fillStyle = idx === points.length - 1 && state.demoStep === 2 ? '#ef4444' : '#ffffff';
    ctx.strokeStyle = state.demoStep === 2 && idx === points.length - 1 ? '#ffffff' : '#3b82f6';
    ctx.lineWidth = 2;
    ctx.fill();
    ctx.stroke();

    // Hover value label above the last/highest point
    if (idx === points.length - 1 || (state.demoStep === 2 && idx === points.length - 1)) {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px Outfit';
      ctx.fillText(`${dataPoints[idx]}%`, p.x - 10, p.y - 12);
    }
  });

  // Draw X axis labels (Simulated Days)
  const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Today', 'Lockdown'];
  ctx.fillStyle = '#9ca3af';
  ctx.font = '10px Inter';
  points.forEach((p, idx) => {
    ctx.fillText(labels[idx], p.x - 10, paddingY + chartHeight + 20);
  });
}

function drawLoginLocationsChart() {
  const canvas = document.getElementById('chart-login-locations');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  
  // Set dimensions
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  
  const width = rect.width;
  const height = rect.height;
  
  ctx.clearRect(0, 0, width, height);

  // Setup datasets based on state
  let locationsData = [
    { country: 'India', normal: 28, anomaly: 0 },
    { country: 'Singapore', normal: 3, anomaly: 0 },
    { country: 'USA', normal: 1, anomaly: 0 },
    { country: 'Japan', normal: 0, anomaly: 0 }
  ];

  if (state.demoStep === 2) {
    locationsData[3].anomaly = 1; // Show anomaly in Japan
  } else if (state.demoStep === 3) {
    locationsData[3].normal = 0;
    locationsData[3].anomaly = 1; // Blocked anomaly
  }

  const paddingX = 40;
  const paddingY = 20;
  const chartHeight = height - paddingY - 35;
  const barWidth = 35;
  const gap = (width - paddingX - 40 - (locationsData.length * barWidth)) / (locationsData.length - 1);

  // Draw Axis lines
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = paddingY + (i * chartHeight / 3);
    ctx.beginPath();
    ctx.moveTo(paddingX, y);
    ctx.lineTo(width - 20, y);
    ctx.stroke();
  }

  // Draw Bars
  locationsData.forEach((item, idx) => {
    const x = paddingX + 20 + (idx * (barWidth + gap));
    
    // Scale normal logins (max 30 logins)
    const normalHeight = (item.normal / 30) * chartHeight;
    const anomalyHeight = (item.anomaly / 30) * chartHeight;

    // Normal Logins bar
    if (normalHeight > 0) {
      const normalGrad = ctx.createLinearGradient(x, paddingY + chartHeight - normalHeight, x, paddingY + chartHeight);
      normalGrad.addColorStop(0, '#3b82f6');
      normalGrad.addColorStop(1, 'rgba(59, 130, 246, 0.2)');
      
      ctx.fillStyle = normalGrad;
      ctx.beginPath();
      ctx.roundRect(x, paddingY + chartHeight - normalHeight, barWidth, normalHeight, [4, 4, 0, 0]);
      ctx.fill();

      // Text frequency label
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Inter';
      ctx.fillText(item.normal, x + (barWidth/2) - 4, paddingY + chartHeight - normalHeight - 6);
    }

    // Anomaly Logins bar
    if (anomalyHeight > 0) {
      const anomalyGrad = ctx.createLinearGradient(x, paddingY + chartHeight - anomalyHeight, x, paddingY + chartHeight);
      anomalyGrad.addColorStop(0, '#ef4444');
      anomalyGrad.addColorStop(1, 'rgba(239, 68, 68, 0.2)');
      
      ctx.fillStyle = anomalyGrad;
      ctx.beginPath();
      ctx.roundRect(x, paddingY + chartHeight - anomalyHeight, barWidth, anomalyHeight, [4, 4, 0, 0]);
      ctx.fill();

      // Alert Badge/value
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px Inter';
      ctx.fillText('WARN', x + 2, paddingY + chartHeight - anomalyHeight - 6);
    }

    // Country name label
    ctx.fillStyle = '#9ca3af';
    ctx.font = '11px Inter';
    ctx.fillText(item.country, x - 2, paddingY + chartHeight + 20);
  });
}

// --- SPEEDOMETER VERDICT GAUGE ---
function updateSpeedometer() {
  const fillArc = document.getElementById('speed-fill-arc');
  const needle = document.getElementById('speed-needle');
  const scoreNum = document.getElementById('audit-score-number');
  
  if (!fillArc || !needle) return;

  let score = 12;
  if (state.demoStep === 2) {
    score = 94;
  } else if (state.demoStep === 3) {
    score = 2; // Locked/frozen score
  }

  scoreNum.textContent = score;

  // The speedometer arc is semi-circle (180 degrees)
  // Arc length is ~ 251.3 pixels (r=80, length = PI*r = 3.1415*80 = 251.3)
  // Calculate dash offset based on percentage
  const maxDash = 251.3;
  const fillPercentage = score / 100;
  const offset = maxDash - (fillPercentage * maxDash);
  
  fillArc.style.strokeDashoffset = offset;

  // Rotate Needle: From -90deg to +90deg (range of 180 degrees)
  const angle = (fillPercentage * 180) - 90;
  needle.style.transform = `rotate(${angle}deg)`;
}

// --- ALARM SOUND GENERATION (Web Audio API) ---
function startEmergencyAlarm() {
  if (state.isAlarmPlaying) return;
  state.isAlarmPlaying = true;
  
  try {
    // Create AudioContext on-demand (user gestures will trigger this)
    if (!state.audioCtx) {
      state.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }

    if (state.audioCtx.state === 'suspended') {
      state.audioCtx.resume();
    }

    // Siren alarm looping function (pitch sweep)
    const playAlarmPulse = () => {
      if (!state.isAlarmPlaying) return;

      const osc = state.audioCtx.createOscillator();
      const gainNode = state.audioCtx.createGain();
      
      osc.connect(gainNode);
      gainNode.connect(state.audioCtx.destination);
      
      osc.type = 'sawtooth';
      // Low siren starting pitch
      osc.frequency.setValueAtTime(450, state.audioCtx.currentTime);
      // Sweep pitch upwards to 950Hz over 0.4s
      osc.frequency.exponentialRampToValueAtTime(950, state.audioCtx.currentTime + 0.45);
      
      // Pulse Volume Envelope
      gainNode.gain.setValueAtTime(0.01, state.audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.15, state.audioCtx.currentTime + 0.05); // volume up
      gainNode.gain.exponentialRampToValueAtTime(0.001, state.audioCtx.currentTime + 0.5); // fade out
      
      osc.start();
      osc.stop(state.audioCtx.currentTime + 0.5);
    };

    // Trigger pulse every 600ms
    playAlarmPulse();
    state.alarmIntervalId = setInterval(playAlarmPulse, 600);

  } catch (err) {
    console.warn("Web Audio Context could not initialize:", err);
  }
}

function stopEmergencyAlarm() {
  state.isAlarmPlaying = false;
  if (state.alarmIntervalId) {
    clearInterval(state.alarmIntervalId);
    state.alarmIntervalId = null;
  }
}

// --- DEMO TIMELINE SCRIPT SIMULATION ---
function setupDemoEvents() {
  const nextBtn = document.getElementById('btn-demo-next');
  const resetBtn = document.getElementById('btn-demo-reset');
  const toggleMinBtn = document.getElementById('btn-toggle-demo-min');
  
  // Next Step in demo
  nextBtn.addEventListener('click', () => {
    executeDemoStep(state.demoStep === 3 ? 1 : state.demoStep + 1);
  });

  resetBtn.addEventListener('click', () => {
    resetDemoSimulation();
  });

  toggleMinBtn.addEventListener('click', () => {
    const widget = document.querySelector('.demo-controller-widget');
    state.isDemoMinimised = !state.isDemoMinimised;
    if (state.isDemoMinimised) {
      widget.classList.add('minimized');
      toggleMinBtn.textContent = '+';
    } else {
      widget.classList.remove('minimized');
      toggleMinBtn.textContent = '-';
    }
  });
}

function executeDemoStep(stepNumber) {
  state.demoStep = stepNumber;
  
  // Update UI timelines
  document.querySelectorAll('.demo-step').forEach(step => {
    step.classList.remove('active');
  });
  document.getElementById(`demo-step-${stepNumber}`).classList.add('active');

  const nextBtn = document.getElementById('btn-demo-next');

  if (stepNumber === 1) {
    // Normal Scenario
    nextBtn.textContent = 'Trigger Suspicious Login (Step 2)';
    nextBtn.className = 'btn btn-primary w-100';
    
    // Clear alerts
    document.getElementById('smart-alert-overlay').classList.add('hidden');
    document.getElementById('mobile-notification-container').classList.add('hidden');
    stopEmergencyAlarm();
    
    // Reset core stats to safe
    updateRiskScores(12, 'safe');
    
    // Reset sidebars
    document.getElementById('lbl-sim-loc').textContent = 'Chennai, IN';
    document.getElementById('lbl-sim-dev').textContent = 'iPhone (Trusted)';
    
    // Restore default logs
    state.transactions = state.transactions.filter(t => t.id !== 'TXN-9104');
    state.logins = state.logins.filter(l => l.location !== 'Kyoto, Japan');
    
    // Clear Admin feeds
    state.adminAlerts = [];
    updateAdminStats(0);
    
    renderDashboardTables();
    renderAdminAlertsFeed();
    drawCharts();
    updateSpeedometer();

  } else if (stepNumber === 2) {
    // Trigger Alarm Scenario
    nextBtn.textContent = 'Resolve threat & view Admin SOC (Step 3)';
    nextBtn.className = 'btn btn-warning w-100';
    
    // Simulate data updates
    // Insert threat transaction
    state.transactions.unshift({
      id: 'TXN-9104',
      merchant: 'Sony Online Store',
      amount: '₹84,000',
      time: 'Just Now',
      status: 'Pending Verification',
      risk: 'High (96%)',
      riskClass: 'danger'
    });

    // Insert threat login
    state.logins.unshift({
      datetime: 'Today, 07:54 PM (Now)',
      device: 'Unknown Linux Chrome',
      ip: '210.140.10.34',
      location: 'Kyoto, Japan',
      status: 'Suspicious / Flagged',
      statusClass: 'danger'
    });

    // Populate live admin alert feed
    state.adminAlerts.unshift({
      id: 'ALT-44',
      title: '🚨 CRITICAL: Remote Geo-Velocity Anomaly',
      reason: 'Dual locations active simultaneously. Chennai session (Verified iPhone) and Kyoto, Japan session (Unknown Device) requested access in < 10 mins interval.',
      time: 'Just Now',
      status: 'CRITICAL',
      resolved: false
    });

    // Update risk indicators
    updateRiskScores(94, 'danger');
    updateAdminStats(1);

    // Sidebar simulation updates
    document.getElementById('lbl-sim-loc').textContent = 'Kyoto, Japan';
    document.getElementById('lbl-sim-dev').textContent = 'Linux Chrome (Untrusted)';

    // Trigger overlay, notification bubble, and alarm sound
    document.getElementById('smart-alert-overlay').classList.remove('hidden');
    document.getElementById('mobile-notification-container').classList.remove('hidden');
    
    // Start Audio
    startEmergencyAlarm();

    // Redraw and re-render datasets
    renderDashboardTables();
    renderAdminAlertsFeed();
    drawCharts();
    updateSpeedometer();

    // Flash Admin badge in sidebar navigation if not viewing it
    if (state.activeSubview !== 'subview-admin') {
      const adminBadge = document.getElementById('admin-sidebar-alert-badge');
      adminBadge.classList.remove('hidden');
    }

  } else if (stepNumber === 3) {
    // Mitigation / Resolution
    nextBtn.textContent = 'Restart Demo Scenario';
    nextBtn.className = 'btn btn-secondary w-100';
    
    resolveThreat('freeze');
  }
}

function updateRiskScores(score, type) {
  const riskCard = document.getElementById('summary-risk-card');
  const riskGlow = document.getElementById('risk-glow');
  const icon = document.getElementById('risk-card-icon');
  const badge = document.getElementById('risk-level-badge');
  const scoreText = document.getElementById('risk-score-text');
  const barFill = document.getElementById('risk-progress-bar-fill');
  const footerMsg = document.getElementById('risk-footer-msg');
  
  scoreText.innerHTML = `${score}<span class="percentage">%</span>`;
  barFill.style.width = `${score}%`;

  // Remove old classes
  riskCard.className = 'card glass summary-card card-risk-indicator';
  riskGlow.className = 'card-glow-element';
  barFill.className = 'progress-fill';
  icon.className = 'card-icon';

  if (type === 'safe') {
    riskGlow.classList.add('bg-success-glow');
    badge.className = 'risk-badge bg-success';
    badge.innerHTML = '🟢 Safe';
    barFill.classList.add('bg-success');
    icon.classList.add('text-success');
    footerMsg.textContent = 'AI Engine reports highly consistent keystroke, latency, and routing signatures.';
  } else if (type === 'danger') {
    riskGlow.classList.add('bg-danger-glow');
    badge.className = 'risk-badge bg-danger';
    badge.innerHTML = '🔴 High Risk';
    barFill.classList.add('bg-danger');
    icon.classList.add('text-danger');
    footerMsg.textContent = '⚠️ ANOMALY DETECTED: Mismatched mouse trajectory velocity and geo-location routing.';
    riskCard.classList.add('danger-border-pulse');
  } else if (type === 'locked') {
    riskGlow.classList.add('bg-warning-glow');
    badge.className = 'risk-badge bg-warning';
    badge.innerHTML = '🟡 Account Frozen';
    barFill.classList.add('bg-warning');
    icon.classList.add('text-warning');
    footerMsg.textContent = '🔒 Account temporarily locked. Verification requested via primary secure hardware.';
  }
}

function updateAdminStats(highRiskCount) {
  const countEl = document.getElementById('admin-high-risk-count');
  const metaEl = document.getElementById('admin-high-risk-meta');
  const avgRiskEl = document.getElementById('admin-avg-risk');
  
  countEl.textContent = highRiskCount;
  
  if (highRiskCount > 0) {
    countEl.className = 'stat-number text-danger animate-pulse';
    metaEl.innerHTML = '🔴 Session hijacking detected';
    metaEl.className = 'stat-meta text-danger';
    avgRiskEl.textContent = '32%';
  } else {
    countEl.className = 'stat-number text-success';
    metaEl.innerHTML = '✓ All alerts resolved';
    metaEl.className = 'stat-meta text-success';
    avgRiskEl.textContent = '14%';
  }

  // Update Cheran status inside User Directory row in Admin view
  state.adminUsers[0].risk = state.demoStep === 2 ? 94 : (state.demoStep === 3 ? 2 : 12);
  state.adminUsers[0].status = state.demoStep === 2 ? 'High Risk' : (state.demoStep === 3 ? 'Frozen' : 'Safe');
  state.adminUsers[0].statusClass = state.demoStep === 2 ? 'danger' : (state.demoStep === 3 ? 'warning' : 'safe');
  
  renderAdminUsersTable();
}

function resolveThreat(actionType) {
  stopEmergencyAlarm();
  document.getElementById('smart-alert-overlay').classList.add('hidden');
  document.getElementById('mobile-notification-container').classList.add('hidden');
  document.getElementById('admin-sidebar-alert-badge').classList.add('hidden');

  // Transition user risk to a secure locked down state
  updateRiskScores(2, 'locked');
  state.demoStep = 3;
  
  // Set demo steps timeline state
  document.querySelectorAll('.demo-step').forEach(step => step.classList.remove('active'));
  document.getElementById(`demo-step-3`).classList.add('active');
  document.getElementById('btn-demo-next').textContent = 'Restart Demo Scenario';
  document.getElementById('btn-demo-next').className = 'btn btn-secondary w-100';

  // Mark admin alert as resolved
  if (state.adminAlerts.length > 0) {
    state.adminAlerts[0].resolved = true;
    state.adminAlerts[0].status = 'RESOLVED';
    state.adminAlerts[0].title = '✓ RESOLVED: Fraud Blocked';
    
    if (actionType === 'freeze') {
      state.adminAlerts[0].reason = 'Account has been frozen by the client Cheran via secure secondary confirmation. All active authorization keys expired.';
    } else if (actionType === 'block') {
      state.adminAlerts[0].reason = 'Unrecognized hardware device signature added to permanent blacklist. IP address 210.140.10.34 blocked.';
    } else {
      state.adminAlerts[0].reason = 'Forced session termination of Kyoto connection successful. Profile token refreshed.';
    }
  }

  // Update tables & charts
  state.transactions[0].status = 'Blocked / Cancelled';
  state.transactions[0].riskClass = 'safe';
  state.transactions[0].risk = 'Blocked (0%)';

  state.logins[0].status = 'Session Blocked';
  state.logins[0].statusClass = 'safe'; // Green row because threat was terminated

  updateAdminStats(0);
  renderDashboardTables();
  renderAdminAlertsFeed();
  drawCharts();
  updateSpeedometer();

  // Redirect client to Risk Center subview to see detailed frozen status
  switchSubview('subview-risk-analysis');
  
  // Populate details on the Risk Page
  document.getElementById('audit-score-number').textContent = '2';
  document.getElementById('audit-level-value').textContent = 'Frozen';
  document.getElementById('audit-level-value').className = 'val text-warning';
  
  document.getElementById('audit-report-badge').textContent = '🟡 Security Lockdown Active';
  document.getElementById('audit-report-badge').className = 'report-badge-status warning';
  document.getElementById('audit-report-headline').textContent = 'Your digital banking credentials have been frozen.';
  document.getElementById('audit-report-text').textContent = 'As a safety measure, SentiPay AI locked your payment portals after detecting access from Kyoto, Japan. You can restore access by scanning biometric credentials on your trusted device.';
  document.getElementById('audit-recommendation-text').textContent = 'Secure hardware verification requested. Temporary freeze active.';
  
  // Disable freeze button
  document.getElementById('audit-action-buttons').innerHTML = `
    <button class="btn btn-primary btn-sm" id="btn-unfreeze-account">Restore Access (Verify Pin)</button>
  `;

  // Attach unfreeze trigger
  document.getElementById('btn-unfreeze-account').addEventListener('click', () => {
    resetDemoSimulation();
    switchSubview('subview-dashboard');
  });
}

function resetDemoSimulation() {
  executeDemoStep(1);
}

// --- AI SECURITY ASSISTANT PRESET BOT ---
function setupAIResponses() {
  const chatMessages = document.getElementById('chat-messages-area');
  const presetButtons = document.querySelectorAll('.btn-preset-q');

  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const qType = btn.getAttribute('data-q');
      const questionText = btn.textContent.trim();
      
      // 1. Append User Message
      appendMessage(questionText, 'user');
      
      // 2. Append thinking bubble
      const thinkingBubble = document.createElement('div');
      thinkingBubble.className = 'chat-bubble bot text-muted';
      thinkingBubble.id = 'ai-thinking';
      thinkingBubble.textContent = 'Threat Engine analyzing...';
      chatMessages.appendChild(thinkingBubble);
      scrollToBottom();

      // 3. Render Answer with delay
      setTimeout(() => {
        // Remove thinking bubble
        const thinking = document.getElementById('ai-thinking');
        if (thinking) thinking.remove();
        
        let answer = '';
        if (qType === 'blocked') {
          answer = `Your transactions will be immediately blocked if:
          <br><br>
          1. <strong>Geo-velocity limits are breached</strong>: Logging in from Chennai, India and attempting a card sweep in Kyoto, Japan within a 10-minute window (requires speed of Mach 4).
          <br>
          2. <strong>Keystroke Anomaly</strong>: Typing patterns (speed, dwell time, fly time) show 80%+ deviation from your established baseline profile.
          <br>
          3. <strong>Carding Vectors</strong>: Attempting highly repetitive micro-transactions to test authorization lines at a rate exceeding 3 transactions/sec.`;
        } else if (qType === 'high-risk') {
          answer = `Your behavioral risk score rises because of metric spikes across these main evaluation vectors:
          <br><br>
          • <strong>Device Spoofing</strong>: Accessing through Chrome Linux when your profile holds 98% Apple iOS affinity.
          <br>
          • <strong>Access Point volatility</strong>: Requests originating from public proxies or residential TOR nodes.
          <br>
          • <strong>Unusual Transaction Payload</strong>: Rapid consecutive purchases for premium goods at odd times (e.g. 03:00 AM) that show statistical outliers.`;
        } else if (qType === 'improve') {
          answer = `To maximize your behavioral trust profile, SentiPay AI suggests:
          <br><br>
          1. <strong>Register Trusted Terminals</strong>: Bind your browser's hardware canvas fingerprint as a registered identity node.
          <br>
          2. <strong>Enable Multi-Biometrics</strong>: Verify transaction thresholds with FaceID/fingerprint matching rather than static numeric pins.
          <br>
          3. <strong>Pattern Consistency</strong>: Avoid using commercial VPN services when executing digital payments to retain a clean geocoded routing signature.`;
        } else {
          answer = `Here are standard AI security guidelines:
          <br><br>
          • <strong>Sanitize Session Contexts</strong>: Log out of digital interfaces after making transfers.
          <br>
          • <strong>Rotate Cryptographic Hashes</strong>: Refresh security tokens every 90 days.
          <br>
          • <strong>Beware Social Vectors</strong>: No bank agent will ever ask you to verify a transaction via an email link or third-party screen sharing applications.`;
        }
        
        appendMessage(answer, 'bot');
      }, 550);
    });
  });

  function appendMessage(text, sender) {
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender}`;
    bubble.innerHTML = text;
    chatMessages.appendChild(bubble);
    scrollToBottom();
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }
}
