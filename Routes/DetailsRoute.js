const Details = require("../Model/DetailsModel");
const express = require("express");
router = express.Router();
let user_details = {};

router.get("/getDetails/:empID", (_req, res) => {
  let empID = _req.params.empID;
  Details.findOne(
    { empID: empID },
    {
      name: 1,
      email: 1,
    }
  )
    .then((users) => {
      res.json(users);
      user_details = users;
    })
    .catch(() => {
      res.status(500).json({ err: message });
    });
});

module.exports = router;
