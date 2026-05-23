-- 1. message_threads by entity_type
SELECT entity_type, count(*) as cnt FROM message_threads GROUP BY entity_type ORDER BY cnt DESC;
