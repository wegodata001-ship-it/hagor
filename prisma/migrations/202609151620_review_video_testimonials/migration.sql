CREATE TYPE "ReviewMediaType" AS ENUM ('TEXT', 'VIDEO');

ALTER TABLE "Review"
ADD COLUMN "mediaType" "ReviewMediaType" NOT NULL DEFAULT 'TEXT',
ADD COLUMN "title" TEXT,
ADD COLUMN "videoUrl" TEXT;
