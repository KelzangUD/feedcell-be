const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CategorySchema = new Schema({

    category: {
        required: true,
        type: String,
    }

});

const category = mongoose.model('Document', CategorySchema);

module.exports = category;