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

    d3.select('#loginButton').on('click', function () {
        const username = d3.select('#usernameInput').node().value;
        const password = d3.select('#passwordInput').node().value;

        const url = `/login/password`;
        d3.json(url, {
            method: 'POST', 
            headers: { "Content-Type": "application/json; charset=UTF-8" },
            'body': JSON.stringify({
                'username': username,
                'password': password
            })
        }).then(function (data) {
            console.log('post response:', data);
            if (data['result'] === 'success') {
                d3.selectAll('input').classed('is-invalid', false);
                console.log('redirect..');
                window.location = '/';
            } else {
                console.log('error detected');
                // handle failed validation in bootstrap
                d3.selectAll('input').classed('is-invalid', true);
            }
        }).catch(function (error) {
            console.log('error:', error);
        });
    });

});