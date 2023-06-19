const mongoose = require("mongoose");

const detailsSchema = new mongoose.Schema({
  empID: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  gender: {
    type: String,
    required: true,
  },
  designation: {
    type: String,
    required: true,
  }
});

const Details = mongoose.model("empDetails", detailsSchema);
module.exports = Details;
