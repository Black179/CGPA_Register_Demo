const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    lockedSemesters: {
        type: [Number],
        default: []
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Settings', settingsSchema);
