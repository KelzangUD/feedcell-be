const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    category: {
        type: String,
    }
})
const Category = mongoose.model('category', CategorySchema);

module.exports = Category