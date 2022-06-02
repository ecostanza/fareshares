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

    let _settings = {};
    const settings_str = window.localStorage.getItem('settings');
    if (settings_str !== null) {
        _settings = JSON.parse(settings_str);
    }
    console.log('_settings', _settings);
    let _all_entries = [];

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

        d3.selectAll('tr.entry')
          .selectAll('button')
          .on('click', function (event) {
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
                const desc_value = d3.select('input.description-filter').node().value;
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
                const updated_weeks = parseInt(update_value_str);
                const now = luxon.DateTime.now();
                if (!isNaN(updated_weeks)) {
                    // filter by price_updatedAt
                    filtered_entries = filtered_entries.filter(function (e) {
                        if (e['price_updatedAt'] !== null) {
                            const delta = luxon.Interval.fromDateTimes(e['price_updatedAt'], now).length('weeks');
                            return delta > updated_weeks;
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

    let _all_fields = [
        // field({
        //     key: function (e) {return e['category']['name'];},
        //     header: 'Category'
        // }),
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
            interactive_header: function () {
                return '<input type="text" class="brand-filter form-control form-control-sm" aria-describedby="brand filter">';
            }(),
            header: 'Brand'
        }),
        field({
            key: 'desc',
            value: function (e) {
                if (e.infinity_desc) {
                    return e['infinity_desc'];
                } else {
                    return e['suma_desc'];
                }
            },
            interactive_header: function () {
                return '<input type="text" class="description-filter form-control form-control-sm" aria-describedby="description filter">';
            }(),
            header: 'Description'
        }),
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
            header: 'Infinity Price'
        }),
        field({
            key: 'suma_price',
            header: 'Suma Price'
        }),
        field({
            key: 'suma_infinity_diff',
            value: function (e) {
                if (e['suma_price'] && e['infinity_price']) {
                    return Math.abs(e['suma_price'] - e['infinity_price']).toFixed(2);
                } else {
                    return '';
                }
            },
            header: 'Suma - Infinity Difference'
        }),
        field({
            key: 'preferred_supplier',
            value: function (e) {
                if (interactive === true) {
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
                } else {
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
                }
            },
            header: 'Pref. Supplier'
        }),
        field({
            key: 'vat',
            header: 'Vat',
            interactive_header: function () {
                let html = `
                <select class="form-select-sm vat-filter" aria-label="Updated on select">\n
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
                <select class="form-select-sm updated-filter" aria-label="Updated on select">\n
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
            'key': 'delete_button',
            'value': function (e) {
                let html = `
                <button class="btn btn-danger btn-sm" type="button">
                Del.
                </button>
                `;
                return html;
            },
            'header': 'Delete'
        }));
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
            window.localStorage.setItem('settings', JSON.stringify(_settings))

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
                    console.log(error);
                }
            }
            return `<div>
            <input type="checkbox" class="form-check-input" id="dropdownCheck-${d.key}" ${checked}>
            <label class="form-check-label" for="dropdownCheck-${i}">
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
                .attr('class', 'entry')
                .attr('data-dbid', function (d) { return d.id; })
                .html(function (d) {
                    // console.log(d);
                    let html = '';
                    for (const i of _selected_fields) {
                        html += `<td>${i.value(d)}</td>`
                        // console.log(i.header(), i.key(d));
                    }
                    return html;
                });
        });

        if (interactive === true) {
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

    async function load_data () {
        const url = '/entries';
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
            render_header();
            render(_all_entries);
        } catch (error) {
            console.log('error', error);
        }

    }

    load_data();



});
