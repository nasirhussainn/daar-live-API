const express = require('express');
const router = express.Router();
const {
    createPlan,
    getAllPlans,
    getPlanById,
    updatePlan,
    deletePlan
} = require('../../controller/subscription/subscriptionPlanController');

// const { authMiddleware, isSuperAdmin } = require('../middlewares/authMiddleware');

// Public Routes
router.get('/', getAllPlans);
router.get('/:id', getPlanById);

// Admin-Only Routes (Should be protected by authMiddleware)
router.post('/', createPlan);
router.put('/:id', updatePlan);
router.delete('/:id', deletePlan);

module.exports = router;
