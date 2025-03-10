const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  },
  isSuperAdmin: {
    type: Boolean,
    default: false
  },
  role: {
    type: String,
    enum: ['super', 'viewer', 'editor']
  },
  permissions: [{
     type: String, required: true ,  
  }]
}, { timestamps: true });

const Admin = mongoose.model('Admin', AdminSchema);

module.exports = Admin;
