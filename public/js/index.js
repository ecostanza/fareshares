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
    console.log('loaded');

    // d3.selectAll('td.preferred_supplier')
    //     .html(`
    //     <select class="form-select-sm preferred_supplier" aria-label="Default select example">
    //         <option value="null"></option>
    //         <option value="suma">Suma</option>
    //         <option value="infinity">Infinity</option>
    //     </select>
    //     `);

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
            tr.select('td.fareshares_price').html(
                `<b>${ response['fareshares_price'].toFixed(2) }</b>`
            );
        } catch(error) {
            console.log('post error:', error);
        }
});
    // TODO: update price on preferred supplier change (on backend)

    d3.selectAll('tr.entry')
        .append('td')
        .append('button')
        .attr('class', "btn btn-danger btn-sm")
        .attr('type', 'button')
        .text('Del.');

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

});
