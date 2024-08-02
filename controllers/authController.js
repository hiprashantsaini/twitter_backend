const User = require('../models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');
const dotenv = require('dotenv');

dotenv.config();

exports.login = async (req, res) => {
  console.log("executed:",req.body)
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid Credentials' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });

    // Track device
    const deviceInfo = {
      browser: req.headers['user-agent'],
      os: req.headers['sec-ch-ua-platform'],
      device: req.headers['sec-ch-ua-mobile'],
      ip: req.ip,
      otp: Math.floor(100000 + Math.random() * 900000).toString(),
      lastAccessed: new Date()
    };

    user.devices.push(deviceInfo);
    await user.save();

    // Send OTP via email
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    let mailOptions = {
      from: process.env.EMAIL_USER,
      to: user.email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${deviceInfo.otp}`
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log('Email sent: ' + info.response);
    });

    res.json({ token, deviceInfo });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};

exports.verifyOtp = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, otp } = req.body;

  try {
    let user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid Email' });
    }

    const device = user.devices.find(d => d.otp === otp && !d.verified);

    if (!device) {
      return res.status(400).json({ msg: 'Invalid OTP' });
    }

    device.verified = true;
    await user.save();

    res.json({ msg: 'Device verified' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
};
