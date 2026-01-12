require('dotenv').config();
const mongoose = require('mongoose');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/dentaldb';

const PatientFileSchema = new mongoose.Schema({}, { strict: false });
const PatientFile = mongoose.model("PatientFile", PatientFileSchema);

mongoose.connect(MONGO_URI)
    .then(async () => {
        console.log("Connected to DB:", MONGO_URI);
        try {
            const files = await PatientFile.find({});
            console.log(`Found ${files.length} file records in 'patientfiles' collection:`);
            files.forEach(f => {
                console.log(`- ${f.originalName} (stored as: ${f.filename})`);
            });
        } catch (error) {
            console.error("Error fetching files:", error);
        } finally {
            mongoose.connection.close();
        }
    })
    .catch(err => {
        console.error("Connection error:", err);
    });
