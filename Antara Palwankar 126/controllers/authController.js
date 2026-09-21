const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../config/firebaseConfig');

// Helper to generate JWT token
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'super_secret_event_ticketing_jwt_key_2026';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
};

// @desc    Register as Attendee or Organizer
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'attendee' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password.',
      });
    }

    const normalizedRole = role.toLowerCase();
    if (!['attendee', 'organizer'].includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Role must be either 'attendee' or 'organizer'.",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long.',
      });
    }

    // Check if user already exists
    const usersRef = db.collection('users');
    const existingQuery = await usersRef.where('email', '==', email.toLowerCase()).get();

    if (!existingQuery.empty) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const userId = `usr_${normalizedRole}_${Date.now().toString().slice(-6)}`;
    const newUser = {
      id: userId,
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: normalizedRole,
      createdAt: new Date().toISOString(),
    };

    await usersRef.doc(userId).set(newUser);

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: 'User registered successfully.',
      data: {
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          createdAt: newUser.createdAt,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Authenticate and obtain JWT token
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password.',
      });
    }

    const usersRef = db.collection('users');
    const userSnapshot = await usersRef.where('email', '==', email.toLowerCase()).get();

    if (userSnapshot.empty) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const userDoc = userSnapshot.docs[0];
    const user = userDoc.data();

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Retrieve user profile & role
// @route   GET /api/auth/profile
// @access  Authenticated
exports.getProfile = async (req, res, next) => {
  try {
    const userRef = db.collection('users').doc(req.user.id);
    const doc = await userRef.get();

    if (!doc.exists) {
      return res.status(200).json({
        success: true,
        data: {
          id: req.user.id,
          email: req.user.email,
          name: req.user.name,
          role: req.user.role,
        },
      });
    }

    const user = doc.data();
    delete user.password;

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
