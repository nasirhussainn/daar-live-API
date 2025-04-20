const jwt = require('jsonwebtoken');

// Secret key for JWT signing (you should keep it safe and not hardcode it in production)
const secretKey = process.env.JWT_SECRET_KEY || "your_secret_key";

// Function to generate JWT
const generateToken = (user) => {
  const payload = { 
    userId: user._id, 
    role: user.role,
    email: user.email 
  };

  return jwt.sign(payload, secretKey, { expiresIn: "1h" }); // Token expires in 1 hour
};

const generateTokenPhone = (user) => {
  const payload = { 
    userId: user._id, 
    role: "buyer",
    phone_number: user.phone_number
  };

  return jwt.sign(payload, secretKey, { expiresIn: "1h" }); // Token expires in 1 hour
};

module.exports = { generateToken, generateTokenPhone };
