const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';

async function debugFiles() {
    try {
        await mongoose.connect(MONGO_URI);
        console.log("Connected to DB");

        const User = require('./models/User');
        const PatientFile = require('./models/PatientFile');

        // 1. Find the patient
        const patientName = "Sahana B S";
        const patient = await User.findOne({ name: patientName });

        if (!patient) {
            console.log(`User '${patientName}' not found.`);
            // List all users to see who we have
            const users = await User.find({}, 'name email role');
            console.log("Available Users:", users.map(u => `${u.name} (${u.role})`));
        } else {
            console.log(`Found Patient: ${patient.name} (ID: ${patient._id})`);

            // 2. Find files
            try {
                const files = await PatientFile.find({ patient: patient._id }).sort({ createdAt: -1 });
                console.log(`Found ${files.length} files.`);
                files.forEach(f => console.log(` - ${f.originalName} (${f.size} bytes)`));
            } catch (err) {
                console.error("Error querying PatientFile:", err);
            }
        }

        await mongoose.disconnect();
    } catch (err) {
        console.error("Global Error:", err);
    }
}

debugFiles();
