const express = require("express");
const controller = require("./controller");

const router = express.Router();

// Internal users (Sales Rep, Manager, Finance/Ops, Admin)
router.post("/signup", controller.signup);
router.post("/login", controller.login);

// Customer portal - kept under the same router for now but issues a
// separate token type (see middleware/auth.js) and never touches the
// internal User table.
router.post("/customer-login", controller.customerLogin);

module.exports = router;
