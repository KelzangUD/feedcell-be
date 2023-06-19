const express = require("express");
router = express.Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const multer = require("multer");
const GridFsStorage = require("multer-gridfs-storage").GridFsStorage;
const Grid = require("gridfs-stream");
const methodOverride = require("method-override");
const User = require("../Model/UserModel");
const nodemailer = require("nodemailer");
const Document = require("../Model/DocumentModel");
const dayjs = require("dayjs");
const Category = require("../Model/Category");
const ejs = require("ejs");
const fs = require("fs");

// Middleware
router.use(methodOverride("_method"));

// Create mongo connection
const conn = mongoose.createConnection(process.env.DB_URL);

let gfs;

conn.once("open", () => {
  // Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection("documents");
});

// Create storage engine
const storage = new GridFsStorage({
  url: process.env.DB_URL,
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err) => {
        if (err) {
          return reject(err);
        }
        const filename = file.originalname;
        const fileInfo = {
          filename: filename,
          bucketName: "documents",
        };
        resolve(fileInfo);
      });
    });
  },
});
const upload = multer({ storage });

//upload a file
router.post("/upload", upload.single("file"), (req, res) => {
  const data = req.body.metadata;
  const metadata = JSON.parse(data);

  Document.findOne({ title: metadata.title })
    .then((docs) => {
      if (docs) {
        return res.status(200).json({
          success: false,
          message: "Document already exists",
        });
      }
      let newDocument = new Document({
        title: metadata.title,
        category: metadata.category,
        filename: req.file.filename,
        uploaded_by: metadata.uploaded_by,
        uploaded_on: dayjs(new Date()).format("YYYY-MM-DD"),
        fileId: req.file.id,
      });
      newDocument
        .save()
        .then((docs) => {
          res.status(200).json({
            success: true,
            docs,
            message: "Mail sent to all users",
          });
          sendNotifications(req, res);
        })
        .catch((err) => res.status(500).json(err));
    })
    .catch((err) => res.status(500).json(err));
});

router.get("/get-files", (req, res) => {
  getFiles(res);
});

function getFiles(res, err = null) {
  gfs.files.find().toArray((err, files) => {
    if (!files || files.length === 0) {
      res.json({ message: "No files found" });
    } else {
      res.json({ files });
    }
  });
}

router.get("/get-document", async (req, res) => {
  Document.find({}, (err, files) => {
    if (err) {
      res.json({ err: err.message });
    } else {
      res.status(200).json({
        files,
      });
    }
  });
});

//Get the document according to the user types.
router.get("/files/:id", async (req, res) => {
  const user = await User.findById(req.params.id);
  if (user.is_admin === true) {
    gfs.files.find().toArray((err, files) => {
      // Check if files
      if (!files || files.length === 0) {
        return res.json({
          err: "No files exist",
        });
      }
      // Files exist
      return res.json(files);
    });
  } else {
    return res.status(404).json({
      err: "No files exist",
    });
  }
});

//get individual file
router.get("/file-name/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists",
      });
    }
    // File exists
    return res.json(file);
  });
});

//get the file
router.get("/document-name/:filename", (req, res) => {
  gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
    // Check if file
    if (!file || file.length === 0) {
      return res.status(404).json({
        err: "No file exists",
      });
    }

    // Check the file type
    if (
      file.contentType === "image/jpeg" ||
      file.contentType === "image/png" ||
      file.contentType === "file/pdf" ||
      file.contentType === "image/jpg"
    ) {
      const readstream = gfs.createReadStream(file.filename);
      readstream.pipe(res);
    } else {
      res.status(404).json({
        err: "Error",
      });
    }
  });
});

//send mails to the users after the document has been uploaded.
function sendNotifications(req, res) {
  User.find({}, function (err, allUsers) {
    if (err) {
      res.json({ message: err.message });
    }
    var mailList = [];
    allUsers.forEach(function (users) {
      mailList.push(users.email);
      return mailList;
    });
    var transporter = nodemailer.createTransport({
      host: `${process.env.HOST}`,
      port: 587,
      auth: {
        user: `ticl-alerts@tashicell.com`,
        pass: `77889977`,
      },
    });

    ejs.renderFile(
      __dirname + "..\\..\\views\\document-notification.ejs",
      { name: "Notifications" },
      // ejs.renderFile("views/document-notification.ejs", { name: "Notifications" },
      function (err, data) {
        if (err) {
          res.json({ message: err.message });
        } else {
          var mainOptions = {
            to: mailList,
            from: `ticl-alerts@tashicell.com`,
            subject: "Notifications",
            html: data,
          };
          transporter.sendMail(mainOptions, function (err, info) {
            if (err) {
              res.json({ message: err.message });
            } else {
              res.json({ message: "Mail sent to " + mailList });
            }
          });
        }
      }
    );
  });
}

//get the list of the users in the collection to be tagged in the documents.
router.get("/get-username", (req, res) => {
  User.find({}, { name: 1 }, (err, user) => {
    if (err) {
      res.json({ message: err.message });
    }
    res.json(user);
  });
});

//Get the list of the users who have uploaded the document
router.get("/uploaded-by", (req, res) => {
  Document.find({}, { uploaded_by: 1 }, (err, user) => {
    if (err) {
      res.json({ message: err.message });
    }
    res.json(user);
  });
});

router.get("/filter-documents", (req, res) => {
  var query = {};
  if (req.body.name) {
    query = {
      $and: [
        { category: { $regex: req.body.category, $options: "i" } },
        { uploaded_by: { $regex: req.body.uploaded_by, $options: "i" } },
      ],
    };
  }
  Document.find(query, function (err, data) {
    if (err) {
      res.json({ err: err.message });
    }
    res.json({ data });
  });
});

router.post("/add-new-category", (req, res) => {
  const category = req.body.category;
  Category.findOne({ category: category })
    .then((docs) => {
      if (docs) {
        return res.status(200).json({
          success: false,
          message: "Category already exists",
        });
      }
      let newCategory = new Category({
        category,
      });
      newCategory
        .save()
        .then(() => {
          res.status(200).json({
            success: true,
            message: "Category added successfully",
          });
        })
        .catch((err) => res.status(500).json(err));
    })
    .catch((err) => res.status(500).json(err));
});

//delete a document from the database
router.delete("/delete/:id", deleteFromCollection);

function deleteFromCollection(req, res) {
  Document.findOne({ fileId: req.params.id })
    .then((image) => {
      if (image) {
        Document.deleteMany({ fileId: req.params.id })
          .then(() => {
            return res.json({
              success: true,
              message: `File deleted successfully`,
            });
          })
          .catch(() => {
            return res.json({
              message: `Error deleting file`,
            });
          });
      }
    })
    .catch((err) => res.status(500).json(err));
  gridfsBucket = new mongoose.mongo.GridFSBucket(conn.db, {
    bucketName: "documents",
  });
  gridfsBucket.delete(new mongoose.Types.ObjectId(req.params.id));
}

//Get the count of the each document.
router.get("/document-count", async (req, res) => {
  var category = {};
  Document.aggregate(
    [
      {
        $match: {
          // _id: mongoose.Types.ObjectId(_id),
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
    ],
    function (err, arr) {
      arr.map((p) => (category[p._id] = p.count));
      res.json(category);
    }
  );
});

//Downlaod a file
router.get("/download/:id", async (req, res) => {
  var gridfsbucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
    chunkSizeBytes: 1024,
    bucketName: "documents",
  });
  try {
    const _id = mongoose.Types.ObjectId(req.params.id);
    const cursor = gridfsbucket.find({ _id });
    const filesMetadata = await cursor.toArray();
    if (!filesMetadata.length) return res.json({ err: "Not a File!" });
    gridfsbucket.openDownloadStream(_id).pipe(res);
  } catch (err) {
    res.json({ err: `Error: ${err.message}` });
  }
});

module.exports = router;
