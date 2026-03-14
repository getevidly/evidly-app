-- ============================================================
-- API-JURISDICTIONS-01: Add slug column to jurisdictions table
-- ============================================================
-- Adds a unique slug column for public API lookups.
-- County-level: lowercase hyphenated county name (e.g. "san-diego")
-- City-level: lowercase hyphenated city name (e.g. "long-beach")
-- Special cases: Los Angeles county → "la-county", Nevada county → "nevada-ca"
-- ============================================================

ALTER TABLE jurisdictions ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;

-- County-level slugs (58 counties)
UPDATE jurisdictions SET slug = 'alameda'          WHERE county = 'Alameda'         AND city IS NULL;
UPDATE jurisdictions SET slug = 'alpine'           WHERE county = 'Alpine'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'amador'           WHERE county = 'Amador'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'butte'            WHERE county = 'Butte'           AND city IS NULL;
UPDATE jurisdictions SET slug = 'calaveras'        WHERE county = 'Calaveras'       AND city IS NULL;
UPDATE jurisdictions SET slug = 'colusa'           WHERE county = 'Colusa'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'contra-costa'     WHERE county = 'Contra Costa'    AND city IS NULL;
UPDATE jurisdictions SET slug = 'del-norte'        WHERE county = 'Del Norte'       AND city IS NULL;
UPDATE jurisdictions SET slug = 'el-dorado'        WHERE county = 'El Dorado'       AND city IS NULL;
UPDATE jurisdictions SET slug = 'fresno'           WHERE county = 'Fresno'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'glenn'            WHERE county = 'Glenn'           AND city IS NULL;
UPDATE jurisdictions SET slug = 'humboldt'         WHERE county = 'Humboldt'        AND city IS NULL;
UPDATE jurisdictions SET slug = 'imperial'         WHERE county = 'Imperial'        AND city IS NULL;
UPDATE jurisdictions SET slug = 'inyo'             WHERE county = 'Inyo'            AND city IS NULL;
UPDATE jurisdictions SET slug = 'kern'             WHERE county = 'Kern'            AND city IS NULL;
UPDATE jurisdictions SET slug = 'kings'            WHERE county = 'Kings'           AND city IS NULL;
UPDATE jurisdictions SET slug = 'lake'             WHERE county = 'Lake'            AND city IS NULL;
UPDATE jurisdictions SET slug = 'lassen'           WHERE county = 'Lassen'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'la-county'        WHERE county = 'Los Angeles'     AND city IS NULL;
UPDATE jurisdictions SET slug = 'madera'           WHERE county = 'Madera'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'marin'            WHERE county = 'Marin'           AND city IS NULL;
UPDATE jurisdictions SET slug = 'mariposa'         WHERE county = 'Mariposa'        AND city IS NULL;
UPDATE jurisdictions SET slug = 'mendocino'        WHERE county = 'Mendocino'       AND city IS NULL;
UPDATE jurisdictions SET slug = 'merced'           WHERE county = 'Merced'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'modoc'            WHERE county = 'Modoc'           AND city IS NULL;
UPDATE jurisdictions SET slug = 'mono'             WHERE county = 'Mono'            AND city IS NULL;
UPDATE jurisdictions SET slug = 'monterey'         WHERE county = 'Monterey'        AND city IS NULL;
UPDATE jurisdictions SET slug = 'napa'             WHERE county = 'Napa'            AND city IS NULL;
UPDATE jurisdictions SET slug = 'nevada-ca'        WHERE county = 'Nevada'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'orange'           WHERE county = 'Orange'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'placer'           WHERE county = 'Placer'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'plumas'           WHERE county = 'Plumas'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'riverside'        WHERE county = 'Riverside'       AND city IS NULL;
UPDATE jurisdictions SET slug = 'sacramento'       WHERE county = 'Sacramento'      AND city IS NULL;
UPDATE jurisdictions SET slug = 'san-benito'       WHERE county = 'San Benito'      AND city IS NULL;
UPDATE jurisdictions SET slug = 'san-bernardino'   WHERE county = 'San Bernardino'  AND city IS NULL;
UPDATE jurisdictions SET slug = 'san-diego'        WHERE county = 'San Diego'       AND city IS NULL;
UPDATE jurisdictions SET slug = 'san-francisco'    WHERE county = 'San Francisco'   AND city IS NULL;
UPDATE jurisdictions SET slug = 'san-joaquin'      WHERE county = 'San Joaquin'     AND city IS NULL;
UPDATE jurisdictions SET slug = 'san-luis-obispo'  WHERE county = 'San Luis Obispo' AND city IS NULL;
UPDATE jurisdictions SET slug = 'san-mateo'        WHERE county = 'San Mateo'       AND city IS NULL;
UPDATE jurisdictions SET slug = 'santa-barbara'    WHERE county = 'Santa Barbara'   AND city IS NULL;
UPDATE jurisdictions SET slug = 'santa-clara'      WHERE county = 'Santa Clara'     AND city IS NULL;
UPDATE jurisdictions SET slug = 'santa-cruz'       WHERE county = 'Santa Cruz'      AND city IS NULL;
UPDATE jurisdictions SET slug = 'shasta'           WHERE county = 'Shasta'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'sierra'           WHERE county = 'Sierra'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'siskiyou'         WHERE county = 'Siskiyou'        AND city IS NULL;
UPDATE jurisdictions SET slug = 'solano'           WHERE county = 'Solano'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'sonoma'           WHERE county = 'Sonoma'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'stanislaus'       WHERE county = 'Stanislaus'      AND city IS NULL;
UPDATE jurisdictions SET slug = 'sutter'           WHERE county = 'Sutter'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'tehama'           WHERE county = 'Tehama'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'trinity'          WHERE county = 'Trinity'         AND city IS NULL;
UPDATE jurisdictions SET slug = 'tulare'           WHERE county = 'Tulare'          AND city IS NULL;
UPDATE jurisdictions SET slug = 'tuolumne'         WHERE county = 'Tuolumne'        AND city IS NULL;
UPDATE jurisdictions SET slug = 'ventura'          WHERE county = 'Ventura'         AND city IS NULL;
UPDATE jurisdictions SET slug = 'yolo'             WHERE county = 'Yolo'            AND city IS NULL;
UPDATE jurisdictions SET slug = 'yuba'             WHERE county = 'Yuba'            AND city IS NULL;

-- City-level slugs (4 independent cities)
UPDATE jurisdictions SET slug = 'long-beach'       WHERE county = 'Los Angeles'     AND city = 'Long Beach';
UPDATE jurisdictions SET slug = 'pasadena'         WHERE county = 'Los Angeles'     AND city = 'Pasadena';
UPDATE jurisdictions SET slug = 'vernon'           WHERE county = 'Los Angeles'     AND city = 'Vernon';
UPDATE jurisdictions SET slug = 'berkeley'         WHERE county = 'Alameda'         AND city = 'Berkeley';
