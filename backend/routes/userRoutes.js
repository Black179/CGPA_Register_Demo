const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Get user by register number
router.get('/:registerNo', async (req, res) => {
  try {
    const user = await User.findOne({ registerNo: req.params.registerNo.toUpperCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Create or update user
router.post('/', async (req, res) => {
  try {
    const { registerNo } = req.body;
    const user = await User.findOneAndUpdate(
      { registerNo: registerNo.toUpperCase() },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );
    res.status(201).json(user);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete user by register number
router.delete('/:registerNo', async (req, res) => {
  try {
    const user = await User.findOneAndDelete({ registerNo: req.params.registerNo.toUpperCase() });
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ message: 'User deleted successfully', user });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
