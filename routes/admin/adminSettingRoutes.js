const express = require('express');
const router = express.Router();
const adminSettingController = require('../../controller/admin/adminSettingController');

// Contact Routes
router.post('/contact', adminSettingController.createContact);
router.get('/contact', adminSettingController.getContacts);
router.get('/contact/:id', adminSettingController.getContactById); 
router.put('/contact/:id', adminSettingController.updateContact);
router.delete('/contact/:id', adminSettingController.deleteContact);

// About Us Routes
router.post('/about', adminSettingController.createAbout);
router.get('/about', adminSettingController.getAbout);
router.get('/about/:id', adminSettingController.getAboutById); 
router.put('/about/:id', adminSettingController.updateAbout);
router.delete('/about/:id', adminSettingController.deleteAbout);

// FAQ Routes
router.post('/faqs', adminSettingController.createFaq);
router.get('/faqs', adminSettingController.getFaqs);
router.get('/faqs/:id', adminSettingController.getFaqById); 
router.put('/faqs/:id', adminSettingController.updateFaq);
router.delete('/faqs/:id', adminSettingController.deleteFaq);

// Settings Routes
router.post('/settings', adminSettingController.addOrUpdateSettings);
router.get('/settings', adminSettingController.getSettings);

module.exports = router;
