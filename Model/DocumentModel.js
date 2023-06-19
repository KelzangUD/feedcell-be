const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const DocumentSchema = new Schema({
  title: {
    required: true,
    type: String,
  },
  category: {
    required: true,
    type: String,
  },
  filename: {
    required: true,
    type: String,
  },
  fileId: {
    required: true,
    type: String,
  },
  uploaded_on: {
    required: true,
    type: String,
  },
  uploaded_by: {
    required: true,
    type: String,
  },
});

const Document = mongoose.model("Document", DocumentSchema);

module.exports = Document;
