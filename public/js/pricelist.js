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

    // get the last part of the ULR to save the settings specific to it
    const page = window.location.pathname.split("/").slice(-1)[0];
    console.log('page', page);

    let _settings = {};
    const settings_str = window.localStorage.getItem(`settings_${page}`);
    if (settings_str !== null) {
        _settings = JSON.parse(settings_str);
    }
    // console.log('_settings', _settings);

    let _order_data = {};
    const order_data_str = window.localStorage.getItem(`order_data`);
    if (order_data_str !== null) {
        _order_data = JSON.parse(order_data_str);
    }

    let _all_entries = [];

    function setup_interactive_elements () {
        // save changes on select changed
        d3.selectAll('select.preferred_supplier').on('change', async function () {
            const tr = d3.select(this.parentNode.parentNode);
            const db_id = tr.attr('data-dbid');
            console.log(`change entry ${db_id}`, this.value);
            const url = `${rootUrl}/entries/${db_id}`;
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

        // TODO: this needs fixing so that it is attached only to the edit button
        d3.selectAll('tr.entry')
          .selectAll('button')
          .on('click', function (event) {
            const tr = d3.select(this.parentNode.parentNode);
            const db_id = tr.attr('data-dbid');
            console.log(db_id); 
            const entry = JSON.parse(tr.attr('data-entry'));
            console.log(entry); 

            d3.select('input#infinityID').property('value', entry['infinity']);
            d3.select('input#sumaID').property('value', entry['suma']);
            d3.select('input#category_autocomplete').property('value', entry['category']['name']);
            d3.select('select#preferred_supplier_edit').property('value', entry['preferred_supplier']);

            // show edit modal
            const modal = new bootstrap.Modal(
                document.getElementById('editModal'), {backdrop: 'static'});
            modal.show();

            document.getElementById('editModal').addEventListener('hide.bs.modal', function () {
                d3.select('input#infinityID').property('value', '');
                d3.select('input#sumaID').property('value', '');
                d3.select('input#category_autocomplete').property('value', '');
                d3.select('select#preferred_supplier_edit').property('value', '');
                // reset validation warnings
                d3.select('input#infinityID').classed('is-invalid', false);
                d3.select('input#sumaID').classed('is-invalid', false);
            });

            // TODO: handle the save button
            d3.select('button#saveEditsButton').on('click', async function (event) {
                // TODO: first check that the infinity ID and suma ID are valid (if present)
                console.log(`save entry ${db_id}`);
                const infinity_id = d3.select('input#infinityID').property('value');
                console.log(`infinity_id ${infinity_id}`, infinity_id);
                if (infinity_id !== "") {
                    const inifinity_check_url = `${rootUrl}/matching_products/?product_id=${infinity_id}&supplier=infinity`;
                    try {
                        const inifinity_check_response = await d3.json(inifinity_check_url, {
                            method: 'GET', 
                            headers: { "Content-Type": "application/json; charset=UTF-8" }
                        });
                        console.log('inifinity_check_response:', inifinity_check_response);
                        if (inifinity_check_response['error'] === 'not found') {
                            console.log('error detected');
                            // handle failed validation in bootstrap
                            d3.select('input#infinityID').classed('is-invalid', true);
                            return;
                        } 
                    } catch(error) {
                        console.log('infinity_check error:', error);
                    }
                }

                const suma_id = d3.select('input#sumaID').property('value');
                console.log(`suma_id ${suma_id}`, suma_id);
                if (suma_id !== "") {
                    const inifinity_check_url = `${rootUrl}/matching_products/?product_id=${suma_id}&supplier=suma`;
                    try {
                        const inifinity_check_response = await d3.json(inifinity_check_url, {
                            method: 'GET', 
                            headers: { "Content-Type": "application/json; charset=UTF-8" }
                        });
                        console.log('inifinity_check_response:', inifinity_check_response);
                        if (inifinity_check_response['error'] === 'not found') {
                            console.log('error detected');
                            // handle failed validation in bootstrap
                            d3.select('input#sumaID').classed('is-invalid', true);
                            return;
                        } 
                    } catch(error) {
                        console.log('suma_check error:', error);
                    }
                }
                
                // if we get here it means the infinity and suma codes are valid
                // TODO: then save to DB
                let edited = {};
                edited['infinity'] = d3.select('input#infinityID').property('value');
                if (edited['infinity'] === '') {
                    edited['infinity'] = 'none';
                }
                edited['suma'] = d3.select('input#sumaID').property('value');
                if (edited['suma'] === '') {
                    edited['suma'] = 'none';
                }
                edited['category_name'] = d3.select('input#category_autocomplete').property('value');
                edited['preferred_supplier'] = d3.select('select#preferred_supplier_edit').property('value');
   
                const url = `${rootUrl}/entries/${db_id}`;
                try {
                    const response = await d3.json(url, {
                        method: 'POST', 
                        'body': JSON.stringify(edited),
                        headers: { "Content-Type": "application/json; charset=UTF-8" }
                    });
                    console.log('post response:', response);
                    // update row
                    // tr.select('span.fareshares_price').html(
                    //     `<b>${ response['fareshares_price'].toFixed(2) }</b>`
                    // );
                    tr.select('td.fareshares_price').html(
                        `<span class="fareshares_price">
                        <b>${ response['fareshares_price'].toFixed(2) }</b>
                        </span>`
                    );
                        
                    tr.select('td.infinity').text(response['infinity']);
                    tr.select('td.suma').text(response['suma']);
                    tr.select('td.preferred_supplier').text(response['preferred_supplier']);
                    
                    // TODO: update local data
                    tr.attr('data-entry', JSON.stringify(response));
                } catch(error) {
                    console.log('post error:', error);
                }
                    
                modal.hide();
            });

            // handle delete button
            // TODO: test!
            d3.selectAll('#editModal')
                .selectAll('button#deleteButton')
                .on('click', function (event) {

                    // prompt for confirmation
                    const modal = new bootstrap.Modal(
                        document.getElementById('confirmDeleteModal'), {backdrop: 'static'});
                    modal.show();
                    
                    d3.select('button#confirmDeleteButton').on('click', async function (event) {
                        // TODO: delete item
                        console.log(`delete entry ${db_id}`);
                        const url = `${rootUrl}/entries/${db_id}`;
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
        });

        function handle_basket_event (event, delta) {
            // TODO: implement basket event handling
            const that = event.currentTarget;
            const tr = d3.select(that.parentNode.parentNode.parentNode.parentNode);
            let item_data_string = tr.attr('data-entry');
            let item_data = JSON.parse(item_data_string);
            console.log('add to order', item_data);

            let item_order_id = `${item_data['id']}_${item_data['supplier']}`;
            
            let order_number_span = tr.select('span.order-number');
            let order_number = parseInt(order_number_span.text(), 10);
            order_number = order_number + delta;
            order_number_span.text(order_number);

            if (order_number !== 0) {

                item_data['order_number'] = order_number;

                // _order_data.push({ item_id, order_number });
                _order_data[item_order_id] = item_data;
            } else {
                delete _order_data[item_order_id];
            }
            // TODO: save order data to local storage
            window.localStorage.setItem(`order_data`, JSON.stringify(_order_data));
        }

        d3.selectAll('button.add-button').on('click', function (event) {
            handle_basket_event(event, 1);
        });

        d3.selectAll('button.subtract-button').on('click', function (event) {
            handle_basket_event(event, -1);
        });

        d3.select('button#basketButton').on('click', function (event) {
            const modal = new bootstrap.Modal(
                document.getElementById('basketModal'), {backdrop: 'static'});
            modal.show();

            // clear existing text
            d3.select('pre#infinityBasket').text('');
            d3.select('pre#sumaBasket').text('');

            let infinity_value = 0;
            let suma_value = 0;
            
            // iterate over _order_data and populate the modal
            for (const item of Object.values(_order_data)) {
                console.log('item', item);
                const entry = `${item['code']}, ${item['order_number']}`;
                console.log('entry', entry);
                const selector = `pre#${item['supplier']}Basket`;
                console.log('selector', selector);
                const destination = d3.select(selector);
                const existing_text = destination.text();
                console.log('existing_text', existing_text);
                destination.text(existing_text + entry + '\n');

                if (item['supplier'] === 'infinity') {
                    infinity_value += item['infinity_price'] * item['order_number'];
                } else if (item['supplier'] === 'suma') {
                    suma_value += item['suma_price'] * item['order_number'];
                }
            }

            d3.select('span#infinityTotal').text(infinity_value.toFixed(2));
            d3.select('span#sumaTotal').text(suma_value.toFixed(2));

            function copy_to_clipboard (event, supplier) {
                const selector = `pre#${supplier}Basket`;
                const clipboard_text = d3.select(selector).text();
                navigator.clipboard.writeText(clipboard_text).then(function() {
                        console.log(`${supplier} IDs copied to clipboard`);
                        // show a temporary message that disappears after 2 seconds
                        const message = d3.select(`div#${supplier}BasketMessage`);
                        message.text('Copied to clipboard!');
                        setTimeout(function() {
                            message.text('');
                        }, 2000);
                    }, function(err) {
                        console.error('Could not copy text: ', err);
                    });
                
            }

            d3.select('button#infinityBasketButton').on('click', function (event) {
                copy_to_clipboard(event, 'infinity');
            });
            d3.select('button#sumaBasketButton').on('click', function (event) {
                copy_to_clipboard(event, 'suma');
            });

            function clear_basket (event, supplier) {
                // iterate over _order_data and remove items for the specified supplier
                for (const item_id of Object.keys(_order_data)) {
                    if (_order_data[item_id]['supplier'] === supplier) {
                        delete _order_data[item_id];
                    }
                }
                // save _order_data to local storage
                window.localStorage.setItem(`order_data`, JSON.stringify(_order_data));
            }
            
            d3.select('button#emptyInfinityBasketButton').on('click', function (event) {
                clear_basket(event, 'infinity');
                render(_all_entries);
                update_order_amounts();
            });
            
            d3.select('button#emptySumaBasketButton').on('click', function (event) {
                clear_basket(event, 'suma');
                render(_all_entries);
                update_order_amounts();
            });
            
        });
        
    }

    function setup_filters () {
        function filter_entries () {
            // reset
            let filtered_entries = _all_entries;

            if (_selected_fields.map(f => f.key).includes('brand')) {
                const brand_value = d3.select('input.brand-filter').node().value;
                if (brand_value.length > 2) {
                    filtered_entries = filtered_entries.filter(function (e) {
                        return e['brand'].includes(brand_value);
                    });
                }    
            }

            if (_selected_fields.map(f => f.key).includes('desc')) {
                const desc_value = d3.select('input.description-filter').node().value.toLowerCase();
                if (desc_value.length > 2) {
                    filtered_entries = filtered_entries.filter(function (e) {
                        if (!e['suma_desc']) {
                            return e['infinity_desc'].includes(desc_value);
                        } else if(!e['infinity_desc']) {
                            return e['suma_desc'].includes(desc_value);
                        } else {
                            const result = (
                                e['suma_desc'].includes(desc_value) | 
                                e['infinity_desc'].includes(desc_value)
                                );
                            return result;
                        }
                    });
                }
            }

            if (_selected_fields.map(f => f.key).includes('infinity')) {
                const infinity_value_str = d3.select('select.infinity-filter').node().value;
                if (infinity_value_str === 'true') {
                    filtered_entries = filtered_entries.filter(function (e) {
                        return e['infinity'] !== null;
                    });
                } else if (infinity_value_str === 'false') {
                    filtered_entries = filtered_entries.filter(function (e) {
                        return e['infinity'] === null;
                    });
                }
            }

            if (_selected_fields.map(f => f.key).includes('suma')) {
                const suma_value_str = d3.select('select.suma-filter').node().value;
                if (suma_value_str === 'true') {
                    filtered_entries = filtered_entries.filter(function (e) {
                        return e['suma'] !== null;
                    });
                } else if (suma_value_str === 'false') {
                    filtered_entries = filtered_entries.filter(function (e) {
                        return e['suma'] === null;
                    });
                }
            }


            if (_selected_fields.map(f => f.key).includes('vat')) {
                const vat_value_str = d3.select('select.vat-filter').node().value;
                let vat_value = null;
                if (vat_value_str === 'true') {
                    vat_value = true;
                } else if (vat_value_str === 'false') {
                    vat_value = false;
                }
                if (vat_value !== null) {
                    filtered_entries = filtered_entries.filter(function (e) {
                    return e['vat'] === vat_value;
                    });
                }
            }

            if (_selected_fields.map(f => f.key).includes('price_updatedAt')) {
                const update_value_str = d3.select('select.updated-filter').node().value;
                const updated_weeks = parseInt(update_value_str, 10);
                const now = luxon.DateTime.now();
                if (!isNaN(updated_weeks)) {
                    // filter by price_updatedAt
                    filtered_entries = filtered_entries.filter(function (e) {
                        if (e['price_updatedAt'] !== null) {
                            const delta = luxon.Interval.fromDateTimes(e['price_updatedAt'], now).length('weeks');
                            return delta <= updated_weeks;
                        } else {
                            return false;
                        }
                    });
                }
            }

            render(filtered_entries);
        }

        d3.select('input.brand-filter').on('keyup', function () {
            filter_entries();
        });
        
        d3.select('input.description-filter').on('keyup', function () {
            filter_entries();
        });
        
        d3.select('select.infinity-filter').on('change', function () {
            filter_entries();
        });

        d3.select('select.suma-filter').on('change', function () {
            filter_entries();
        });

        d3.select('select.vat-filter').on('change', function () {
            filter_entries();
        });

        d3.select('select.updated-filter').on('change', function () {
            filter_entries();
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
            key: o['key'], 
            'value': function (e) { 
                if (typeof o['value'] === "function") {
                    // console.log('o', o);
                    return o['value'](e);
                } else {
                    if (e[o['key']]) { return e[o['key']]; }
                    else { return ""; }
                }
            },
            interactive_header: function () { 
                if (o['interactive_header']) {
                    return o['interactive_header'];
                } else {
                    return '&nbsp;';
                }
            },
            header: function () { return o['header']}
        };
    };

    const description_field = field({
        key: 'desc',
        value: function (e) {
            let result = e['suma_desc'];
            if (e.infinity_desc) {
                result = e['infinity_desc'];
            } 
            if (ordering === true) {
                result = `${result} - ${item_size(e)}`;
            }
            return result;
        },
        interactive_header: function () {
            return '<input id="desc-filter-input" type="text" class="description-filter form-control form-control-sm" aria-describedby="description filter">';
        }(),
        header: 'Description'
    });


    let _all_fields = [
        // field({
        //     key: function (e) {return e['category']['name'];},
        //     header: 'Category'
        // }),
        field({
            key: 'infinity',
            header: 'Infinity',
            interactive_header: function () {
                let html = `
                <select id="infinity-filter-select" class="form-select-sm infinity-filter" aria-label="Updated on select">\n
                `;
                for (const option of [
                {'value': "any", "label": "any"}, 
                {'value': "true", "label": "yes"}, 
                {'value': "false", "label": "no"}] ) {
                    html += `<option value="${option.value}"\n`;
                    html += `>${option.label}</option>`;
                }
                html += '</select>';
                return html;
            }()
        }),
        field({
            key: 'suma',
            header: 'Suma',
            interactive_header: function () {
                let html = `
                <select id="suma-filter-select" class="form-select-sm suma-filter" aria-label="Updated on select">\n
                `;
                for (const option of [
                {'value': "any", "label": "any"}, 
                {'value': "true", "label": "yes"}, 
                {'value': "false", "label": "no"}] ) {
                    html += `<option value="${option.value}"\n`;
                    html += `>${option.label}</option>`;
                }
                html += '</select>';
                return html;
            }()
        }),
        field({
            key: 'brand',
            interactive_header: function () {
                return '<input id="brand-filter-input" type="text" class="brand-filter form-control form-control-sm" aria-describedby="brand filter">';
            }(),
            header: 'Brand'
        }),
        description_field,
        field({
            key: 'organic',
            header: 'Organic'
        }),
        field({
            key: 'size',
            value: function (e) {
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
            header: 'Infinity Price',
            // value: function (e) {
            //     if (e['infinity_price']) {
            //         if (e['suma_price']) {
            //             const delta = e['suma_price'] - e['infinity_price'];
            //             if (delta > e['infinity_price'] * 0.05) {
            //                 return e['infinity_price'].toFixed(2);
            //             } else {
            //                 return `<span style="color: gray">${e['infinity_price'].toFixed(2)}</span>`;
            //             }
            //         } else {
            //             return e['infinity_price'].toFixed(2);
            //         }
            //     } else {
            //         return '';
            //     }
            // }
        }),
        //
        field({
            key: 'infinity_unit_price',
            value: function (e) {
                if (e['infinity_price']) {
                    let divider = e['item_size'];
                    if (e.n_items > 1) {
                        divider = e['n_items'];
                    }
                    return (e['infinity_price']/divider).toFixed(2);
                } else {
                    return '';
                }
            },
            header: 'Infinity Unit Price'
        }),
        //
        field({
            key: 'suma_price',
            header: 'Suma Price',
            // value: function (e) {
            //     if (e['suma_price']) {
            //         if (e['infinity_price']) {
            //             const delta = e['infinity_price'] - e['suma_price'];
            //             if (delta > e['suma_price'] * 0.05) {
            //                 return e['suma_price'].toFixed(2);
            //             } else {
            //                 return `<span style="color: gray">${e['suma_price'].toFixed(2)}</span>`;
            //             }
            //         } else {
            //             return e['suma_price'].toFixed(2);
            //         }
            //     } else {
            //         return '';
            //     }
            // }
        }),
        //
        field({
            key: 'suma_unit_price',
            value: function (e) {
                if (e['suma_price']) {
                    let divider = e['item_size'];
                    if (e.n_items > 1) {
                        divider = e['n_items'];
                    }
                    return (e['suma_price']/divider).toFixed(2);
                } else {
                    return '';
                }
            },
            header: 'Suma Unit Price'
        }),
        //
        field({
            key: 'suma_infinity_diff',
            value: function (e) {
                if (e['suma_price'] && e['infinity_price']) {
                    let divider = e['item_size'];
                    if (e.n_items > 1) {
                        divider = e['n_items'];
                    }
                    return Math.abs(e['suma_price']/divider - e['infinity_price']/divider).toFixed(2);
                    // return Math.abs(e['suma_price'] - e['infinity_price']).toFixed(2);
                } else {
                    return '';
                }
            },
            // header: 'Suma - Infinity Difference'
            header: 'Suma - Infinity Difference (per unit)'
        }),
        field({
            key: 'preferred_supplier',
            value: function (e) {
                // console.log('preferred_supplier:', e.preferred_supplier);
                if (e['infinity'] === null & e['suma'] === null) {
                    return '';
                }
                if (!e['suma']) {
                    return 'Infinity';
                } else if (!e['infinity']) {
                    return 'Suma';
                } else {
                    if (e.preferred_supplier === null) {
                        return '';
                    }
                    return e.preferred_supplier;
                }
            },
            header: 'Pref. Supplier'
        }),
        field({
            key: 'vat',
            header: 'Vat',
            interactive_header: function () {
                let html = `
                <select id="vat-filter-select" class="form-select-sm vat-filter" aria-label="Updated on select">\n
                `;
                for (const option of [
                {'value': "any", "label": "any"}, 
                {'value': "true", "label": "yes"}, 
                {'value': "false", "label": "no"}] ) {
                    html += `<option value="${option.value}"\n`;
                    html += `>${option.label}</option>`;
                }
                html += '</select>';
                return html;
            }()
        }),
        field({
            // TODO: render date better
            'key': 'price_updatedAt',
            'value': function (e) {
                if (e['price_updatedAt'] !== null) {
                    return e['price_updatedAt'].toFormat('dd LLL yyyy');
                } else {
                    return '';
                }
            },
            'header': 'Price Updated on',
            'interactive_header': function () {
                let html = `
                <select id="price-updated-filter-select" class="form-select-sm updated-filter" aria-label="Updated on select">\n
                `;
                for (const option of [
                {'value': "null", "label": ""}, 
                {'value': "0", "label": "ever"},
                {'value': "1", "label": "1 w"}, 
                {'value': "2", "label": "2 w"}, 
                {'value': "3", "label": "3 w"}, 
                {'value': "4", "label": "4 w"}] ) {
                    html += `<option value="${option.value}"\n`;
                    html += `>${option.label}</option>`;
                }
                html += '</select>';
                return html;
            }()
        }),
        field({
            'key': 'prev_fareshares_price',
            'value': function (e) {
                if (e['prev_fareshares_price']) {
                    return e['prev_fareshares_price'].toFixed(2);
                } else {
                    return "";
                }
            },
            'header': 'Prev. Fareshares Price'
        }),
        field({
            key: 'price_diff',
            value: function (e) {
                if (e['fareshares_price'] && e['prev_fareshares_price']) {
                    const diff = e['fareshares_price'] - e['prev_fareshares_price'];
                    let span = `<span style="color: gray">${diff.toFixed(2)}</span>`;
                    if (e['fareshares_price'] > e['prev_fareshares_price']) {
                        span = `<span style="color: red">${diff.toFixed(2)}</span>`;
                    } 
                    return span;
                } else {
                    return '';
                }
            },
            header: 'Price difference'
        }),
        field({
            'key': 'fareshares_price',
            'value': function (e) {
                if (e['infinity'] === null & e['suma'] === null) {
                    return '';
                }
                if (e['fareshares_price']) {
                    return `<span class="fareshares_price"><b>${e['fareshares_price'].toFixed(2)}</b></span>`;
                } else {
                    return "";
                }
            },
            'header': '<b>Fareshares Price</b>'
        }),
    ];

    if (interactive === true) {
        // insert preferred supplier after suma price
        // const idx = fields.findIndex(function (i) {console.log(i._key);return i._key === 'suma_price';});

        // delete button
        _all_fields.push(field({
            'key': 'edit_button',
            'value': function (e) {
                let html = `
                <button class="btn btn-primary btn-sm" type="button">
                Edit
                </button>
                `;
                return html;
            },
            'header': 'Edit'
        }));
    }

    const item_size = function (e) {
        if (e.n_items > 1) {
            return `${e.n_items} x ${e.item_size}${e.item_unit}`;
        } else {
            return `${e.item_size}${e.item_unit}`;
        }
    };

    if (ordering === true) {
        // prepend order column
        _all_fields = [

            field({
                key: 'order',
                header: 'Order',
                value: function (e) {
                    let html = '';
                    html += '<div class="btn-group">'
                    html += '<span class="btn-group-prepend">'
                    html += '<button class="btn btn-secondary btn-sm subtract-button" type="button">';
                    html += '-';
                    html += '</button>';
                    html += '</span>';
                    html += '&nbsp;';
                    html += '<span class="btn-sm order-number">0</span>';
                    // html += '<input type="number" class="form-control order-number" value="0">';
                    html += '&nbsp;';
                    html += '<span class="btn-group-append">'
                    html += '<button class="btn btn-secondary btn-sm add-button" type="button">';
                    html += '+';
                    html += '</button>';
                    html += '</span>';
                    html += '</div>';
                    return html;
                }
            }),
            // field({
            //     key: 'supplier',
            //     header: 'Supplier'
            // }),
            description_field,
            field({
                key: 'size',
                value: function (e) {
                    if (e.n_items > 1) {
                        return `${e.n_items} x ${e.item_size}${e.item_unit}`;
                    } else {
                        return `${e.item_size}${e.item_unit}`;
                    }
                },
                header: 'Pack Size'
            }),
            field({
                key: 'supplier_unit_price',
                value: function (e) {
                    if (e['supplier'] === 'infinity') {
                        let divider = e['item_size'];
                        if (e.n_items > 1) {
                            divider = e['n_items'];
                        }
                        return (e['infinity_price']/divider).toFixed(2);
                    } else if (e['supplier'] === 'suma') {
                        let divider = e['item_size'];
                        if (e.n_items > 1) {
                            divider = e['n_items'];
                        }
                        return (e['suma_price']/divider).toFixed(2);
                    } else {
                        return '';
                    }
                },
                header: 'Supplier Unit Price'
            })
        ];
    }

    d3.select('button#settingsButton').on('click', function () {
        const modal = new bootstrap.Modal(
            document.getElementById('settingsModal'), {backdrop: 'static'});
        modal.show();

        d3.select('button#saveSettingsButton').on('click', async function (event) {
            console.log('saveSettingsButton');
            // apply settings
            const checked = d3.select('div#settingsModal .modal-body ul').selectAll("input.form-check-input:checked");
            // console.log(checked);
            let cols = [];
            checked.each(function () {
                const id_str = d3.select(this).attr('id');
                const key = id_str.split('-')[1];
                cols.push(key);
            });
            console.log('cols:', cols);
            _selected_fields = _all_fields.filter(function (f) {
                return cols.includes(f.key);
            })
            console.log('_selected_fields:', _selected_fields.map(f => f.key));
            render_header();
            render(_all_entries);
            
            // save settings
            _settings['fields'] = function () {
                    let result = {};
                    _all_fields.forEach(function(f) {result[f.key] = {'show': false}});
                    _selected_fields.forEach(function(f) {result[f.key] = {'show': true}});
                    console.log('result', result);
                    return result;
                }();
            console.log('_settings', _settings);
            window.localStorage.setItem(`settings_${page}`, JSON.stringify(_settings))

            modal.hide();
        });

        function on_dismissed (event) {
            console.log('cancelSettingsButton');
            modal.hide();
            console.log('cancel');
            // TODO: reset settings
            const lis = d3.select('div#settingsModal .modal-body ul').selectAll("input.form-check-input");
            lis.property('checked', false);
            _selected_fields.forEach(function (f) {
                d3.select(`input#dropdownCheck-${f.key}`).property('checked',true);
            });
        }

        d3.select('button#cancelSettingsButton').on('click', on_dismissed);
        document.getElementById('settingsModal').addEventListener('hidden.bs.modal', on_dismissed);
    });

    
    d3.select('div#settingsModal .modal-body ul')
        .selectAll(null)
        .data(_all_fields)
        .enter()
        .append('li')
        // .append('a')
        .attr('class', "list-group-item")
        .html(function (d, i) {
            // return `<div class="mb-3">
            let checked = 'checked';
            if (_settings['fields'] !== undefined) {
                const fields = _settings['fields'];
                console.log(d.key, fields[d.key]);
                try {
                    if (fields[d.key]['show'] === false) {
                        checked = '';
                    }
                } catch (error) {
                    fields[d.key] = {};
                    fields[d.key]['show'] = true;
                    _settings['fields'] = fields;
                    console.log(error);
                }
            }
            return `<div>
            <input type="checkbox" class="form-check-input" id="dropdownCheck-${d.key}" ${checked}>
            <label class="form-check-label" for="dropdownCheck-${d.key}">
              ${d.header()}
            </label>
          </div>`;
        });
    

    // <li><a class="dropdown-item" href="#">Action</a></li>
    // <li><a class="dropdown-item" href="#">Another action</a></li>
    // <li><a class="dropdown-item" href="#">Something else here</a></li>

    function render_header() {
        d3.select('thead').selectAll('*').remove();

        d3.select('thead')
            .append('tr')
            .html(function () {
                let html = '';
                for (const i of _selected_fields) {
                    html += `<td>${i.header()}</td>`
                }
                return html;
            });

        d3.select('thead')
            .append('tr')
            .html(function () {
                let html = '';
                for (const i of _selected_fields) {
                    html += `<td>${i.interactive_header()}</td>`
                }
                return html;
            });
    
    }

    
    function render (entries) {
        // console.log(entries);
        d3.select('tbody')
            .selectAll('tr').remove();

        const groups = d3.group(entries, d => d.category.name);
        // console.log(groups);

        groups.forEach(function (g, cat) {
            // console.log(g, cat);
            d3.select('tbody')
                .append('tr')
                .append('td')
                .attr('colspan', _selected_fields.length)
                .attr('class', 'category')
                .html(cat);

            d3.select('tbody')
                .selectAll(null)
                .data(g)
                .enter()
                .append('tr')
                .attr('class', function (d) {
                    let class_text = 'entry';
                    if (d['alternative_supplier'] !== undefined && d['alternative_supplier'] === false) {
                        class_text += ' spaced';
                    }
                    if (d['supplier'] !== undefined) {
                        class_text += ` ${d['supplier']}`
                        class_text += ` ${d['supplier']}_${d['id']}`;
                    }
                    return class_text;
                })
                .attr('data-dbid', function (d) { return d.id; })
                .attr('data-entry', function (d) { return JSON.stringify(d); })
                .html(function (d) {
                    // console.log(d);
                    let html = '';
                    for (const i of _selected_fields) {
                        html += `<td class="${i.key}">${i.value(d)}</td>`
                        // console.log(i.header(), i.key(d));
                    }
                    return html;
                });
        });

        if (interactive === true || ordering === true) {
            setup_interactive_elements();
        }

        setup_filters();
    
    }

    let _selected_fields = _all_fields.filter(function (f) {
        if (_settings['fields'] !== undefined) {
            const fields = _settings['fields'];
            try {
                if (fields[f.key]['show']) {
                    return true;
                }
            } catch (error) {
                console.log(error);
            }
            return false; 
        } else {
            return true;
        }
    });

    function update_order_amounts () {
        console.log('_order_data', _order_data);
        console.log('_order_data.values()', Object.values(_order_data));
        // iterate over _order_data and update the order numbers in the table
        for (const item of Object.values(_order_data)) {
            console.log('item', item);
            const item_order_id = `${item['supplier']}_${item['id']}`;
            const order_number = item['order_number'];
            console.log('item_order_id', item_order_id, 'order_number', order_number);
            const tr = d3.select(`tr.${item_order_id}`);
            tr.select('span.order-number').text(order_number);
        }
    }

    async function load_data () {
        const url = `${rootUrl}/entries`;
        console.log('load_data');
        try {
            const data = await d3.json(url, {
                method: 'GET', 
                headers: { "Content-Type": "application/json" }
            });
            _all_entries = data.map(function (e) {
                // console.log(e['price_updatedAt']);
                if (e['price_updatedAt'] !== null) {
                    e['price_updatedAt'] = luxon.DateTime.fromISO(e['price_updatedAt']);
                }
                return e;
            });
            console.log('_all_entries', _all_entries);
            let get_infinity_details = function (e) {
                let item = {};
                item['supplier'] = 'infinity';
                item['infinity_price'] = e['infinity_price'];
                item['item_size'] = e['item_size'];
                item['item_unit'] = e['item_unit'];
                item['n_items'] = e['n_items'];
                item['code'] = e['infinity'];
                item['infinity_desc'] = e['brand'] + ' ' + e['infinity_desc'];
                // get all other fields from e
                // item = {...e, ...item};
                item['category'] = e['category'];
                item['id'] = e['id'];

                item['alternative_supplier'] = false;

                return item;
            };
            let get_suma_details = function (e) {
                let item = {};
                item['supplier'] = 'suma';
                item['suma_price'] = e['suma_price'];
                item['code'] = e['suma'];
                item['item_size'] = e['item_size'];
                item['item_unit'] = e['item_unit'];
                item['n_items'] = e['n_items'];
                item['infinity_desc'] = e['brand'] + ' ' + e['suma_desc'];            
                // item = {...e, ...item};
                item['category'] = e['category'];
                item['id'] = e['id'];

                item['alternative_supplier'] = false;

                return item;
            };
            if (ordering === true) {
                // split entries with both infinity and suma into two entries, one for each supplier
                // but only if the price difference is significant (e.g. > 5%)
                let split_entries = _all_entries.map(function (e) {
                    let result = [];
                    if (e['suma'] && e['infinity']) {
                        const min_price = Math.min(
                            e['infinity_price'], e['suma_price']);
                        const delta = Math.abs(
                            e['infinity_price'] - e['suma_price']);
                        if (delta > min_price * 0.05) {
                            // keep only the cheaper option
                            if (e['infinity_price'] < e['suma_price']) {
                                // keep infinity
                                result.push(get_infinity_details(e));
                            } else {
                                // keep suma
                                result.push(get_suma_details(e));
                            }
                        } else {
                            // keep both options
                            let infinity_tmp = get_infinity_details(e);
                            infinity_tmp['alternative_supplier'] = true;
                            result.push(infinity_tmp);
                            let suma_tmp = get_suma_details(e);
                            // use the infinity description to emphasize they are
                            // the same product
                            suma_tmp['infinity_desc'] = e['brand'] + ' ' + e['infinity_desc'];
                            result.push(suma_tmp);
                        }
                    } else {
                        if (e['infinity']) {
                            result.push(get_infinity_details(e));
                        } else if (e['suma']) {
                            result.push(get_suma_details(e));
                        }
                    }
                    return result;
                });
                // flatten the list of lists
                _split_entries = [].concat.apply([], split_entries);
                console.log('_split_entries', _split_entries);
                _all_entries = _split_entries;
            }
            render_header();
            render(_all_entries);
            // update the order amounts
            update_order_amounts();
        } catch (error) {
            console.log('error', error);
        }

    }

    load_data();



});
