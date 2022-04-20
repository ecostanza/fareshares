-- CreateTable
CREATE TABLE "Category" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Entry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "suma" TEXT,
    "infinity" TEXT,
    "suma_desc" TEXT,
    "infinity_desc" TEXT,
    "items" INTEGER NOT NULL,
    "item_size" TEXT NOT NULL,
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

-- CreateIndex
CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_suma_key" ON "Entry"("suma");

-- CreateIndex
CREATE UNIQUE INDEX "Entry_infinity_key" ON "Entry"("infinity");
