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

    const product_input = d3.select('#productID');
    const supplier_input = d3.selectAll('input[name=supplierRadio]');
    function enable_find_button () {
        console.log('enable_find_button');
        console.log('supplier_input.node().value:', supplier_input.node().value);
        console.log('product_input.node().value:', product_input.node().value);
        const checked = supplier_input.nodes().map(item => item.checked).some(item => item === true);
        // check if supplier_input is selected
        if (checked &
        // check if product_input has text
        product_input.node().value !== '' 
        ) {
            d3.select('#findButton').attr('disabled', null);
        }
    }
    product_input.on('keyup', enable_find_button);
    supplier_input.on('change', enable_find_button);

    d3.select('#findButton').on('click', function () {
        const product_id = d3.select('#productID').node().value;
        // TODO: there must be a cleaner way
        const supplier_radio_id = d3.selectAll('[name=supplierRadio]:checked').node().id;
        let supplier = 'Infinity';
        let other_supplier = 'Suma';
        if (supplier_radio_id.includes('Suma')) {
            supplier = 'Suma';
            other_supplier = 'Infinity';
        }

        console.log(product_id, supplier);

        const url = `${rootUrl}/matching_products/?product_id=${product_id}&supplier=${supplier}`;
        d3.json(url, {
            method: 'GET', 
            headers: { "Content-Type": "application/json" }
        }).then(function (data) {
            console.log('post response:', data);
            if (data['error'] === 'not found') {
                console.log('error detected');
                // handle failed validation in bootstrap
                d3.select('#productID').classed('is-invalid', true);
            } else {
                d3.select('#productID').classed('is-invalid', false);
                // disable initial part of form
                d3.select('fieldset#searchFormFieldset').attr('disabled', true);
                const results_div = d3.select('#results');
                results_div.selectAll("*").remove();
                results_div.append('div')
                    .html(function () {
                        // return JSON.stringify(data['product_details']);
                        const d = data['product_details'];
                        return `
                        <div>
                            <h4>${supplier} item found:</h4>
                            <div class="details">
                                ${d['brand']}: ${d['full description']} 
                                (organic: ${d['is_organic']}) <br>
                                ${d['units case']}
                            </div>
                        </div>`;
                    });

                const details = data['product_details'];
                    
                const details_div = results_div.append('div')
                    .attr('class', 'details');
                
                details_div.append('div')
                    .html(`
                        <label for="minQuantityInput" class="form-label">What's the minimum you need?</label>
                        <div class="input-group mb-3">
                        <input id="minQuantityInput" 
                               type="number" 
                               class="form-control" 
                               value="1"
                               aria-label="Minimum quantity you need" 
                               aria-describedby="button-addon1">
                        </div>
                    `);
                    // <button class="btn btn-outline-secondary" type="button" id="minQuantityMinusButton">-</button>
                    // <button class="btn btn-outline-secondary" type="button" id="minQuantityPlusButton">+</button>

                details_div.append('div')
                    .html(`
                    <label for="maxQuantityInput" class="form-label">What's the maximum you can take?</label>
                    <div class="input-group mb-3">
                    <input id="maxQuantityInput" 
                           type="number" 
                           class="form-control" 
                           value="1" 
                           aria-label="Maximum quantity you can take" 
                           aria-describedby="button-addon1">
                    </div>
                    `);
                
                let fareshares_price = details['Case price'] * 1.15;
                if (details['add_vat'] === true) {
                    fareshares_price = fareshares_price * 1.2;
                }
                fareshares_price = fareshares_price / details['units case'];
                fareshares_price = fareshares_price.toFixed(2);
                details_div.append('div')
                    .attr('class','mb-3')
                    .html(`
                    <label for="maxPriceInput" class="form-label">
                    Are you willing to pay more than the wholesale price? If so how much?
                    </label>
                    <input id="maxPriceInput" 
                           type="number" 
                           class="form-control" 
                           value="${fareshares_price}" 
                           aria-label="Minimum quantity you need" aria-describedby="button-addon1">
                    <div id="maxPriceHelp" class="form-text">
                    If you can take a larger share of the cost, you can still make a 
                    saving while making it is more likely for others will join the order. <br/>
                    The minimum is ${fareshares_price} the recommended retail price is ${details['RRP']}.
                    </div>
                    `);

                // TODO: add buttons to submit and cancel
                results_div.append('span')
                    .html(`<button type="button" id="addButton" class="btn btn-primary" disabled>Place Request</button>&nbsp;`);

                results_div.append('span')
                    .html(`<button type="button" id="cancelButton" class="btn btn-primary">Cancel</button>`);
                
                d3.select('#addButton').on('click', function () {
                    let value = d3.select('input[name="matchingProductRadio"]:checked').node().value;
                    console.log('value:', value);
                    let add_data = {}
                    add_data[supplier.toLowerCase()] = product_id;
                    add_data[other_supplier.toLowerCase()] = value;
                    // add_data['category_name'] = d3.select('#categorySelect').node().value;
                    add_data['category_name'] = category_autocomplete.node().value;
                    add_data['user'] = 'enrico';
                    const add_url = `${rootUrl}/entries/`;
                    d3.json(add_url, {
                        method: 'PUT', 
                        headers: { "Content-Type": "application/json; charset=UTF-8" },
                        'body': JSON.stringify(add_data)
                    }).then(function (response) {
                        console.log('add response:', response);
                        // TODO: show feedback on success or failure
                        d3.select('fieldset#matchesFormFieldset').attr('disabled', true);
                        const feedback = d3.select('div#feedback');
                        if (response.error) {
                            let msg = 'Sorry, that did not work';
                            if (response.error.includes('Unique constraint failed')) {
                                msg += '<br/>That item seems to be already in the pricelist';
                            }
                            feedback.html(msg);
                            feedback.append('div')
                                .html(`
                                <button 
                                    type="button" 
                                    id="restartButton" 
                                    class="btn btn-primary">Try again</button>`);
                        } else {
                            feedback.html(`It worked! <br/>
                            Infinity: ${response.infinity} <br/>
                            Suma: ${response.suma}
                            `);
                            feedback.append('div')
                                .html(`
                                <button 
                                    type="button" 
                                    id="restartButton" 
                                    class="btn btn-primary">Add another</button>`);
                        }
                        d3.select('#restartButton').on('click', function () {
                            window.location.reload();
                        });
                    });            
                });

                // enable add only if an option is selected
                const match_input = d3.selectAll('input[name=matchingProductRadio]');
                function enable_find_button () {
                    // console.log('enable_find_button');
                    // console.log('supplier_input.node().value:', supplier_input.node().value);
                    // console.log('product_input.node().value:', product_input.node().value);
                    const checked = match_input.nodes().map(item => item.checked).some(item => item === true);
                    // check if supplier_input is selected
                    if (checked) {
                    // check if product_input has text
                        if (d3.select('input[name="matchingProductRadio"]:checked').node().value !== '') {
                            d3.select('#addButton').attr('disabled', null);
                        } else {
                            d3.select('#addButton').attr('disabled', true);
                        }
                    }
                }
                match_input.on('change', enable_find_button);
                // d3.select('input#manualMatch').on('keyup', );
                d3.select('input#manualMatch').on('keyup', function () {
                    let value = d3.select('#manualMatch').node().value;
                    d3.select('input#manualMatchRadio').attr('value', value);
                    console.log('value:', value);
                    enable_find_button();
                });

            
                d3.select('#cancelButton').on('click', function () {
                    window.location.reload();
                });
            }
        })

    });

});