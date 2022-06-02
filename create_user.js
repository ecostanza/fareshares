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

const prompt = require('prompt');
const bcrypt = require('bcrypt');

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();


prompt.start();

const properties = [
    {
      name: 'username',
      validator: /^[a-zA-Z0-9-]+$/,
      warning: 'Username must be only letters, numbers, or dashes'
    },
    {
      name: 'password',
      type: 'string',
      hidden: true
    },
    {
        name: 'admin',
        type: 'boolean'
      },
      {
          name: 'member',
          type: 'boolean'
      }
  ];

prompt.get(properties, function (err, result) {
  if (err) {
    console.log('err:', err);
  }
  console.log('Command-line input received:');
  console.log('  Username: ' + result.username);
  console.log('  Password: ' + result.password);
  console.log('  Admin: ' + result.admin);
  console.log('  Member: ' + result.member);
  // hash password
  bcrypt.hash(result.password, 12)
  .then(function(hash) {
    // store hash in db
    console.log('hash:', hash);
    return prisma.user.create({
        data: {
            'username': result.username,
            'hashed_password': hash,
            'is_member': result.member,
            'is_admin': result.admin
        }
    })
  })
  .then(function (user) {
      console.log('created:', user);
  })
  .catch(function (error) {
      console.log('error:', error);
  });

});

