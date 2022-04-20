/*
  Warnings:

  - You are about to drop the column `prev_infinity_price` on the `Entry` table. All the data in the column will be lost.
  - You are about to drop the column `prev_suma_price` on the `Entry` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Entry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "suma" TEXT,
    "infinity" TEXT,
    "suma_desc" TEXT,
    "infinity_desc" TEXT,
    "brand" TEXT NOT NULL,
    "n_items" INTEGER NOT NULL,
    "item_size" REAL NOT NULL,
    "item_unit" TEXT NOT NULL,
    "suma_price" REAL,
    "infinity_price" REAL,
    "fareshares_price" REAL NOT NULL,
    "prev_fareshares_price" REAL,
    "price_updatedAt" DATETIME,
    "vat" BOOLEAN NOT NULL,
    "organic" BOOLEAN NOT NULL,
    "sort_order" INTEGER,
    "categoryId" INTEGER NOT NULL,
    "preferred_supplier" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT NOT NULL,
    CONSTRAINT "Entry_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Entry" ("brand", "categoryId", "createdAt", "fareshares_price", "id", "infinity", "infinity_desc", "infinity_price", "item_size", "item_unit", "n_items", "organic", "preferred_supplier", "sort_order", "suma", "suma_desc", "suma_price", "updatedAt", "updatedBy", "vat") SELECT "brand", "categoryId", "createdAt", "fareshares_price", "id", "infinity", "infinity_desc", "infinity_price", "item_size", "item_unit", "n_items", "organic", "preferred_supplier", "sort_order", "suma", "suma_desc", "suma_price", "updatedAt", "updatedBy", "vat" FROM "Entry";
DROP TABLE "Entry";
ALTER TABLE "new_Entry" RENAME TO "Entry";
CREATE UNIQUE INDEX "Entry_suma_key" ON "Entry"("suma");
CREATE UNIQUE INDEX "Entry_infinity_key" ON "Entry"("infinity");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
