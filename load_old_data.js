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

const fs = require('fs');
const process = require('process');
const csv = require('fast-csv');
var catalog_utils = require('./catalog_utils');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

let outStream = fs.createWriteStream('out.csv');
let csvStream = csv.format();
csvStream.pipe(outStream)
    .on('end', function (row_count) {
        console.log(`Wrote ${row_count} rows`);
    });

const infinity_lut = {
    'infinity_desc': 'full description',
    'infinity_price': 'Case price',
    'brand': 'brand',
    'vat': 'add_vat',
    'organic': 'is_organic',
    'n_items': 'units case',
    'item_size': 'pk size',
    'item_unit': 'unit'
    };

const suma_lut = {
    'suma_desc': 'full description',
    'suma_price': 'PRICE',
    'brand': 'brand',
    'vat': 'add_vat',
    'organic': 'is_organic',
    'n_items': 'units case',
    'item_size': 'pk size',
    'item_unit': 'unit'
    };

async function get_category (category_name) {
    let current_category = null;
    try {
        current_category = await prisma.category.findUnique({
            'where': {
                'name': category_name
            }
        });
        // console.log('category_name:', category_name);
        // console.log('current_category found in DB:', current_category);                
    } catch (prisma_error) {
        console.log('prisma_error:', prisma_error);
        // TODO: create?
    }
    if (current_category === null) {
        // create
        try {
            current_category = await prisma.category.create({
                'data': {'name':category_name}
            });
            console.log('current_category created:', current_category);
        } catch (create_error) {
            console.log('create_error:', create_error);
        }
    }
    return current_category;
}

const process_row = async function (row) {
    
    let data = {
    };

    if (row['Infinity']) {
        data['infinity'] = row['Infinity'];
        try {
            const product_details = await catalog_utils.find_product(row['Infinity'], 'infinity');
            Object.keys(infinity_lut).forEach(function (key) {
                data[key] = product_details[infinity_lut[key]];
            });
        } catch (error) {
            console.log('find_product (infinity) error:', error);
            data['infinity'] = null;
            fs.writeFile('missing_infinity.txt', `${row['Infinity']}\n`, { flag: 'a+' }, err => {});
        }
    }
    if (row['Suma']) {
        data['suma'] = row['Suma'];
        try{
            const product_details = await catalog_utils.find_product(row['Suma'], 'suma')
            Object.keys(suma_lut).forEach(function (key) {
                data[key] = product_details[suma_lut[key]];
            });
        } catch (error) {
            console.log('find_product (suma) error:', error);
            data['suma'] = null;
            fs.writeFile('missing_suma.txt', `${row['Suma']}\n`, { flag: 'a+' }, err => {});
        }
    }
    const category_name = row['Category'];
    const category = await get_category(category_name);
    // console.log('category:', category);
    data['category'] = {'connect': {'id': category.id}};
    data['updatedBy'] = 'enrico';

    // console.log('process_row:', row['Category'], row['Description'], row['Infinity'], row['Suma']);
    // console.log('data', data);

    if (!data['n_items']) {
        data['n_items'] = 1;
        data['n_items'] = data['item_size'];
    }

    if (!data['suma'] && !data['infinity']) {
        console.log('skipping');
        return;
    }

    let price = 0;
    if (!data['suma']) {
        price = data['infinity_price'] / data['n_items'] * 1.15;
    } else if (!data['infinity']) {
        price = data['suma_price'] / data['n_items'] * 1.15;
    } else {
        price = (data['suma_price'] + data['infinity_price']) / 2 / data['n_items'] * 1.15;
    }
    data['fareshares_price'] = price;

    try {
        prisma.entry.create({'data': data})
        .then(function (entry) {console.log("entry created\n");})
        .catch(function (error) {console.log('error:', error);})
    } catch (error) {
        console.log('entry create error:', error, data);
        // console.log(data);
    }        
    //process.exit(1);
};

async function run () {
    const deleteEntries = await prisma.entry.deleteMany({})
    console.log('deleteEntries:', deleteEntries);
    let rows = [];
    // fs.createReadStream('oldpricelist.csv')
    fs.createReadStream('grouped.csv')
        // .pipe(csv.parse({ 'headers': true, 'maxRows': 10 }))
        .pipe(csv.parse({ 'headers': true}))
        .on('error', function(error) {
            console.error(error);
            process.exit(1);
        })
        .on('data', function (row) {rows.push(row);})
        .on('end', async function (row_count) {
            console.log(`Parsed ${row_count} rows`);
            // console.log(`out_rows has ${out_rows.length} rows`);
            csvStream.end();

            // process rows in a for loop, to avoid synch issues
            // forEach does not seem to work here..
            for (i=0; i<rows.length; i+=1) {
                await process_row(rows[i]);
            }            
        });
    }

run();
