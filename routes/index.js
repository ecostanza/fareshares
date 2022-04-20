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

async function render_pricelist(interactive, req, res, next) {
  // res.render('index', { title: 'Express' });
  let entries = await prisma.entry.findMany({
    'include': {
      'category': true,
    },
  });
  // console.log('entries', entries.map(e => [e.category.name, e.infinity_desc]));
  entries.sort(function (a, b) {
    return a.category.sort_order - b.category.sort_order;
  });
  // console.log('entries', entries.map(e => [e.category.name, e.infinity_desc]));
  res.render('index.html', { 
    'title': 'Pricelist',
    'interactive': interactive,
    'nav_url': '/manage_pricelist',
    'entries': entries
  });
}

// TODO: change to /printable_pricelist ?
router.get('/', function(req, res, next) {
  console.log('req.user.admin', req.user.admin);
  return render_pricelist(false, req, res, next);
});

router.get('/manage_pricelist', function(req, res, next) {
  if ( !req.user.is_admin ) {
    return res.redirect('/');
  }
  return render_pricelist(true, req, res, next);
});

router.get('/batch_add/', async function(req, res, next) {
  if ( !req.user.is_admin ) {
    return res.redirect('/');
  }
  // res.render('index', { title: 'Express' });
  // const categories = await prisma.category.findMany({});
  console.log('get batch_add');
  res.render('batch_add.html', { 
    'title': 'Batch Add Products',
    'nav_url': '/batch_add',
    'username': req.user.username
  });
});

router.get('/add/', async function(req, res, next) {
  if ( !req.user.is_admin ) {
    return res.redirect('/');
  }
  // res.render('index', { title: 'Express' });
  const categories = await prisma.category.findMany({});
  // console.log('get add, categories:', categories);
  res.render('add.html', { 
    'title': 'Add Product',
    'nav_url': '/add',
    'categories': categories
  });
});

// TODO: change to /entries/:entry_id/matching_products/ ?
// maybe not because there is not an entry item in the DB for this yet
router.get('/matching_products/', function(req, res, next) {
  // res.render('index', { title: 'Express' });
  const code = req.query.product_id;
  const supplier = req.query.supplier;
  let other_supplier = 'suma';
  if (supplier.toLowerCase() === 'suma') {
    other_supplier = 'infinity';
  }
  
  catalog_utils.find_product(code, supplier)
    .then(function (product_details) {
      // TODO: do I need to return?
      console.log('first then');
      return catalog_utils.find_matches(product_details, other_supplier);
    })
    .then(function (result) {
      console.log('second then');
      console.log('result:', result);
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
      console.log('delete result:', result);
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
  console.log('req.body:', req.body);
  for (const k in expected_fields) {
    const field = expected_fields[k];
    console.log(`field ${field}, req.body[field] ${req.body[field]}`);
    if (req.body[field]) {
      data[field] = req.body[field];
    }
  }
  

  try {
    console.log('data:', data);
    const result = await prisma.entry.update({
      'where': {id: entry_id},
      'data': data
    });
    console.log('update result:', result);
    catalog_utils.calculate_price(result);
    console.log('result:', result);
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

// TODO: change to PUT and /entries/
// and add POST /entries/:entry_id for editing
router.put('/entries/', async function(req, res, next) {
  // res.render('index', { title: 'Express' });
  console.log(req.body);
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
  console.log('category:', category);
  console.log('req.body:', req.body);
  // get from request
  const user = {'username': req.body['user']};

  if (!suma_code && !infinity_code) {
    console.log('no product code provided');
    return res.json({'error': 'no product code provided' });
  }

  let data = {
  };

  try {
    console.log('about to get_product_data');
    // check codes
    await catalog_utils.get_product_data(infinity_code, 'infinity', data);
    // console.log('data:', data);
    await catalog_utils.get_product_data(suma_code, 'suma', data);
    //console.log('data:', data);
  } catch (error) {
    return res.json({'error': error});
  }

  // console.log('category:', category);
  data['category'] = {'connect': {'id': category.id}};
  data['updatedBy'] = user.username;

  if (!data['n_items']) {
      data['n_items'] = 1;
      data['n_items'] = data['item_size'];
  }

  catalog_utils.calculate_price(data);

  let result = {};
  try {
    result = await prisma.entry.create({'data': data});
    console.log('result:', result);
  } catch (error) {
    console.log('entry create error:', error, data);
    console.log('data:', data);
    result = {'error': 'entry create error ' + error};
  }        

  return res.json(result);
});





module.exports = router;
