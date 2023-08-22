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

const dotenv = require('dotenv');
dotenv.config();
const fs = require('fs');
const csv = require('fast-csv');
const levenshtein = require('js-levenshtein');
const { e } = require('nunjucks/src/filters');

const https = require('https'); // or 'https' for https:// URLs

function download_catalogue(supplier) {
    //console.log('download_catalogue', supplier);
    let url = 'https://www.infinityfoodswholesale.coop/download/c50f-2a5b-2174-ac03-fd54-92b7-eb55-4717/';
    let filename = "infinity_catalogue.csv";
    if (supplier === 'suma') {
        // URL is in environment variable because it is not public
        // clients need contact Suma to obtain it
        url = process.env.SUMA_URL;
        filename = 'suma_catalogue.csv';
    }
    let file = fs.createWriteStream(filename);
    return new Promise( function (resolve, reject) {
        const request = https.get(url, function(response) {
            response.pipe(file);
            
            // after download completed close filestream
            file.on("finish", () => {
                file.close();
                // console.log("Download Completed");
                resolve();
            });
            file.on('error', function (error) {
                console.log('file error:', error);
                reject(error);
            } );
        });    
        request.on('error', function(error) {
            console.log('https error:', error);
        });
    });
}

function check_catalogue(supplier) {
    let filename = "infinity_catalogue.csv";
    if (supplier.toLowerCase() === 'suma') {
        filename = 'suma_catalogue.csv';
    }
    //console.log('check_catalogue', supplier, filename);
    return new Promise( function (resolve, reject) {
        fs.stat(filename, function(error, stat) {
            //console.log('stat callback error:', error);
            //console.log('stat callback stat:', stat, filename);
            if(error === null) {
                resolve(true);
            } else if(error.code === 'ENOENT') {
                // file does not exist
                resolve(false);
            } else {
                reject(error);
            }
        });    
    });
}



function do_find_product (code, supplier) {
    let found_item = null;

    const find_infinity_item = function (row, code_to_find) {
        if (row['Product code'].toLowerCase() === code_to_find) {
            // console.log("*** infinity row ***");
            // console.log(row);
            // console.log("*** end row ***");
            found_item = row;
            found_item['full description'] = row['product description'].toLowerCase();
            found_item['brand'] = row['brand'].toLowerCase();
            found_item['is_organic'] = row['organic'] === 'organic';
            found_item['add_vat'] = row['Vat Marker'] === 'V';
            // the infinity catalogue seems to keep changing between using
            // 'concatprodsize for export' and 'concatprodsize as text' 
            if (row.hasOwnProperty('concatprodsize for export')) {
                found_item['pack size'] = row['concatprodsize for export'].toLowerCase().replace(/\s/g, '');
            } else {
                found_item['pack size'] = row['concatprodsize as text'].toLowerCase().replace(/\s/g, '');
            }
            // console.log(found_item['pack size']);
            found_item['pack size'] = found_item['pack size'].toLowerCase().replace(/\s/g, '');
            const matches = [...found_item['pack size'].matchAll(/(\d+)\s?x\s?([.\d]+)(\w*)/g)][0];
            // console.log('matches:', matches);
            if (matches) {
                found_item['units case'] = parseInt(matches[1], 10);
                found_item['pack size'] = parseInt(matches[2], 10);
                found_item['unit'] = matches[3];
            } else {
                // console.log(found_item['pack size']);
                try {
                    const alt_matches = [...found_item['pack size'].matchAll(/([.\d]+)\s?(\w*)/g)][0];
                    found_item['units case'] = 1;
                    found_item['pack size'] = parseInt(alt_matches[1], 10);
                    found_item['unit'] = alt_matches[2];
                } catch (error) {
                    found_item['units case'] = 1;
                    found_item['pack size'] = 1;
                    found_item['unit'] = '';
                }
            }
            // console.log(found_item['pack size']);

            // found_item['units case'] = parseInt(found_item['units case'], 10);
            // found_item['pk size'] = parseInt(found_item['pk size'], 10);
            found_item['Case price'] = parseFloat(found_item['Case price'], 10);
        }
    };
    
    const find_suma_item = function (row, code_to_find) {
        if (row['PLCDE'].toLowerCase() === code_to_find) {
            // console.log("*** suma row ***");
            // console.log(row);
            // console.log("*** end row ***");
            found_item = row;
            found_item['full description'] = row['PLDESC'].toLowerCase() + ' ' + row['PLTEXT'].toLowerCase();
            found_item['is_organic'] = row['O'] === 'O';
            found_item['add_vat'] = row[' VAT'] === '1';
            found_item['brand'] = row['BRAND'].toLowerCase();
            found_item['pack size'] = row['SIZE'].toLowerCase().replace(/\s/g, '');
            const matches = [...found_item['pack size'].matchAll(/(\d+)\s?x\s?([.\d]+)(\w*)/g)][0];
            // console.log('matches:', matches);
            if (matches) {
                found_item['units case'] = parseInt(matches[1], 10);
                found_item['pk size'] = parseInt(matches[2], 10);
                found_item['unit'] = matches[3];
            } else {
                // console.log(found_item['pack size']);
                try {
                    const alt_matches = [...found_item['pack size'].matchAll(/([.\d]+)\s?(\w*)/g)][0];
                    found_item['units case'] = 1;
                    found_item['pk size'] = parseInt(alt_matches[1], 10);
                    found_item['unit'] = alt_matches[2];
                } catch (error) {
                    found_item['units case'] = 1;
                    found_item['pk size'] = 1;
                    found_item['unit'] = '';
                }
            }
            found_item['PRICE'] = parseFloat(found_item['PRICE'], 10);
            // console.log('found_item:', found_item);
        }
    };
    
    let find_item = function (row) { find_infinity_item(row, code.toLowerCase()); };
    let filename = 'infinity_catalogue.csv';
    if (supplier.toLowerCase() === 'suma') {
        find_item = function (row) { find_suma_item(row, code.toLowerCase()); };
        filename = 'suma_catalogue.csv';
    }
    // console.log('do_find_product, filename:', filename);
    return new Promise(function (resolve, reject) {
        fs.createReadStream(filename)
        .pipe(csv.parse({ 'headers': true }))
        .on('error', function (error) {
            // console.error(error);
            reject(error);
        })
        .on('data', find_item)
        .on('end', function (row_count) {
            // console.log(`row count: ${row_count}, found_item:`, found_item);
            if (found_item === null) {
                // not found
                reject('not found');
            } else {
                resolve(found_item);
            }
        });
    });
}

async function find_product (code, supplier) {
    let filename = 'infinity_catalogue.csv';
    supplier = supplier.toLowerCase();
    if (supplier === 'suma') {
        filename = 'suma_catalogue.csv';
    }
    try {
        let catalogue_downloaded = await check_catalogue(supplier);
        if (catalogue_downloaded === false) {
            await download_catalogue(supplier);
        }
        return await do_find_product(code, supplier);
    } catch (error) {
        console.log('find_product, error:', JSON.stringify(error));
        // throw new Error(error);
        throw error;
    }
}

const infinity_lut = {
    'infinity_desc': 'full description',
    'infinity_price': 'Case price',
    'brand': 'brand',
    'vat': 'add_vat',
    'organic': 'is_organic',
    'n_items': 'units case',
    // 'item_size': 'pk size',
    'item_size': 'pack size',
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

const do_get_product_data = async function (product_code, supplier, data) {
    let filename = 'infinity_catalogue.csv';
    let lut = infinity_lut;
    if (supplier.toLowerCase() === 'suma') {
        filename = 'suma_catalogue.csv';
        lut = suma_lut;
    }
    
    if (product_code) {
        data[supplier] = product_code;
        try {
          const product_details = await find_product(product_code, supplier);
          Object.keys(lut).forEach(function (key) {
              data[key] = product_details[lut[key]];
          });
        } catch (error) {
          console.log(`find_product (${supplier}) error:`, error);
          data[supplier] = null;
        }
        return data;
    }  
};

const get_product_data = async function (product_code, supplier, data) {
    console.log(`get_product_data: ${product_code}, ${supplier}`);
    let filename = 'infinity_catalogue.csv';
    if (supplier.toLowerCase() === 'suma') {
        filename = 'suma_catalogue.csv';
    }
    try {
        let catalogue_downloaded = await check_catalogue(supplier);
        if (catalogue_downloaded === false) {
            await download_catalogue(supplier);
        }
        return await do_get_product_data(product_code, supplier, data);
    } catch (error) {
        console.log('get_product_data error:', error);
        throw new Error(error);
    }
};

function do_find_matches (product_details, supplier) {
    let matches = [];

    const find_suma_matches = function (row, infinity_item) {
        
        if (infinity_item['brand'].toLowerCase() === row['BRAND'].toLowerCase()) {
            row['full description'] = row['PLDESC'].toLowerCase() + ' ' + row['PLTEXT'].toLowerCase();

            let current = {
                'size_match': false,
                'organic_match': false
            };
            
            row['brand'] = row['BRAND'].toLowerCase();
            row['pack size'] = row['SIZE'].toLowerCase().replace(/\s/g, '');

            // console.log("infinity_item['clean size']", infinity_item['clean size']);

            if (infinity_item['pack size'] === row['pack size']) {
                current['size_match'] = true;
            }

            row['is_organic'] = row['full description'].includes('organic');
            row['code'] = row['PLCDE'];
            // console.log(`row['is_organic']: ${row['is_organic']}`);
            // console.log(`infinity_item['is_organic']: ${infinity_item['is_organic']}\n`);

            row['full description'].includes('organic')

            if (infinity_item['is_organic'] === row['is_organic']) {
                current['organic_match'] = true;
            }
            const suma_desc = row['full description'];
            const inf_desc = infinity_item['product description'].toLowerCase();
            const distance = levenshtein(suma_desc, inf_desc) / Math.max(suma_desc.length, inf_desc.length);
            current['distance'] = distance;
            current['item'] = row;

            matches.push(current);
        }
    
    };
    
    const find_infinity_matches = function (row, suma_item) {
        if (row['brand'].toLowerCase() === suma_item['BRAND'].toLowerCase()) {
            let current = {
                'size_match': false,
                'organic_match': false
            };
            row['full description'] = row['product description'].toLowerCase();
            // console.log();
            
            // the infinity catalogue seems to keep changing between using
            // 'concatprodsize for export' and 'concatprodsize as text' 
            // row['pack size'] = row['concatprodsize as text'].toLowerCase().replace(/\s/g, '');
            // row['pack size'] = row['concatprodsize for export'].toLowerCase().replace(/\s/g, '');
            if (row.hasOwnProperty('concatprodsize for export')) {
                suma_item['pack size'] = row['concatprodsize for export'].toLowerCase().replace(/\s/g, '');
            } else {
                suma_item['pack size'] = row['concatprodsize as text'].toLowerCase().replace(/\s/g, '');
            }
            
            if (row['pack size'] === suma_item['pack size']) {
                current['size_match'] = true;
            }
            row['is_organic'] = row['organic'] === 'organic';
            row['code'] = row['Product code'];
            // console.log(`row['is_organic']: ${row['is_organic']}`);
            // console.log(`suma_item['is_organic']: ${suma_item['is_organic']}\n`);
            if (row['is_organic'] === suma_item['is_organic']) {
                current['organic_match'] = true;
            }

            const suma_desc = suma_item['full description'];
            const inff_desc = row['product description'].toLowerCase();
            const distance = levenshtein(suma_desc, inff_desc) / Math.max(suma_desc.length, inff_desc.length);
            current['distance'] = distance;
            current['item'] = row;

            matches.push(current);    
        }
    };

    // console.log('product_details:', product_details);

    let find_matches = function (row) { find_infinity_matches(row, product_details); };
    let filename = 'infinity_catalogue.csv';
    if (supplier.toLowerCase() === 'suma') {
        find_matches = function (row) { find_suma_matches(row, product_details); };
        filename = 'suma_catalogue.csv';
    }

    return new Promise(function (resolve, reject) {
        fs.createReadStream(filename)
            .pipe(csv.parse({ 'headers': true }))
            .on('error', function (error) {
                console.error(error);
                reject(error);
            })
            .on('data', find_matches)
            .on('end', function (row_count) {
                // console.log(`Parsed ${row_count} rows`);
                // console.log(`${matches.length} matches on brand`);
                matches = matches.filter(function (item) {
                    return item.organic_match === true && item.size_match === true;});
                matches.sort(function (a, b) {return a['distance'] - b['distance'];});
                // console.log(`${matches.length} closer matches`);
                // console.log(`target: ${item['product description']} \n`);
                // matches.forEach(element => {
                //     console.log(element['item']['full description']);
                //     console.log(element['distance'].toFixed(2));
                //     console.log();
                // });

                resolve({
                    'product_details': product_details,
                    'matches': matches
                });
            });
    });
}

async function find_matches (product_details, supplier) {
    let filename = 'infinity_catalogue.csv';
    if (supplier.toLowerCase() === 'suma') {
        filename = 'suma_catalogue.csv';
    }
    try {
        let catalogue_downloaded = await check_catalogue(supplier);
        if (catalogue_downloaded === false) {
            await download_catalogue(supplier);
        }
        return await do_find_matches(product_details, supplier);
    } catch (error) {
        throw new Error(error);
    }
};

function calculate_price (data) {
    // if n_items is 1, then use item_size as denominator
    let denominator = data['n_items'];
    if (denominator === 1) {
      denominator = data['item_size'];
    }
    const fareshares_factor = 1.15;
    let price = 0;
    if (!data['suma'] | data['preferred_supplier'] === 'infinity') {
        price = data['infinity_price'] / denominator * fareshares_factor;
    } else if (!data['infinity'] | data['preferred_supplier'] === 'suma') {
        price = data['suma_price'] / denominator * fareshares_factor;
    } else {
        price = (data['suma_price'] + data['infinity_price']) / 2 / denominator * fareshares_factor;
    }
    if (data['vat'] === true) {
        price = price * 1.20;
    }
    if (data['infinity'] === null & data['suma'] === null) {
        price = 0;
    }
    data['fareshares_price'] = price;
}


module.exports = {
    'find_product': find_product,
    'find_matches': find_matches,
    'calculate_price': calculate_price,
    'get_product_data': get_product_data
};

async function test () {
    let details = null;
    try{
        details = await find_product ('SY016', 'suma');
        console.log(details);
        calculate_price(details);
        console.log(details);
    } catch (error) {
        console.log('error:', error);
    }
    
    try{
        details = await find_product ('724660', 'infinity');
        console.log(details);
    } catch (error) {
        console.log('error:', error);
    }
    
}

async function test2() {
    let data = {};
    // const infinity_code = '253025';
    const infinity_code = '253018';
    // const infinity_code = '251621'; 
    get_product_data(infinity_code, 'infinity', data)
    console.log(data['item_size']);
    // const suma_code = 'gh205';
    // get_product_data(suma_code, 'suma', data)
    // console.log(data['item_size']);
    // Tahini,tahini white org,253025,null
}

// test();
// test2();
