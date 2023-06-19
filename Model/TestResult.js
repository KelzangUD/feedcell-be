const mongoose = require("mongoose");

const testResultSchema = new mongoose.Schema({
  testName: String,
  user: String,
  markScore: Number,
  totalPoint:  Number,
  numberOfQuestions: Number,
  testScheduledTime: String,
  testScheduledMonth: String,
  testScheduledYear: String,
  testDuration: String,
  testAppearedTime: String,
});

const TestResult = mongoose.model("test_results", testResultSchema);

module.exports = TestResult;
