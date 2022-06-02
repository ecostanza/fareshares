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

    const date_sel = document.querySelector('input#date');
    const datepicker = new Datepicker(date_sel, {
        buttonClass: 'btn',
    }); 
    

    // TODO: update to work with log description
    // const category_autocomplete = d3.select('input#description_autocomplete');
    // const ac = new Autocomplete(category_autocomplete.node(), {
    //     data: categories.map(function (c) {return {'label': c, 'value': c};}),
    //     // maximumItems: 5,
    //     onSelectItem: ({label, value}) => {
    //         console.log("user selected:", label, value);
    //     }
    // });

    const date_input = d3.select('input#date');
    const amount_input = d3.select('input#amount');
    const by_input = d3.select('input#by');
    const description_input = d3.select('input#description_autocomplete');
    function enable_add_button () {
        console.log('enable_add_button');
        console.log('date_input.node().value:', date_input.node().value);
        console.log('amount_input.node().value:', amount_input.node().value);
        console.log('by_input.node().value:', by_input.node().value);
        console.log('description_input.node().value:', description_input.node().value);
        
        if (
        // check if date_input has text
        date_input.node().value !== '' &
        amount_input.node().value !== '' &
        by_input.node().value !== '' &
        description_input.node().value !== '' 
        ) {
            d3.select('#addButton').attr('disabled', null);
        }
    }

    date_input.on('keyup', enable_add_button);
    amount_input.on('keyup', enable_add_button);
    by_input.on('keyup', enable_add_button);
    description_input.on('keyup', enable_add_button);

    d3.select('#addButton').on('click', function () {
        const date = date_input.node().value;
        const amount = amount_input.node().value;
        const by = by_input.node().value;
        const description = description_input.node().value;
        const comments = d3.select('input#comments').node().value;

        console.log(date, amount, description, comments);

        const new_transaction_data = {
            date: date,
            amount: amount,
            description: description,
            by: by,
            comments: comments
        };

        const url = `/transactions/`;
        d3.json(url, {
            method: 'PUT', 
            headers: { "Content-Type": "application/json" },
            'body': JSON.stringify(new_transaction_data)
        }).then(function (data) {
            console.log('post response:', data);
            if (data['error']) {
                console.log('error detected:', data['error']);
                // TODO: handle failed validation in bootstrap
                // d3.select('#productID').classed('is-invalid', true);
            } else {
                console.log('it worked');
                // TODO: handle passed validation in bootstrap
                // d3.select('#productID').classed('is-invalid', false);

                // TODO: refresh values
                load_data();

                // TODO: clear form?
                
            }
        })

    });

    // loading & rendering
    let _all_entries = [];

    function render (entries) {
        // console.log(entries);

        const sum = entries.reduce(function (s, e) {
            console.log(`e: ${e}, s: ${s}`);
            return s + +e.amount;
        }, 0).toFixed(2);
        console.log(sum);
        d3.select('span#balance').text(`£${sum}`);

        d3.select('tbody')
            .selectAll('tr').remove();

        d3.select('tbody')
            .selectAll(null)
            .data(entries)
            .enter()
            .append('tr')
            .attr('class', 'entry')
            .attr('data-dbid', function (d) { return d.id; })
            .html(function (d) {
                console.log(d);
                let html = '';
                d.by = d.user.username;
                d.date = d.date.toFormat('EEE d MMM y');
                d.amount = d.amount.toFixed(2);
                const fields = [
                    'date', 'amount', 'description', 'by', 'comments'
                ];
                for (const f of fields) {
                    console.log(f);
                    if (f === 'comments') {
                        let value = '&nbsp;';
                        if (d[f]) {
                            value = d[f];
                        }
                        html += `<td class="d-none d-md-table-cell">${value}</td>`
                    } else {
                        html += `<td>${d[f]}</td>`
                    }
                    // console.log(i.header(), i.key(d));
                }
                html += `
                <td><button class="delete btn btn-danger btn-sm" type="button">
                Del.
                </button>
                </td>
                `;
                return html;
            });

        d3.selectAll('button.delete')
          .on('click', function (event) {
            const tr = d3.select(this.parentNode.parentNode);
            const db_id = tr.attr('data-dbid');
            console.log(db_id); 
            //  prompt for confirmation
            const modal = new bootstrap.Modal(
                document.getElementById('confirmDeleteModal'), {backdrop: 'static'});
            modal.show();

            d3.select('button#confirmDeleteButton').on('click', async function (event) {
                // TODO: delete item
                console.log(`delete transaction ${db_id}`);
                const url = `/transactions/${db_id}`;
                try {
                    const response = await fetch(url, {
                    method: 'DELETE', 
                    headers: { "Content-Type": "application/json; charset=UTF-8" }
                    });
                    console.log('delete response:', response);
                    console.log('removing:', this.parentNode.parentNode);
                    // tr.remove();
                    load_data();
                } catch(error) {
                    console.log('delete error:', error);
                }
                modal.hide();
            });

            d3.select('button#cancelDeleteButton').on('click', function (event) {
                modal.hide();
                console.log('cancel');
            });
            
        });

        // if (interactive === true) {
        //     setup_interactive_elements();
        // }

        // setup_filters();    
    }

    
    async function load_data () {
        const url = '/transactions';
        console.log('load_data');
        try {
            const data = await d3.json(url, {
                method: 'GET', 
                headers: { "Content-Type": "application/json" }
            });
            _all_entries = data.map(function (e) {
                // console.log(e['price_updatedAt']);
                if (e['date'] !== null) {
                    e['date'] = luxon.DateTime.fromISO(e['date']);
                }
                return e;
            });
            // render_header();
            render(_all_entries);
        } catch (error) {
            console.log('error', error);
        }

    }

    load_data();

});