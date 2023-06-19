const mongoose = require("mongoose");

function DBconnect() {
  mongoose.connect(
    process.env.DB_URL,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    },
    () => {
      console.log("Database connected");
    }
  );
}

module.exports = DBconnect;
