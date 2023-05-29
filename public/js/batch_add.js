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

/*global d3*/
/*eslint no-undef: "error"*/
/*eslint-env browser*/

document.addEventListener("DOMContentLoaded", function() { 

    d3.select('#processButton').on('click', async function () {
        console.log('processButton clicked');

        let all_rows = [];
        d3.select('#csv_input').selectChildren().each(function (d, i) {
            const div = d3.select(this);
            div.attr('id', `row_${i}`);
            const row = div.text().split(',');
            all_rows.push(row);
            console.log(i, row);
        });
        
        if (typeof(all_rows[1]) === 'string') {
            let one_row = all_rows;
            all_rows = [];
            while(one_row.length) {
                all_rows.push(one_row.splice(0,3));
            }
        }
        // const newArr = [];
        // 

        let n = 0;
        for (const row of all_rows) {
            const [category, description, infinity, suma] = row;
            console.log(category, description, infinity, suma);

            const prog = d3.select('span#progress');
            // prog.selectAll('*').remove();
            // prog.append('div').html(`Processing: ${description}`);
            const percent = n/all_rows.length*100;
            prog.html(`${percent.toFixed(0)}% (processing: ${description})`);
            d3.select('div#bar').style('width', `${percent}%`);

            let add_data = {}
            add_data['suma'] = suma;
            add_data['infinity'] = infinity;
            add_data['category_name'] = category;
            add_data['user'] = username;
            const add_url = `${rootUrl}/entries`;
            try {
                const response = await d3.json(add_url, {
                    method: 'PUT', 
                    headers: { "Content-Type": "application/json; charset=UTF-8" },
                    'body': JSON.stringify(add_data)
                });
                console.log('add response:', response);
                
            } catch (error) {
                console.log('post error:', error);
            }
            n += 1;
        };



    });

});