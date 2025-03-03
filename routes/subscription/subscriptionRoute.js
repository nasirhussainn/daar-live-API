const express = require('express');
const router = express.Router();
const subscriptionController = require('../../controller/subscription/subscriptionController');

// Define subscription routes
router.post('/subscribe', subscriptionController.subscribeRealtor);
router.get('/subscriptions', subscriptionController.getAllSubscriptions);
router.get('/subscriptions-list', subscriptionController.getAllSubscriptionsFull);
router.get('/subscriptions/:realtor_id', subscriptionController.getRealtorSubscriptions);
router.put('/subscription/cancel/:subscription_id', subscriptionController.cancelSubscription);

module.exports = router;
