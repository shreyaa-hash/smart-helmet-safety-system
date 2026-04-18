// --- PAGE ROUTING & UI SETUP ---
const socket = io();

document.addEventListener('DOMContentLoaded', () => {
    // Initial Loader
    setTimeout(() => {
        const loader = document.getElementById('loading-screen');
        loader.style.opacity = '0';
        setTimeout(() => loader.style.display = 'none', 500);
    }, 1500);

    // Login Form Submit
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();

        const operatorId = document.getElementById('operator-id').value;
        const passcode = document.getElementById('passcode').value;
        const errorDiv = document.getElementById('login-error');
        const submitBtn = document.querySelector('#login-form button[type="submit"]');

        errorDiv.classList.add('hidden');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fa-solid fa-spinner animate-spin"></i> AUTHENTICATING...';

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ operator_id: operatorId, passcode })
            });

            const data = await response.json();

            if (data.success) {
                // Hide Login, Show Dashboard
                document.getElementById('login-page').classList.remove('active');
                document.getElementById('sidebar').classList.remove('hidden');
                document.getElementById('sidebar').classList.add('flex');
                document.getElementById('top-header').classList.remove('hidden');
                document.getElementById('top-header').classList.add('flex');
                
                switchPage('dashboard');
                
                // Setup initial UI states
                initChart();
            } else {
                errorDiv.innerText = data.message || 'Invalid Credentials';
                errorDiv.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Login Error:', err);
            errorDiv.innerHTML = `<strong>Error:</strong> ${err.message}<br><span style="font-size:10px;color:#aaa;">${err.stack || ''}</span>`;
            errorDiv.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'INITIALIZE UPLINK';
        }
    });

    // Navigation Logic
    const navBtns = document.querySelectorAll('.nav-btn');
    const pages = document.querySelectorAll('.page');

    function switchPage(targetId) {
        // Update nav buttons
        navBtns.forEach(btn => {
            if (btn.dataset.target === targetId) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Update pages
        pages.forEach(page => {
            if (page.id === targetId + '-page') {
                page.classList.add('active');
            } else {
                page.classList.remove('active');
            }
        });
    }

    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.dataset.target) switchPage(btn.dataset.target);
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', () => {
        document.getElementById('sidebar').classList.add('hidden');
        document.getElementById('sidebar').classList.remove('flex');
        document.getElementById('top-header').classList.add('hidden');
        document.getElementById('top-header').classList.remove('flex');
        switchPage('login');
    });

    // Notifications Dropdown
    const notifToggle = document.getElementById('notif-toggle');
    const notifDropdown = document.getElementById('notif-dropdown');
    
    notifToggle.addEventListener('click', () => {
        notifDropdown.classList.toggle('hidden');
        document.getElementById('notif-badge').classList.add('hidden');
    });

    // Mobile Menu Toggle
    document.getElementById('mobile-menu-btn').addEventListener('click', () => {
        const sidebar = document.getElementById('sidebar');
        if (sidebar.classList.contains('hidden')) {
            sidebar.classList.remove('hidden');
            sidebar.classList.add('flex', 'absolute', 'h-full', 'z-50');
        } else {
            sidebar.classList.add('hidden');
            sidebar.classList.remove('flex', 'absolute', 'h-full', 'z-50');
        }
    });

    // SOS Modal Dismiss
    document.getElementById('dismiss-sos').addEventListener('click', () => {
        document.getElementById('sos-modal').classList.add('hidden');
    });
});

// --- REAL-TIME BACKEND INTEGRATION ---

let chartInstance;
const maxDataPoints = 30;

// Chart Data States
const chartData = {
    labels: Array(maxDataPoints).fill(''),
    bpm: Array(maxDataPoints).fill(80),
    spo2: Array(maxDataPoints).fill(98)
};

let workersData = [];
let criticalAlertsCount = 0;

// Chart.js Initialization
function initChart() {
    const ctx = document.getElementById('vitalsChart').getContext('2d');
    
    // Gradient for BPM line
    const gradientBpm = ctx.createLinearGradient(0, 0, 0, 400);
    gradientBpm.addColorStop(0, 'rgba(0, 209, 255, 0.5)');   
    gradientBpm.addColorStop(1, 'rgba(0, 209, 255, 0.0)');

    const gradientSpO2 = ctx.createLinearGradient(0, 0, 0, 400);
    gradientSpO2.addColorStop(0, 'rgba(0, 255, 163, 0.5)');   
    gradientSpO2.addColorStop(1, 'rgba(0, 255, 163, 0.0)');

    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = 'Inter';

    chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.labels,
            datasets: [
                {
                    label: 'Avg Heart Rate (BPM)',
                    data: chartData.bpm,
                    borderColor: '#00D1FF',
                    backgroundColor: gradientBpm,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4
                },
                {
                    label: 'Avg SpO2 (%)',
                    data: chartData.spo2,
                    borderColor: '#00FFA3',
                    backgroundColor: gradientSpO2,
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointRadius: 0,
                    pointHoverRadius: 4
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 500,
                easing: 'linear'
            },
            scales: {
                y: {
                    min: 50,
                    max: 120,
                    grid: { color: 'rgba(255,255,255,0.05)' }
                },
                x: {
                    grid: { display: false },
                    ticks: { display: false }
                }
            },
            plugins: {
                legend: { position: 'top', align: 'end', labels: { boxWidth: 12, usePointStyle: true } },
                tooltip: { mode: 'index', intersect: false, backgroundColor: '#121620', titleColor: '#fff', bodyColor: '#fff', borderColor: '#333', borderWidth: 1 }
            }
        }
    });

    // Make an initial fetch for past logs right away
    fetchLogs();
}

// SOCKET.IO EVENT LISTENERS (Receiving from Backend)

socket.on('vitals_stream', (data) => {
    // Update Global Vitals Chart
    chartData.labels.shift();
    chartData.labels.push('');
    chartData.bpm.shift();
    chartData.bpm.push(data.bpm);
    chartData.spo2.shift();
    chartData.spo2.push(data.spo2);

    if (chartInstance) chartInstance.update('none');

    // Update Top Cards
    document.getElementById('stat-bpm').innerText = Math.round(data.bpm);
    document.getElementById('stat-temp').innerText = data.temp;

    // Update Gases
    updateGassesUI(data.ch4, data.co, data.o2);
});

socket.on('workers_update', (workers) => {
    workersData = workers;
    
    // Update stats
    document.getElementById('stat-active').innerText = workers.length;
    
    renderWorkersTable();
    renderRadar();
    renderFatigueAI();
});

socket.on('notification', (data) => {
    pushNotification(data.msg, data.isCritical);
    if(data.isCritical) alertIncrement();
});

socket.on('sos_alert', (data) => {
    document.getElementById('sos-worker-details').innerText = `Worker ${data.id} (${data.name}) triggered a manual SOS code in Sector Alpha. Immediate dispatch required.`;
    document.getElementById('sos-modal').classList.remove('hidden');
    alertIncrement();
    pushNotification(`MANUAL SOS: ${data.id} (${data.name})`, true);
});

// UI Rendering Functions
function updateGassesUI(ch4, co, o2) {
    const ch4Card = document.getElementById('gas-ch4-card');
    const ch4Warn = document.getElementById('gas-ch4-warnbg');
    const ch4Bar = document.getElementById('gas-ch4-bar');
    
    document.getElementById('gas-ch4-val').innerHTML = `${ch4}<span class="text-sm text-textMuted ml-1">%</span>`;
    ch4Bar.style.width = `${Math.min(100, ch4 * 100)}%`;
    
    if (ch4 > 0.25) {
        ch4Bar.classList.replace('bg-neonGreen', 'bg-neonRed');
        ch4Warn.style.opacity = '1';
    } else {
        ch4Bar.classList.replace('bg-neonRed', 'bg-neonGreen');
        ch4Warn.style.opacity = '0';
    }

    const coBar = document.getElementById('gas-co-bar');
    document.getElementById('gas-co-val').innerHTML = `${co}<span class="text-sm text-textMuted ml-1">ppm</span>`;
    coBar.style.width = `${Math.min(100, (co/50)*100)}%`;
}

function renderWorkersTable() {
    const tbody = document.getElementById('worker-table-body');
    tbody.innerHTML = '';
    
    workersData.forEach(w => {
        let statusBadge = `<span class="bg-neonGreen/10 text-neonGreen px-2 py-1 rounded text-xs font-semibold">Active</span>`;
        if (w.status === 'Warning') statusBadge = `<span class="bg-neonYellow/10 text-neonYellow px-2 py-1 rounded text-xs font-semibold">Warning</span>`;
        if (w.status === 'Critical') statusBadge = `<span class="bg-neonRed/10 text-neonRed px-2 py-1 rounded text-xs font-semibold animate-pulse">Critical</span>`;

        let fatigueColor = w.fatigue === 'Normal' ? 'text-neonGreen' : (w.fatigue === 'Caution' ? 'text-neonYellow' : 'text-neonRed');

        tbody.innerHTML += `
            <tr class="hover:bg-white/5 transition-colors">
                <td class="px-6 py-4 font-mono text-xs">${w.id}</td>
                <td class="px-6 py-4 font-medium">${w.name}</td>
                <td class="px-6 py-4">${statusBadge}</td>
                <td class="px-6 py-4">${w.bpm} BPM</td>
                <td class="px-6 py-4 font-semibold ${fatigueColor}">${w.fatigue}</td>
                <td class="px-6 py-4 text-center">
                    <button class="text-textMuted hover:text-white transition" title="View Profile"><i class="fa-solid fa-expand"></i></button>
                    <button class="ml-3 text-neonRed hover:text-red-500 transition" title="Trigger Manual SOS" onclick="triggerSOS('${w.id}', '${w.name}')"><i class="fa-solid fa-triangle-exclamation"></i></button>
                </td>
            </tr>
        `;
    });
}

function renderFatigueAI() {
    const list = document.getElementById('fatigue-list');
    list.innerHTML = '';
    const sorted = [...workersData].sort((a,b) => b.bpm - a.bpm).slice(0, 3); // Top 3 highest BPM

    sorted.forEach(w => {
        let color = 'bg-neonGreen';
        let bg = 'bg-neonGreen/10';
        let pct = 15 + Math.random() * 20;

        if (w.fatigue === 'Caution') { color = 'bg-neonYellow'; bg = 'bg-neonYellow/10'; pct = 60 + Math.random() * 20; }
        if (w.fatigue === 'Exhausted' || w.status === 'Critical') { color = 'bg-neonRed'; bg = 'bg-neonRed/10'; pct = 85 + Math.random() * 15; }

        list.innerHTML += `
            <div class="flex items-center justify-between p-3 rounded-lg ${bg} border border-white/5">
                <div class="flex items-center gap-3">
                    <div class="w-8 h-8 rounded-full bg-black/30 flex items-center justify-center font-mono text-xs shadow-inner">
                        <i class="fa-solid fa-user text-${color.split('-')[1]}"></i>
                    </div>
                    <div>
                        <p class="text-sm font-semibold">${w.name}</p>
                        <p class="text-xs text-textMuted">Predictive Load: ${Math.round(pct)}%</p>
                    </div>
                </div>
                <div class="${color.replace('bg-', 'text-')} font-bold text-sm">
                    ${w.fatigue}
                </div>
            </div>
        `;
    });
}

function renderRadar() {
    const radar = document.getElementById('radar-workers');
    let html = '';
    workersData.forEach(w => {
        let colorClass = 'text-neonGreen';
        if(w.status === 'Warning') colorClass = 'text-neonYellow';
        if(w.status === 'Critical') colorClass = 'text-neonRed';

        html += `<div class="worker-dot bg-current ${colorClass}" style="left: ${w.loc_x}%; top: ${w.loc_y}%;" title="${w.id}"></div>`;
    });
    radar.innerHTML = html;
}

function pushNotification(msg, isCritical = false) {
    const list = document.getElementById('notif-list');
    document.getElementById('notif-badge').classList.remove('hidden');

    const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
    const color = isCritical ? 'text-neonRed' : 'text-neonYellow';
    const bg = isCritical ? 'bg-neonRed/10 border-neonRed/50' : 'bg-white/5 border-white/10';
    const icon = isCritical ? 'fa-triangle-exclamation' : 'fa-bell';

    const el = document.createElement('div');
    el.className = `p-3 rounded-lg border ${bg} flex gap-3 items-start animate-fade-in`;
    el.innerHTML = `
        <i class="fa-solid ${icon} ${color} mt-0.5"></i>
        <div>
            <p class="text-sm font-medium ${isCritical ? 'text-white' : 'text-gray-200'}">${msg}</p>
            <p class="text-xs text-textMuted mt-1">${time}</p>
        </div>
    `;
    
    list.prepend(el);
    if(list.children.length > 20) list.removeChild(list.lastChild);
}

document.getElementById('clear-notif').addEventListener('click', () => {
    document.getElementById('notif-list').innerHTML = '';
    document.getElementById('notif-badge').classList.add('hidden');
});

function alertIncrement() {
    criticalAlertsCount++;
    const alertEl = document.getElementById('stat-alerts');
    const alertCard = document.getElementById('stat-alert-card');
    
    alertEl.innerText = criticalAlertsCount;
    alertCard.classList.add('glow-red');
    
    setTimeout(() => {
        alertCard.classList.remove('glow-red');
    }, 2000);
}

// Global SOS Emitted natively back to Server
window.triggerSOS = function(id, name) {
    socket.emit('trigger_sos', { id, name });
};

// Fetch logs via API Rest
async function fetchLogs() {
    try {
        const response = await fetch('/api/logs');
        const logs = await response.json();
        
        // Populate historical logs silently without popping up
        const list = document.getElementById('notif-list');
        logs.reverse().forEach(log => {
            const isCritical = ['CRITICAL', 'SOS_TRIGGERED'].includes(log.event_type);
            const time = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
            const color = isCritical ? 'text-neonRed' : 'text-neonYellow';
            const bg = isCritical ? 'bg-neonRed/10 border-neonRed/50' : 'bg-white/5 border-white/10';
            const icon = isCritical ? 'fa-triangle-exclamation' : 'fa-bell';

            const el = document.createElement('div');
            el.className = `p-3 rounded-lg border ${bg} flex gap-3 items-start opacity-70 hover:opacity-100 transition`;
            el.innerHTML = `
                <i class="fa-solid ${icon} ${color} mt-0.5"></i>
                <div>
                    <p class="text-sm font-medium ${isCritical ? 'text-white' : 'text-gray-200'}">${log.message}</p>
                    <p class="text-xs text-textMuted mt-1">${time} - DB RECORD</p>
                </div>
            `;
            list.prepend(el);
        });
    } catch (e) {
        console.error("Failed to fetch past logs:", e);
    }
}
