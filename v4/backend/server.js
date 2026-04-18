require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const WorkerData = require('./models/WorkerData');
const Alert = require('./models/Alert');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

// Socket.io Real-time Logic
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // When worker sends telemetry data
    socket.on('worker_telemetry', async (data) => {
        try {
            // data contains: userId, heartRate, bodyTemp, gases, etc.
            const updatedData = await WorkerData.findOneAndUpdate(
                { userId: data.userId },
                { ...data, condition: data.heartRate > 100 || data.gasMethane > 0.2 ? 'Danger' : 'Safe' },
                { new: true, upsert: true }
            ).populate('userId', 'fullName role status');

            // Broadcast to admins
            io.emit('admin_dashboard_update', updatedData);
        } catch (err) {
            console.error('Error saving telemetry:', err);
        }
    });

    // Emergency SOS Trigger
    socket.on('trigger_sos', async (data) => {
        try {
            const alert = new Alert({
                userId: data.userId,
                type: 'SOS',
                message: `Worker triggered manual SOS! Immediate assistance required.`
            });
            await alert.save();
            
            // Broadcast emergency to all clients (admins & workers)
            io.emit('emergency_alert', alert);
        } catch (err) {
            console.error('Error saving SOS:', err);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend server running on port ${PORT}`));
