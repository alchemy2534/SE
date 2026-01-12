require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected to DB");

    // Ensure Doctor exists
    const email = "drtest@example.com";
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    let doctor = await User.findOne({ email });
    if (!doctor) {
        doctor = await User.create({
            name: "Test Doctor",
            email: email,
            phone: "1111111111",
            password: hashedPassword,
            role: "doctor"
        });
        console.log("Created Doctor");
    } else {
        // Update password just in case
        doctor.password = hashedPassword;
        doctor.role = "doctor";
        await doctor.save();
        console.log("Updated Doctor password");
    }

    mongoose.connection.close();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
