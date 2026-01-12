const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';
const API_BASE = "http://localhost:5000";

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        const User = require('./models/User');
        const Appointment = require('./models/Appointment');

        // 1. Get Doctor and Patient
        const doctor = await User.findOne({ email: "drtest@example.com" });
        const patient = await User.findOne({ name: "Sahana B S" });

        if (!doctor || !patient) {
            console.error("Doctor or Patient not found");
            process.exit(1);
        }

        // 2. Create Appointment if none exists
        const count = await Appointment.countDocuments({ doctor: doctor._id, patient: patient._id });
        if (count === 0) {
            console.log("Creating dummy appointment...");
            await Appointment.create({
                doctor: doctor._id,
                patient: patient._id,
                date: new Date(),
                timeSlot: "10:00 AM",
                status: "Pending"
            });
        }

        // 3. Login
        // We assume password is 'password123' from previous steps
        const token = await login("drtest@example.com", "password123");

        // 4. Fetch
        await fetchAppointments(token);

        process.exit(0);

    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

function login(email, password) {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify({ email, password, role: "doctor" });
        const req = http.request(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.log("Login Failed:", body);
                    resolve(null);
                } else {
                    const json = JSON.parse(body);
                    resolve(json.token);
                }
            });
        });
        req.write(data);
        req.end();
    });
}

function fetchAppointments(token) {
    return new Promise((resolve, reject) => {
        const url = `${API_BASE}/api/doctor/appointments`;
        console.log("Fetching: " + url);
        const req = http.request(url, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(body);
                    if (json.success && json.appointments.length > 0) {
                        const appt = json.appointments[0];
                        console.log("First Appointment Patient Structure:");
                        console.log(JSON.stringify(appt.patient, null, 2));
                    } else {
                        console.log("No appointments found or API error", body);
                    }
                    resolve();
                } catch (e) {
                    console.error("Parse Error", body);
                    resolve();
                }
            });
        });
        req.end();
    });
}

run();
