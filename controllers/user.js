const { Router } = require('express');
const validator = require("validator");
const bcrypt = require('bcryptjs');

const { User } = require('../models')

const controller = Router();


const userValidator = (req, res, next) => {
    const { name, email, password } = req.body;
    // TODO: email verification required validation does not prevent fraud
    // TODO: no password policy specified 
    const isValid =
        (name && typeof (name) == 'string') &&
        (password && typeof (password) == 'string') &&
        (email && typeof (email) == 'string' && validator.isEmail(email));
    if (!isValid) {
        res.status(400).send({ message: 'missing or invalid input' });
        return;
    }
    next();
};

const hashRounds = Number.parseInt(process.env.HASH_ROUNDS, 10);

// create user record
controller.post('/', userValidator, (req, res, next) => {
    // TODO: what about duplicate entries
    const { name, email, password } = req.body;
    // not safe to store passwords in a db
    bcrypt.hash(password, hashRounds, (err, passwordHash) => {
        if (err) return next(err);
        User.create({ name, email, passwordHash })
            .then(savedUser => {
                res.status(201).send({ message: 'User record saved', data: { id: savedUser.id } });
            })
            .catch(next);
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
                res.status(400).send({ message: 'User not found' });
                return;
            }
            bcrypt.compare(password, dbUser.passwordHash, (err, validPassword) => {
                if (err) return next(err);
                if (validPassword) {
                    const {name, email, id} = dbUser;
                    res.send({name, email, id});
                    return
                } else {
                    // not specific that invalid password no an attacker cannot use this guess valid emails
                    res.status(400).send({ message: 'User not found' });
                    return;
                }
            });
        })
        .catch(next);
});


controller.param('userId', (req, res, next, userId) => {
    User.findByPk(userId)
        .then(dbUser => {
            if (!dbUser) {
                // not specific that email not found so an attacker cannot use this guess valid emails
                res.status(404).send({ message: 'User not found' });
                return;
            }
            req.dbUser = dbUser;
            next();
        })
        .catch(next);
});


//update user record
controller.put('/:userId', userValidator, (req, res, next) => {
    const { name, email, password } = req.body;
    // not safe to store passwords in a db
    bcrypt.hash(password, hashRounds, (err, passwordHash) => {
        if (err) return next(err);
        req.dbUser.update({ name, email, passwordHash })
            .then(() => {
                res.send({ message: 'User record updated' });
            })
            .catch(next);
    });
});


// remove user record
controller.delete('/:userId', (req, res, next) => {
    req.dbUser.destroy({ force: true })
        .then(() => {
            res.send({ message: 'User record deleted' });
        })
        .catch(next);
});


//TODO: Test purposes only
controller.get('/', (req, res, next) => {
    User.findAll()
        .then(allUsers => {
            res.send(allUsers);
        })
        .catch(next)
});



module.exports = controller;