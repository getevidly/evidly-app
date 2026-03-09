/**
 * ScoreTableCityPage — City-level ScoreTable pages for California
 * URL: getevidly.com/scoretable/city/[city-slug]
 * ~482 pages generated from this template
 *
 * Each city page pulls inspection methodology from its parent county's COUNTY_DATA.
 * City-specific: H1, hero copy, breadcrumb, meta tags, schema markup.
 * Everything else — methodology, scoring, violations, FAQ — comes from the county.
 */

import { useParams } from "react-router-dom";
import ScoreTableCountyPage from "./ScoreTableCountyPage";
import { CITY_TO_COUNTY, cityDisplayName } from "./CityPage";

export default function ScoreTableCityPage(){
  var { citySlug } = useParams();
  var slug = citySlug || "";
  var countyKey = CITY_TO_COUNTY[slug] || "merced";
  var name = cityDisplayName(slug);
  return <ScoreTableCountyPage county={countyKey} cityName={name} citySlug={slug} />;
}
