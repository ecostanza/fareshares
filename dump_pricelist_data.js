/**
 This file is part of fareshares-pricelist a simple nodejs web application to 
manage the pricelist of a food coop.

Copyright (C) 2023 Enrico Costanza e.costanza@ieee.org

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
// const process = require('process');
var catalog_utils = require('./catalog_utils');
// var mail_utils = require('./mail_utils');
// const { DateTime } = require('luxon');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()



const process_entry = async function (entry) {
    
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

function rename_catalogue (supplier) {
    const fname = `${supplier}_catalogue.csv`;
    const now = DateTime.now();
    const new_name = fname.replace('.csv', `_${now.toFormat('yyyyLLdd')}.csv`);
    if (fs.existsSync(fname)) {
        fs.rename(fname, new_name, function (error) {
            if (error !== null) {
                console.log('rename error', error);
            }
        });
    }
}

async function run () {
    console.log('starting..');

    const entries = await prisma.entry.findMany({
        'include': {
            'category': true,
        },
        // 'where': {}
    });
    
    entries.sort(function (a, b) {
        return a.category.sort_order - b.category.sort_order;
    });
    
    let counter = 0;
    let update_counter = 0;
    for (const e of entries) {
        // console.log();
        // process.stdout.write
        // console.log(`processing ${e['id']} (${(100*counter/entries.length).toFixed(0)}%)\r`);
        // Category,Description,Infinity,Suma
        let desc = null;
        if(e['suma_desc']) {
            desc = e['suma_desc'];
        } else {
            desc = e['infinity_desc'];
        }

        console.log(`${e.category.name},${desc},${e['infinity']},${e['suma']}`);
        // console.log(`e['infinity']: ${e['infinity']}`);
        // console.log(`e['suma']: ${e['suma']}`);

        counter = counter + 1;
    }
    console.log(`processed ${counter} items`);
}

run();


