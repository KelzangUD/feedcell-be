const mongoose = require("mongoose");

module.exports = mongoose.model(
  "User",
  new mongoose.Schema({
    _id: {
      type: String,
    },
    is_admin: Boolean,
    status: String,
    password: String,
    empID: {
      type: String,
    },
    email: {
      type: String,
    },
    gender: {
      type: String,
    },
    name: {
      type: String,
    },
    designation: {
      type: String,
    },
    number: {
      type: String,
    },
    region: {
      type: String,
    },
    extension: {
      type: String,
    },
  })
);
