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
const prisma = new PrismaClient()

router.use(function (req, res, next) {
  res.locals['user'] = {'username': req.user.username, 'is_admin': req.user.is_admin};
  const menu_items = [
    {admin_only: false, url: '/ledger', label: 'Ledger'},
    {admin_only: false, url: '/', label: 'Printable Pricelist'},
    // 
    {admin_only: true, url: '/manage_pricelist', label: 'Manage Pricelist'},
    {admin_only: true, url: '/add', label: 'Add Entry'},
    {admin_only: true, url: '/batch_add', label: 'Batch Add Entries'},
    {admin_only: true, url: '/categories', label: 'Manage Categories'},
    {admin_only: true, url: '/users', label: 'Manage Users'},
    //{url: '/', label: ''},
  ];
  res.locals['menu_items'] = menu_items;
  
  if (req.user.is_admin === false) {
    // filter out restricted views
    const allowed_items = menu_items.filter(i => (i.admin_only === false));

    // if the url requested is not in the allowed ones, redirect to homepage
    if (allowed_items.map(i => i.url).includes(req.url) === false) {
      return res.redirect('/');
    }

    res.locals['menu_items'] = allowed_items;
  }
  
  next();
});


async function render_pricelist(interactive, req, res, next) {
  let nav_url = '/manage_pricelist';
  if (interactive === false) {
    nav_url = '/';
  }
  res.render('pricelist.html', { 
    'title': 'Pricelist',
    'interactive': interactive,
    'username': req.user.username,
    'nav_url': nav_url
  });
}

router.get('/', function(req, res, next) {
  res.redirect('/ledger');
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
    csv += `${e.category.name},${e.infinity_desc},${e.infinity},${e.suma}\n`;
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
  res.redirect('/static/favicon.ico');
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
  const expected_fields = ['preferred_supplier', 'category_name'];
  const data = {};

  for (const k in expected_fields) {
    const field = expected_fields[k];

    if (req.body[field]) {
      data[field] = req.body[field];
    }
  }
  

  try {
    const result = await prisma.entry.update({
      'where': {id: entry_id},
      'data': data
    });

    catalog_utils.calculate_price(result);

    const price_result = await prisma.entry.update({
      'where': {id: entry_id},
      'data': result
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

router.put('/entries/', async function(req, res, next) {
  // get codes from request body
  const infinity_code = req.body['infinity'].toLowerCase();
  const suma_code = req.body['suma'].toLowerCase();
  const category_name = req.body['category_name'];
  if (!category_name) {
    return res.json({'error': 'no category name provided' });
  }

  let category = null;
  try {
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
  } catch (error) {
    console.log('category error:', error);
    return res.json({'error': error });
  }

  // get from request
  const user = {'username': req.body['user']};

  if (!suma_code && !infinity_code) {
    return res.json({'error': 'no product code provided' });
  }

  let data = {
  };

  try {
    // check codes
    await catalog_utils.get_product_data(infinity_code, 'infinity', data);
    await catalog_utils.get_product_data(suma_code, 'suma', data);
  } catch (error) {
    return res.json({'error': error});
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
    return res.json({'error': 'entry create error ' + error});
  }        

});


module.exports = router;
