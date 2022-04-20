/*
  Warnings:

  - You are about to alter the column `item_size` on the `Entry` table. The data in that column could be lost. The data in that column will be cast from `String` to `Float`.
  - Added the required column `brand` to the `Entry` table without a default value. This is not possible if the table is not empty.
  - Added the required column `item_unit` to the `Entry` table without a default value. This is not possible if the table is not empty.

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
    "items" INTEGER NOT NULL,
    "item_size" REAL NOT NULL,
    "item_unit" TEXT NOT NULL,
    "suma_price" REAL,
    "infinity_price" REAL,
    "prev_suma_price" REAL,
    "prev_infinity_price" REAL,
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
INSERT INTO "new_Entry" ("categoryId", "createdAt", "id", "infinity", "infinity_desc", "infinity_price", "item_size", "items", "organic", "preferred_supplier", "prev_infinity_price", "prev_suma_price", "sort_order", "suma", "suma_desc", "suma_price", "updatedAt", "updatedBy", "vat") SELECT "categoryId", "createdAt", "id", "infinity", "infinity_desc", "infinity_price", "item_size", "items", "organic", "preferred_supplier", "prev_infinity_price", "prev_suma_price", "sort_order", "suma", "suma_desc", "suma_price", "updatedAt", "updatedBy", "vat" FROM "Entry";
DROP TABLE "Entry";
ALTER TABLE "new_Entry" RENAME TO "Entry";
CREATE UNIQUE INDEX "Entry_suma_key" ON "Entry"("suma");
CREATE UNIQUE INDEX "Entry_infinity_key" ON "Entry"("infinity");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
