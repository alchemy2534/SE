require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("Connected to DB");
        const email = "sahana@gmail.com";
        const passwordInput = "sahana";

        const user = await User.findOne({ email });
        if (!user) {
            console.log("User not found via findOne({ email })");
            // Try case insensitive find?
            const userRegex = await User.findOne({ email: { $regex: new RegExp(`^${email}$`, 'i') } });
            if (userRegex) {
                console.log("User FOUND but case mismatch:", userRegex.email);
            }
        } else {
            console.log("User found:", user.email);
            console.log("Stored Role:", user.role);
            console.log("Stored Hash:", user.password);

            const isMatch = await bcrypt.compare(passwordInput, user.password);
            console.log("Password 'sahana' Match Result:", isMatch);

            if (!isMatch) {
                // Generate a new hash for reference
                const newHash = await bcrypt.hash(passwordInput, 10);
                console.log("Expected hash for 'sahana' would look like:", newHash);
            }
        }
        mongoose.connection.close();
    })
    .catch(err => console.error(err));
