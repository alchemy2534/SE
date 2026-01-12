// routes/doctorRoutes.js
const express = require("express");
const router = express.Router();

const User = require("../models/User");
const Reminder = require("../models/Reminder");
const Appointment = require("../models/Appointment"); // make sure this file exists

const auth = require("../middleware/auth"); // this is your auth.js

const {
  getDoctorAppointments,
  updateAppointmentStatusDoctor,
  scheduleNextAppointment,
} = require("../controllers/doctorController");

// ---------- APPOINTMENTS ----------

// GET all appointments for logged-in doctor
router.get(
  "/appointments",
  auth(["doctor"]),
  getDoctorAppointments
);

// UPDATE status of an appointment (Confirm / Complete / Cancel)
router.patch(
  "/appointments/:id/status",
  auth(["doctor"]),
  updateAppointmentStatusDoctor
);

// SCHEDULE next appointment based on an existing one
router.post(
  "/appointments/:id/next",
  auth(["doctor"]),
  scheduleNextAppointment
);

// ---------- REMINDERS ----------

// GET all reminders for this doctor
router.get(
  "/reminders",
  auth(["doctor"]),
  async (req, res) => {
    try {
      const reminders = await Reminder.find({
        doctor: req.user._id,
        isDone: false,
      }).sort({ date: 1 });

      res.json({ success: true, reminders });
    } catch (err) {
      console.error("REMINDERS GET ERROR:", err);
      res.status(500).json({ success: false, message: "Failed to load reminders" });
    }
  }
);

// POST create new reminder
router.post(
  "/reminders",
  auth(["doctor"]),
  async (req, res) => {
    try {
      const { patientName, description, date } = req.body;

      if (!patientName || !description || !date) {
        return res
          .status(400)
          .json({ success: false, message: "patientName, description and date are required" });
      }

      const reminder = await Reminder.create({
        doctor: req.user._id,
        patientName,
        description,
        date, // "YYYY-MM-DD" is fine
      });

      res.status(201).json({ success: true, reminder });
    } catch (err) {
      console.error("REMINDERS CREATE ERROR:", err);
      res.status(500).json({ success: false, message: "Failed to create reminder" });
    }
  }
);

// PATCH mark reminder done
router.patch(
  "/reminders/:id",
  auth(["doctor"]),
  async (req, res) => {
    try {
      const reminder = await Reminder.findOneAndUpdate(
        { _id: req.params.id, doctor: req.user._id },
        { isDone: true },
        { new: true }
      );

      if (!reminder) {
        return res
          .status(404)
          .json({ success: false, message: "Reminder not found" });
      }

      res.json({ success: true, reminder });
    } catch (err) {
      console.error("REMINDERS PATCH ERROR:", err);
      res.status(500).json({ success: false, message: "Failed to update reminder" });
    }
  }
);

// DELETE a reminder
router.delete(
  "/reminders/:id",
  auth(["doctor"]),
  async (req, res) => {
    try {
      const result = await Reminder.findOneAndDelete({
        _id: req.params.id,
        doctor: req.user._id,
      });

      if (!result) {
        return res
          .status(404)
          .json({ success: false, message: "Reminder not found" });
      }

      res.json({ success: true, message: "Reminder deleted" });
    } catch (err) {
      console.error("REMINDERS DELETE ERROR:", err);
      res.status(500).json({ success: false, message: "Failed to delete reminder" });
    }
  }
);

// ---------- PATIENTS ----------
// GET patients who have appointments with the logged-in doctor
router.get("/patients", auth(["doctor"]), async (req, res) => {
  try {
    // 1. Find all appointments for this doctor and populate the patient
    const appts = await Appointment.find({ doctor: req.user._id })
      .populate({
        path: "patient",
        model: "User",
        select: "name email phone",   // 👈 make sure email + phone are selected
      })
      .lean();

    // 2. Deduplicate patients by _id
    const map = new Map();

    appts.forEach((a) => {
      if (!a.patient) return;
      const id = String(a.patient._id);

      if (!map.has(id)) {
        map.set(id, {
          id,
          name: a.patient.name || "Patient",
          email: a.patient.email || "",
          phone: a.patient.phone || "",
        });
      }
    });

    const patients = Array.from(map.values());

    return res.json({ success: true, patients });
  } catch (err) {
    console.error("DOCTOR PATIENTS ERROR:", err);
    return res.status(500).json({
      success: false,
      message: "Failed to load patients",
    });
  }
});

// ---------- PATIENT FILES ----------
// GET files for a specific patient (Doctor must have an appointment with this patient? Or just any patient?
// For simplicity, assuming if they are in the doctor's patient list/appointments, they can view.
// But the UI sends patientId.
// We'll trust the ID but ensure the user is a doctor.
router.get("/patients/:id/files", auth(["doctor"]), async (req, res) => {
  try {
    const PatientFile = require("../models/PatientFile");
    const files = await PatientFile.find({ patient: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, files });
  } catch (err) {
    console.error("DOCTOR GET FILES ERROR:", err);
    res.status(500).json({ success: false, message: "Failed to load files" });
  }
});

module.exports = router;
