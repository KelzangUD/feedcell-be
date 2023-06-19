const Details = require("../Model/DetailsModel");
const express = require("express");
const Question = require("../Model/QuestionsModel");
const NewQuestion = require("../Model/NewQuestionModel");
const QuestionsBank = require("../Model/QuestionsBankModel")
const TestParam = require("../Model/TestParamsModel");
const TestResult = require("../Model/TestResult");
const User = require("../Model/UserModel");
const request = require("request");
const dayjs = require("dayjs");
const nodemailer = require("nodemailer");
const ejs = require("ejs");

router = express.Router();
let user_details = {};


/**
 * @description this router handles the request to add questions to QuestionBank.
 */
router.post("/add-to-questions-bank", addToQuestionsBank);
async function addToQuestionsBank(req, res) {
  // console.log(req.body.questions);
  const data = req.body;
  QuestionsBank.insertMany(data.questions)
    .then(() => {
      res.status(201).json({ message: 'Uploaded To Questions Bank Successful' })
    })
    .catch((err) => {
      res.status(400).json({ message: 'Error While Uploading to Questions Bank' })
    })
  };
/**
 * @description this router handles the request to get all questions stored in questions bank from database.
 */
router.get("/get-from-questions-bank", getQuestionsBank);
async function getQuestionsBank(req, res) {
  QuestionsBank.find({}, {uploadedOn: 1, data: 1})
    .then((questions) => {
      res.status(200).json({
        questions: questions,
      });
    })
    .catch((err) => {
      res.status(200).json({ err: err.message });
    });
};

router.post("/add-questions", addQuestion);
async function addQuestion(req, res) {
  // console.log(req.body);
  // const data = JSON.parse(req.body["questions"]);
  const data = req.body;
  // Question.findOne().then((questions) => {
  //   questions
  //     ? Question.findByIdAndUpdate(
  //         { _id: questions._id, new: true },
  //         data,
  //         function (err, docs) {
  //           if (err) {
  //             res.status(200).json({ message: err });
  //           } else {
  //             res.status(200).json({ message: "Upload Successful" });
  //           }
  //         }
  //       )
  //     : Question.create(data.questions);
  // });
  NewQuestion.insertMany(data.questions)
    .then(() => {
      res.status(200).json({ message: 'Upload Successful' })
    })
    .catch((err) => {
      res.status(400).json({ message: 'Error While Uploading Questions' })
    })
}

/**
 * @description this router handles the request to get all questions from database.
 */
router.get("/get-questions", getQuestions);
async function getQuestions(req, res) {
  Question.find({}, { _id: 0, __v: 0 })
    .then((questions) => {
      res.status(200).json({
        questions: questions,
      });
    })
    .catch((err) => {
      res.status(200).json({ err: err.message });
    });
}

/**
 * @description this router handles the request to get count all questions from the server.
 */
router.get("/question-count", questionCount);
async function questionCount(req, res) {
  NewQuestion.find()
    .count()
    .then((question_count) => {
      res.status(200).json({
        questions_count: question_count,
      });
    })
    .catch((err) => {
      res.status(500).json({ err: err.message });
    });
}
/**
 * @description this router handles the request to get all questions from the server to schedule test.
 */
router.get("/get-questions-to-schedule-test", questionsToScheduleTest);
async function questionsToScheduleTest(req, res) {
  NewQuestion.find({},
    {
      _id: 1,
      question: 1,
      option_1: 1,
      option_2: 1,
      option_3: 1,
      option_4: 1,
      correct_option: 1,
      point: 1,
    },
    ).then((questions) => {
    // console.log(questions);
    res.status(200).json({
      questions: questions,
    })
  })
  .catch((err) => {
    console.log(err);
  })
}

/**
 * @description this router handles the request to schedule test.
 */
router.post("/schedule-test", setTests, sendSMS);
async function setTests(req, res) {
  try {
    new TestParam(req.body).save().then(() => {
      res.status(200).json({
        message: "Test Scheduled Successfully",
      });
      prepareQuestion(req.body);
      sendSMS(req.body);
    });
  } catch (err) {
    res.json({ message: err.message });
  }
}

/**
 * @description this function will prepare questions to float for upcoming test.
 * @params params:{ questions: 1, time: '2022-09-30T11:51:00', duration: '2 Hours' }
 * @description questions: number of questions for the test.
 * @description time: test start time.
 * @description duration: test duration
 */
function prepareQuestion(params) {
  moveQuestions(params);
}

function sendSMS(test_date) {
  User.find({}, { number: 1, _id: 0 }, (err, user) => {
    if (!err) {
      const message = `CCEs test have been scheduled on ${dayjs(
        test_date.upcoming_tests.time
      ).format("DD MMMM, YYYY")} at ${dayjs(
        test_date.upcoming_tests.time
      ).format("hh:mm A")}. Link: https://kep.tashicell.com/`;
      user.map((numbers) => {
        request(`http://10.76.177.100//cgi-bin/BMP_SendTextMsg?UserName=feedcell&PassWord=feedcell&UserData=${message}
        &Concatenated=0&Mode=0&SenderId=TashiCell&Deferred=false&Number=975${numbers.number}&Dsr=false`);
      });
    } else {
      console.log(err);
    }
  });
}

async function sendMail() {
  let emailID = [];
  User.find({}, { email: 1, _id: 0 }, (err, data) => {
    if (data) emailID = data;
  });
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
    {
      name: "Questions saved successfully",
      user_details: user_details,
      password: process.env.PASSWORD,
    },
    function (err, det) {
      if (err) {
        // res.json({ message: err.message });
        console.log("Err", err)
      } else {
        emailID.map((element) => {
          var mainOptions = {
            to: `sw_engineer13.sdu@tashicell.com`,
            from: `ticl-alerts@tashicell.com`,
            subject: "Upcoming CCEs Test",
            html: det,
          };
          transporter.sendMail(mainOptions, function (err, info) {
            err ? console.log("error sending mail") : console.log("Mail Sent Successfully");
            // err
            //   ? res.json({ err: err.message })
            //   : res.json({ message: "Mail Sent Successfully" });
          });
        });
      }
    }
  );
}

function moveQuestions(params) {
  let _ids = [];
  NewQuestion.find({}, { _id: 0, __v: 0 })
    .limit(params.upcoming_tests.questions)
    .then((questions) => {
      Question.insertMany(questions);
    });
  clearFromQuestionBank(params.upcoming_tests.questionsIdArray);
}

function clearFromQuestionBank(questions_id) {
  // console.log(questions_id);
  NewQuestion.find({},{
    question: 0,
    option_1:0,
    option_2:0,
    option_3:0,
    correct_option:0,
    point:0,
    __v:0
  })
    .then((questions) => {
      questions.forEach((item) =>{
        questions_id.map(async(element) => {
          if (item._id.toString() ===  element) {
            await NewQuestion.deleteOne({ _id: item._id });
          }
        })
      })
    });
  // console.log(number_of_questions);
  // Question.find({},{
  //   question: 0,
  //   option_1:0,
  //   option_2:0,
  //   option_3:0,
  //   correct_option:0,
  //   point:0,
  //   __v:0
  // })
  //   .limit(number_of_questions)
  //   .then((question_ids) => {
  //     question_ids.forEach( (question) =>{Question.remove({ _id: question._id.toString });
  //     console.log(question._id)})
      
  //   });
}
/**
 * @description this router handles the request to get details for scheduled test from database.
 */
router.get("/schedule-details", getTestSchedule);
async function getTestSchedule(req, res) {
  TestParam.find({}, { _id: 0, __v: 0 })
    .then((upcoming_tests) => {
      res.status(200).json({
        upcoming_tests: upcoming_tests,
      });
    })
    .catch((err) => {
      res.status(200).json({ err: err.message });
    });
}
/**
 * @description this router handles the request to save Test Details.
 */
router.post("/save-test-result", saveTestResult);
async function saveTestResult(req, res) {
  try {
    new TestResult(req.body).save().then(() => {
      res.status(200).json({
        message: "Test Result Saved Successfully",
      });
    });
  } catch (err) {
    res.json({ message: err.message });
  }
}
/**
 * @description this router handles the request to get details for test Results.
 */
 router.get("/test-results", getTestResults);
 async function getTestResults(req, res) {
   TestResult.find({}, { _id: 0, __v: 0 })
     .then((test_Results) => {
       res.status(200).json({ test_Results });
     })
     .catch((err) => {
       res.status(200).json({ err: err.message });
     });
 };
 /**
 * @description this router handles the request to get details for test Results for particular month and year.
 */
 router.post("/test-results-for-the-month-and-year", getTestResultsForParticularMonthAndYear);
 async function getTestResultsForParticularMonthAndYear(req, res) {
  const month = req.body.month;
  const year = req.body.year;
  TestResult.find({ testScheduledMonth: month, testScheduledYear: year })
    .then((test_Results_for_particular_month) => {
     res.status(200).json({ test_Results_for_particular_month });
   })
   .catch((err) => {
     res.status(200).json({ err: err.message });
   });
 };
 /**
 * @description this router handles the request to get details for test Results for particular year.
 */
 router.post("/test-results-for-the-year", getTestResultsForParticularYear);
 async function getTestResultsForParticularYear(req, res) {
  const year = req.body.year;
  TestResult.find({ testScheduledYear: year })
    .then((test_Results_for_selected_year) => {
     res.status(200).json({ test_Results_for_selected_year });
   })
   .catch((err) => {
     res.status(200).json({ err: err.message });
   });
 };
 /**
 * @description this router handles the request to end test scheduled.
 */
  router.delete("/end-test-schedule", endTestScheduled);
  async function endTestScheduled(req, res) {
    TestParam.find({}, { _id: 0, __v: 0 })
    .remove()
    .then(() => {
      Question.find({}, { _id: 0, __v: 0 })
      .remove()
      .then(() => {
        res.status(200).json({message: "Test Scheduled Ended Successfully"})
      })
      .catch((err) => {
        res.status(200).json({ err: err.message });
      })
    })
    .catch((err) => {
      res.status(200).json({ err: err.message });
    })
  }
 /**
 * @description this router handles the delete question from question bank.
 */
router.delete("/delete-question-from-question-bank/:id", (req, res) => {
  QuestionsBank.findByIdAndDelete(req.params.id, (err) => {
    if (err) {
      res.status(500).json({ message: err.message });
    } else {
      res.status(200).json({
        message: "Deleted Successfully",
      });
    }
  });
});

module.exports = router;
