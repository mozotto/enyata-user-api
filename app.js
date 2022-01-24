require('dotenv').config(); //load config

const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const helmet = require("helmet");

const userController = require('./user.controller');

const app = express();

app.use(helmet()); // helmet security stuff

app.use(morgan('dev')); // application logger

app.use(bodyParser.json());


// Home route for testing
app.get('/', (req, res, next) => {
    res.send({ message: "Hello World" });
});

// register routes
app.use('/user', userController);


// error handler
app.use((error, req, res, next) => {
    console.log(error);
    res.status(500).send({ message: "server error" });
});


function startServer() {
    const port = process.env.PORT;
    app.listen(port, () => {
        console.log('Api up and running');
    });
}

startServer();



