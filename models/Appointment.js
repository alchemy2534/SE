const mongoose = require("mongoose");

const AppointmentSchema = new mongoose.Schema(
  {
    // Patient who booked the appointment
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Doctor for the appointment
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    // Date of the appointment
    date: {
      type: Date,
      required: true,
    },

    // Time slot string (e.g., "10:00 AM")
    timeSlot: {
      type: String,
      required: true,
    },

    // Current status of the appointment
    status: {
      type: String,
      // added Acknowledged to represent cancellation acknowledgement (displayed as ACKNOWLEDGE)
      enum: ["Pending", "Confirmed", "Completed", "Cancelled", "Acknowledged", "Walk-in"],
      default: "Pending",
    },

    // Source of booking (online / offline)
    source: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },

    // cancellation details (if admin cancels and suggests alternatives)
    cancellation: {
      reason: { type: String, trim: true },
      // list of suggested alternatives (doctor + date + timeSlot)
      suggestions: [
        {
          doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          date: { type: Date },
          timeSlot: { type: String }
        }
      ],
      notified: { type: Boolean, default: false },
      // notification metadata when a message was sent
      notification: {
        provider: { type: String },
        sid: { type: String },
        sentAt: { type: Date },
        to: { type: String },
        status: { type: String },
        error: { type: String }
      }
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("Appointment", AppointmentSchema);
