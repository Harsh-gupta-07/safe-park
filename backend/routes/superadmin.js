const express = require("express");
const { authenticateToken } = require("../middleware/auth");
const isSuperAdmin = require("../middleware/isSuperAdmin");
const router = express.Router();

module.exports = router;
