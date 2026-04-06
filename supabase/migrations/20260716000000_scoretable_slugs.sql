-- ═══════════════════════════════════════════════════════════════════════════
-- SCORETABLE-APP-01: Populate slug column for NV, OR, WA, AZ + tribal rows
-- Drops global UNIQUE on slug, adds composite (state, slug) UNIQUE index
-- so counties with the same name in different states (Clark NV/WA, Douglas NV/OR)
-- can coexist.
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 0: Ensure slug column exists (may already exist from 20260313 migration)
ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS slug TEXT;

-- Step 1: Drop global unique constraint, add state-scoped unique
ALTER TABLE jurisdictions DROP CONSTRAINT IF EXISTS jurisdictions_slug_key;
DROP INDEX IF EXISTS jurisdictions_slug_key;
CREATE UNIQUE INDEX IF NOT EXISTS idx_jurisdictions_state_slug
  ON jurisdictions(state, slug) WHERE slug IS NOT NULL;

-- ═══ NV — 17 jurisdictions (16 counties + Carson City) ═══
UPDATE jurisdictions SET slug = 'clark'       WHERE state='NV' AND county='Clark'       AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'washoe'      WHERE state='NV' AND county='Washoe'      AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'carson-city' WHERE state='NV' AND county='Carson City'  AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'douglas'     WHERE state='NV' AND county='Douglas'     AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'churchill'   WHERE state='NV' AND county='Churchill'   AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'elko'        WHERE state='NV' AND county='Elko'        AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'esmeralda'   WHERE state='NV' AND county='Esmeralda'   AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'eureka'      WHERE state='NV' AND county='Eureka'      AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'humboldt'    WHERE state='NV' AND county='Humboldt'    AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'lander'      WHERE state='NV' AND county='Lander'      AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'lincoln'     WHERE state='NV' AND county='Lincoln'     AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'lyon'        WHERE state='NV' AND county='Lyon'        AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'mineral'     WHERE state='NV' AND county='Mineral'     AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'nye'         WHERE state='NV' AND county='Nye'         AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'pershing'    WHERE state='NV' AND county='Pershing'    AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'storey'      WHERE state='NV' AND county='Storey'      AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'white-pine'  WHERE state='NV' AND county='White Pine'  AND slug IS NULL AND governmental_level IN ('county','city');

-- ═══ OR — 36 counties ═══
UPDATE jurisdictions SET slug = 'baker'       WHERE state='OR' AND county='Baker'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'benton'      WHERE state='OR' AND county='Benton'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'clackamas'   WHERE state='OR' AND county='Clackamas'   AND slug IS NULL;
UPDATE jurisdictions SET slug = 'clatsop'     WHERE state='OR' AND county='Clatsop'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'columbia'    WHERE state='OR' AND county='Columbia'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'coos'        WHERE state='OR' AND county='Coos'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'crook'       WHERE state='OR' AND county='Crook'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'curry'       WHERE state='OR' AND county='Curry'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'deschutes'   WHERE state='OR' AND county='Deschutes'   AND slug IS NULL;
UPDATE jurisdictions SET slug = 'douglas'     WHERE state='OR' AND county='Douglas'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'gilliam'     WHERE state='OR' AND county='Gilliam'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'grant'       WHERE state='OR' AND county='Grant'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'harney'      WHERE state='OR' AND county='Harney'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'hood-river'  WHERE state='OR' AND county='Hood River'  AND slug IS NULL;
UPDATE jurisdictions SET slug = 'jackson'     WHERE state='OR' AND county='Jackson'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'jefferson'   WHERE state='OR' AND county='Jefferson'   AND slug IS NULL;
UPDATE jurisdictions SET slug = 'josephine'   WHERE state='OR' AND county='Josephine'   AND slug IS NULL;
UPDATE jurisdictions SET slug = 'klamath'     WHERE state='OR' AND county='Klamath'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'lake'        WHERE state='OR' AND county='Lake'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'lane'        WHERE state='OR' AND county='Lane'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'lincoln'     WHERE state='OR' AND county='Lincoln'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'linn'        WHERE state='OR' AND county='Linn'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'malheur'     WHERE state='OR' AND county='Malheur'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'marion'      WHERE state='OR' AND county='Marion'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'morrow'      WHERE state='OR' AND county='Morrow'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'multnomah'   WHERE state='OR' AND county='Multnomah'   AND slug IS NULL;
UPDATE jurisdictions SET slug = 'polk'        WHERE state='OR' AND county='Polk'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'sherman'     WHERE state='OR' AND county='Sherman'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'tillamook'   WHERE state='OR' AND county='Tillamook'   AND slug IS NULL;
UPDATE jurisdictions SET slug = 'umatilla'    WHERE state='OR' AND county='Umatilla'    AND slug IS NULL;
UPDATE jurisdictions SET slug = 'union'       WHERE state='OR' AND county='Union'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'wallowa'     WHERE state='OR' AND county='Wallowa'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'wasco'       WHERE state='OR' AND county='Wasco'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'washington'  WHERE state='OR' AND county='Washington'  AND slug IS NULL;
UPDATE jurisdictions SET slug = 'wheeler'     WHERE state='OR' AND county='Wheeler'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'yamhill'     WHERE state='OR' AND county='Yamhill'     AND slug IS NULL;

-- ═══ WA — 39 counties ═══
UPDATE jurisdictions SET slug = 'adams'        WHERE state='WA' AND county='Adams'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'asotin'       WHERE state='WA' AND county='Asotin'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'benton'       WHERE state='WA' AND county='Benton'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'chelan'       WHERE state='WA' AND county='Chelan'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'clallam'      WHERE state='WA' AND county='Clallam'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'clark'        WHERE state='WA' AND county='Clark'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'columbia'     WHERE state='WA' AND county='Columbia'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'cowlitz'      WHERE state='WA' AND county='Cowlitz'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'douglas'      WHERE state='WA' AND county='Douglas'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'ferry'        WHERE state='WA' AND county='Ferry'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'franklin'     WHERE state='WA' AND county='Franklin'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'garfield'     WHERE state='WA' AND county='Garfield'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'grant'        WHERE state='WA' AND county='Grant'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'grays-harbor' WHERE state='WA' AND county='Grays Harbor' AND slug IS NULL;
UPDATE jurisdictions SET slug = 'island'       WHERE state='WA' AND county='Island'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'jefferson'    WHERE state='WA' AND county='Jefferson'    AND slug IS NULL;
UPDATE jurisdictions SET slug = 'king'         WHERE state='WA' AND county='King'         AND slug IS NULL;
UPDATE jurisdictions SET slug = 'kitsap'       WHERE state='WA' AND county='Kitsap'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'kittitas'     WHERE state='WA' AND county='Kittitas'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'klickitat'    WHERE state='WA' AND county='Klickitat'    AND slug IS NULL;
UPDATE jurisdictions SET slug = 'lewis'        WHERE state='WA' AND county='Lewis'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'lincoln'      WHERE state='WA' AND county='Lincoln'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'mason'        WHERE state='WA' AND county='Mason'        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'okanogan'     WHERE state='WA' AND county='Okanogan'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'pacific'      WHERE state='WA' AND county='Pacific'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'pend-oreille' WHERE state='WA' AND county='Pend Oreille' AND slug IS NULL;
UPDATE jurisdictions SET slug = 'pierce'       WHERE state='WA' AND county='Pierce'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'san-juan'     WHERE state='WA' AND county='San Juan'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'skagit'       WHERE state='WA' AND county='Skagit'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'skamania'     WHERE state='WA' AND county='Skamania'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'snohomish'    WHERE state='WA' AND county='Snohomish'    AND slug IS NULL;
UPDATE jurisdictions SET slug = 'spokane'      WHERE state='WA' AND county='Spokane'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'stevens'      WHERE state='WA' AND county='Stevens'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'thurston'     WHERE state='WA' AND county='Thurston'     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'wahkiakum'    WHERE state='WA' AND county='Wahkiakum'    AND slug IS NULL;
UPDATE jurisdictions SET slug = 'walla-walla'  WHERE state='WA' AND county='Walla Walla'  AND slug IS NULL;
UPDATE jurisdictions SET slug = 'whatcom'      WHERE state='WA' AND county='Whatcom'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'whitman'      WHERE state='WA' AND county='Whitman'      AND slug IS NULL;
UPDATE jurisdictions SET slug = 'yakima'       WHERE state='WA' AND county='Yakima'       AND slug IS NULL;

-- ═══ AZ — 15 counties ═══
UPDATE jurisdictions SET slug = 'maricopa'   WHERE state='AZ' AND county='Maricopa'   AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'pima'       WHERE state='AZ' AND county='Pima'       AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'pinal'      WHERE state='AZ' AND county='Pinal'      AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'yavapai'    WHERE state='AZ' AND county='Yavapai'    AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'coconino'   WHERE state='AZ' AND county='Coconino'   AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'mohave'     WHERE state='AZ' AND county='Mohave'     AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'yuma'       WHERE state='AZ' AND county='Yuma'       AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'cochise'    WHERE state='AZ' AND county='Cochise'    AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'navajo'     WHERE state='AZ' AND county='Navajo'     AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'apache'     WHERE state='AZ' AND county='Apache'     AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'graham'     WHERE state='AZ' AND county='Graham'     AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'gila'       WHERE state='AZ' AND county='Gila'       AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'santa-cruz' WHERE state='AZ' AND county='Santa Cruz'  AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'greenlee'   WHERE state='AZ' AND county='Greenlee'   AND slug IS NULL AND governmental_level IN ('county','city');
UPDATE jurisdictions SET slug = 'la-paz'     WHERE state='AZ' AND county='La Paz'     AND slug IS NULL AND governmental_level IN ('county','city');

-- ═══ CA tribal (7) ═══
UPDATE jurisdictions SET slug = 'table-mountain-rancheria' WHERE state='CA' AND tribal_entity_name='Table Mountain Rancheria'                       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'tachi-yokut-tribe'        WHERE state='CA' AND tribal_entity_name='Tachi-Yokut Tribe'                              AND slug IS NULL;
UPDATE jurisdictions SET slug = 'santa-ynez-chumash'       WHERE state='CA' AND tribal_entity_name='Santa Ynez Band of Chumash'                     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'morongo-band'             WHERE state='CA' AND tribal_entity_name='Morongo Band of Mission Indians'                 AND slug IS NULL;
UPDATE jurisdictions SET slug = 'agua-caliente'            WHERE state='CA' AND tribal_entity_name='Agua Caliente Band of Cahuilla Indians'          AND slug IS NULL;
UPDATE jurisdictions SET slug = 'pechanga-band'            WHERE state='CA' AND tribal_entity_name='Pechanga Band of Luiseno Indians'                AND slug IS NULL;
UPDATE jurisdictions SET slug = 'san-manuel-band'          WHERE state='CA' AND tribal_entity_name='San Manuel Band of Mission Indians'              AND slug IS NULL;

-- ═══ AZ tribal (9) ═══
UPDATE jurisdictions SET slug = 'gila-river'       WHERE state='AZ' AND tribal_entity_name='Gila River Indian Community'                     AND slug IS NULL;
UPDATE jurisdictions SET slug = 'salt-river'       WHERE state='AZ' AND tribal_entity_name='Salt River Pima-Maricopa Indian Community'       AND slug IS NULL;
UPDATE jurisdictions SET slug = 'fort-mcdowell'    WHERE state='AZ' AND tribal_entity_name='Fort McDowell Yavapai Nation'                    AND slug IS NULL;
UPDATE jurisdictions SET slug = 'tohono-oodham'    WHERE state='AZ' AND tribal_entity_name LIKE 'Tohono O%'                                  AND slug IS NULL;
UPDATE jurisdictions SET slug = 'ak-chin'          WHERE state='AZ' AND tribal_entity_name='Ak-Chin Indian Community'                        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'pascua-yaqui'     WHERE state='AZ' AND tribal_entity_name='Pascua Yaqui Tribe'                              AND slug IS NULL;
UPDATE jurisdictions SET slug = 'yavapai-prescott' WHERE state='AZ' AND tribal_entity_name='Yavapai-Prescott Indian Tribe'                   AND slug IS NULL;
UPDATE jurisdictions SET slug = 'fort-mojave'      WHERE state='AZ' AND tribal_entity_name='Fort Mojave Indian Tribe'                        AND slug IS NULL;
UPDATE jurisdictions SET slug = 'navajo-nation'    WHERE state='AZ' AND tribal_entity_name='Navajo Nation'                                   AND slug IS NULL;

-- ── Verification ─────────────────────────────────────────────────────────
SELECT state, COUNT(*) AS total, COUNT(slug) AS with_slug, COUNT(*) - COUNT(slug) AS missing_slug
FROM jurisdictions
GROUP BY state
ORDER BY state;
