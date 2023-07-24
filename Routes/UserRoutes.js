const express = require("express");
router = express.Router();
const User = require("../Model/UserModel");
const nodemailer = require("nodemailer");
const Details = require("../Model/DetailsModel");
const mongoose = require("mongoose");
const ejs = require("ejs");
let user_details = {};
var bcrypt = require("bcryptjs");
const crypto = require("crypto");
const fs = require('fs');
const axios = require('axios');
const qs = require('qs');

//get user details
router.get("/get-Details/:empID", (_req, res) => {
  let empID = _req.params.empID;
  User.findOne({ empID: empID })
    .then((users) => {
      res.status(200).json({
        _id: users._id,
        name: users.name,
        email: users.email,
        employeeId: users.empID,
        gender: users.gender,
        is_admin: users.is_admin,
        designation: users.designation,
        number: users.number,
        region: users.region,
        extension: users.extension,
      });
      user_details = users;
    })
    .catch((err) => {
      res.status(500).json({ err: err.message });
    });
});
//get user details based on document id
router.get("/getDetailsBasedOnDocId/:id", (_req, res) => {
  let id = _req.params.id;
  User.findOne({ _id: id })
    .then((users) => {
      res.status(200).json({
        _id: users._id,
        name: users.name,
        email: users.email,
        employeeId: users.empID,
        gender: users.gender,
        is_admin: users.is_admin,
        designation: users.designation,
        number: users.number,
        region: users.region,
        extension: users.extension,
      });
      user_details = users;
    })
    .catch((err) => {
      res.status(500).json({ err: err.message });
    });
});
// sso user mapping
async function ssoUserMapping(employeeID) {
  const username = process.env.CONSUMER_USERNAME;
  const password = process.env.CONSUMER_PASSWORD;
  let data = qs.stringify({
    'empId': employeeID,
    'appCode': process.env.SSO_APPCODE,
    'access': process.env.SSO_ACCESS 
  });
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${process.env.SSO_API}/employee-mapping`,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
    },
    data : data
  };
  
  return axios.request(config)
  .then((response) => (response))
  .catch((error) => (error));
}

function sendSMS(empId, password, number) {
  User.findOne({empID: empId}, (err, user) => {
    if (!err) {
      const message = `Please login from SSO to access the KEP System with user ID ${empId}  and password ${password}`;
      user.map(() => {
        request(`http://10.76.177.100//cgi-bin/BMP_SendTextMsg?UserName=feedcell&PassWord=feedcell&UserData=${message}
        &Concatenated=0&Mode=0&SenderId=TashiCell&Deferred=false&Number=975${number}&Dsr=false`);
      });
    } else {
      console.log(err);
    }
  });
}

//User Creation and dispersion of credentials
router.post("/user-registration", createUser, sendMail);
async function createUser(req, res, next) {
  let body = {};
  let user = {};
  // console.log(req.body);
  try {
    Object.assign(body, { is_admin: req.body.is_admin }),
    Object.assign(body, { status: req.body.status }),
    Object.assign(body, { password: req.body.dob }),
    Object.assign(body, { name: req.body.fullName}),
    Object.assign(body, { email: req.body.email}),
    Object.assign(body, { empID: req.body.empID }),
    Object.assign(body, { designation: req.body.designation }),
    Object.assign(body, { number: req.body.number }),
    Object.assign(body, { gender: req.body.gender }),
    Object.assign(body, { region: req.body.region }),
    Object.assign(body, { extension: req.body.extension }),
    (user = new User(body)),
    (user._id = mongoose.Types.ObjectId()),
    (user.isNew = true),
    user
      .save()
          .then(async () =>{
            const empID = req.body.empID.split("0")[2];
            const response = await ssoUserMapping(empID);
            // console.log(response)
            if (response.data.message === "Employee mapping saved"){
              res.status(201).json({ message: "Registration successful" });
            }
          }
      )
      sendMail(req, res);
      // sendSMS(req.body.empID, process.env.PASSWORD, req.body.number);
  } catch (err) {
    return res.status(201).json({ message: "Registration Failed" })
  }
}

async function sendMail(req, res) {
  var transporter = nodemailer.createTransport({
    host: `smtp1.tashicell.com`,
    port: 587,
    auth: {
      user: `ticl-alerts@tashicell.com`,
      pass: `77889977`,
    },
  });
  ejs.renderFile(
    "views/new-user.ejs",
    // __dirname + "..\\..\\views\\new-user.ejs",
    // ejs.renderFile("views/new-user.ejs",
    {
      name: "New User",
      user_details: req.body,
      password: process.env.PASSWORD,
    },
    function (err, data) {
      if (err) {
        // res.json({ message: err.message });
        console.log(err);
      } else {
        var mainOptions = {
          to: `${req.body.email}`,
          from: `ticl-alerts@tashicell.com`,
          subject: "KEP-SSO Registration",
          html: data,
        };
        transporter.sendMail(mainOptions, function (err, info) {
          err ? console.log(err): console.log("Successful");
            // ? res.json({ err: err.message })
            // : res.json({ message: "Mail Sent Successfully" });
        });
      }
    }
  );
}

//user login
router.post("/login", (req, res) => {
  const empID = req.body.empID;
  const password = req.body.password;
  User.findOne({ empID: empID }, (_err, user) => {
    const user_params = {
      id: "",
      user_name: "",
      status: "",
      emp_id: "",
      is_admin: "",
    };
   
    if (user && user.status == "active" && password === user.password) {
      res.json({
        message: "Login Successful",
        user: {
          _id: user._id,
          user_name: user.name,
          status: user.status,
          emp_id: user.empID,
          is_admin: user.is_admin,
        },
      });
      return;
    }
    if (user && user.status != "active") {
      res.json({
        message: "You are suspended.",
        user: user_params,
      });
      return;
    }

    if (user && password != user.password) {
      res.json({
        message: "Password didn't match",
        user: user_params,
      });
      return;
    }
    
    if (!user || _err) {
      res.json({
        message: "User doesn't exit.",
        user: user_params,
      });
      return;
    }
  });
});

//update password
router.post("/update-password/:id", async (req, res) => {
  const oldPassword = req.body.oldPassword;
  const password = req.body.password;
  try {
    // get user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(400).send({ message: "User not found"});
    }
    if (user.password !== oldPassword) {
      res.send({ message: "Password didn't match. Check your old password" });
    }
    // update user's password
    user.password = password;
    const updatedUser = await user.save();
    return res.status(201).send({ message: "Password updated successfully" });
  } catch (err) {
    return res.json({ message: "Something went wrong. Try again" });
  }
});

//Get all the users
router.get("/get-all-users", (req, res) => {
  User.find(
    {},
    {
      name: 1,
      empID: 1,
      email: 1,
      designation: 1,
      extension: 1,
      region: 1,
      status: 1,
      is_admin: 1,
    },
    (err, user) => {
      if (err) {
        res.status(500).json({ err: err.message });
      } else {
        res.status(200).json({
          user,
        });
      }
    }
  );
});

// update status in sso

const updateUserStatusInSso = async(data) => {
  let userData = qs.stringify(data);
  
  let config = {
    method: 'post',
    maxBodyLength: Infinity,
    url: `${process.env.SSO_API}/employee-mapping`,
    headers: { 
      'Content-Type': 'application/x-www-form-urlencoded', 
      'Authorization': 'Basic dmFzYXBwX3JlY29uOnZAc18mX29ubV8xMjMl'
    },
    data : userData
  };
  
  axios.request(config)
  .then((response) => {
    return response;
  })
  .catch((error) => {
    return error;
  });
}

//update status
router.post("/update-status/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(200).send({ message: "User not found"});
    } else {
      user.status = req.body.status;
      user
        .save()
        .then((response) => {
          const data = {
            empId: response.empID.split("0")[2],
            appCode : process.env.SSO_APPCODE,
            access : response.status === 'active' ? 1 : 0
          }
          const ssoResponse = updateUserStatusInSso(data)
          if (ssoResponse.status === 200) {
            return res.status(200).json({ message: "Status Updated Successfully" });
          } else {
            return res.status(200).json({ message: ssoResponse });
          }
        })
        .catch((err) => {
          res.status(400).send({ message: "Unable To Update Status" });
          console.log(err);
        });
    }
  } catch (err) {
    return res.json({ message: "Something went wrong. Try again" });
  }
});

//update status
router.post("/sso-update-status", async (req, res) => {
  try {
    const emp_id = `E00${req.body.empID}`
    const user = await User.findOne({ empID: emp_id });
    if (!user) {
      return res.status(200).send({ message: "User not found"});
    } else {
      user.status = req.query.userStatus === '1' ? 'active' : 'suspend';
      user
        .save()
        .then((response) => {
          res.status(200).json({ message: "Status Updated Successfully" });
        })
        .catch((err) => {
          res.status(400).send({ message: "Unable To Update Status" });
          console.log(err);
        });
    }
  } catch (err) {
    return res.json({ message: "Something went wrong. Try again" });
  }
});

//delete a user
router.delete("/delete-user/:id", (req, res) => {
  User.findByIdAndDelete(req.params.id, (err, user) => {
    if (err) {
      res.status(500).json({ message: err.message });
    } else {
      res.status(200).json({
        message: "User deleted successfully",
      });
    }
  });
});
// formating date funtion
const formatingDate = (date) => {
  let year = date.getFullYear();
  let month = date.getMonth() + 1;
  let day = date.getDate();
  let hour = parseInt(date.getHours(), 10);
  // Pad the month and day with leading zeros if necessary
  month = month < 10 ? "0" + month : month;
  day = day < 10 ? "0" + day : day;
  hour = hour < 10 ? "0" + hour : hour;

  // Return the formatted date
  return `${year}_${month}_${day}_${hour}`;
};
const verifyPassword = (password, hashedPassword) => {
  return bcrypt.compareSync(password, hashedPassword);
};

const verification = (publicKey, tokenSignedData, tokenSignature) => {
  try {
    const sig = crypto.createVerify('RSA-SHA1');
    sig.update(Buffer.from(tokenSignedData, 'utf8'));
    const isVerified = sig.verify(publicKey, tokenSignature, 'hex');
    if (isVerified) {
      return true
    }
    return false
  } catch (e) {
    console.error(e);
    return false;
  }
}

//sso login
router.get("/sso/:token", (_req, res) => {
  const token = _req.params.token;
  const decoded = decodeURIComponent(token);
  const decodedArray = decoded.split("|");
  const employeeID = parseInt(decoded.split("|")[0]) / 9;
  // console.log(employeeID)
  // console.log((''+employeeID).length)
  let empID;
  if ((''+employeeID).length === 1) {
    empID = `E0000${decodedArray[0]/9}`
  } else if ((''+employeeID).length === 2) {
    empID = `E000${decodedArray[0]/9}`
  } else {
    empID = `E00${decodedArray[0]/9}`;
  };
  // console.log(empID)
  const tokenSignedData = decoded.split("|")[1];
  const tokenSignature = decoded.split("|")[2];
  // const tokenEncryptedPass = decoded.split("|")[3];
  const tokenSignedDataJava = tokenSignedData.replace(/^\$2y(.+)$/i, "$2a$1");
  User.findOne({ empID: empID })
    .then((users) => {
      if(users.number){
        const payLoadClient = employeeID + "@" + users.number + "@" + formatingDate(new Date()); //use in server for sso-login
        // const payLoadClient = employeeID + "@" + users.number + "@" + "2023_06_12_17";
        const publicKey = fs.readFileSync(__dirname+"/FEEDCELL_SSO.pem", { encoding: "utf8" });
        const bcryptVerification = verifyPassword(payLoadClient, tokenSignedDataJava);
        const tokenVerification = verification(publicKey, tokenSignedData, tokenSignature);
        if (bcryptVerification && tokenVerification) {
          res.status(200).json({
            empId: users.empID,
            password: users.password,
            message: "SSO Verified Successfully!" 
          });
        } else {
          res.status(200).json({
            payLoadClient: payLoadClient,
            tokenSignedDataJava: tokenSignedDataJava,
            date: formatingDate(new Date()),
            bcryptVerification:bcryptVerification,
            tokenVerification: tokenVerification,
            users: users,
            message: "SSO Verification Failed!" 
          });
        }
      } else {
        res.status(200).json({ message: 'Contact No. Not Found' });
      }
    })
    .catch((err) => {
      res.status(500).json({ err: err.message });
    });
});

async function searchEmployee(employeeID) {
  const username = process.env.CONSUMER_USERNAME;
  const password = process.env.CONSUMER_PASSWORD;
  console.log(process.env.SSO_API)
  let config = {
    method: 'get',
    maxBodyLength: Infinity,
    url: `${process.env.SSO_API}/search-employee/${employeeID}`,
    headers: { 
      'Authorization': 'Basic ' + Buffer.from(username + ':' + password).toString('base64')
    }
  };
  
  return axios.request(config)
  .then((response) => (response))
  .catch((error) => (error));
}

// fetch employee detail from sso
router.get("/fetch-user-details/:empID", async (req, res) => {
  try {
    const empID = req.params.empID;
    const employeeID = empID.split("0")[2];
    console.log(employeeID)
    const response = await searchEmployee(employeeID);
    // console.log(response)
    if (response.status === 200) {
      return res.json({ 
        message: "Successfully Fetch!",
        data: response.data 
      });
    } else {
      return res.json({ message: "No Data" });
    }
  } catch (err) {
    return res.json({ message: "Failed To Fetch User Detail" });
  }
});

module.exports = router;
