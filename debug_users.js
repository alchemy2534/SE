require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("Connected to DB:", MONGO_URI);
        try {
            const users = await User.find({});
            console.log(`Found ${users.length} users:`);
            users.forEach(u => {
                console.log(`- ${u.name} (${u.email}) [${u.role}]`);
            });
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            mongoose.connection.close();
        }
    })
    .catch(err => {
        console.error("Connection error:", err);
    });
