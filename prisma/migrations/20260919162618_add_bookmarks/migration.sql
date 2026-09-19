-- CreateTable
CREATE TABLE "BookmarkCategory" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "parentId" INTEGER,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookmarkCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" SERIAL NOT NULL,
    "categoryId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500) NOT NULL,
    "iconUrl" VARCHAR(2048),
    "url" VARCHAR(2048) NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookmarkCategory_parentId_sort_idx" ON "BookmarkCategory"("parentId", "sort");

-- CreateIndex
CREATE INDEX "BookmarkCategory_sort_id_idx" ON "BookmarkCategory"("sort", "id");

-- CreateIndex
CREATE UNIQUE INDEX "BookmarkCategory_parentId_name_key" ON "BookmarkCategory"("parentId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_url_key" ON "Bookmark"("url");

-- CreateIndex
CREATE INDEX "Bookmark_categoryId_sort_idx" ON "Bookmark"("categoryId", "sort");

-- CreateIndex
CREATE INDEX "Bookmark_isVisible_sort_idx" ON "Bookmark"("isVisible", "sort");

-- AddForeignKey
ALTER TABLE "BookmarkCategory" ADD CONSTRAINT "BookmarkCategory_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "BookmarkCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "BookmarkCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
