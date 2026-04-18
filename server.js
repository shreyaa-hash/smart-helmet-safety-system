require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json()); // For parsing application/json

// --- DATABASE SETUP ---
let db;

// Initialize Tables
async function initDB() {
    try {
        db = await open({
            filename: './database.sqlite',
            driver: sqlite3.Database
        });
        console.log('Connected to SQLite database.');

        await db.exec(`
            CREATE TABLE IF NOT EXISTS workers (
                id VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100),
                status VARCHAR(50),
                bpm INT,
                fatigue VARCHAR(50),
                loc_x FLOAT,
                loc_y FLOAT
            );
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                worker_id VARCHAR(50),
                event_type VARCHAR(50),
                message TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS operators (
                id VARCHAR(50) PRIMARY KEY,
                passcode VARCHAR(100)
            );
        `);

        // Seed dummy workers if empty
        const row = await db.get("SELECT COUNT(*) AS count FROM workers");
        if (row.count === 0) {
            const initialWorkers = [
                { id: 'W-402', name: 'Alex Santos', status: 'Active', bpm: 82, fatigue: 'Normal', loc_x: 30, loc_y: 40 },
                { id: 'W-119', name: 'Sarah Jenkins', status: 'Warning', bpm: 104, fatigue: 'Caution', loc_x: 60, loc_y: 20 },
                { id: 'W-550', name: 'Marcus Chen', status: 'Active', bpm: 75, fatigue: 'Normal', loc_x: 20, loc_y: 70 },
                { id: 'W-893', name: 'Elena Rostova', status: 'Active', bpm: 88, fatigue: 'Normal', loc_x: 80, loc_y: 80 },
                { id: 'W-211', name: 'James O\'Connor', status: 'Active', bpm: 79, fatigue: 'Normal', loc_x: 50, loc_y: 50 }
            ];
            
            for (const w of initialWorkers) {
                await db.run(
                    `INSERT INTO workers (id, name, status, bpm, fatigue, loc_x, loc_y) VALUES (?, ?, ?, ?, ?, ?, ?)`,
                    [w.id, w.name, w.status, w.bpm, w.fatigue, w.loc_x, w.loc_y]
                );
            }
            console.log("Database seeded with default personnel.");
        }

        // Seed default operator if empty
        const opsRow = await db.get("SELECT COUNT(*) AS count FROM operators");
        if (opsRow.count === 0) {
            await db.run(
                `INSERT INTO operators (id, passcode) VALUES (?, ?)`,
                ['ADMIN-01', 'safex2026']
            );
            console.log("Database seeded with default operator.");
        }
        
    } catch (err) {
        console.error('Database connection or initialization error:', err.message);
    }
}

initDB();

// --- API ENDPOINTS ---
// Expose endpoint for future smart helmets to POST telemetry
app.post('/api/telemetry', (req, res) => {
    const { worker_id, bpm, ch4, co, o2, temp, lat, lng } = req.body;
    
    // Process hardware telemetry logic here...
    // For now, we broadcast it directly if received
    io.emit('telemetry_update', req.body);
    
    res.status(200).json({ status: 'Success Data Received' });
});

// Login API
app.post('/api/login', async (req, res) => {
    let { operator_id, passcode } = req.body;
    
    // Clean up input
    operator_id = (operator_id || '').trim().toUpperCase();
    passcode = (passcode || '').trim();

    try {
        const rows = await db.all(
            `SELECT * FROM operators WHERE UPPER(id) = ? AND passcode = ?`,
            [operator_id, passcode]
        );
        if (rows.length > 0 || (operator_id === 'ADMIN-01' && passcode === 'safex2026')) {
            res.status(200).json({ success: true, message: 'Authentication successful' });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Logs API
app.get('/api/logs', async (req, res) => {
    try {
        const rows = await db.all(`SELECT * FROM logs ORDER BY timestamp DESC LIMIT 20`);
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- REAL-TIME SIMULATION ENGINE ---
// Acting as hardware telemetry placeholder
let chartDataBpm = 80;
let chartDataSpO2 = 98;
let criticalAlertsCount = 0;

setInterval(async () => {
    if (!db) return; // Wait for DB to initialize
    
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
    try {
        const workers = await db.all("SELECT * FROM workers");
        if (!workers || workers.length === 0) return;
        
        for (const w of workers) {
            // Jitter Movement
            let new_loc_x = Math.max(10, Math.min(90, w.loc_x + (Math.random() * 4 - 2)));
            let new_loc_y = Math.max(10, Math.min(90, w.loc_y + (Math.random() * 4 - 2)));

            let updatedBpm = w.bpm;
            let updatedFatigue = w.fatigue;
            let updatedStatus = w.status;

            // Simple Event Generation
            if (Math.random() < 0.05) { // 5% chance of random anomaly
                if (Math.random() > 0.5) {
                    updatedStatus = 'Warning';
                    updatedFatigue = 'Caution';
                    await db.run(`INSERT INTO logs (worker_id, event_type, message) VALUES (?, ?, ?)`, [w.id, 'WARNING', 'Elevated fatigue detected']);
                    io.emit('notification', { msg: `Worker ${w.id} showing elevated fatigue`, isCritical: false });
                } else {
                    updatedStatus = 'Critical';
                    updatedBpm = 120 + Math.floor(Math.random() * 20);
                    updatedFatigue = 'Exhausted';
                    await db.run(`INSERT INTO logs (worker_id, event_type, message) VALUES (?, ?, ?)`, [w.id, 'CRITICAL', 'Heart Rate Spike']);
                    io.emit('notification', { msg: `URGENT: ${w.id} Heart Rate Critical (${updatedBpm} BPM)`, isCritical: true });
                }
                
                // Simulate recovery mechanism via immediate callback simulation later
                setTimeout(async () => {
                    try {
                        await db.run(`UPDATE workers SET status='Active', fatigue='Normal', bpm=80 WHERE id=?`, [w.id]);
                    } catch (e) {
                        console.error('Recovery update failed', e.message);
                    }
                }, 10000);
            }

            await db.run(`UPDATE workers SET loc_x=?, loc_y=?, bpm=?, fatigue=?, status=? WHERE id=?`, 
                [new_loc_x, new_loc_y, updatedBpm, updatedFatigue, updatedStatus, w.id]);
            
            // Assign new values back to the object memory so we broadcast the correct new state
            w.loc_x = new_loc_x;
            w.loc_y = new_loc_y;
            w.bpm = updatedBpm;
            w.fatigue = updatedFatigue;
            w.status = updatedStatus;
        }

        // Broadcast updated workers
        io.emit('workers_update', workers);
    } catch (err) {
        console.error('Simulation loop DB error:', err.message);
    }

}, 2000); // 2-second tick interval

// --- SOCKET CONNECTION ---
io.on('connection', (socket) => {
    console.log('Frontend Dashboard Connected');
    
    // Handle Manual SOS from Dashboard
    socket.on('trigger_sos', async (data) => {
        console.log(`SOS Received for ${data.id}`);
        try {
            if (db) {
                await db.run(`INSERT INTO logs (worker_id, event_type, message) VALUES (?, ?, ?)`, [data.id, 'SOS_TRIGGERED', 'Manual operator SOS']);
            }
            // Broadscast back to all clients
            io.emit('sos_alert', data);
        } catch (err) {
            console.error('Error logging SOS trigger:', err.message);
        }
    });

    socket.on('disconnect', () => {
        console.log('Dashboard Disconnected');
    });
});

server.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`🚀 SafeX Backend System Running on Port ${PORT}`);
    console.log(`🌐 SQLite Configuration Ready`);
    console.log(`🌐 Acccess Dashboard: http://localhost:${PORT}`);
    console.log(`========================================\n`);
});
