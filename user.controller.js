const { Router } = require('express');
const emailValidator = require("email-validator");
const bcrypt = require('bcryptjs');

const User = require('./user.model');

const controller = Router();


const userValidator = (req, res, next) => {
    const { name, email, password } = req.body;
    // TODO: email verification required validation does not prevent fraud
    // TODO: no password policy specified 
    const isValid = name && typeof (name) == 'string' &&
        password && typeof (password) == 'string'
    email && typeof (email) == 'string' && emailValidator.validate(email);
    if (!isValid) {
        res.status(400).send({ message: 'missing or invalid input' });
        return;
    }
    next();
};


// create user record
controller.post('/', userValidator, (req, res, next) => {
    // TODO: what about duplicate entries
    const { name, email, password } = req.body;
    // not safe to store passwords in a db
    bcrypt.hash(password, process.env.HASH_ROUNDS, (err, passwordHash) => {
        if (err) {
            console.log(err);
            res.status(500).send({ message: 'Server error' });
            return;
        }
        User.create({ name, email, passwordHash })
            .then(savedUser => {
                res.status(201).send({ message: 'User record saved', data: { id: savedUser.id } });
            })
            .catch(err => {
                console.log(err);
                res.status(500).send({ message: 'Server error' });
            });
    });
});


// TODO: would usually use the GET HTTP method but not sure what charset the application supports
// so using the fallback POST to allow request body
// also to prevent the password from showing up in the url due to url encoding of form-get params
controller.post('/search', (req, res, next) => {
    const { email, password } = req.body;
    const requiredParams = email && password;
    if (!requiredParams) {
        res.status(400).send({ message: 'email or password missing' });
        return;
    }
    User.findOne({ where: { email } })
        .then(dbUser => {
            if (!dbUser) {
                // not specific that email not found so an attacker cannot use this guess valid emails
                res.status(400).send({ message: 'Invalid credentials' });
                return;
            }
            bcrypt.compare(password, dbUser.passwordHash, (err, validPassword) => {
                if (err) {
                    console.log(err);
                    res.status(500).send({ message: 'Server error' });
                    return;
                }
                if (!validPassword) {
                    // not specific that invalid password nso an attacker cannot use this guess valid emails
                    res.status(400).send({ message: 'Invalid credentials' });
                    return;
                }
            });
        })
        .catch(err => {
            console.log(err);
            res.status(500).send({ message: 'Server error' });
        });
});


controller.param('userId', (req, res, next, userId) => {
    User.findByPk(userId)
        .then(dbUser => {
            if (!dbUser) {
                // not specific that email not found so an attacker cannot use this guess valid emails
                res.status(404).send({ message: 'Invalid UserId' });
                return;
            }
            req.dbUser = dbUser;
            next();
        })
        .catch(err => {
            console.log(err);
            res.status(500).send({ message: 'Server error' });
        });
});


//update user record
controller.put('/{userId}', userValidator, (req, res, next) => {
    const { name, email, password } = req.body;
    // not safe to store passwords in a db
    bcrypt.hash(password, process.env.HASH_ROUNDS, (err, passwordHash) => {
        if (err) {
            console.log(err);
            res.status(500).send({ message: 'Server error' });
            return;
        }
        req.dbUser.update({ name, email, passwordHash })
            .then(() => {
                res.send({ message: 'User record updated' });
            })
            .catch(err => {
                console.log(err);
                res.status(500).send({ message: 'Server error' });
            });
    });
});


// remove user record
controller.delete('/{userId}', (req, res, next) => {
    req.dbUser.destroy({ force: true })
        .then(() => {
            res.send({ message: 'User record deleted' });
        })
        .catch(err => {
            console.log(err);
            res.status(500).send({ message: 'Server error' });
        });
});


module.exports = controller;