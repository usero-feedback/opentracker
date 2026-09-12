-- RedefineTables
PRAGMA defer_foreign_keys = ON;

PRAGMA foreign_keys = OFF;

-- 1. Create the new table
CREATE TABLE
    "new_Story" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "number" INTEGER NOT NULL,
        "projectId" TEXT NOT NULL,
        "title" TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "type" TEXT NOT NULL,
        "state" TEXT NOT NULL DEFAULT 'unscheduled',
        "points" INTEGER,
        "priority" BOOLEAN NOT NULL DEFAULT false,
        "iteration" INTEGER,
        "position" REAL NOT NULL DEFAULT 0,
        "deadline" TEXT,
        "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" DATETIME NOT NULL,
        CONSTRAINT "Story_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project" ("id") ON DELETE CASCADE ON UPDATE CASCADE
    );

-- 2. Insert data with generated 'number'
-- We use ROW_NUMBER() to generate 1, 2, 3... for each story within a specific project
INSERT INTO
    "new_Story" (
        "id",
        "number",
        "projectId",
        "title",
        "description",
        "type",
        "state",
        "points",
        "priority",
        "iteration",
        "position",
        "deadline",
        "createdAt",
        "updatedAt"
    )
SELECT
    "id",
    ROW_NUMBER() OVER (
        PARTITION BY
            "projectId"
        ORDER BY
            "createdAt" ASC
    ) as "number",
    "projectId",
    "title",
    "description",
    "type",
    "state",
    "points",
    "priority",
    "iteration",
    "position",
    "deadline",
    "createdAt",
    "updatedAt"
FROM
    "Story";

-- 3. Cleanup and Indices
DROP TABLE "Story";

ALTER TABLE "new_Story"
RENAME TO "Story";

CREATE INDEX "Story_projectId_idx" ON "Story" ("projectId");

CREATE INDEX "Story_projectId_state_idx" ON "Story" ("projectId", "state");

CREATE INDEX "Story_projectId_iteration_idx" ON "Story" ("projectId", "iteration");

CREATE UNIQUE INDEX "Story_projectId_number_key" ON "Story" ("projectId", "number");

PRAGMA foreign_keys = ON;

PRAGMA defer_foreign_keys = OFF;