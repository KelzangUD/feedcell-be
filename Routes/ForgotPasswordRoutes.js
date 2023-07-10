const express = require("express");
router = express.Router();
const User = require("../Model/UserModel");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
let { otp, email } = {};

//forgot password
router.post("/forgot-password", async (req, res) => {
  email = req.body.email;
  try {
    const user = await User.findOne({ email: email });
    if (!user) {
      return res.json({ message: "Sorry Email does not Exist!" });
    } else if (user) {
      res.json({ message: "Check your email" });
      otp = Math.floor(1000 + Math.random() * 9000);
      const transporter = nodemailer.createTransport({
        host: "smtp1.tashicell.com",
        port: "587",
        auth: {
          user: "ticl-alerts@tashicell.com",
          pass: "77889977",
        },
      });
      ejs.renderFile(__dirname + "..\\..\\views\\forgot-password.ejs",
      // ejs.renderFile("views/forgot-password.ejs",
      { name: "Forgot-Password", otp: otp },
      function (err, data) {
        if (err) {
          res.json({ message: err.message })
        } else {
          var mainOptions = {
            to: `${ email }`,
            from: `ticl-alerts@tashicell.com`,
            subject: "Reset Password",
            html: data,
          };
          transporter.sendMail(mainOptions, function (err, info) {
            if (error) throw error;
            return res.send({ message: "Sent reset password email" });
          });
        }
      }
    );
    }
    
  } catch (err) {
    res.send({ message: err });
  }
});

//Create new password
router.post("/new-password", async (req, res) => {
  if (req.body.otp == otp) {
    try {
      User.findOne({ email: email }, (err, user) => {
        if (user) {
          user.password = req.body.password;
          user.save();
          return res.json({ message: "Password updated successfully" });
        } else {
          res.json({ message: err.message });
        }
      });
    } catch (err) {
      res.json({ message: err.message });
    }
  } else {
    res.json({ message: "OTP didn't match" });
  }
});

//Create new password
router.post("/sso-new-password", async (req, res) => {
  console.log(req.query)
  const emp_id = `E00${req.query.empID}`; 
  try {
    User.findOne({ empID: emp_id }, (err, user) => {
      if (user) {
        user.password = req.query.password;
        user.save();
        return res.json({ message: "Password updated successfully" });
      } else {
        res.json({ message: err.message });
      }
    });
  } catch (err) {
    res.json({ message: err.message });
  }
});

module.exports = router;
