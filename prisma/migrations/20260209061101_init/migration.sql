-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "context" TEXT,
    "targetKeywords" TEXT[],
    "excludeKeywords" TEXT[],
    "industry" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Query" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "searchTerm" TEXT NOT NULL,
    "improvedQuery" TEXT,
    "targets" TEXT[],
    "sources" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "lastRun" TIMESTAMP(3),
    "resultCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Query_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "queryId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "emails" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "phones" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "websites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "whatsapp" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "instagram" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "github" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "twitter" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "linkedin" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "telegram" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "discord" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL,
    "sources" TEXT[],
    "quality" TEXT NOT NULL DEFAULT 'medium',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relevanceScore" INTEGER,
    "enrichedAt" TIMESTAMP(3),
    "enrichmentData" JSONB,
    "status" TEXT NOT NULL DEFAULT 'new',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DirectoryEntity" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "queryId" TEXT,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "image" TEXT,
    "description" TEXT,
    "title" TEXT,
    "role" TEXT,
    "company" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "founded" TEXT,
    "headquarters" TEXT,
    "author" TEXT,
    "publisher" TEXT,
    "year" TEXT,
    "isbn" TEXT,
    "category" TEXT,
    "price" TEXT,
    "website" TEXT,
    "email" TEXT,
    "twitter" TEXT,
    "linkedin" TEXT,
    "source" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectoryEntity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_name_idx" ON "Project"("name");

-- CreateIndex
CREATE INDEX "Query_projectId_idx" ON "Query"("projectId");

-- CreateIndex
CREATE INDEX "Query_status_idx" ON "Query"("status");

-- CreateIndex
CREATE INDEX "Lead_queryId_idx" ON "Lead"("queryId");

-- CreateIndex
CREATE INDEX "Lead_projectId_idx" ON "Lead"("projectId");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_quality_idx" ON "Lead"("quality");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_projectId_url_key" ON "Lead"("projectId", "url");

-- CreateIndex
CREATE INDEX "DirectoryEntity_projectId_idx" ON "DirectoryEntity"("projectId");

-- CreateIndex
CREATE INDEX "DirectoryEntity_type_idx" ON "DirectoryEntity"("type");

-- CreateIndex
CREATE INDEX "DirectoryEntity_name_idx" ON "DirectoryEntity"("name");

-- AddForeignKey
ALTER TABLE "Query" ADD CONSTRAINT "Query_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_queryId_fkey" FOREIGN KEY ("queryId") REFERENCES "Query"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DirectoryEntity" ADD CONSTRAINT "DirectoryEntity_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
