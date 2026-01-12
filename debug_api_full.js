const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';
const API_BASE = "http://localhost:5000";

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        const User = require('./models/User');

        // 1. Ensure Doctor Credentials
        const email = "drtest@example.com";
        const password = "password123";
        const hashedPassword = await bcrypt.hash(password, 10);

        let doctor = await User.findOne({ email });
        if (!doctor) {
            console.log("Creating new doctor...");
            doctor = await User.create({
                name: "Dr. Test",
                email,
                phone: "1111111111",
                password: hashedPassword,
                role: "doctor"
            });
        } else {
            console.log("Updating doctor password...");
            doctor.password = hashedPassword;
            await doctor.save();
        }

        // 2. Get Patient ID
        const patient = await User.findOne({ name: "Sahana B S" });
        if (!patient) {
            console.error("Patient 'Sahana B S' not found!");
            await mongoose.disconnect();
            return;
        }
        const patientId = patient._id.toString();

        await mongoose.disconnect();

        // 3. Login and Fetch
        const token = await login(email, password);
        if (token) {
            await fetchFiles(token, patientId);
        }

    } catch (e) {
        console.error(e);
    }
}

function login(email, password) {
    return new Promise((resolve, reject) => {
        const http = require('http');
        // FIXED: Added role: "doctor"
        const data = JSON.stringify({ email, password, role: "doctor" });

        const req = http.request(`${API_BASE}/api/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': data.length
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                if (res.statusCode !== 200) {
                    console.log("Login Failed:", res.statusCode, body);
                    resolve(null);
                } else {
                    const json = JSON.parse(body);
                    console.log("Login Successful");
                    resolve(json.token);
                }
            });
        });

        req.on('error', (e) => reject(e));
        req.write(data);
        req.end();
    });
}

function fetchFiles(token, patientId) {
    return new Promise((resolve, reject) => {
        const http = require('http');
        const url = `${API_BASE}/api/doctor/patients/${patientId}/files`;
        console.log("Fetching: " + url);

        const req = http.request(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                console.log("Files API Status:", res.statusCode);
                console.log("Files API Body:", body);
                resolve();
            });
        });

        req.on('error', (e) => reject(e));
        req.end();
    });
}

run();
