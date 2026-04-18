const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['admin', 'worker'], default: 'worker' },
    fullName: { type: String, required: true },
    status: { type: String, enum: ['Offline', 'Online', 'Danger'], default: 'Offline' }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
