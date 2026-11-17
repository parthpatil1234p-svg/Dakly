/**
 * Payment Routes for Dakly (Razorpay Integration)
 * 
 * @license MIT
 */

'use strict';

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, optionalProtect } = require('../middleware/authJwt');

// Public route to view plans and keyId
router.get('/plans', paymentController.getPlans);

// Create checkout order on Razorpay
router.post('/razorpay/create-order', optionalProtect, paymentController.createRazorpayOrder);

// Verify client-side payment signature from Razorpay modal
router.post('/razorpay/verify', optionalProtect, paymentController.verifyRazorpayPayment);

// Check order status
router.get('/orders/:orderId', paymentController.getOrderStatus);

// Authenticated route to view order history
router.get('/orders', protect, paymentController.getPaymentHistory);

module.exports = router;
