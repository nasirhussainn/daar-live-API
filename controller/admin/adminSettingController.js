const Contact = require('../../models/admin/Contact');
const About = require('../../models/admin/About');
const Faq = require('../../models/admin/Faq');
const Settings = require('../../models/admin/Settings');
const { translateText } = require('../../services/translateService');

// Contact Us CRUD Operations
exports.createContact = async (req, res) => {
  try {
    const title = await translateText(req.body.title);
    const description = await translateText(req.body.description);
    const contact = new Contact({
      title: title,
      description: description,
      });
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
    const updateData = {};

    if (req.body.title) {
      updateData.title = await translateText(req.body.title);
    }

    if (req.body.description) {
      updateData.description = await translateText(req.body.description);
    }

    const contact = await Contact.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
    const heading = await translateText(req.body.heading);
    const paragraph = await translateText(req.body.paragraph);

    const about = new About({
      heading,
      paragraph,
    });

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
    const updateData = {};

    if (req.body.heading) {
      updateData.heading = await translateText(req.body.heading);
    }

    if (req.body.paragraph) {
      updateData.paragraph = await translateText(req.body.paragraph);
    }

    const about = await About.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
    const question = await translateText(req.body.question);
    const answer = await translateText(req.body.answer);

    const faq = new Faq({
      question,
      answer,
    });

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
    const updateData = {};

    if (req.body.question) {
      updateData.question = await translateText(req.body.question);
    }

    if (req.body.answer) {
      updateData.answer = await translateText(req.body.answer);
    }

    const faq = await Faq.findByIdAndUpdate(req.params.id, updateData, { new: true });
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
    const {
      contact_email,
      price_per_day,
      booking_percentage,
      free_trial_days,
      free_trial_properties,
      free_trial_events,
      days_to_hide_after_expiry,
      yemen_currency,
      privacy_policy,
      terms_and_conditions,
      linkedin,
      facebook,
      instagram,
      twitter,
      playstore_link,
      appstore_link,
      phone_no,
      location
    } = req.body;

    // Translate privacy_policy and terms_and_conditions
    const translatedPrivacyPolicy = await translateText(privacy_policy);
    const translatedTermsAndConditions = await translateText(terms_and_conditions);

    const settings = await Settings.findOneAndUpdate(
      {}, // Find any existing settings
      {
        contact_email,
        price_per_day,
        booking_percentage,
        free_trial_days,
        free_trial_properties,
        free_trial_events,
        days_to_hide_after_expiry,
        yemen_currency,
        privacy_policy: translatedPrivacyPolicy,
        terms_and_conditions: translatedTermsAndConditions,
        linkedin,
        facebook,
        instagram,
        twitter,
        playstore_link,
        appstore_link,
        phone_no,
        location
      },
      { new: true, upsert: true, setDefaultsOnInsert: true } // Create if not exists, set defaults
    );

    res.status(200).json({ message: "Settings updated successfully", settings });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};



