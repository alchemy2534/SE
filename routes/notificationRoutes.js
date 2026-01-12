const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const Notification = require("../models/Notification");

// GET /api/notifications
// Fetch all notifications for the logged-in user
router.get("/", auth(), async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user._id })
            .sort({ createdAt: -1 })
            .limit(50); // Limit to last 50 to avoid bloat

        res.json({ success: true, notifications });
    } catch (err) {
        console.error("GET NOTIFICATIONS ERROR:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// PATCH /api/notifications/:id/read
// Mark a notification as read
router.patch("/:id/read", auth(), async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user._id },
            { isRead: true },
            { new: true }
        );

        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.json({ success: true, notification });
    } catch (err) {
        console.error("MARK READ ERROR:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// PATCH /api/notifications/mark-all-read
router.patch("/mark-all-read", auth(), async (req, res) => {
    try {
        await Notification.updateMany(
            { user: req.user._id, isRead: false },
            { isRead: true }
        );
        res.json({ success: true, message: "All marked as read" });
    } catch (err) {
        console.error("MARK ALL READ ERROR:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

module.exports = router;
