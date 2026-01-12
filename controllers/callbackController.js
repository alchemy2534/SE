// controllers/callbackController.js
const CallbackRequest = require('../models/CallbackRequest');

/**
 * GET /api/admin/callbacks
 * Return list of callbacks sorted by newest first.
 */
exports.getAllCallbacks = async (req, res) => {
  try {
    const callbacks = await CallbackRequest.find().sort({ createdAt: -1 }).lean();
    return res.json({ success: true, callbacks });
  } catch (err) {
    console.error('getAllCallbacks error', err);
    return res.status(500).json({ success: false, message: 'Server error fetching callbacks' });
  }
};

/**
 * PATCH /api/admin/callbacks/:id/contacted
 * Mark a callback as contacted.
 */
exports.markCallbackContacted = async (req, res) => {
  try {
    const id = req.params.id;
    const cb = await CallbackRequest.findByIdAndUpdate(id, { contacted: true, status: "Done" }, { new: true });

    if (!cb) return res.status(404).json({ success: false, message: 'Callback not found' });
    return res.json({ success: true, callback: cb });
  } catch (err) {
    console.error('markCallbackContacted error', err);
    return res.status(500).json({ success: false, message: 'Server error marking contacted' });
  }
};

/**
 * DELETE /api/admin/callbacks/:id
 * Delete a callback request.
 */
exports.deleteCallback = async (req, res) => {
  try {
    const id = req.params.id;
    const cb = await CallbackRequest.findByIdAndDelete(id);
    if (!cb) return res.status(404).json({ success: false, message: 'Callback not found' });
    return res.json({ success: true, message: 'Callback deleted' });
  } catch (err) {
    console.error('deleteCallback error', err);
    return res.status(500).json({ success: false, message: 'Server error deleting callback' });
  }
};
