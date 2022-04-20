/**
 This file is part of fareshares-pricelist a simple nodejs web application to 
manage the pricelist of a food coop.

Copyright (C) 2022 Enrico Costanza e.costanza@ieee.org

This program is free software: you can redistribute it and/or modify it
under the terms of the GNU General Public License as published by the Free
Software Foundation, either version 3 of the License, or (at your option)
any later version.

This program is distributed in the hope that it will be useful, but WITHOUT
ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
FITNESS FOR A PARTICULAR PURPOSE. See the GNU General Public License for
more details.

You should have received a copy of the GNU General Public License along with
this program. If not, see <http://www.gnu.org/licenses/>. 
 */

const express = require('express');

const passport = require('passport');
const LocalStrategy = require('passport-local');
// const crypto = require('crypto');
const bcrypt = require('bcrypt');
const router = express.Router();

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function verify(username, password, cb) {
    console.log('verify, username:', username, password);

    prisma.user.findUnique({
        'where': {
            'username': username
        }
    })
    .then(function (user) {
        console.log('user:', user);
        if (user) {
            bcrypt.compare(password, user.hashed_password, function(err, result) {
                if (err) { return cb(err); }
                if (result === false) {
                    return cb(null, false, { message: 'Incorrect username or password.' });
                }
                return cb(null, user);
            });
        } else {
            return cb(null, false, { message: 'Incorrect username or password.' });    
        }
    })
    .catch(function (error) {
        console.log('LocalStrategy, error:', error);
        return cb(error);
    });
}

const strategy = new LocalStrategy(verify);
passport.use(strategy);

// router.post('/login/password', passport.authenticate('local', {
//     successRedirect: '/',
//     failureRedirect: '/login'
// }));

router.post('/login/password', function(req, res, next) {
    console.log('/login/password');
    passport.authenticate('local', function(err, user, info) {
        console.log(err, user, info);
        if (err) { return next(err); }
        // Redirect if it fails
        if (user === false) { 
            console.log('user === false');
            return res.json({'result': 'fail', 'message': info['message']}); 
        }
        req.logIn(user, function(err) {
            if (err) { return next(err); }
            // Redirect if it succeeds
            return res.json({'result': 'success'});
        });
    })(req, res, next);
});

router.get('/login', function(req, res, next) {
    console.log('login');
    res.render('login.html', {'title': 'Login'});
});

router.get('/logout', function(req, res, next) {
    req.session = null;
    res.redirect('/'); 
});

passport.serializeUser(function(user, cb) {
  process.nextTick(function() {
    cb(null, { 
        id: user.id, 
        is_admin: user.is_admin,
        username: user.username 
    });
  });
});

passport.deserializeUser(function(user, cb) {
  process.nextTick(function() {
    return cb(null, user);
  });
});

module.exports = router;
