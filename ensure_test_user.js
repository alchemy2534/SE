require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
const bcrypt = require('bcryptjs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';

mongoose.connect(MONGO_URI).then(async () => {
    console.log("Connected to DB");
    const email = "testuser_2345@example.com";
    const password = "password123";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Ensure Doctor exists
    let doctor = await User.findOne({ role: 'doctor' });
    if (!doctor) {
        doctor = await User.create({
            name: "Dr. Test",
            email: "drtest@example.com",
            phone: "1111111111",
            password: hashedPassword,
            role: "doctor"
        });
        console.log("Created Doctor");
    } else {
        console.log("Doctor exists");
    }

    // Ensure Patient exists and update password
    let user = await User.findOne({ email });
    if (user) {
        user.password = hashedPassword;
        await user.save();
        console.log("Updated Patient password");
    } else {
        await User.create({
            name: "Test User Two",
            email,
            phone: "1234567890",
            password: hashedPassword,
            role: "patient"
        });
        console.log("Created Patient");
    }

    mongoose.connection.close();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
