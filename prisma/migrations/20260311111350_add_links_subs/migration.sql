-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CalendarSubscription" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#14b8a6',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" DATETIME,
    "errorMsg" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_CalendarSubscription" ("color", "createdAt", "enabled", "errorMsg", "id", "lastSyncedAt", "name", "updatedAt", "url") SELECT "color", "createdAt", "enabled", "errorMsg", "id", "lastSyncedAt", "name", "updatedAt", "url" FROM "CalendarSubscription";
DROP TABLE "CalendarSubscription";
ALTER TABLE "new_CalendarSubscription" RENAME TO "CalendarSubscription";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
