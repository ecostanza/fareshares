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

var cookieSession = require('cookie-session')
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const nunjucks = require('nunjucks');
const passport = require('passport');

const indexRouter = require('./routes/index');
// const usersRouter = require('./routes/users');
const authRouter = require('./routes/auth');

// let rootUrl = '/';
const url_utils = require('./url_utils')
const rootUrl = url_utils.root_url;

// from https://stackoverflow.com/a/54623372/6872193
var ensureAuthenticated = function(req, res, next) {
    console.log('ensureAuthenticated');
    if (req.isAuthenticated()) return next();
    else res.redirect(rootUrl + '/login')
}

const app = express();

nunjucks.configure('views', {
    autoescape: true,
    express: app
});

app.use(function(req, res, next){
    res.locals.rootUrl = rootUrl;
    next();
});

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
// app.use(express.static(path.join(__dirname, 'public')));
app.use(`${rootUrl}/static`, express.static(path.join(__dirname, 'public')));
// app.use('/static', express.static(path.join(__dirname, 'public')));

app.use(cookieSession({
    name: 'session',
    //keys: [/* secret keys */],
    secret: 'Trapani Sale',

    // Cookie Options
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// based on https://github.com/jaredhanson/passport/issues/904#issuecomment-1307558283
// register regenerate & save after the cookieSession middleware initialization
app.use(function(request, response, next) {
    if (request.session && !request.session.regenerate) {
        request.session.regenerate = (cb) => {
            console.log('session.regenerate');
            cb()
        }
    }
    if (request.session && !request.session.save) {
        request.session.save = (cb) => {
            console.log('session.save');
            cb()
        }
    }
    next()
})

app.use(passport.authenticate('session'));

app.use(passport.initialize());
app.use(passport.session());
// app.use(authenticationMiddleware(allowUrl));

app.use(`${rootUrl}/`, authRouter);
// app.use('fs/', authRouter);
// From here on, all routes need authorization:
app.use(ensureAuthenticated);

app.use(`${rootUrl}/`, indexRouter);
// app.use('/users', usersRouter);

module.exports = app;
