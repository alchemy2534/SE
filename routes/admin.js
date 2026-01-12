const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");

const User = require("../models/User");
const Appointment = require("../models/Appointment");
const Notification = require("../models/Notification");
const auth = require("../middleware/auth");

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

// ============================================================
//  ADD DOCTOR (Admin Only)
// ============================================================
router.post("/add-doctor", auth(["admin"]), async (req, res) => {
  try {
    const { name, email, phone, password, speciality } = req.body;

    if (!name || !email || !phone || !password) {
      return res
        .status(400)
        .json({ success: false, message: "All fields are required" });
    }

    const existing = await User.findOne({ email, role: "doctor" });
    if (existing) {
      return res
        .status(400)
        .json({ success: false, message: "Doctor already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const doctor = new User({
      name,
      email,
      phone,
      speciality: speciality || "",
      password: hashedPassword,
      role: "doctor",
    });

    await doctor.save();

    return res.json({
      success: true,
      message: "Doctor added successfully!",
      doctor: {
        _id: doctor._id,
        name: doctor.name,
        email: doctor.email,
        phone: doctor.phone,
        speciality: doctor.speciality,
        role: doctor.role,
      },
    });
  } catch (err) {
    console.error("ADD DOCTOR ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server Error while adding doctor" });
  }
});

// ============================================================
//  GET ALL DOCTORS (Admin Only)
// ============================================================
router.get("/doctors", auth(["admin"]), async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" }).select(
      "-password -resetOtp -resetOtpExpiry"
    );

    return res.json({ success: true, doctors });
  } catch (err) {
    console.error("GET DOCTORS ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server Error while fetching doctors" });
  }
});

// ============================================================
//  GET ALL PATIENTS (Admin Only)
// ============================================================
router.get("/patients", auth(["admin"]), async (req, res) => {
  try {
    const patients = await User.find({ role: "patient" }).select(
      "-password -resetOtp -resetOtpExpiry"
    );

    return res.json({ success: true, patients });
  } catch (err) {
    console.error("GET PATIENTS ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server Error while fetching patients" });
  }
});

// ============================================================
//  DELETE DOCTOR (Admin Only)
// ============================================================
router.delete("/delete-doctor/:id", auth(["admin"]), async (req, res) => {
  try {
    const doctorId = req.params.id;

    const doctor = await User.findOneAndDelete({
      _id: doctorId,
      role: "doctor",
    });

    if (!doctor) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    return res.json({
      success: true,
      message: "Doctor deleted successfully",
    });
  } catch (err) {
    console.error("DELETE DOCTOR ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server Error while deleting doctor" });
  }
});

// ============================================================
//  EDIT DOCTOR (Admin Only)
// ============================================================
router.put("/edit-doctor/:id", auth(["admin"]), async (req, res) => {
  try {
    const { name, email, phone, speciality } = req.body;

    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, role: "doctor" },
      { name, email, phone, speciality },
      { new: true }
    ).select("-password -resetOtp -resetOtpExpiry");

    if (!updated) {
      return res
        .status(404)
        .json({ success: false, message: "Doctor not found" });
    }

    return res.json({
      success: true,
      message: "Doctor updated successfully",
      doctor: updated,
    });
  } catch (err) {
    console.error("EDIT DOCTOR ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server Error while editing doctor" });
  }
});

// ============================================================
//  PUBLIC ROUTE FOR PATIENT DASHBOARD TO FETCH DOCTORS
// ============================================================
router.get("/public/doctors", async (req, res) => {
  try {
    const doctors = await User.find({ role: "doctor" }).select(
      "-password -resetOtp -resetOtpExpiry"
    );

    return res.json({ success: true, doctors });
  } catch (err) {
    console.error("PUBLIC DOCTORS ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server Error while fetching doctors" });
  }
});

// ============================================================
//  GET ALL APPOINTMENTS (Admin Only)
// ============================================================
router.get("/appointments", auth(["admin"]), async (req, res) => {
  try {
    // By default do not return Completed or Cancelled appointments (keeps UI clean).
    // Use ?showCompleted=true or ?showCancelled=true to include them when needed.
    const includeCompleted = String(req.query.showCompleted || '').toLowerCase() === 'true';
    // we now use 'Acknowledged' for cancellations; allow fetching acknowledged items with ?showAcknowledged=true
    const includeAcknowledged = String(req.query.showAcknowledged || '').toLowerCase() === 'true';

    let filter = {};
    if (!includeCompleted || !includeAcknowledged) {
      const exclude = [];
      if (!includeCompleted) exclude.push('Completed');
      if (!includeAcknowledged) exclude.push('Acknowledged');
      if (exclude.length) filter.status = { $nin: exclude };
    }

    const appts = await Appointment.find(filter)
      .populate("patient", "_id name phone")
      .populate("doctor", "_id name")
      .sort({ date: 1, timeSlot: 1 });

    // Debug: log how many appointments are returned and the filter applied
    console.log(`ADMIN GET APPOINTMENTS: includeCompleted=${includeCompleted} includeAcknowledged=${includeAcknowledged} count=${appts.length}`);

    const formatted = appts.map((a) => ({
      _id: a._id,
      patientId: a.patient?._id,
      patientName: a.patient ? a.patient.name : "Unknown",
      patientPhone: a.patient ? a.patient.phone : "-",
      doctorId: a.doctor?._id,
      doctorName: a.doctor ? a.doctor.name : "Unknown",
      date: a.date,
      timeSlot: a.timeSlot,
      status: a.status,
      source: a.source || 'online',
      cancellation: a.cancellation || null
    }));

    // ---------------------------------------------------------
    // DOCTOR AVAILABILITY: occupied slots for a doctor on a given date
    // GET /api/admin/appointments/doctor/availability?doctorId=...&date=YYYY-MM-DD
    // ---------------------------------------------------------
    router.get('/appointments/doctor/availability', auth(['admin', 'doctor']), async (req, res) => {
      try {
        const { doctorId, date } = req.query;
        if (!doctorId || !date) return res.status(400).json({ success: false, message: 'doctorId and date required' });

        // sample business slots
        const allSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const taken = await Appointment.find({ doctor: doctorId, date: { $gte: dayStart, $lte: dayEnd } }).select('timeSlot status');
        const occupied = taken.map(t => t.timeSlot);
        const available = allSlots.filter(s => !occupied.includes(s));

        return res.json({ success: true, occupied, available, allSlots });
      } catch (err) { console.error('AVAILABILITY ERROR', err); return res.status(500).json({ success: false, message: 'Server Error' }); }
    });

    // ---------------------------------------------------------
    // PUBLIC: DOCTOR AVAILABILITY (for patient booking UI)
    // GET /api/admin/appointments/public/doctor/availability?doctorId=...&date=YYYY-MM-DD
    // ---------------------------------------------------------
    router.get('/appointments/public/doctor/availability', async (req, res) => {
      try {
        const { doctorId, date } = req.query;
        if (!doctorId || !date) return res.status(400).json({ success: false, message: 'doctorId and date required' });

        // sample business slots
        const allSlots = ['09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM', '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM'];

        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const taken = await Appointment.find({ doctor: doctorId, date: { $gte: dayStart, $lte: dayEnd } }).select('timeSlot status');
        const occupied = taken.map(t => t.timeSlot);
        const available = allSlots.filter(s => !occupied.includes(s));

        return res.json({ success: true, occupied, available, allSlots });
      } catch (err) { console.error('PUBLIC AVAILABILITY ERROR', err); return res.status(500).json({ success: false, message: 'Server Error' }); }
    });

    // ---------------------------------------------------------
    // DOCTORS AVAILABLE AT A PARTICULAR DATE/time
    // GET /api/admin/doctors/available?date=YYYY-MM-DD&timeSlot=...
    // ---------------------------------------------------------
    router.get('/doctors/available', auth(['admin']), async (req, res) => {
      try {
        const { date, timeSlot } = req.query;
        if (!date || !timeSlot) return res.status(400).json({ success: false, message: 'date and timeSlot required' });

        // find doctors who don't have an appointment at that date/time
        const dayStart = new Date(date);
        const dayEnd = new Date(date);
        dayEnd.setHours(23, 59, 59, 999);

        const appts = await Appointment.find({ date: { $gte: dayStart, $lte: dayEnd }, timeSlot });
        const busyDoctorIds = appts.map(a => String(a.doctor));

        const doctors = await User.find({ role: 'doctor' }).select('name');
        const available = doctors.filter(d => !busyDoctorIds.includes(String(d._id))).map(d => ({ _id: d._id, name: d.name }));

        return res.json({ success: true, available });
      } catch (err) { console.error('DOCTORS AVAILABLE ERROR', err); return res.status(500).json({ success: false, message: 'Server Error' }); }
    });

    return res.json({ success: true, appointments: formatted });
  } catch (err) {
    console.error("ADMIN GET APPOINTMENTS ERROR:", err);
    return res
      .status(500)
      .json({ success: false, message: "Server Error" });
  }
});

// ---------------------------------------------------------
// BOOK A WALK-IN (Admin)
// POST /api/admin/appointments/walkin
// body: { name, phone, doctorId, date, timeSlot }
// ---------------------------------------------------------
router.post("/appointments/walkin", auth(["admin"]), async (req, res) => {
  try {
    const { name, phone, email, doctorId, date, timeSlot } = req.body;

    if (!name || !phone || !doctorId || !date || !timeSlot) {
      return res.status(400).json({ success: false, message: "All fields are required" });
    }

    // Validate that date and time are in the future
    if (!isValidFutureDateTime(date, timeSlot)) {
      return res.status(400).json({
        success: false,
        message: "Please select a future date and time for the walk-in appointment",
      });
    }

    // ensure doctor exists
    const doctor = await User.findOne({ _id: doctorId, role: "doctor" });
    if (!doctor) {
      return res.status(400).json({ success: false, message: "Invalid doctor" });
    }

    // 🔹 Check if this slot is already booked (prevent race condition)
    const dayStart = new Date(date);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const existingAppt = await Appointment.findOne({
      doctor: doctor._id,
      date: { $gte: dayStart, $lte: dayEnd },
      timeSlot: timeSlot,
    });

    if (existingAppt) {
      return res.status(400).json({
        success: false,
        message: "This time slot is no longer available. Another appointment was just booked for this slot. Please select a different time.",
      });
    }

    // try to find a patient by phone, otherwise create a lightweight patient record
    let patient = await User.findOne({ phone: phone, role: "patient" });
    if (!patient) {
      const randomPass = Math.random().toString(36).slice(-12);
      const hashed = await bcrypt.hash(randomPass, 10);
      const emailToUse = email || `${phone}@walkin.local`;
      patient = await User.create({ name, email: emailToUse, phone, password: hashed, role: "patient" });
    }

    const appt = await Appointment.create({
      patient: patient._id,
      doctor: doctor._id,
      date,
      timeSlot,
      status: "Walk-in",
      source: "offline",
    });

    const populated = await Appointment.findById(appt._id).populate("patient", "name phone").populate("doctor", "name");

    return res.status(201).json({
      success: true,
      appointment: {
        _id: populated._id,
        patientName: populated.patient ? populated.patient.name : "Unknown",
        patientPhone: populated.patient ? populated.patient.phone : "-",
        doctorName: populated.doctor ? populated.doctor.name : "Unknown",
        date: populated.date,
        timeSlot: populated.timeSlot,
        status: populated.status,
        source: populated.source || 'offline'
      },
    });
  } catch (err) {
    console.error("WALKIN ERROR:", err);
    return res.status(500).json({ success: false, message: "Server Error" });
  }
});

// ============================================================
//  CANCEL (ACKNOWLEDGE) APPOINTMENT (Admin)
//  PATCH /api/admin/appointments/:id/cancel
//  body: { reason, suggestedDoctorId?, suggestedDate?, suggestedTimeSlot?, notifyNow?: boolean }
// ============================================================
router.patch('/appointments/:id/cancel', auth(['admin']), async (req, res) => {
  try {
    const { reason, suggestedDoctorId, suggestedDate, suggestedTimeSlot, notifyNow, message, suggestions } = req.body;

    // require either reason or at least one suggestion
    if (!reason && !suggestions && !suggestedDoctorId) {
      return res.status(400).json({ success: false, message: 'Provide a reason or suggest an alternate slot/doctor' });
    }

    // Validate suggested date/time if provided
    if (suggestedDate && suggestedTimeSlot && !isValidFutureDateTime(suggestedDate, suggestedTimeSlot)) {
      return res.status(400).json({
        success: false,
        message: 'Suggested date and time must be in the future'
      });
    }

    // Validate suggestions array if provided
    if (Array.isArray(suggestions) && suggestions.length) {
      for (const sugg of suggestions) {
        if (sugg.date && sugg.timeSlot && !isValidFutureDateTime(sugg.date, sugg.timeSlot)) {
          return res.status(400).json({
            success: false,
            message: 'All suggested dates and times must be in the future'
          });
        }
      }
    }

    const update = {
      status: 'Acknowledged',
      cancellation: {
        reason: reason || '',
        suggestions: [],
      }
    };

    // support array of suggestions (preferred)
    if (Array.isArray(suggestions) && suggestions.length) {
      // each suggestion should be { doctorId, date, timeSlot }
      update.cancellation.suggestions = suggestions.map(s => ({ doctor: s.doctorId, date: s.date || null, timeSlot: s.timeSlot || '' }));
    } else if (suggestedDoctorId || suggestedDate || suggestedTimeSlot) {
      // backward compatibility for single suggestion
      update.cancellation.suggestions = [{ doctor: suggestedDoctorId || null, date: suggestedDate || null, timeSlot: suggestedTimeSlot || '' }];
    }

    update.cancellation.notified = Boolean(notifyNow);

    const appt = await Appointment.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('patient', 'name phone')
      .populate('doctor', 'name');

    // Notification Logic for Acknowledge/Cancel
    if (appt && appt.patient) {
      let msg = `Your appointment has been acknowledged with status: ${appt.status}.`;
      if (reason) msg += ` Reason: ${reason}`;
      if (appt.cancellation && appt.cancellation.suggestions && appt.cancellation.suggestions.length) {
        msg += " Please check your dashboard for suggested reschedule times.";
      }

      await Notification.create({
        user: appt.patient._id,
        message: msg,
        type: 'appointment_update'
      });
    }

    if (!appt) return res.status(404).json({ success: false, message: 'Appointment not found' });

    // Create a callback request so admin/staff can reach out to patient with the message
    try {
      const cb = await require('../models/CallbackRequest').create({ name: appt.patient?.name || '', phone: appt.patient?.phone || '' });
      console.log('Created callback request for cancellation notify:', cb._id);
    } catch (e) { console.warn('Failed to create callback request:', e.message); }

    // If notifyNow was requested, attempt to send an SMS via Twilio (falls back to simulated log when not configured)
    if (notifyNow) {
      try {
        const providedMessage = message || '';
        let msg = providedMessage;
        if (!msg) {
          // build from cancellation info
          const parts = [];
          if (update.cancellation.reason) parts.push(`Reason: ${update.cancellation.reason}`);
          if (update.cancellation.suggestions && update.cancellation.suggestions.length) {
            const s = update.cancellation.suggestions.map(sg => `${sg.timeSlot || ''}${sg.date ? ' on ' + sg.date : ''}`).join(' | ');
            parts.push(`Suggested: ${s}`);
          }
          msg = `Hello ${appt.patient?.name || ''}, your appointment with ${appt.doctor?.name || ''} on ${appt.date ? new Date(appt.date).toLocaleString() : ''} has been acknowledged/cancelled by the clinic. ${parts.join('. ')}`;
        }

        const patientPhone = appt.patient?.phone;
        if (!patientPhone) {
          console.warn('No patient phone available for immediate notify');
        } else if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
          // send via Twilio
          try {
            const tw = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
            const messageRes = await tw.messages.create({ from: process.env.TWILIO_FROM, to: patientPhone, body: msg });
            // persist notification metadata
            appt.cancellation.notified = true;
            appt.cancellation.notification = {
              provider: 'twilio',
              sid: messageRes.sid,
              sentAt: new Date(),
              to: patientPhone,
              status: messageRes.status
            };
            await appt.save();
            console.log('SENT SMS via Twilio ->', patientPhone, messageRes.sid);
          } catch (e) {
            // record error on appointment and fall back to simulated log
            appt.cancellation.notified = false;
            appt.cancellation.notification = { provider: 'twilio', error: String(e && e.message ? e.message : e) };
            await appt.save();
            console.warn('Twilio SMS failed, falling back to simulated log:', e && e.message ? e.message : e);
            console.log('SIMULATED SMS ->', patientPhone, msg);
          }
        } else {
          // Twilio not configured, just log message (simulation)
          console.log('TWILIO NOT CONFIGURED - SIMULATED SMS ->', appt.patient?.phone, msg);
        }
      } catch (e) { console.warn('Failed to process notifyNow flow', e.message) }
    }

    console.log(`APPOINTMENT ACKNOWLEDGED: id=${appt._id} reason=${reason || '[none]'} suggestedDoctor=${suggestedDoctorId || '[none]'} notifyNow=${Boolean(notifyNow)}`);

    return res.json({
      success: true, message: 'Appointment acknowledged and notification recorded', appointment: {
        _id: appt._id,
        status: appt.status,
        cancellation: appt.cancellation || null
      }
    });
  } catch (err) {
    console.error('ACKNOWLEDGE APPT ERROR:', err);
    return res.status(500).json({ success: false, message: 'Server Error' });
  }
});

// ============================================================
//  UPDATE APPOINTMENT STATUS (Admin Only)
//  PATCH /api/admin/appointments/:id/status
//  body: { status: "Pending" | "Confirmed" | "Completed" | "Cancelled" }
// ============================================================
router.patch("/appointments/:id/status", auth(["admin"]), async (req, res) => {
  try {
    let { status } = req.body;

    // normalize status (frontend safety)
    status =
      status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

    const allowed = ["Pending", "Confirmed", "Completed", "Cancelled", "Acknowledged", "Walk-in"];
    if (!allowed.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status value" });
    }


    const appt = await Appointment.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    )
      .populate("patient", "name")
      .populate("patient", "name")
      .populate("doctor", "name");

    // Notification Logic
    if (appt && appt.patient) {
      const msg = `Your appointment status has been updated to: ${status}`;
      await Notification.create({
        user: appt.patient._id,
        message: msg,
        type: 'appointment_update'
      });
    }

    if (!appt) {
      return res
        .status(404)
        .json({ success: false, message: "Appointment not found" });
    }

    // Debug log: show updated appointment status (helps confirm DB persisted change)
    console.log(`APPOINTMENT UPDATE: id=${appt._id} status=${appt.status}`);

    res.json({
      success: true,
      message: "Status updated",
      appointment: {
        _id: appt._id,
        patientName: appt.patient ? appt.patient.name : "Unknown",
        patientPhone: appt.patient ? appt.patient.phone : "-",
        doctorName: appt.doctor ? appt.doctor.name : "Unknown",
        date: appt.date,
        timeSlot: appt.timeSlot,
        status: appt.status,
        cancellation: appt.cancellation || null
      },
    });
  } catch (err) {
    console.error("ADMIN UPDATE APPOINTMENT STATUS ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error" });
  }
});
// GET /api/admin/patients
// Admin can view all patients (name/email/phone)
router.get("/patients", auth(["admin"]), async (req, res) => {
  try {
    const patients = await User.find({ role: "patient" })
      .select("name email phone createdAt")   // only needed fields
      .sort({ name: 1 })
      .lean();

    return res.json({ success: true, patients });
  } catch (err) {
    console.error("ADMIN PATIENTS ERROR:", err);
    return res.status(500).json({ success: false, message: "Failed to load patients" });
  }
});

// ============================================================
//  EDIT PATIENT (Admin Only)
//  PUT /api/admin/patients/:id
// ============================================================
router.put("/patients/:id", auth(["admin"]), async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name) {
      return res.status(400).json({ success: false, message: "Name is required" });
    }

    if (phone && !/^\d{10}$/.test(phone)) {
      return res.status(400).json({ success: false, message: "Enter valid 10-digit mobile number" });
    }

    const updated = await User.findOneAndUpdate(
      { _id: req.params.id, role: "patient" },
      { name, email, phone },
      { new: true }
    ).select("name email phone createdAt");

    if (!updated) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    return res.json({ success: true, message: "Patient updated successfully", patient: updated });
  } catch (err) {
    console.error("ADMIN EDIT PATIENT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server Error while editing patient" });
  }
});

// ============================================================
//  DELETE PATIENT (Admin Only)
//  DELETE /api/admin/patients/:id
// ============================================================
router.delete("/patients/:id", auth(["admin"]), async (req, res) => {
  try {
    const deleted = await User.findOneAndDelete({ _id: req.params.id, role: "patient" });

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    return res.json({ success: true, message: "Patient deleted successfully" });
  } catch (err) {
    console.error("ADMIN DELETE PATIENT ERROR:", err);
    return res.status(500).json({ success: false, message: "Server Error while deleting patient" });
  }
});

const mult = require("multer");
const fs = require("fs");
const path = require("path");
const PatientFile = require("../models/PatientFile");

// Configure Multer Storage
const storage = mult.diskStorage({
  destination: function (req, file, cb) {
    const dir = "assets/patient_files";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    // Unique filename: fieldname-timestamp-random.ext
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = mult({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// ============================================================
//  UPLOAD PATIENT FILE (Admin Only)
//  POST /api/admin/patients/:id/files
// ============================================================
router.post("/patients/:id/files", auth(["admin"]), upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const patientId = req.params.id;
    const patient = await User.findById(patientId);
    if (!patient) {
      // cleanup file if patient not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ success: false, message: "Patient not found" });
    }

    const newFile = new PatientFile({
      patient: patientId,
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      mimetype: req.file.mimetype,
      size: req.file.size
    });

    await newFile.save();

    res.json({ success: true, message: "File uploaded successfully", file: newFile });
  } catch (err) {
    console.error("UPLOAD FILE ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error during upload" });
  }
});

// ============================================================
//  GET PATIENT FILES (Admin Only)
//  GET /api/admin/patients/:id/files
// ============================================================
router.get("/patients/:id/files", auth(["admin"]), async (req, res) => {
  try {
    const files = await PatientFile.find({ patient: req.params.id }).sort({ createdAt: -1 });
    res.json({ success: true, files });
  } catch (err) {
    console.error("GET FILES ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error fetching files" });
  }
});

// ============================================================
//  DELETE PATIENT FILE (Admin Only)
//  DELETE /api/admin/files/:id
// ============================================================
router.delete("/files/:id", auth(["admin"]), async (req, res) => {
  try {
    const fileRecord = await PatientFile.findById(req.params.id);
    if (!fileRecord) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    // Delete from disk
    if (fs.existsSync(fileRecord.path)) {
      fs.unlinkSync(fileRecord.path);
    }

    // Delete from DB
    await PatientFile.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: "File deleted successfully" });
  } catch (err) {
    console.error("DELETE FILE ERROR:", err);
    res.status(500).json({ success: false, message: "Server Error deleting file" });
  }
});

module.exports = router;
