const mongoose = require('mongoose');

const TestParamSchema = new mongoose.Schema({
        upcoming_tests: {
    type: Object
    }
})
const TestParam = mongoose.model('scheduled_tests', TestParamSchema);

module.exports = TestParam