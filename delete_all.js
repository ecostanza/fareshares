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

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient()

async function run () {
    const deletedEntries = await prisma.entry.deleteMany({})
    console.log('deletedEntries:', deletedEntries);

    const deletedCategories = await prisma.category.deleteMany({})
    console.log('deletedCategories:', deletedCategories);

    }

run();
