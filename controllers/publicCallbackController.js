// controllers/publicCallbackController.js
const CallbackRequest = require('../models/CallbackRequest');

exports.createCallback = async (req, res) => {
  try {
  

    // accept phone OR mobile from frontend
    const { name = '', phone, mobile } = req.body || {};
    const finalPhone = phone || mobile;

    if (!finalPhone || String(finalPhone).trim().length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    const cb = new CallbackRequest({
      name: String(name).trim(),
      phone: String(finalPhone).trim(),
      status: "Pending"   // default status
      // contacted defaults to false from model
    });

    await cb.save();

    return res.status(201).json({
      success: true,
      callback: cb,
      message: 'Callback saved'
    });

  } catch (err) {
    console.error('createCallback error FULL:', err);
    return res.status(500).json({
      success: false,
      message: err.message || err.toString()
    });
  }
};
