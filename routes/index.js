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

var express = require('express');
var router = express.Router();
var catalog_utils = require('../catalog_utils');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
//const bcrypt = require('bcrypt');
const mail_utils = require('../mail_utils');
// let rootUrl = '/fs';
const url_utils = require('../url_utils')
const rootUrl = url_utils.root_url;

router.use(function (req, res, next) {
  res.locals['user'] = {'username': req.user.username, 'is_admin': req.user.is_admin};
  const menu_items = [
    {admin_only: false, url: '/ledger', label: 'Ledger'},
    {admin_only: false, url: '/pricelist', label: 'Printable Pricelist'},
    // 
    {admin_only: true, url: '/manage_pricelist', label: 'Manage Pricelist'},
    {admin_only: true, url: '/add', label: 'Add Entry'},
    {admin_only: true, url: '/batch_add', label: 'Batch Add Entries'},
    {admin_only: true, url: '/categories', label: 'Manage Categories'},
    {admin_only: true, url: '/users', label: 'Manage Users'},
  ];
  res.locals['menu_items'] = menu_items;
  
  if (req.user.is_admin === false) {
    // filter out restricted views
    let allowed_items = menu_items.filter(i => (i.admin_only === false));
    // allowed_items.push({url: ''});

    const allowed_urls = allowed_items.map(i => i.url).concat(
      ['','/']
    );
    // console.log('allowed_urls', allowed_urls);

    // if the url requested is not in the allowed ones, redirect to homepage
    if (
      allowed_urls.includes(req.url) === false
      & req.url.startsWith('/transactions') === false
      & req.url.startsWith('/entries') === false
      ) {
      return res.redirect(`${rootUrl}/`);
    }

    res.locals['menu_items'] = allowed_items;
  }
  
  next();
});


async function render_pricelist(interactive, req, res, next) {
  let nav_url = `${rootUrl}/manage_pricelist`;
  if (interactive === false) {
    nav_url = `${rootUrl}/`;
  }
  res.render('pricelist.html', { 
    'title': 'Pricelist',
    'interactive': interactive,
    'username': req.user.username,
    'nav_url': nav_url
  });
}

router.get('/', function(req, res, next) {
  res.redirect(`${rootUrl}/ledger`);
});

// TODO: change to /printable_pricelist ?
router.get('/pricelist', function(req, res, next) {
  return render_pricelist(false, req, res, next);
});

router.get('/manage_pricelist', function(req, res, next) {
  return render_pricelist(true, req, res, next);
});

router.get('/pricelist_csv', async function (req, res, next) {
  let entries = await prisma.entry.findMany({
    'include': {
      'category': true,
    },
  });

  entries.sort(function (a, b) {
    return a.category.sort_order - b.category.sort_order;
  });

  // Category,Description,Infinity,Suma
  let csv = "Category,Description,Infinity,Suma\n";
  entries.forEach(function (e) {
    let desc = e.suma_desc;
    if (e.infinity_desc) {
      desc = e.infinity_desc;
    }
    csv += `${e.category.name},${desc},${e.infinity},${e.suma}\n`;
  });

  res.header('Content-Type', 'text/csv');
  res.attachment('pricelist_export.csv');
  return res.send(csv);
});

router.get('/batch_add/', async function(req, res, next) {
  res.render('batch_add.html', { 
    'title': 'Batch Add Products',
    'nav_url': '/batch_add',
    'username': req.user.username
  });
});

router.get('/add/', async function(req, res, next) {
  const categories = await prisma.category.findMany({});

  res.render('add.html', { 
    'title': 'Add Product',
    'nav_url': '/add',
    'username': req.user.username,
    'categories': categories
  });
});

router.get('/ledger/', async function(req, res, next) {
  res.render('ledger.html', { 
    'title': 'Ledger',
    'nav_url': '/ledger',
    'username': req.user.username,
    'categories': []
  });
});

router.get('/users/', async function(req, res, next) {
  const users = await prisma.user.findMany({});
  res.locals['users'] = users;

  res.locals['title'] = 'Users';
  res.locals['nav_url'] = '/users';
  res.locals['username'] = req.user.username;
  res.render('users.html');
});


router.get('/client_order/', async function(req, res, next) {
  const categories = await prisma.category.findMany({});

  res.render('client_order.html', { 
    'title': 'Order Product',
    'username': req.user.username,
    'nav_url': '/client_order'
  });
});

router.get('/matching_products/', function(req, res, next) {
  const code = req.query.product_id;
  const supplier = req.query.supplier;
  let other_supplier = 'suma';
  if (supplier.toLowerCase() === 'suma') {
    other_supplier = 'infinity';
  }
  
  catalog_utils.find_product(code, supplier)
    .then(function (product_details) {
      return catalog_utils.find_matches(product_details, other_supplier);
    })
    .then(function (result) {
      res.json(result);
    })
    .catch(function (error) {
      console.log("router.get('/matching_products/'", 'catch, error:', JSON.stringify(error));
      res.json({'error': error});
    });
  
});

router.get('/favicon.ico', function(req, res) {
  res.redirect(`${rootUrl}/static/favicon.ico`);
})

// TODO: move API calls to /api/ and to separate file?

router.delete('/entries/:entry_id', async function (req, res) {
    // delete 
    const entry_id = parseInt(req.params['entry_id'], 10);
    try {
      const result = await prisma.entry.delete({
        'where': {id: entry_id}
      });

      res.json(result);
    } catch (error) {
      console.log('delete error:', error);
      res.json ({'error': error});
    }
});

router.post('/entries/:entry_id', async function (req, res) {
  // updated 
  const entry_id = parseInt(req.params['entry_id'], 10);
  const expected_fields = [
    'infinity',
    'suma',
    'preferred_supplier'
  ];
  const data = {};

  expected_fields.forEach(function (field) {
    // const field = expected_fields[k];

    if (req.body[field]) {
      data[field] = req.body[field];
    }
  });

  if (data['infinity'] === 'none') {
    data['infinity'] = null;
  }
  if (data['suma'] === 'none') {
    data['suma'] = null;
  }

  console.log(data);

  // TODO: deal with 'category_name'
  let category = null;
  try {
    category = await get_or_create_category(req.body['category_name']);
    console.log('category:', category);
  } catch (error) {
    console.log('category error:', error);
    return res.status(400).json({'error': error });
  }

  data['category'] = {'connect': {'id': category.id}};
  data['updatedBy'] = req.body['user'];
  
  try {
    const result = await prisma.entry.update({
      'where': {id: entry_id},
      'data': data
    });

    // TODO: re-calculate price for this tiem (the following does not work)
    try {
      if (data['infinity'] !== null) {
        await catalog_utils.get_product_data(data['infinity'], 'infinity', data);
        console.log(data);
      }
    } catch (error) {
      console.log('get product data (infinity) error:', error);
    }
    try {
      if (data['suma'] !== null) {
        await catalog_utils.get_product_data(data['suma'], 'suma', data);
        console.log(data);
      }
    } catch (error) {
      console.log('get product data (suma) error:', error);
    }    

    catalog_utils.calculate_price(data);
    console.log(data);

    const price_result = await prisma.entry.update({
      'where': {id: entry_id},
      'include': {
        'category': true,
      },
      'data': data
    });

    res.json(price_result);
  } catch (error) {
    console.log('update error:', error);
    res.json ({'error': error});
  }
});

router.get('/entries', async function (req, res, next) {
  try {
    let entries = await prisma.entry.findMany({
      'include': {
        'category': true,
      },
      'orderBy': {
        'category': {
          'sort_order': 'asc'
        }
      }
    });

    return res.json(entries);
  } catch (error) {
    console.log('category error:', error);
    res.json(error);
  }

});

async function get_or_create_category(category_name) {
  category = await prisma.category.findUnique({
    'where': {
        'name': category_name
    }
  });
  if (category === null) {
    const all_categories = await prisma.category.findMany({
      'where': {}
    });
    let order = Math.max(...all_categories.map(c => c.sort_order)) + 1;
    if (all_categories.length === 0) {
      order = 1;
    }
    category = await prisma.category.create({
      'data': {
          'name': category_name,
          'sort_order': order
      }
    });  
  }
  return category;
}

router.put('/entries', async function(req, res, next) {
  // get codes from request body
  const infinity_code = req.body['infinity'].toLowerCase();
  const suma_code = req.body['suma'].toLowerCase();
  const category_name = req.body['category_name'];
  if (!category_name) {
    return res.status(400).json({'error': 'no category name provided' });
  }

  let category = null;
  try {
    category = await get_or_create_category(category_name);
    console.log('category:', category);
  } catch (error) {
    console.log('category error:', error);
    return res.status(400).json({'error': error });
  }

  // get from request
  const user = {'username': req.body['user']};

  if (!suma_code && !infinity_code) {
    return res.status(400).json({'error': 'no product code provided' });
  }

  let data = {
  };

  try {
    // check codes
    await catalog_utils.get_product_data(infinity_code, 'infinity', data);
    await catalog_utils.get_product_data(suma_code, 'suma', data);
  } catch (error) {
    return res.status(400).json({'error': error});
  }

  data['category'] = {'connect': {'id': category.id}};
  data['updatedBy'] = user.username;

  if (!data['n_items']) {
      data['n_items'] = 1;
  }

  catalog_utils.calculate_price(data);

  let result = {};
  try {
    result = await prisma.entry.create({'data': data});
    return res.json(result);
  } catch (error) {
    console.log('entry create error:', error, data);
    console.log('data:', data);
    return res.status(400).json({'error': 'entry create error ' + error});
  }        

});


router.put('/transactions', async function(req, res, next) {
  var html_report = `PUT /transactions request with:\n${JSON.stringify(req.body)}`;
  var txt_report = html_report;
  await mail_utils.send_report(html_report, txt_report, "Transaction logged");
  console.log(html_report);
  // get codes from request body
  const required = ['date', 'amount', 'description', 'by'];
  for (const f of required) {
    if (!req.body[f]) {
      return res.status(400).json({'error': `no ${f} provided` });
    }
  }

  // validate date
  const date = new Date(req.body['date']);
  if (date == 'Invalid Date') {
    return res.json({'error': `invalid date` });
  }

  // validate amount 
  const amount = +req.body['amount'];
  if (Number.isNaN(amount)) {
    return res.json({'error': `invalid amount` });
  }

  const description = req.body['description'].toLowerCase();
  let comments = null;
  if (req.body['comments']) {
    comments = req.body['comments'].toLowerCase();
  }

  let transaction_user = null;
  const uname = req.body['by'].toLowerCase();
  try {
    transaction_user = await prisma.user.findUnique({
      'where': {
          'username': uname
      }
    });
    if (transaction_user === null) {
      transaction_user = await prisma.user.create({
        'data': {
            'username': uname,
            'hashed_password': '',
            'is_admin': false,
            'is_member': true
        }
      });  
    }
  } catch (error) {
    console.log('user creation error:', error);
    return res.json({'error': error });
  }

  const data = {
    'date': date,
    'amount': amount,
    'description': description,
    'user': {'connect': {'id': transaction_user.id}},
    'comments': comments
  };  
  let result = {};
  try {
    result = await prisma.transaction.create({'data': data});
    return res.json(result);
  } catch (error) {
    console.log('transaction create error:', error, data);
    console.log('data:', data);
    return res.json({'error': 'transaction create error ' + error});
  }        

});

router.get('/transactions', async function (req, res, next) {
  try {
    let transaction = await prisma.transaction.findMany({
      'include': {
        'user': {
          select: {
            username: true
          }
        },
      },
      'orderBy': {
        'date':  'desc'
      }
    });

    return res.json(transaction);
  } catch (error) {
    console.log('error:', error);
    res.json(error);
  }

});

router.delete('/transactions/:transaction_id', async function (req, res) {
  // var html_report = `DELETE /transaction/${req.params['transaction_id']} request`;
  // delete 
  const transaction_id = parseInt(req.params['transaction_id'], 10);
  try {
    const result = await prisma.transaction.delete({
      'where': {id: transaction_id}
    });

    res.json(result);
  } catch (error) {
    console.log('delete error:', error);
    res.json ({'error': error});
  }
});

router.post('/transactions/:transaction_id', async function(req, res) {
  var html_report = `POST /transactions request with:\n${JSON.stringify(req.body)}`;
  var txt_report = html_report;
  await mail_utils.send_report(html_report, txt_report, "Transaction logged");

  console.log(html_report);
  const transaction_id = parseInt(req.params['transaction_id'], 10);

  // get codes from request body
  const required = ['date', 'amount', 'description', 'by'];
  for (const f of required) {
    if (!req.body[f]) {
      return res.status(400).json({'error': `no ${f} provided` });
    }
  }

  // validate date
  const date = new Date(req.body['date']);
  if (date == 'Invalid Date') {
    return res.status(400).json({'error': `invalid date` });
  }

  // validate amount 
  const amount = +req.body['amount'];
  if (Number.isNaN(amount)) {
    return res.status(400).json({'error': `invalid amount` });
  }

  const description = req.body['description'].toLowerCase();
  let comments = null;
  if (req.body['comments']) {
    comments = req.body['comments'].toLowerCase();
  }

  let transaction_user = null;
  const uname = req.body['by'].toLowerCase();
  try {
    transaction_user = await prisma.user.findUnique({
      'where': {
          'username': uname
      }
    });
    if (transaction_user === null) {
      transaction_user = await prisma.user.create({
        'data': {
            'username': uname,
            'hashed_password': '',
            'is_admin': false,
            'is_member': true
        }
      });  
    }
  } catch (error) {
    console.log('user creation error:', error);
    return res.status(400).json({'error': error });
  }

  const data = {
    'date': date,
    'amount': amount,
    'description': description,
    'user': {'connect': {'id': transaction_user.id}},
    'comments': comments
  }; 
  console.log('data:', data);
  let result = {};
  try {
    result = await prisma.transaction.update({
      'where': {id: transaction_id},
      'data': data
    });
    return res.json(result);
  } catch (error) {
    console.log('transaction update error:', error, data);
    console.log('data:', data);
    return res.status(400).json({'error': 'transaction update error ' + error});
  }
});


module.exports = router;
