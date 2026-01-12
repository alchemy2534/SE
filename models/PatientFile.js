const mongoose = require("mongoose");

const PatientFileSchema = new mongoose.Schema(
    {
        patient: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        filename: { type: String, required: true },     // generated filename
        originalName: { type: String, required: true }, // original user filename
        path: { type: String, required: true },         // path on disk
        mimetype: { type: String, required: true },
        size: { type: Number, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model("PatientFile", PatientFileSchema);
