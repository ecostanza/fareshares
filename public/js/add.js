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

document.addEventListener("DOMContentLoaded", async function() { 

    const category_autocomplete = d3.select('input#category_autocomplete');
    const ac = new Autocomplete(category_autocomplete.node(), {
        data: categories.map(function (c) {return {'label': c, 'value': c};}),
        // maximumItems: 5,
        onSelectItem: ({label, value}) => {
            console.log("user selected:", label, value);
        }
    });

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
        product_input.node().value !== '' &
        category_autocomplete.node().value !== ''
        ) {
            d3.select('#findButton').attr('disabled', null);
        }
    }
    product_input.on('keyup', enable_find_button);
    supplier_input.on('change', enable_find_button);
    // d3.select('#categorySelect').on('change', enable_find_button);
    category_autocomplete.on('change', enable_find_button);

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
                                ${d['brand']}: ${d['full description']} (organic: ${d['is_organic']})
                            </div>
                        </div>`;
                    });

                results_div.append('div')
                    .html(`
                        <div>
                            <h5>Please select an option for ${other_supplier}:</h4>
                        </div>`
                    );
                    
                const matches = results_div.append('div')
                    .attr('class', 'matches');
                
                d3.select('.matches')
                    .selectAll('div')
                    .data(data['matches'])
                    .enter()
                    .append('div')
                    .html(function (d) {
                        console.log(d);
                        // return JSON.stringify(d);
                        const i = d['item'];
                        let html = `
                        <input 
                            class="form-check-input" 
                            type="radio" 
                            value="${i['code']}"
                            name="matchingProductRadio" 
                            id="flexRadio${i['code']}">
                        <label class="form-check-label" for="flexRadio${i['code']}">
                            ${i['brand']}: ${i['full description']} (organic: ${i['is_organic']})
                        </label>
                        `;
                        // return `${i['brand']}: ${i['full description']} (organic: ${i['is_organic']})`;
                        return html;
                    });

                d3.select('.matches')
                    .append('div')
                    .html(`
                        <div class="input-group">
                            <div class="input-group-text">
                                <input id="manualMatchRadio" name="matchingProductRadio" class="form-check-input mt-0" type="radio" value="" aria-label="Radio button for following text input">
                            </div>
                            <input type="text" id="manualMatch" placeholder="Manually enter ${other_supplier} product code" class="form-control" aria-label="Text input with radio button">
                        </div>`);
                
                d3.select('.matches')
                    .append('div')
                    .html(`
                    <input 
                        class="form-check-input" 
                        type="radio" 
                        name="matchingProductRadio" 
                        value="none"
                        id="flexRadioNone">
                    <label class="form-check-label" for="flexRadioNone">
                        There is no matching item from ${other_supplier}
                    </label>
                    `);

                // TODO: add buttons to submit and cancel
                results_div.append('span')
                    .html(`<button type="button" id="addButton" class="btn btn-primary" disabled>Add</button>&nbsp;`);

                results_div.append('span')
                    .html(`<button type="button" id="cancelButton" class="btn btn-primary">Cancel</button>`);
                
                d3.select('#addButton').on('click', async function () {
                    let value = d3.select('input[name="matchingProductRadio"]:checked').node().value;
                    console.log('value:', value);
                    let add_data = {}
                    add_data[supplier.toLowerCase()] = product_id;
                    add_data[other_supplier.toLowerCase()] = value;
                    // add_data['category_name'] = d3.select('#categorySelect').node().value;
                    add_data['category_name'] = category_autocomplete.node().value;
                    add_data['user'] = 'enrico';
                    const add_url = `${rootUrl}/entries/`;
                    const feedback = d3.select('div#feedback');
                    let response = null;
                    try {
                        response = await d3.json(add_url, {
                            method: 'PUT', 
                            headers: { "Content-Type": "application/json; charset=UTF-8" },
                            'body': JSON.stringify(add_data)
                        });
                        console.log('add response:', response);
                        // TODO: show feedback on success or failure
                        d3.select('fieldset#matchesFormFieldset').attr('disabled', true);
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
                    } catch (error) {
                        console.log('error from d3.json', error);
                        console.log('response', response);
                        let msg = 'Sorry, that did not work';
                        msg += '<br/>That item seems to be already in the pricelist';
                        // if (error.includes('Unique constraint failed')) {
                        //     msg += '<br/>That item seems to be already in the pricelist';
                        // }
                        feedback.html(msg);
                        feedback.append('div')
                            .html(`
                            <button 
                                type="button" 
                                id="restartButton" 
                                class="btn btn-primary">Try again</button>`);

                        d3.select('#restartButton').on('click', function () {
                            window.location.reload();
                        });
                                
                    }
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