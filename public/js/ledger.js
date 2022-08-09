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

    function reset_form () {
        d3.selectAll('input').nodes().forEach(function (d) {
            d.value = '';
            d.checked = false;
        });
        d3.select('button#addButton').text('Add');
        d3.select('button#deleteButton').style('display', 'none');
        // set add button to create
        d3.select('button#addButton').on('click', create_event);
    }

    const date_sel = document.querySelector('input#date');
    const _datepicker = new Datepicker(date_sel, {
        buttonClass: 'btn',
    }); 
    
    d3.selectAll('button#cancelButton').on('click', reset_form);
    
    d3.select('button#deleteButton').style('display', 'none');

    // TODO: update to work with log description
    // const category_autocomplete = d3.select('input#description_autocomplete');
    // const ac = new Autocomplete(category_autocomplete.node(), {
    //     data: categories.map(function (c) {return {'label': c, 'value': c};}),
    //     // maximumItems: 5,
    //     onSelectItem: ({label, value}) => {
    //         console.log("user:", label, value);
    //     }
    // });

    const date_input = d3.select('input#date');
    const amount_input = d3.select('input#amount');
    
    const by_input = d3.select('input#by');
    const description_input = d3.select('input#description_autocomplete');
    function enable_add_button () {
        const in_out_input = d3.select('input[name="inOutRadio"]:checked');
        // console.log('enable_add_button');
        // console.log('date_input.node().value:', date_input.node().value);
        // console.log('amount_input.node().value:', amount_input.node().value);
        // console.log('in_out_input.node():', in_out_input.node());
        // console.log('by_input.node().value:', by_input.node().value);
        // console.log('description_input.node().value:', description_input.node().value);
        
        if (
            // check if date_input has text
            date_input.node().value !== '' &
            amount_input.node().value !== '' &
            in_out_input.node() !== null &
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
    d3.selectAll('input[name="inOutRadio"]').on('change', enable_add_button);

    function collect_form_data () {
        const date = date_input.node().value;
        let amount = +amount_input.node().value;
        const by = by_input.node().value;
        const description = description_input.node().value;
        const comments = d3.select('input#comments').node().value;
        const in_out = d3.select('input[name="inOutRadio"]:checked').node().value;
        if (in_out === 'in') {
            amount = Math.abs(amount);
        } else if (in_out === 'out') {
            amount = -Math.abs(amount);
        } else {
            // something went wrong
            console.log('something went wrong');
            // alert('Sorry, something went wrong, please contact Enrico.');
        }

        // console.log(date, amount, description, comments);

        return {
            date: date,
            amount: amount,
            description: description,
            by: by,
            comments: comments
        };
    }

    async function update_event (event) {
        const updated_transaction_data = collect_form_data();
        // TODO: post
        console.log(`edit transaction ${_current_entry.id}`, updated_transaction_data);
        const url = `/transactions/${_current_entry.id}`;
        try {
            const response = await fetch(url, {
                method: 'POST', 
                'body': JSON.stringify(updated_transaction_data),
                headers: { "Content-Type": "application/json" }
            });
            console.log('post response:', response);
            load_data();
        } catch(error) {
            console.log('post error:', error);
        }
    }
    
    function create_event () {
        const new_transaction_data = collect_form_data();
        const url = `/transactions/`;
        let method = 'PUT';
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

                // clear form
                reset_form();
            }
        });
    }

    d3.select('#addButton').on('click', create_event);

    // loading & rendering
    let _all_entries = [];
    let _current_entry = null;

    function render (entries) {
        // console.log(entries);
        
        // TODO: check that the transactions 
        // are always in reverse chronological order

        let filtered = entries.slice();
        // look for the most recent 'bank balance' 

        const balance_index = filtered.findIndex(function (entry) {
            return entry.description.toLowerCase() === 'bank balance';
        });

        // slice from the most recent 'bank balance' (included)
        if (balance_index > 0) {
            filtered = filtered.slice(0, balance_index + 1);
        }

        const sum = filtered.reduce(function (s, e) {
            // console.log(`e: ${e}, s: ${s}`);
            return s + +e.amount;
        }, 0).toFixed(2);
        // console.log('sum:', sum);
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
                // console.log(d);
                let html = '';
                d.by = d.user.username;
                d.date_str = d.date.toFormat('EEE d MMM y');
                d.amount = d.amount.toFixed(2);
                const fields = [
                    'date_str', 'amount', 'description', 'by', 'comments'
                ];
                let bold = false;
                if (d.description.toLowerCase() === 'bank balance') {
                    bold = true;
                }
                for (const f of fields) {
                    //console.log(f);
                    if (f === 'comments') {
                        let value = '&nbsp;';
                        if (d[f]) {
                            value = d[f];
                        }
                        if (bold === true) {
                            html += `<td class="d-none d-md-table-cell"><strong>${value}</strong></td>`
                        } else {
                            html += `<td class="d-none d-md-table-cell">${value}</td>`
                        }
                    } else {
                        if (bold === true) {
                            html += `<td><strong>${d[f]}</strong></td>`
                        } else {
                            html += `<td>${d[f]}</td>`
                        }
                    }
                    // console.log(i.header(), i.key(d));
                }
                html += `
                <td><button class="edit btn btn-info btn-sm" type="button">
                Edit
                </button>
                </td>
                `;
                return html;
            });

        d3.selectAll('button.edit')
          .on('click', function (event) {
            const tr = d3.select(this.parentNode.parentNode);
            const db_id = +tr.attr('data-dbid');
            window.scrollTo(0,0);
            console.log(db_id); 

            _current_entry = _all_entries.filter(function (e) {
                return e.id === db_id;
            })[0];
            console.log('_current_entry:', _current_entry);

            d3.select('button#addButton').text('Save');

            // populate form
            // date_input.node().value = _current_entry.date.toFormat('');
            _datepicker.setDate(_current_entry.date.toFormat('MM/dd/yyyy'));
            amount_input.node().value = Math.abs(_current_entry.amount);
            if (_current_entry.amount < 0) {
                d3.select('input#moneyOutRadio').node().checked = true;
            } else {
                d3.select('input#moneyInRadio').node().checked = true;
            }
            
            by_input.node().value = _current_entry.by;
            description_input.node().value = _current_entry.description;
            if (_current_entry.comments !== null) {
                d3.select('input#comments').node().value = _current_entry.comments;
            }

            // show delete button
            d3.select('button#deleteButton').style('display', 'block');
            // set add button to update
            d3.select('button#addButton').on('click', update_event);
        });

        d3.selectAll('button#deleteButton')
          .on('click', function (event) {
            console.log('deleting entry with id:', _current_entry.id); 
            //  prompt for confirmation
            const modal = new bootstrap.Modal(
                document.getElementById('confirmDeleteModal'), {backdrop: 'static'});
            modal.show();

            d3.select('button#confirmDeleteButton').on('click', async function (event) {
                // TODO: delete item
                console.log(`delete transaction ${_current_entry.id}`);
                const url = `/transactions/${_current_entry.id}`;
                try {
                    const response = await fetch(url, {
                    method: 'DELETE', 
                    headers: { "Content-Type": "application/json; charset=UTF-8" }
                    });
                    console.log('delete response:', response);
                    console.log('removing:', this.parentNode.parentNode);
                    // tr.remove();
                    reset_form();
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