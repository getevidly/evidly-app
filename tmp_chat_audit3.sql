-- 2b. messages by channel
SELECT channel, count(*) as cnt FROM messages GROUP BY channel;
