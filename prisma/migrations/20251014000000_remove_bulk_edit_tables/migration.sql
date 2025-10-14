-- Drop BulkEditItem first because it has a foreign key relationship to BulkEditBatch
DROP TABLE "BulkEditItem";

-- Now drop BulkEditBatch
DROP TABLE "BulkEditBatch";
