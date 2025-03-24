const Contact = require('../../models/admin/Contact');
const About = require('../../models/admin/About');
const Faq = require('../../models/admin/Faq');
const Settings = require('../../models/admin/Settings');

// Contact Us CRUD Operations
exports.createContact = async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.status(201).json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getContacts = async (req, res) => {
  res.json(await Contact.find());
};

exports.getContactById = async (req, res) => {
  try {
    const contact = await Contact.findById(req.params.id);
    if (!contact) return res.status(404).json({ message: "Contact not found" });
    res.json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateContact = async (req, res) => {
  try {
    const contact = await Contact.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(contact);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteContact = async (req, res) => {
  await Contact.findByIdAndDelete(req.params.id);
  res.json({ message: 'Contact deleted' });
};

// About Us CRUD Operations
exports.createAbout = async (req, res) => {
  try {
    const about = new About(req.body);
    await about.save();
    res.status(201).json(about);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getAbout = async (req, res) => {
  res.json(await About.find());
};


exports.getAboutById = async (req, res) => {
  try {
    const about = await About.findById(req.params.id);
    if (!about) return res.status(404).json({ message: "About section not found" });
    res.json(about);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAbout = async (req, res) => {
  try {
    const about = await About.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(about);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteAbout = async (req, res) => {
  await About.findByIdAndDelete(req.params.id);
  res.json({ message: 'About Us deleted' });
};

// FAQ CRUD Operations
exports.createFaq = async (req, res) => {
  try {
    const faq = new Faq(req.body);
    await faq.save();
    res.status(201).json(faq);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.getFaqs = async (req, res) => {
  res.json(await Faq.find());
};

exports.getFaqById = async (req, res) => {
  try {
    const faq = await Faq.findById(req.params.id);
    if (!faq) return res.status(404).json({ message: "FAQ not found" });
    res.json(faq);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateFaq = async (req, res) => {
  try {
    const faq = await Faq.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(faq);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteFaq = async (req, res) => {
  await Faq.findByIdAndDelete(req.params.id);
  res.json({ message: 'FAQ deleted' });
};

exports.getSettings = async (req, res) => {
  try {
      const { field } = req.query; // Get the requested field (optional)

      // Fetch the settings document
      const settings = await Settings.findOne();

      if (!settings) return res.status(404).json({ message: "Settings not found" });

      // If a field is provided, return only that field
      if (field) {
          if (settings[field] === undefined) {
              return res.status(400).json({ message: `Field '${field}' not found in settings` });
          }
          return res.status(200).json({ [field]: settings[field] });
      }

      // If no field is specified, return the full settings document
      res.status(200).json(settings);
  } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
  }
};


exports.addOrUpdateSettings = async (req, res) => {
  try {
      const { contact_email, price_per_day, booking_percentage } = req.body;

      const settings = await Settings.findOneAndUpdate(
          {}, // Find any existing settings
          { contact_email, price_per_day, booking_percentage },
          { new: true, upsert: true } // Create if not exists
      );

      res.status(200).json({ message: "Settings updated successfully", settings });
  } catch (error) {
      res.status(500).json({ message: "Server error", error: error.message });
  }
};

