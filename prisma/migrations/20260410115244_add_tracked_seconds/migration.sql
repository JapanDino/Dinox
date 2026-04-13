-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "color" TEXT,
    "startAt" DATETIME NOT NULL,
    "endAt" DATETIME NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "kind" TEXT NOT NULL DEFAULT 'EVENT',
    "status" TEXT NOT NULL DEFAULT 'TODO',
    "projectId" TEXT,
    "links" TEXT,
    "recurrenceRule" TEXT,
    "seriesId" TEXT,
    "parentId" TEXT,
    "externalSource" TEXT,
    "externalId" TEXT,
    "trackedSeconds" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Item_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Item" ("allDay", "color", "createdAt", "description", "endAt", "externalId", "externalSource", "id", "kind", "links", "parentId", "projectId", "recurrenceRule", "seriesId", "startAt", "status", "title", "updatedAt") SELECT "allDay", "color", "createdAt", "description", "endAt", "externalId", "externalSource", "id", "kind", "links", "parentId", "projectId", "recurrenceRule", "seriesId", "startAt", "status", "title", "updatedAt" FROM "Item";
DROP TABLE "Item";
ALTER TABLE "new_Item" RENAME TO "Item";
CREATE INDEX "Item_projectId_idx" ON "Item"("projectId");
CREATE INDEX "Item_startAt_endAt_idx" ON "Item"("startAt", "endAt");
CREATE INDEX "Item_seriesId_idx" ON "Item"("seriesId");
CREATE INDEX "Item_parentId_idx" ON "Item"("parentId");
CREATE INDEX "Item_externalSource_externalId_idx" ON "Item"("externalSource", "externalId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
