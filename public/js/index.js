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
/*global interactive*/
/*eslint no-undef: "error"*/
/*eslint-env browser*/

document.addEventListener("DOMContentLoaded", function() { 
    console.log('loaded');

    function setup_interactive_elements () {
        // save changes on select changed
        d3.selectAll('select.preferred_supplier').on('change', async function () {
            const tr = d3.select(this.parentNode.parentNode);
            const db_id = tr.attr('data-dbid');
            console.log(`change entry ${db_id}`, this.value);
            const url = `/entries/${db_id}`;
            try {
                const response = await d3.json(url, {
                    method: 'POST', 
                    'body': JSON.stringify({'preferred_supplier': this.value}),
                    headers: { "Content-Type": "application/json; charset=UTF-8" }
                });
                console.log('post response:', response);
                // update price
                tr.select('span.fareshares_price').html(
                    `<b>${ response['fareshares_price'].toFixed(2) }</b>`
                );
            } catch(error) {
                console.log('post error:', error);
            }
        });

        // d3.selectAll('tr.entry')
        //     .append('td')
        //     .append('button')
        //     .attr('class', "btn btn-danger btn-sm")
        //     .attr('type', 'button')
        //     .text('Del.');

        d3.selectAll('button').on('click', function (event) {
            const tr = d3.select(this.parentNode.parentNode);
            const db_id = tr.attr('data-dbid');
            console.log(db_id); 
            // TODO: prompt for confirmation
            const modal = new bootstrap.Modal(
                document.getElementById('confirmDeleteModal'), {backdrop: 'static'});
            modal.show();

            d3.select('button#confirmDeleteButton').on('click', async function (event) {
                // TODO: delete item
                console.log(`delete entry ${db_id}`);
                const url = `/entries/${db_id}`;
                try {
                    const response = await fetch(url, {
                    method: 'DELETE', 
                    headers: { "Content-Type": "application/json; charset=UTF-8" }
                    });
                    console.log('delete response:', response);
                    console.log('removing:', this.parentNode.parentNode);
                    tr.remove();
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
    }

    function field (o) {
        return {
            _key: function () {
                if (typeof o['key'] === "function") {
                    return 'function';
                } else {
                    return o['key'];
                }
            }(), 
            key: function (e) { 
                if (typeof o['key'] === "function") {
                    // console.log('o', o);
                    return o['key'](e);
                } else {
                    if (e[o['key']]) { return e[o['key']]; }
                    else { return ""; }
                }
            },
            header: function () { return o['header']}
        };
    };

    let fields = [
        field({
            key: 'brand',
            header: 'Brand'
        }),
        field({
            key: 'infinity',
            header: 'Infinity'
        }),
        field({
            key: 'suma',
            header: 'Suma'
        }),
        field({
            key: 'brand',
            header: 'Brand'
        }),
        field({
            key: function (e) {
                if (e.infinity_desc) {
                    return e['infinity_desc'];
                } else {
                    return e['suma_desc'];
                }
            },
            header: 'Description'
        }),
        field({
            key: 'organic',
            header: 'Organic'
        }),
        field({
            key: function (e) {
                if (e.n_items > 1) {
                    return `${e.n_items} x ${e.item_size}${e.item_unit}`;
                } else {
                    return `${e.item_size}${e.item_unit}`;
                }
            },
            header: 'Pack Size'
        }),
        field({
            key: 'infinity_price',
            header: 'Infinity Price'
        }),
        field({
            key: 'suma_price',
            header: 'Suma Price'
        }),
        field({
            key: 'vat',
            header: 'Vat'
        }),
        field({
            key: function (e) {
                if (e['prev_fareshares_price']) {
                    return e['prev_fareshares_price'].toFixed(2);
                } else {
                    return "";
                }
            },
            header: 'Prev. Fareshares Price'
        }),
        field({
            key: function (e) {
                if (e['fareshares_price']) {
                    return `<span class="fareshares_price"><b>${e['fareshares_price'].toFixed(2)}</b></span>`;
                } else {
                    return "";
                }
            },
            header: '<b>Fareshares Price</b>'
        }),
    ];

    if (interactive === true) {
        // insert preferred supplier after suma price
        const idx = fields.findIndex(function (i) {console.log(i._key);return i._key === 'suma_price';});
        fields.splice(idx + 1, 0, field({
            key: function (e) {
                if (!e['suma']) {
                    return 'Infinity';
                } else if (!e['infinity']) {
                    return 'Suma';
                } else {
                    let html = `
                    <select class="form-select-sm preferred_supplier" aria-label="Preferred supplier select">\n
                    `;
                    for (const option of [
                    {'value': "null", "label": ""}, 
                    {'value': "suma", "label": "Suma"}, 
                    {'value': "infinity", "label": "Infinity"}] ) {
                        html += `<option value="${option.value}"\n`;
                        if (option.value === e.preferred_supplier ) {
                            html += 'selected';
                        }
                        html += `>${option.label}</option>`;
                    }
                    html += '</select>';
                    return html;
                }
            },
            header: 'Pref. Supplier'
        }));

        // delete button
        fields.push(field({
            key: function (e) {
                let html = `
                <button class="btn btn-danger btn-sm" type="button">
                Del.
                </button>
                `;
                return html;
            },
            header: '&nbsp;'
        }));
    }

    d3.select('thead')
    .append('tr')
    .html(function () {
        let html = '';
        for (const i of fields) {
            html += `<td>${i.header()}</td>`
        }
        return html;
    });

    function render (data) {
        d3.select('tbody')
        .selectAll('tr')
        .data(data)
        .enter()
        .append('tr')
        .attr('class', 'entry')
        .attr('data-dbid', function (d) { return d.id; })
        .html(function (d) {
            // console.log(d);
            let html = '';
            for (const i of fields) {
                html += `<td>${i.key(d)}</td>`
                // console.log(i.header(), i.key(d));
            }
            return html;
        });

        if (interactive === true) {
            setup_interactive_elements();
        }
    
    }

    async function load_data () {
        const url = '/entries';
        console.log('load_data');
        try {
            const data = await d3.json(url, {
                method: 'GET', 
                headers: { "Content-Type": "application/json" }
            });    
            render(data);
        } catch (error) {
            console.log('error', error);
        }

    }

    load_data();



});
