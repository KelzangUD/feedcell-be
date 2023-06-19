const mongoose = require("mongoose");

const QuestionsBankSchema = new mongoose.Schema({
    uploadedOn: String,
    data: Object,
});
const QuestionsBank = mongoose.model("questions_bank", QuestionsBankSchema);

module.exports = QuestionsBank;
