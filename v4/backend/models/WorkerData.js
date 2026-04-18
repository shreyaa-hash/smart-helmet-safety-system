const mongoose = require('mongoose');

const workerDataSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    heartRate: { type: Number, default: 80 },
    bodyTemp: { type: Number, default: 37.0 },
    gasMethane: { type: Number, default: 0.1 },
    gasCO: { type: Number, default: 5 },
    oxygen: { type: Number, default: 20.9 },
    isHelmetOn: { type: Boolean, default: true },
    condition: { type: String, enum: ['Safe', 'Warning', 'Danger'], default: 'Safe' },
    locationX: { type: Number, default: 50 },
    locationY: { type: Number, default: 50 }
}, { timestamps: true });

module.exports = mongoose.model('WorkerData', workerDataSchema);
