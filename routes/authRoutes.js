const express = require("express");
const router = express.Router();

// Manual Signup
router.post("/signup", (req, res) => {
  const { name, email, password, role } = req.body; // role: 'buyer' or 'realtor'

  if (!name || !email || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Simulating a user creation process
  return res.status(201).json({
    message: "User registered successfully",
    user: { name, email, role },
  });
});

router.post("/signup/firebase", async (req, res) => {
    const { idToken, role } = req.body; // ID Token received from frontend
  
    if (!idToken || !role) {
      return res.status(400).json({ message: "ID Token and role are required" });
    }
  
    try {
      // Verify Firebase ID Token
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, picture } = decodedToken;
  
      // Simulating user registration (Replace with database logic)
      const user = {
        uid,
        name: name || "No Name",
        email,
        picture,
        role, // 'buyer' or 'realtor'
      };
  
      res.status(200).json({
        message: "User authenticated successfully",
        user,
      });
    } catch (error) {
      res.status(401).json({ message: "Invalid ID Token", error: error.message });
    }
  });

module.exports = router;
