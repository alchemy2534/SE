const express = require("express");
const router = express.Router();
const Appointment = require("../models/Appointment");
const Prescription = require("../models/Prescription");
const User = require("../models/User");
const Feedback = require("../models/Feedback");

// ===============================
//  HELPER: Validate future date/time
// ===============================
const isValidFutureDateTime = (dateStr, timeSlot) => {
  const appointmentDate = new Date(dateStr);
  const now = new Date();
  now.setHours(0, 0, 0, 0); // Start of today

  // Check if date is in the past
  if (appointmentDate < now) {
    return false; // Date is outdated
  }

  // If date is today, check time slot
  if (appointmentDate.getTime() === now.getTime()) {
    // Parse time slot (e.g., "09:00 AM", "02:30 PM")
    const [time, period] = timeSlot.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour = hours;
    if (period === 'PM' && hours !== 12) hour += 12;
    if (period === 'AM' && hours === 12) hour = 0;

    const appointmentTime = new Date();
    appointmentTime.setHours(hour, minutes, 0, 0);

    if (appointmentTime <= now) {
      return false; // Time slot has passed
    }
  }

  return true; // Valid future date/time
};

// ===============================
//  BOOK APPOINTMENT (from patient)
//  POST /api/patient/appointments
// ===============================
router.post("/appointments", async (req, res) => {
  try {
    const { patientId, doctorId, date, timeSlot } = req.body;

    if (!patientId || !doctorId || !date || !timeSlot) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    // Validate that date and time are in the future
    if (!isValidFutureDateTime(date, timeSlot)) {
      return res.status(400).json({
        success: false,
        message: "Please select a future date and time for your appointment",
      });
    }

    // Make sure patient and doctor exist
    const patient = await User.findById(patientId);
    const doctor = await User.findById(doctorId);

    if (!patient || !doctor || doctor.role !== "doctor") {
      return res.status(400).json({
        success: false,
        message: "Invalid patient or doctor",
      });
    }

    // 🔹 Check if this slot is already booked (prevent race condition)
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingAppt = await Appointment.findOne({
      doctor: doctor._id,
      date: { $gte: dayStart, $lte: dayEnd },
      timeSlot: timeSlot,
      status: { $nin: ["Cancelled", "Acknowledged"] },
    });

    if (existingAppt) {
      return res.status(400).json({
        success: false,
        message: "This time slot is no longer available. Another patient just booked it. Please select a different slot.",
      });
    }

    // Create and save appointment
    const appt = new Appointment({
      patient: patient._id,
      doctor: doctor._id,
      date,
      timeSlot,
      status: "Pending",
    });

    await appt.save();

    return res.json({
      success: true,
      message: "Appointment booked successfully",
      appointment: {
        _id: appt._id,
        date: appt.date,
        timeSlot: appt.timeSlot,
        status: appt.status,
        doctorName: doctor.name,
        patientName: patient.name,
      },
    });
  } catch (err) {
    console.error("BOOK APPOINTMENT ERROR:", err);
    res
      .status(500)
      .json({ success: false, message: "Server Error while booking appointment" });
  }
});

// ===============================
//  GET patient dashboard data
//  GET /api/patient/dashboard/:patientId
// ===============================
router.get("/dashboard/:patientId", async (req, res) => {
  try {
    const patientId = req.params.patientId;

    // Fetch appointments for this patient
    const appointments = await Appointment.find({ patient: patientId })
      .populate("doctor", "name");

    // Fetch prescriptions for this patient
    const prescriptions = await Prescription.find({ patient: patientId })
      .populate("doctor", "name");

    // Shape data for the frontend (matches patient_dashboard.html expectations)
    const appointmentsData = appointments.map(a => ({
      _id: a._id,
      date: a.date,
      timeSlot: a.timeSlot,
      status: a.status,
      doctorName: a.doctor ? a.doctor.name : "Unknown",
    }));

    const prescriptionsData = prescriptions.map(p => ({
      _id: p._id,
      date: p.date,
      doctorName: p.doctor ? p.doctor.name : "Unknown",
      fileUrl: p.fileUrl, // assumes Prescription model has fileUrl
    }));

    res.json({
      success: true,
      appointments: appointmentsData,
      prescriptions: prescriptionsData,
    });
  } catch (err) {
    console.error("PATIENT DASHBOARD ERROR:", err);
    res
      .status(500)
      .json({ success: false, message: "Server Error" });
  }
});
router.post("/feedback", async (req, res) => {
  try {
    const { patientId, name, message, rating } = req.body;

    if (!patientId || !message) {
      return res.status(400).json({ success: false, message: "All fields required" });
    }

    const feedback = new Feedback({
      patient: patientId,
      name,
      message,
      rating: rating || 5
    });

    await feedback.save();

    res.json({ success: true, message: "Feedback submitted successfully!" });
  } catch (err) {
    console.error("Feedback Error:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
// ------------------------------------------------------
//  SUBMIT FEEDBACK (patient)
//  POST /api/patient/feedback
// ------------------------------------------------------
router.post("/feedback", async (req, res) => {
  try {
    const { patientId, name, message, rating } = req.body;

    if (!patientId || !name || !message) {
      return res
        .status(400)
        .json({ success: false, message: "patientId, name and message are required" });
    }

    const feedback = await Feedback.create({
      patient: patientId,
      name,
      message,
      rating: rating || 5,
    });

    return res.json({
      success: true,
      message: "Feedback submitted successfully",
      feedback,
    });
  } catch (err) {
    console.error("FEEDBACK ROUTE ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server error while saving feedback" });
  }
});

module.exports = router;
