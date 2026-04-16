const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // For parsing application/json

// --- DATABASE SETUP ---
const db = new sqlite3.Database('./database.sqlite', (err) => {
    if (err) console.error('Database connection error:', err.message);
    else console.log('Connected to SQLite database.');
});

// Initialize Tables
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS workers (
            id TEXT PRIMARY KEY,
            name TEXT,
            status TEXT,
            bpm INTEGER,
            fatigue TEXT,
            loc_x REAL,
            loc_y REAL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            worker_id TEXT,
            event_type TEXT,
            message TEXT,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Seed dummy workers if empty
    db.get("SELECT COUNT(*) AS count FROM workers", (err, row) => {
        if (row && row.count === 0) {
            const initialWorkers = [
                { id: 'W-402', name: 'Alex Santos', status: 'Active', bpm: 82, fatigue: 'Normal', loc_x: 30, loc_y: 40 },
                { id: 'W-119', name: 'Sarah Jenkins', status: 'Warning', bpm: 104, fatigue: 'Caution', loc_x: 60, loc_y: 20 },
                { id: 'W-550', name: 'Marcus Chen', status: 'Active', bpm: 75, fatigue: 'Normal', loc_x: 20, loc_y: 70 },
                { id: 'W-893', name: 'Elena Rostova', status: 'Active', bpm: 88, fatigue: 'Normal', loc_x: 80, loc_y: 80 },
                { id: 'W-211', name: 'James O\'Connor', status: 'Active', bpm: 79, fatigue: 'Normal', loc_x: 50, loc_y: 50 }
            ];
            const stmt = db.prepare(`INSERT INTO workers (id, name, status, bpm, fatigue, loc_x, loc_y) VALUES (?, ?, ?, ?, ?, ?, ?)`);
            initialWorkers.forEach(w => stmt.run(w.id, w.name, w.status, w.bpm, w.fatigue, w.loc_x, w.loc_y));
            stmt.finalize();
            console.log("Database seeded with default personnel.");
        }
    });
});

// --- API ENDPOINTS ---
// Expose endpoint for future smart helmets to POST telemetry
app.post('/api/telemetry', (req, res) => {
    const { worker_id, bpm, ch4, co, o2, temp, lat, lng } = req.body;
    
    // Process hardware telemetry logic here...
    // For now, we broadcast it directly if received
    io.emit('telemetry_update', req.body);
    
    res.status(200).json({ status: 'Success Data Received' });
});

// Logs API
app.get('/api/logs', (req, res) => {
    db.all(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT 20`, [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// --- REAL-TIME SIMULATION ENGINE ---
// Acting as hardware telemetry placeholder
let chartDataBpm = 80;
let chartDataSpO2 = 98;
let criticalAlertsCount = 0;

setInterval(() => {
    // 1. Simulate Vitals
    chartDataBpm = Math.max(60, Math.min(110, chartDataBpm + (Math.random() * 6 - 3)));
    chartDataSpO2 = 95 + Math.random() * 4.9;
    const temp = (37.0 + Math.random() * 0.5).toFixed(1);

    // 2. Simulate Gases
    const ch4 = (Math.random() * 0.3).toFixed(2);
    const co = Math.floor(Math.random() * 15);

    // Emit Fleet Vitals Stream
    io.emit('vitals_stream', { bpm: chartDataBpm, spo2: chartDataSpO2, temp, ch4, co, o2: 20.9 });

    // 3. Update Worker Locations & Random Events in DB
    db.all("SELECT * FROM workers", [], (err, workers) => {
        if (err || !workers) return;
        
        workers.forEach(w => {
            // Jitter Movement
            w.loc_x = Math.max(10, Math.min(90, w.loc_x + (Math.random() * 4 - 2)));
            w.loc_y = Math.max(10, Math.min(90, w.loc_y + (Math.random() * 4 - 2)));

            let updatedBpm = w.bpm;
            let updatedFatigue = w.fatigue;
            let updatedStatus = w.status;

            // Simple Event Generation
            if (Math.random() < 0.05) { // 5% chance of random anomaly
                if (Math.random() > 0.5) {
                    updatedStatus = 'Warning';
                    updatedFatigue = 'Caution';
                    db.run(`INSERT INTO logs (worker_id, event_type, message) VALUES (?, ?, ?)`, [w.id, 'WARNING', 'Elevated fatigue detected']);
                    io.emit('notification', { msg: `Worker ${w.id} showing elevated fatigue`, isCritical: false });
                } else {
                    updatedStatus = 'Critical';
                    updatedBpm = 120 + Math.floor(Math.random() * 20);
                    updatedFatigue = 'Exhausted';
                    db.run(`INSERT INTO logs (worker_id, event_type, message) VALUES (?, ?, ?)`, [w.id, 'CRITICAL', 'Heart Rate Spike']);
                    io.emit('notification', { msg: `URGENT: ${w.id} Heart Rate Critical (${updatedBpm} BPM)`, isCritical: true });
                }
                
                // Simulate recovery mechanism via immediate callback simulation later
                setTimeout(() => {
                    db.run(`UPDATE workers SET status='Active', fatigue='Normal', bpm=80 WHERE id=?`, [w.id]);
                }, 10000);
            }

            db.run(`UPDATE workers SET loc_x=?, loc_y=?, bpm=?, fatigue=?, status=? WHERE id=?`, 
                [w.loc_x, w.loc_y, updatedBpm, updatedFatigue, updatedStatus, w.id]);
        });

        // Broadcast updated workers
        io.emit('workers_update', workers);
    });

}, 2000); // 2-second tick interval

// --- SOCKET CONNECTION ---
io.on('connection', (socket) => {
    console.log('Frontend Dashboard Connected');
    
    // Handle Manual SOS from Dashboard
    socket.on('trigger_sos', (data) => {
        console.log(`SOS Received for ${data.id}`);
        db.run(`INSERT INTO logs (worker_id, event_type, message) VALUES (?, ?, ?)`, [data.id, 'SOS_TRIGGERED', 'Manual operator SOS']);
        // Broadscast back to all clients
        io.emit('sos_alert', data);
    });

    socket.on('disconnect', () => {
        console.log('Dashboard Disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 SafeX Backend System Running on Port ${PORT}`);
    console.log(`🌐 Acccess Dashboard: http://localhost:${PORT}`);
    console.log(`========================================\n`);
});
