const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
    sl_no : Number,
    question: String,
    option_1: String,
    option_2: String,
    option_3: String,
    option_4: String,
    correct_option: String,
    point: Number
})
const Question = mongoose.model('questions', QuestionSchema);

module.exports = Question