const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';

async function run() {
    try {
        await mongoose.connect(MONGO_URI);
        const User = require('./models/User');
        const Appointment = require('./models/Appointment');  // Ensure this model uses ObjectId for patient

        // 1. Find Dr. Chetan
        // Regex for case insensitive
        const doctor = await User.findOne({ name: { $regex: /Chetan/i }, role: 'doctor' });

        if (!doctor) {
            console.log("Dr. Chetan not found. Listing all doctors:");
            const docs = await User.find({ role: 'doctor' });
            docs.forEach(d => console.log(` - ${d.name}`));
            return;
        }

        console.log(`Found Doctor: ${doctor.name} (${doctor._id})`);

        // 2. Check his appointments
        const appts = await Appointment.find({ doctor: doctor._id });
        console.log(`Found ${appts.length} appointments.`);

        appts.forEach((a, i) => {
            console.log(`[${i}] Patient Field Type: ${typeof a.patient}`);
            console.log(`[${i}] Patient Field Value: ${a.patient}`);
            // Check if it is a valid ObjectId
            if (mongoose.Types.ObjectId.isValid(a.patient)) {
                console.log(`    -> Valid ObjectId`);
            } else {
                console.log(`    -> INVALID / NOT OBJECTID`);
            }
        });

        await mongoose.disconnect();
    } catch (e) {
        console.error(e);
    }
}

run();
