/**
 * Payment Routes for Dakly
 * 
 * @license MIT
 */

'use strict';

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect } = require('../middleware/authJwt');

// Public route to view plans and gateway config
router.get('/plans', paymentController.getPlans);

// Check order status
router.get('/orders/:orderId', paymentController.getOrderStatus);

// Authenticated route to view order history
router.get('/orders', protect, paymentController.getPaymentHistory);

module.exports = router;
