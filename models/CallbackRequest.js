const mongoose = require('mongoose');

const CallbackRequestSchema = new mongoose.Schema({
  name: {
    type: String,
    trim: true,
    default: ''
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  contacted: {
    type: Boolean,
    default: false
  },
  status: {
    type: String,
    enum: ["Pending", "Done"],
    default: "Pending"
  }
}, { timestamps: true });

module.exports = mongoose.model('CallbackRequest', CallbackRequestSchema);
