const express = require("express");
require("dotenv").config();
const dbConnection = require("./DBConfig/dbconnection");
const bodyParser = require("body-parser");
const UserRoutes = require("./Routes/UserRoutes");
const DocumentRoutes = require("./Routes/DocumentRoutes");
const DetailsRoute = require("./Routes/DetailsRoute");
const cors = require("cors");
const Document = require('./Model/DocumentModel');
const ForgotPasswordRoutes = require("./Routes/ForgotPasswordRoutes");
const QuestionRoutes = require('./Routes/QuestionRoutes')

const app = express();

//Database connection
dbConnection();

app.use(cors());

//Routes
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

//Routes for different stakeholder
app.use("/", UserRoutes);
app.use("/", DocumentRoutes);
app.use("/", DetailsRoute);
app.use("/", ForgotPasswordRoutes);
app.use("/", QuestionRoutes);

const server = require('http').createServer(app);
const ws = require('ws');
const wsServer = new ws.Server({
    port: 8080,
});
wsServer.on('connection', socket => {
    socket.on('message', message => {

        wsServer.clients.forEach(function each(client) {
            if (client.readyState === ws.OPEN) {
                setTimeout(function () {
                    client.send(
                        Buffer.from(JSON.stringify({ "source": "server", "content": "response from server" }))
                        , { binary: false });
                }, 1000);
            }
        });

        console.log(message.toString());
    }
    );
});

app.listen(process.env.PORT, () => {
  console.log(`Listening at ${ process.env.PORT }`);
});
