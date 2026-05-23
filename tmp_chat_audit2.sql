-- 2a. messages by direction
SELECT direction, count(*) as cnt FROM messages GROUP BY direction;
