/**
 * CityPage — City-level landing pages for California
 * URL: getevidly.com/city/[city-slug]
 * ~482 pages generated from this template
 *
 * Each city page pulls inspection data from its parent county's COUNTY_DATA.
 * City-specific: H1, hero copy, breadcrumb, meta tags.
 * Everything else — methodology, scoring, vendors, FAQ — comes from the county.
 */

import { useParams } from "react-router-dom";
import CountyLandingPage from "./CountyLandingPage";

// ═══ CITY → COUNTY MAPPING (all California incorporated cities) ═══
// County keys match COUNTY_DATA keys in CountyLandingPage.jsx.
// Counties without a COUNTY_DATA entry fall back to DEFAULT_COUNTY (merced).
var _c={
  "alameda":["alameda","albany","berkeley","dublin","emeryville","fremont","hayward","livermore","newark","oakland","piedmont","pleasanton","san-leandro","union-city"],
  "amador":["amador-city","ione","jackson","plymouth","sutter-creek"],
  "butte":["biggs","chico","gridley","oroville","paradise"],
  "calaveras":["angels-camp"],
  "colusa":["colusa","williams"],
  "contra-costa":["antioch","brentwood","clayton","concord","el-cerrito","hercules","lafayette","martinez","oakley","pinole","pittsburg","pleasant-hill","richmond","san-pablo","san-ramon","walnut-creek"],
  "del-norte":["crescent-city"],
  "el-dorado":["placerville","south-lake-tahoe"],
  "fresno":["clovis","coalinga","firebaugh","fowler","fresno","huron","kerman","kingsburg","mendota","orange-cove","parlier","reedley","san-joaquin-city","sanger","selma"],
  "glenn":["orland","willows"],
  "humboldt":["arcata","blue-lake","eureka","ferndale","fortuna","rio-dell","trinidad"],
  "imperial":["brawley","calexico","calipatria","el-centro","holtville","imperial","westmorland"],
  "inyo":["bishop"],
  "kern":["arvin","bakersfield","california-city","delano","maricopa","mcfarland","ridgecrest","shafter","taft","tehachapi","wasco"],
  "kings":["avenal","corcoran","hanford","lemoore"],
  "lake":["clearlake","lakeport"],
  "lassen":["susanville"],
  "los-angeles":["agoura-hills","alhambra","arcadia","artesia","avalon","azusa","baldwin-park","bell","bell-gardens","bellflower","beverly-hills","bradbury","burbank","calabasas","carson","cerritos","claremont","commerce","compton","covina","cudahy","culver-city","diamond-bar","downey","duarte","el-monte","el-segundo","gardena","glendale","glendora","hawaiian-gardens","hawthorne","hermosa-beach","hidden-hills","huntington-park","industry","inglewood","irwindale","la-canada-flintridge","la-habra-heights","la-mirada","la-puente","la-verne","lakewood","lancaster","lawndale","lomita","long-beach","los-angeles","lynwood","malibu","manhattan-beach","maywood","monrovia","montebello","monterey-park","norwalk","palmdale","palos-verdes-estates","paramount","pasadena","pico-rivera","pomona","rancho-palos-verdes","redondo-beach","rolling-hills","rolling-hills-estates","rosemead","san-dimas","san-fernando","san-gabriel","san-marino","santa-clarita","santa-fe-springs","santa-monica","sierra-madre","signal-hill","south-el-monte","south-gate","south-pasadena","temple-city","torrance","vernon","walnut","west-covina","west-hollywood","westlake-village","whittier"],
  "madera":["chowchilla","madera"],
  "marin":["belvedere","corte-madera","fairfax","larkspur","mill-valley","novato","ross","san-anselmo","san-rafael","sausalito","tiburon"],
  "mendocino":["fort-bragg","point-arena","ukiah","willits"],
  "merced":["atwater","dos-palos","gustine","livingston","los-banos","merced"],
  "modoc":["alturas"],
  "mono":["mammoth-lakes"],
  "monterey":["carmel-by-the-sea","del-rey-oaks","gonzales","greenfield","king-city","marina","monterey","pacific-grove","salinas","sand-city","seaside","soledad"],
  "napa":["american-canyon","calistoga","napa","st-helena","yountville"],
  "nevada":["grass-valley","nevada-city","truckee"],
  "orange":["aliso-viejo","anaheim","brea","buena-park","costa-mesa","cypress","dana-point","fountain-valley","fullerton","garden-grove","huntington-beach","irvine","la-habra","la-palma","laguna-beach","laguna-hills","laguna-niguel","laguna-woods","lake-forest","los-alamitos","mission-viejo","newport-beach","orange","placentia","rancho-santa-margarita","san-clemente","san-juan-capistrano","santa-ana","seal-beach","stanton","tustin","villa-park","westminster","yorba-linda"],
  "placer":["auburn","colfax","lincoln","loomis","rocklin","roseville"],
  "plumas":["portola"],
  "riverside":["banning","beaumont","blythe","calimesa","canyon-lake","cathedral-city","coachella","corona","desert-hot-springs","eastvale","hemet","indian-wells","indio","jurupa-valley","lake-elsinore","la-quinta","menifee","moreno-valley","murrieta","norco","palm-desert","palm-springs","perris","rancho-mirage","riverside","san-jacinto","temecula","wildomar"],
  "sacramento":["citrus-heights","elk-grove","folsom","galt","isleton","rancho-cordova","sacramento"],
  "san-benito":["hollister","san-juan-bautista"],
  "san-bernardino":["adelanto","apple-valley","barstow","big-bear-lake","chino","chino-hills","colton","fontana","grand-terrace","hesperia","highland","loma-linda","montclair","needles","ontario","rancho-cucamonga","redlands","rialto","san-bernardino","twentynine-palms","upland","victorville","yucaipa","yucca-valley"],
  "san-diego":["carlsbad","chula-vista","coronado","del-mar","el-cajon","encinitas","escondido","imperial-beach","la-mesa","lemon-grove","national-city","oceanside","poway","san-diego","san-marcos","santee","solana-beach","vista"],
  "san-francisco":["san-francisco"],
  "san-joaquin":["escalon","lathrop","lodi","manteca","ripon","stockton","tracy"],
  "san-luis-obispo":["arroyo-grande","atascadero","grover-beach","morro-bay","paso-robles","pismo-beach","san-luis-obispo"],
  "san-mateo":["atherton","belmont","brisbane","burlingame","colma","daly-city","east-palo-alto","foster-city","half-moon-bay","hillsborough","menlo-park","millbrae","pacifica","portola-valley","redwood-city","san-bruno","san-carlos","san-mateo","south-san-francisco","woodside"],
  "santa-barbara":["buellton","carpinteria","goleta","guadalupe","lompoc","santa-barbara","santa-maria","solvang"],
  "santa-clara":["campbell","cupertino","gilroy","los-altos","los-altos-hills","los-gatos","milpitas","monte-sereno","morgan-hill","mountain-view","palo-alto","san-jose","santa-clara","saratoga","sunnyvale"],
  "santa-cruz":["capitola","santa-cruz","scotts-valley","watsonville"],
  "shasta":["anderson","redding","shasta-lake"],
  "sierra":["loyalton"],
  "siskiyou":["dorris","dunsmuir","etna","fort-jones","montague","mount-shasta","tulelake","weed","yreka"],
  "solano":["benicia","dixon","fairfield","rio-vista","suisun-city","vacaville","vallejo"],
  "sonoma":["cloverdale","cotati","healdsburg","petaluma","rohnert-park","santa-rosa","sebastopol","sonoma","windsor"],
  "stanislaus":["ceres","hughson","modesto","newman","oakdale","patterson","riverbank","turlock","waterford"],
  "sutter":["live-oak","yuba-city"],
  "tehama":["corning","red-bluff","tehama"],
  "tulare":["dinuba","exeter","farmersville","lindsay","porterville","tulare","visalia","woodlake"],
  "tuolumne":["sonora"],
  "ventura":["camarillo","fillmore","moorpark","ojai","oxnard","port-hueneme","ventura","santa-paula","simi-valley","thousand-oaks"],
  "yolo":["davis","west-sacramento","winters","woodland"],
  "yuba":["marysville","wheatland"]
};

// Build forward mapping: city slug → county key
export var CITY_TO_COUNTY={};
Object.keys(_c).forEach(function(co){_c[co].forEach(function(city){CITY_TO_COUNTY[city]=co;});});

// ═══ USER-SPECIFIED OVERRIDES ═══
// These cities map to a nearby county that has COUNTY_DATA rather than their
// geographic county (which would fall back to the default).
CITY_TO_COUNTY["roseville"]="sacramento";    // geographically Placer, user wants Sacramento data
CITY_TO_COUNTY["modesto"]="san-joaquin";     // geographically Stanislaus, user wants San Joaquin data
CITY_TO_COUNTY["turlock"]="san-joaquin";     // geographically Stanislaus, user wants San Joaquin data

// ═══ DISPLAY NAME OVERRIDES ═══
// For cities where simple slug → Title Case doesn't produce the correct name.
var CITY_NAMES={
  "mcfarland":"McFarland",
  "st-helena":"St. Helena",
  "paso-robles":"Paso Robles",
  "la-canada-flintridge":"La Canada Flintridge",
  "la-habra-heights":"La Habra Heights",
  "la-mirada":"La Mirada",
  "la-puente":"La Puente",
  "la-verne":"La Verne",
  "la-quinta":"La Quinta",
  "la-mesa":"La Mesa",
  "la-habra":"La Habra",
  "la-palma":"La Palma",
  "el-cerrito":"El Cerrito",
  "el-centro":"El Centro",
  "el-monte":"El Monte",
  "el-segundo":"El Segundo",
  "el-cajon":"El Cajon",
  "del-mar":"Del Mar",
  "del-rey-oaks":"Del Rey Oaks",
  "san-leandro":"San Leandro",
  "san-pablo":"San Pablo",
  "san-ramon":"San Ramon",
  "san-anselmo":"San Anselmo",
  "san-rafael":"San Rafael",
  "san-dimas":"San Dimas",
  "san-fernando":"San Fernando",
  "san-gabriel":"San Gabriel",
  "san-marino":"San Marino",
  "san-jacinto":"San Jacinto",
  "san-clemente":"San Clemente",
  "san-juan-capistrano":"San Juan Capistrano",
  "san-juan-bautista":"San Juan Bautista",
  "san-bruno":"San Bruno",
  "san-carlos":"San Carlos",
  "san-mateo":"San Mateo",
  "san-jose":"San Jose",
  "san-francisco":"San Francisco",
  "san-diego":"San Diego",
  "san-marcos":"San Marcos",
  "san-bernardino":"San Bernardino",
  "san-luis-obispo":"San Luis Obispo",
  "san-joaquin-city":"San Joaquin",
  "south-lake-tahoe":"South Lake Tahoe",
  "south-san-francisco":"South San Francisco",
  "south-el-monte":"South El Monte",
  "south-gate":"South Gate",
  "south-pasadena":"South Pasadena",
  "east-palo-alto":"East Palo Alto",
  "west-covina":"West Covina",
  "west-hollywood":"West Hollywood",
  "west-sacramento":"West Sacramento",
  "half-moon-bay":"Half Moon Bay",
  "big-bear-lake":"Big Bear Lake",
  "diamond-bar":"Diamond Bar",
  "bell-gardens":"Bell Gardens",
  "baldwin-park":"Baldwin Park",
  "rolling-hills":"Rolling Hills",
  "rolling-hills-estates":"Rolling Hills Estates",
  "palos-verdes-estates":"Palos Verdes Estates",
  "rancho-palos-verdes":"Rancho Palos Verdes",
  "rancho-cordova":"Rancho Cordova",
  "rancho-cucamonga":"Rancho Cucamonga",
  "rancho-mirage":"Rancho Mirage",
  "rancho-santa-margarita":"Rancho Santa Margarita",
  "pico-rivera":"Pico Rivera",
  "santa-clarita":"Santa Clarita",
  "santa-fe-springs":"Santa Fe Springs",
  "santa-monica":"Santa Monica",
  "santa-ana":"Santa Ana",
  "santa-barbara":"Santa Barbara",
  "santa-maria":"Santa Maria",
  "santa-clara":"Santa Clara",
  "santa-cruz":"Santa Cruz",
  "santa-rosa":"Santa Rosa",
  "santa-paula":"Santa Paula",
  "sierra-madre":"Sierra Madre",
  "signal-hill":"Signal Hill",
  "temple-city":"Temple City",
  "citrus-heights":"Citrus Heights",
  "huntington-park":"Huntington Park",
  "huntington-beach":"Huntington Beach",
  "hawaiian-gardens":"Hawaiian Gardens",
  "hermosa-beach":"Hermosa Beach",
  "hidden-hills":"Hidden Hills",
  "manhattan-beach":"Manhattan Beach",
  "redondo-beach":"Redondo Beach",
  "newport-beach":"Newport Beach",
  "laguna-beach":"Laguna Beach",
  "laguna-hills":"Laguna Hills",
  "laguna-niguel":"Laguna Niguel",
  "laguna-woods":"Laguna Woods",
  "lake-forest":"Lake Forest",
  "lake-elsinore":"Lake Elsinore",
  "seal-beach":"Seal Beach",
  "villa-park":"Villa Park",
  "yorba-linda":"Yorba Linda",
  "buena-park":"Buena Park",
  "costa-mesa":"Costa Mesa",
  "dana-point":"Dana Point",
  "fountain-valley":"Fountain Valley",
  "garden-grove":"Garden Grove",
  "aliso-viejo":"Aliso Viejo",
  "mission-viejo":"Mission Viejo",
  "los-alamitos":"Los Alamitos",
  "los-altos":"Los Altos",
  "los-altos-hills":"Los Altos Hills",
  "los-gatos":"Los Gatos",
  "los-banos":"Los Banos",
  "los-angeles":"Los Angeles",
  "long-beach":"Long Beach",
  "monte-sereno":"Monte Sereno",
  "morgan-hill":"Morgan Hill",
  "mountain-view":"Mountain View",
  "palo-alto":"Palo Alto",
  "pacific-grove":"Pacific Grove",
  "indian-wells":"Indian Wells",
  "palm-desert":"Palm Desert",
  "palm-springs":"Palm Springs",
  "desert-hot-springs":"Desert Hot Springs",
  "cathedral-city":"Cathedral City",
  "canyon-lake":"Canyon Lake",
  "moreno-valley":"Moreno Valley",
  "jurupa-valley":"Jurupa Valley",
  "apple-valley":"Apple Valley",
  "chino-hills":"Chino Hills",
  "grand-terrace":"Grand Terrace",
  "loma-linda":"Loma Linda",
  "twentynine-palms":"Twentynine Palms",
  "yucca-valley":"Yucca Valley",
  "chula-vista":"Chula Vista",
  "imperial-beach":"Imperial Beach",
  "lemon-grove":"Lemon Grove",
  "national-city":"National City",
  "solana-beach":"Solana Beach",
  "portola-valley":"Portola Valley",
  "redwood-city":"Redwood City",
  "foster-city":"Foster City",
  "daly-city":"Daly City",
  "corte-madera":"Corte Madera",
  "mill-valley":"Mill Valley",
  "carmel-by-the-sea":"Carmel-by-the-Sea",
  "king-city":"King City",
  "sand-city":"Sand City",
  "american-canyon":"American Canyon",
  "grass-valley":"Grass Valley",
  "nevada-city":"Nevada City",
  "crescent-city":"Crescent City",
  "mammoth-lakes":"Mammoth Lakes",
  "angels-camp":"Angels Camp",
  "amador-city":"Amador City",
  "sutter-creek":"Sutter Creek",
  "blue-lake":"Blue Lake",
  "rio-dell":"Rio Dell",
  "orange-cove":"Orange Cove",
  "dos-palos":"Dos Palos",
  "california-city":"California City",
  "shasta-lake":"Shasta Lake",
  "mount-shasta":"Mount Shasta",
  "fort-jones":"Fort Jones",
  "fort-bragg":"Fort Bragg",
  "point-arena":"Point Arena",
  "rio-vista":"Rio Vista",
  "suisun-city":"Suisun City",
  "rohnert-park":"Rohnert Park",
  "live-oak":"Live Oak",
  "yuba-city":"Yuba City",
  "red-bluff":"Red Bluff",
  "port-hueneme":"Port Hueneme",
  "simi-valley":"Simi Valley",
  "thousand-oaks":"Thousand Oaks",
  "scotts-valley":"Scotts Valley",
  "elk-grove":"Elk Grove",
  "grover-beach":"Grover Beach",
  "morro-bay":"Morro Bay",
  "pismo-beach":"Pismo Beach",
  "arroyo-grande":"Arroyo Grande",
  "pleasant-hill":"Pleasant Hill",
  "walnut-creek":"Walnut Creek",
  "agoura-hills":"Agoura Hills",
  "culver-city":"Culver City",
  "westlake-village":"Westlake Village"
};

// Convert city slug to display name
export function cityDisplayName(slug){
  if(!slug)return "";
  if(CITY_NAMES[slug])return CITY_NAMES[slug];
  // Default: capitalize each word
  return slug.split("-").map(function(w){return w.charAt(0).toUpperCase()+w.slice(1);}).join(" ");
}

// Get all city slugs (for sitemap generation)
export function getAllCitySlugs(){
  return Object.keys(CITY_TO_COUNTY);
}

// ═══ MAIN ═══
export default function CityPage(){
  var { citySlug } = useParams();
  var slug = citySlug || "";
  var countyKey = CITY_TO_COUNTY[slug] || "merced";
  var name = cityDisplayName(slug);
  return <CountyLandingPage county={countyKey} cityName={name} citySlug={slug} />;
}
