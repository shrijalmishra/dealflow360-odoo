-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RiskAssessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "versionId" TEXT NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "blendedScore" REAL NOT NULL,
    "worstLineExcessPct" REAL NOT NULL,
    "totalExcessValue" REAL NOT NULL,
    "computedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiskAssessment_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "QuotationVersion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_RiskAssessment" ("blendedScore", "computedAt", "id", "totalExcessValue", "versionId", "worstLineExcessPct") SELECT "blendedScore", "computedAt", "id", "totalExcessValue", "versionId", "worstLineExcessPct" FROM "RiskAssessment";
DROP TABLE "RiskAssessment";
ALTER TABLE "new_RiskAssessment" RENAME TO "RiskAssessment";
CREATE UNIQUE INDEX "RiskAssessment_versionId_key" ON "RiskAssessment"("versionId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
