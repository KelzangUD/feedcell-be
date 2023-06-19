const mongoose = require("mongoose");

const NewQuestionSchema = new mongoose.Schema({
    sl_no : Number,
    question: String,
    option_1: String,
    option_2: String,
    option_3: String,
    option_4: String,
    correct_option: String,
    point: Number
});
const NewQuestion = mongoose.model("new_questions", NewQuestionSchema);

module.exports = NewQuestion;
