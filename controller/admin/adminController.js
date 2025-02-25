const jwt = require('jsonwebtoken');
const Admin = require('../../models/Admin');

// 🔹 Create a new admin (Super Admin Only)
exports.createAdmin = async (req, res) => {
    try {
        const { email, password, role, permissions } = req.body;

        if (!['viewer', 'editor'].includes(role)) {
            return res.status(400).json({ message: 'Invalid role' });
        }

        const existingAdmin = await Admin.findOne({ email });
        if (existingAdmin) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const newAdmin = new Admin({
            email,
            password,
            role,
            permissions
        });

        await newAdmin.save();
        res.status(201).json({ message: 'Admin created successfully', admin: newAdmin });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 🔹 Login Admin
exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;

        const admin = await Admin.findOne({ email });
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (password !== admin.password) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const token = jwt.sign(
            { id: admin._id, isSuperAdmin: admin.isSuperAdmin, role: admin.role },
            process.env.JWT_SECRET_KEY || 'your-secret-key',
            { expiresIn: '2h' } // Token expires in 2 hours
        );

        res.status(200).json({ message: 'Login successful', admin, token });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 🔹 Get all admin users
exports.getAllAdmins = async (req, res) => {
    try {
        const admins = await Admin.find()
        res.status(200).json(admins);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 🔹 Get a single admin by ID
exports.getAdminById = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id)
        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }
        res.status(200).json(admin);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 🔹 Update an admin
exports.updateAdmin = async (req, res) => {
    try {
        const { email, password, role, permissions } = req.body;
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        if (email) {
            const existingAdmin = await Admin.findOne({ email });
            if (existingAdmin && existingAdmin.id !== req.params.id) {
                return res.status(400).json({ message: 'Email already in use' });
            }
            admin.email = email.toLowerCase().trim();
        }

        if (password) {
            admin.password = password;
        }

        if (role) {
            if (!['viewer', 'editor'].includes(role)) {
                return res.status(400).json({ message: 'Invalid role' });
            }
            admin.role = role;
        }

        if (permissions) {
            if (!Array.isArray(permissions)) {
                return res.status(400).json({ message: 'Permissions must be an array' });
            }
            admin.permissions = permissions;
        }

        await admin.save();
        res.status(200).json({ message: 'Admin updated successfully', admin });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// 🔹 Delete an admin (Super Admin Only)
exports.deleteAdmin = async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id);

        if (!admin) {
            return res.status(404).json({ message: 'Admin not found' });
        }

        await Admin.findByIdAndDelete(req.params.id);
        res.status(200).json({ message: 'Admin deleted successfully' });

    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
