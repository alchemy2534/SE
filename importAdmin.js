require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log('Connected to MongoDB');

        try {
            const data = JSON.parse(fs.readFileSync('admin.json', 'utf-8'));

            for (const user of data) {
                const exists = await User.findOne({ email: user.email });
                if (exists) {
                    console.log(`User ${user.email} already exists.`);
                } else {
                    await User.create(user);
                    console.log(`User ${user.email} imported successfully.`);
                }
            }

        } catch (error) {
            console.error('Import error:', error);
        } finally {
            mongoose.connection.close();
            console.log('Connection closed');
        }
    })
    .catch(err => console.error('Connection error:', err));
