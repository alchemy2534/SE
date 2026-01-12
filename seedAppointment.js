require('dotenv').config();
const mongoose = require('mongoose');
const Appointment = require('./models/Appointment');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';

// Hardcoded for testing
const DOCTOR_EMAIL = 'doctor@example.com'; // Adjust if needed or fetch first doctor
const PATIENT_EMAIL = 'admin@gmail.com'; // Use admin as dummy patient for seeding
const DATE = '2026-01-20'; // Future date
const TIME_SLOT = '10:00 AM';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        try {
            // Find or create a dummy doctor
            let doctor = await User.findOne({ role: 'doctor' });
            if (!doctor) {
                console.log('No doctor found, creating one...');
                doctor = await User.create({
                    name: 'Dr. Test',
                    email: 'drtest@example.com',
                    password: 'password123',
                    role: 'doctor',
                    phone: '1111111111'
                });
            }

            // Find a patient
            const patient = await User.findOne({ role: 'patient' }) || await User.findOne({ role: 'admin' });

            // Create appointment
            await Appointment.create({
                patient: patient._id,
                doctor: doctor._id,
                date: new Date(DATE),
                timeSlot: TIME_SLOT,
                status: 'Confirmed'
            });

            console.log(`Seeded appointment: Doctor ${doctor.name} on ${DATE} at ${TIME_SLOT}`);

        } catch (error) {
            console.error('Seeding error:', error);
        } finally {
            mongoose.connection.close();
        }
    })
    .catch(err => console.error('Connection error:', err));
