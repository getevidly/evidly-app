-- One contact row per study response. The plain btree index
-- idx_mrc_response is redundant once a unique index exists.

DROP INDEX IF EXISTS idx_mrc_response;

ALTER TABLE market_research_contacts
  ADD CONSTRAINT market_research_contacts_response_id_key
  UNIQUE (response_id);
