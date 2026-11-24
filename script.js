import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { gsap } from "gsap";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
const formatINR = value => new Intl.NumberFormat("en-IN").format(value);
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const sceneState = {
  progress: 0,
  velocity: 0,
  pointer: new THREE.Vector2(.5, .5),
  pointerWorld: new THREE.Vector2(),
  warp: 0,
  isWarped: false,
  selectedPortal: "42",
  composer: null,
  bloomPass: null,
  liquidPass: null,
  performanceLevel: 0,
  performanceSampleStart: 0,
  performanceSampleFrames: 0,
  waterUniforms: [],
  camera: null,
  cameraTarget: new THREE.Vector3(0, 40, 0),
  baseCamera: new THREE.Vector3(),
  baseTarget: new THREE.Vector3(),
  cameraSpline: null,
  targetSpline: null,
  hotel: null,
  floorLevels: [],
  elevator: null,
  car: null,
  carWheels: [],
  carPath: null,
  carProgress: 0,
  steam: null,
  sparkles: null,
  road: null,
  time: 0,
  renderer: null,
  scene: null,
  vehicleRenderer: null,
  vehicleScene: null,
  vehicleCamera: null,
  vehicleModel: null,
  vehicleDisplayModel: null,
  hotelModelActive: false,
  activeHotel: null,
  vehicleRemoteModel: false,
  vehicleYaw: 0,
  vehicleTargetYaw: 0,
  vehiclePitch: 0,
  vehicleTargetPitch: 0,
  vehicleDragging: false,
  vehicleDragX: 0,
  vehicleDragYaw: 0,
  vehicleDragPitch: 0,
  selectedVehicle: "bentley",
  selectedPackage: "weekend",
  hotelPage: 0,
  width: 0,
  height: 0
};
const chapterOrder = ["cover", "philosophy", "architecture", "suites", "hotels", "fleet", "concierge"];
const chapterProgress = { cover: 0, philosophy: .13, architecture: .3, suites: .76, hotels: .53, fleet: .99, concierge: .53 };
const chapterNames = ["THE ARRIVAL", "THE HOUSE", "THE ESTATE", "THE SUITES", "HYDERABAD HOTELS", "THE MOTOR VAULT", "THE CONCIERGE"];
let currentPage = "opening";
let pageTransitionLocked = false;
let manifestoTween;
let hotelFilterTimer;

const portalSpecs = {
  "42": {
    label: "LEVEL 42 — SKY DECK", title: "THE INFINITY<br>WATERLINE.", short: "INFINITY POOL",
    description: "A 14-metre glass-bottom pool held beyond the building line. Heated to 29°C, with an open view over Hyderabad’s night horizon.",
    elevation: "540 FT / 165 M", area: "4,200 SQ.FT", material: "LOW-IRON GLASS / BRONZE", tariff: "₹ 1,85,000 / NIGHT",
    drawerElevation: "540 FT", drawerArea: "4,200 SQ.FT", drawerTariff: "₹ 1,85,000 / NIGHT",
    camera: [0, 164, 33], target: [0, 158, 10], chapter: 4
  },
  "38": {
    label: "LEVEL 38 — ROYAL PENTHOUSE", title: "A PRIVATE<br>ROYAL RESIDENCE.", short: "ROYAL PENTHOUSE",
    description: "A full-floor 6,800 sq.ft residence with private plunge pool, Italian travertine bathhouse and 360° views across Hussain Sagar.",
    elevation: "490 FT / 149 M", area: "6,800 SQ.FT", material: "TRAVERTINE / BRONZE / GLASS", tariff: "₹ 3,40,000 / NIGHT",
    drawerElevation: "490 FT", drawerArea: "6,800 SQ.FT", drawerTariff: "₹ 3,40,000 / NIGHT",
    camera: [13, 146, 29], target: [0, 145, 0], chapter: 4
  },
  "24": {
    label: "LEVEL 24 — GOLCONDA", title: "DINNER ABOVE<br>THE DECCAN.", short: "SKY CONSERVATORY",
    description: "A cantilevered conservatory with a private Deccan tasting table, candlelit wine vault and a suspended architectural tree.",
    elevation: "310 FT / 94 M", area: "3,600 SQ.FT", material: "LOW-IRON GLASS / BASALT", tariff: "₹ 1,25,000 / EVENING",
    drawerElevation: "310 FT", drawerArea: "3,600 SQ.FT", drawerTariff: "₹ 1,25,000 / EVENING",
    camera: [14, 94, 31], target: [3, 92, 0], chapter: 3
  },
  "4": {
    label: "LEVEL 04 — BASALT WELLNESS", title: "A SLOWER<br>FORM OF LUXURY.", short: "BASALT SPA",
    description: "An 18,000 sq.ft thermal sanctuary of carved basalt, three hydrotherapy pools, Himalayan salt rooms and candlelit steam gardens.",
    elevation: "50 FT / 15 M", area: "18,000 SQ.FT", material: "DECCAN BASALT / WATER", tariff: "₹ 68,000 / RITUAL",
    drawerElevation: "50 FT", drawerArea: "18,000 SQ.FT", drawerTariff: "₹ 68,000 / RITUAL",
    camera: [15, 17, 29], target: [0, 15, 0], chapter: 2
  },
  "1": {
    label: "LEVEL 01 — THE GRAND ARRIVAL", title: "ARRIVE INTO<br>THE NIZAM ATRIUM.", short: "GRAND ATRIUM",
    description: "A triple-height travertine arrival hall, a three-tier crystal chandelier, a private reception monolith and biometric lift access.",
    elevation: "12 FT / 4 M", area: "9,500 SQ.FT", material: "ITALIAN TRAVERTINE / GOLD", tariff: "PRIVATE ACCESS",
    drawerElevation: "12 FT", drawerArea: "9,500 SQ.FT", drawerTariff: "PRIVATE ACCESS",
    camera: [12, 9, 29], target: [0, 8, 0], chapter: 2
  },
  b2: {
    label: "BASEMENT B2 — MOTOR VAULT", title: "THE NIGHT<br>AWAITS BELOW.", short: "SUPERCAR VAULT",
    description: "A biometric motor gallery with a three-car turntable, private chauffeur staging and a direct departure route to Hyderabad’s Outer Ring Road.",
    elevation: "−24 FT / −7 M", area: "12,000 SQ.FT", material: "BRUSHED BASALT / STEEL", tariff: "₹ 2,40,000 / ARRIVAL",
    drawerElevation: "−24 FT", drawerArea: "12,000 SQ.FT", drawerTariff: "₹ 2,40,000 / ARRIVAL",
    camera: [12, -3, 28], target: [0, -7, 0], chapter: 5
  },
  orr: {
    label: "OUTER RING ROAD — MIDNIGHT", title: "THE ROAD<br>IS YOURS.", short: "ORR HIGHWAY DRIVE",
    description: "A private supercar departure from the motor vault to the open sweep of the Outer Ring Road. Hyderabad, after midnight, in motion.",
    elevation: "CITY LEVEL", area: "158 KM ORR", material: "WET ASPHALT / CARBON", tariff: "₹ 4,35,000 / DRIVE",
    drawerElevation: "CITY LEVEL", drawerArea: "158 KM ORR", drawerTariff: "₹ 4,35,000 / DRIVE",
    camera: [-33, 11, 57], target: [-3, 2, 15], chapter: 0
  }
};

const fleetOffers = {
  weekend: { title: "THE NIZAM ROYAL WEEKEND", price: 485000, label: "The Nizam Royal Weekend" },
  residency: { title: "HITEC SKY RESIDENCY", price: 240000, label: "HITEC Executive Sky Residency" },
  midnight: { title: "MIDNIGHT ORR ESCAPE", price: 675000, label: "Midnight ORR Supercar Escape" }
};

const hotelPhotos = {
  falaknuma: { image: "assets/hotels/falaknuma-palace-04.jpg", title: "Falaknuma Palace 04.jpg", artist: "Bernard Gagnon", license: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Falaknuma_Palace_04.jpg", note: "Taj Falaknuma Palace, Hyderabad" },
  tajKrishna: { image: "assets/hotels/taj-krishna.jpg", title: "Taj Krishna hotel in hyderabad.jpg", artist: "Sajeev0101", license: "CC BY-SA 3.0", source: "https://commons.wikimedia.org/wiki/File:Taj_Krishna_hotel_in_hyderabad.jpg", note: "Taj Krishna, Hyderabad" },
  itcKohenur: { image: "assets/hotels/itc-kohenur.jpg", title: "ITC Kohenur.jpg", artist: "Mohammad Anees Qamar", license: "CC0", source: "https://commons.wikimedia.org/wiki/File:ITC_Kohenur.jpg", note: "ITC Kohenur, Hyderabad" },
  sheraton: { image: "assets/hotels/sheraton-hyderabad.jpg", title: "Sheraton, Hyderabad.jpg", artist: "Wasiul Bahar", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Sheraton,_Hyderabad.jpg", note: "Sheraton Hyderabad" },
  hyattGachibowli: { image: "assets/hotels/hyatt-gachibowli.jpg", title: "Hyatt Hotel Hyderabad, at Gachibowli in 2024 14.jpg", artist: "Tarunsamanta", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Hyatt_Hotel_Hyderabad,_at_Gachibowli_in_2024_14.jpg", note: "Hyatt Hyderabad Gachibowli" }
};
const representativeHotelPhotos = [
  "assets/hotels/hotel-atlas-01.jpg", "assets/hotels/hotel-atlas-02.jpg", "assets/hotels/hotel-atlas-03.jpg",
  "assets/hotels/hotel-atlas-04.jpg", "assets/hotels/hotel-atlas-05.jpg", "assets/hotels/hotel-atlas-06.jpg",
  "assets/hotels/hotel-atlas-07.jpg", "assets/hotels/hotel-atlas-08.jpg", "assets/hotels/hotel-atlas-09.jpg",
  "assets/hotels/hotel-atlas-10.jpg", "assets/hotels/hotel-atlas-11.jpg", "assets/hotels/hotel-atlas-12.jpg",
  "assets/hotels/hotel-atlas-13.jpg", "assets/hotels/hotel-atlas-14.jpg", "assets/hotels/hotel-atlas-15.jpg",
  "assets/hotels/hotel-atlas-16.jpg", "assets/hotels/hotel-atlas-17.jpg", "assets/hotels/hotel-atlas-18.jpg"
].map(image => ({
  image,
  title: "Representative luxury-hotel photograph",
  artist: "Unsplash contributors",
  license: "Unsplash License",
  source: "https://unsplash.com/license",
  note: "Representative hotel image — not the named property"
}));
const hotelListings = [
  { name: "The Nizam Sky & Palace", area: "Banjara Hills", style: "FEATURED CONCEPT / PRIVATE SKY ESTATE", site: "#page-architecture", page: "architecture", photo: representativeHotelPhotos[0] },
  { name: "Taj Falaknuma Palace", area: "Old City", style: "HERITAGE PALACE", site: "https://www.tajhotels.com/en-in/hotels/taj-falaknuma-palace-hyderabad", photo: hotelPhotos.falaknuma },
  { name: "Taj Krishna", area: "Banjara Hills", style: "GRAND CITY HOTEL", site: "https://www.tajhotels.com/en-in/hotels/taj-krishna-hyderabad", photo: hotelPhotos.tajKrishna },
  { name: "Taj Deccan", area: "Banjara Hills", style: "CONTEMPORARY CLASSIC", site: "https://www.tajhotels.com/en-in/hotels/taj-deccan-hyderabad", photo: representativeHotelPhotos[0] },
  { name: "Park Hyatt Hyderabad", area: "Banjara Hills", style: "DESIGN-LED LUXURY", site: "https://www.hyatt.com/park-hyatt/en-US/hydph-park-hyatt-hyderabad", photo: representativeHotelPhotos[1] },
  { name: "ITC Kohenur", area: "HITEC City", style: "THE LUXURY COLLECTION", site: "https://www.itchotels.com/in/en/itckohenur-hyderabad", photo: hotelPhotos.itcKohenur },
  { name: "Trident Hyderabad", area: "HITEC City", style: "BUSINESS & LEISURE", site: "https://www.tridenthotels.com/hotels-in-hyderabad", photo: representativeHotelPhotos[3] },
  { name: "The Westin Hyderabad Mindspace", area: "HITEC City", style: "URBAN RESORT", site: "https://www.marriott.com/en-us/hotels/hydwi-the-westin-hyderabad-mindspace/overview/", photo: representativeHotelPhotos[2] },
  { name: "Sheraton Hyderabad Hotel", area: "Gachibowli", style: "FINANCIAL DISTRICT", site: "https://www.marriott.com/en-us/hotels/hydsi-sheraton-hyderabad-hotel/overview/", photo: hotelPhotos.sheraton },
  { name: "Hyatt Hyderabad Gachibowli", area: "Gachibowli", style: "GARDEN-CITY RETREAT", site: "https://www.hyatt.com/en-US/hotel/india/hyatt-hyderabad-gachibowli/hydhy", photo: hotelPhotos.hyattGachibowli },
  { name: "Le Méridien Hyderabad", area: "Gachibowli", style: "CONTEMPORARY DESIGN", site: "https://www.marriott.com/en-us/hotels/hydmd-le-meridien-hyderabad/overview/", photo: representativeHotelPhotos[3] },
  { name: "Novotel Hyderabad Convention Centre", area: "HITEC City", style: "CONVENTION & RESORT", site: "https://all.accor.com/hotel/6329/index.en.shtml", photo: representativeHotelPhotos[4] },
  { name: "Radisson Blu Plaza Hotel Hyderabad Banjara Hills", area: "Banjara Hills", style: "CITY-CENTRE LUXURY", site: "https://www.radissonhotels.com/en-us/hotels/radisson-blu-hyderabad-banjara-hills", photo: representativeHotelPhotos[5] },
  { name: "Hyderabad Marriott Hotel & Convention Centre", area: "Other Hyderabad", style: "LAKEFRONT LANDMARK", site: "https://www.marriott.com/en-us/hotels/hydmc-hyderabad-marriott-hotel-and-convention-centre/overview/", photo: representativeHotelPhotos[6] },
  { name: "Vivanta Hyderabad, Begumpet", area: "Begumpet", style: "BOUTIQUE CITY STAY", site: "https://www.vivantahotels.com/en-in/hotels/vivanta-hyderabad-begumpet", photo: representativeHotelPhotos[7] },
  { name: "The Golkonda Hotel", area: "Other Hyderabad", style: "DECCAN HOSPITALITY", site: "https://www.thegolkondahotel.com/", photo: representativeHotelPhotos[8] },
  { name: "Mercure Hyderabad KCP", area: "Banjara Hills", style: "BOUTIQUE CITY HOTEL", site: "https://all.accor.com/hotel/6586/index.en.shtml", photo: representativeHotelPhotos[9] },
  { name: "Avasa Hotel", area: "HITEC City", style: "DESIGN-DRIVEN STAY", site: "https://www.avasahotels.com/", photo: representativeHotelPhotos[10] },
  { name: "Hyatt Place Hyderabad/Banjara Hills", area: "Banjara Hills", style: "MODERN CITY RETREAT", site: "https://www.hyatt.com/en-US/hotel/india/hyatt-place-hyderabad-banjara-hills/hydzb", photo: representativeHotelPhotos[11] },
  { name: "Fairfield by Marriott Hyderabad Gachibowli", area: "Gachibowli", style: "BUSINESS-CITY ADDRESS", site: "https://www.marriott.com/en-us/hotels/hydfi-fairfield-hyderabad-gachibowli/overview/", photo: representativeHotelPhotos[12] },
  { name: "Daspalla Hyderabad", area: "Other Hyderabad", style: "JUBILEE HILLS CLASSIC", site: "https://www.daspallahotels.com/", photo: representativeHotelPhotos[13] },
  { name: "Novotel Hyderabad Airport", area: "Other Hyderabad", style: "AIRPORT RESORT", site: "https://all.accor.com/hotel/6637/index.en.shtml", photo: representativeHotelPhotos[14] },
  { name: "The Park Hyderabad", area: "Other Hyderabad", style: "DESIGN HOTEL / SOMAJIGUDA", site: "https://www.theparkhotels.com/hyderabad", photo: representativeHotelPhotos[15] },
  { name: "Lemon Tree Premier, HITEC City", area: "HITEC City", style: "URBAN BUSINESS HOTEL", site: "https://www.lemontreehotels.com/lemon-tree-premier/hotel/hyderabad/hitec-city-hyderabad", photo: representativeHotelPhotos[16] },
  { name: "Fortune Park Vallabha", area: "Banjara Hills", style: "CITY-CENTRE ADDRESS", site: "https://www.itchotels.com/in/en/fortuneparkvallabha-hyderabad", photo: representativeHotelPhotos[17] }
];

const vehicleCatalog = [
  { id: "bentley", name: "Bentley Continental GT", class: "01 / GRAND TOURER", power: "V8", type: "GRAND TOURER", color: 0x879a91, copy: "The long-distance grand tourer, composed for a private Hyderabad arrival and the open sweep of the Outer Ring Road.", image: "bentley-continental-gt.jpg", photoTitle: "Bentley Continental GT (4th gen.) IMG 0553.jpg", artist: "Alexander-93", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Bentley_Continental_GT_(4th_gen.)_IMG_0553.jpg" },
  { id: "ghost", name: "Rolls-Royce Ghost", class: "02 / PRIVATE SALOON", power: "V12", type: "LUXURY SALOON", color: 0xb9b5a8, copy: "A quiet, hand-finished arrival with the presence of a private residence and the poise of a grand motor car.", image: "rolls-royce-ghost.jpg", photoTitle: "Monaco-Rolls-Royce-4071031.jpg", artist: "ermell", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Monaco-Rolls-Royce-4071031.jpg" },
  { id: "ferrari296", name: "Ferrari 296 GTB", class: "03 / MID-ENGINE BERLINETTA", power: "V6 HYBRID", type: "BERLINETTA", color: 0xb51427, copy: "A sculpted hybrid berlinetta for a focused, after-dark drive beyond the city lights.", image: "ferrari-296-gtb.jpg", photoTitle: "Ferrari 296 GTB 1X7A6377.jpg", artist: "Alexander Migl", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Ferrari_296_GTB_1X7A6377.jpg" },
  { id: "huracan", name: "Lamborghini Huracán EVO", class: "04 / SUPERCAR", power: "V10", type: "SUPERCAR", color: 0xcaa52d, copy: "A naturally aspirated V10 and an unmistakable silhouette, selected for the midnight run.", image: "lamborghini-huracan-evo.jpg", photoTitle: "Lamborghini Huracan Evo, GIMS 2019, Le Grand-Saconnex (GIMS1010).jpg", artist: "Matti Blume", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Lamborghini_Huracan_Evo,_GIMS_2019,_Le_Grand-Saconnex_(GIMS1010).jpg" },
  { id: "mclaren720", name: "McLaren 720S", class: "05 / SUPERCAR", power: "V8 TWIN-TURBO", type: "SUPERCAR", color: 0xd8692a, copy: "Carbon-fibre engineering, dihedral doors and a clean, purposeful line from the city to the ORR.", image: "mclaren-720s.jpg", photoTitle: "Maclaren 720S PA280972-PSD.jpg", artist: "Ermell", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Maclaren_720S_PA280972-PSD.jpg" },
  { id: "porsche911", name: "Porsche 911 Carrera 4S", class: "06 / ALL-WHEEL-DRIVE COUPÉ", power: "FLAT-SIX", type: "SPORTS COUPÉ", color: 0x547b9d, copy: "A modern 911 with all-weather composure and the unmistakable proportions of a true sports-car icon.", image: "porsche-911-carrera-4s.jpg", photoTitle: "2013 Porsche 911 Carrera 4S (991) (9626546987).jpg", artist: "David Villarreal Fernández", license: "CC BY-SA 2.0", source: "https://commons.wikimedia.org/wiki/File:2013_Porsche_911_Carrera_4S_(991)_(9626546987).jpg" },
  { id: "amggt", name: "Mercedes-AMG GT", class: "07 / GRAND TOURER", power: "V8 BITURBO", type: "GRAND TOURER", color: 0x515e75, copy: "A front-mid-engine performance coupé, blending grand-touring restraint with unmistakable AMG character.", image: "mercedes-amg-gt.jpg", photoTitle: "Mercedes-AMG C192 1X7A0832.jpg", artist: "Alexander-93", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Mercedes-AMG_C192_1X7A0832.jpg" },
  { id: "db12", name: "Aston Martin DB12", class: "08 / SUPER TOURER", power: "V8 TWIN-TURBO", type: "SUPER TOURER", color: 0x245d4a, copy: "A contemporary British super tourer with a tailored cabin and an elegant, long-hood profile.", image: "aston-martin-db12.jpg", photoTitle: "Aston Martin DB12 1X7A1921.jpg", artist: "Alexander-93", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Aston_Martin_DB12_1X7A1921.jpg" },
  { id: "mc20", name: "Maserati MC20", class: "09 / MID-ENGINE COUPÉ", power: "V6 NETTUNO", type: "SUPERCAR", color: 0x397bb0, copy: "The Nettuno-powered Italian supercar: clean surfaces, sculptural doors and a quiet sense of occasion.", image: "maserati-mc20.jpg", photoTitle: "Maserati MC20 Auto Zuerich 2021 IMG 0419.jpg", artist: "Alexander Migl", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Maserati_MC20_Auto_Zuerich_2021_IMG_0419.jpg" },
  { id: "audiR8", name: "Audi R8 V10", class: "10 / MID-ENGINE COUPÉ", power: "V10", type: "SUPERCAR", color: 0x999d9e, copy: "A naturally aspirated V10, precise all-wheel-drive balance and a cockpit built around the drive.", image: "audi-r8-v10.jpg", photoTitle: "2018 Audi R8 Coupe V10 plus Front.jpg", artist: "Vauxford", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:2018_Audi_R8_Coupe_V10_plus_Front.jpg" },
  { id: "bugatti", name: "Bugatti Chiron", class: "11 / HYPER GT", power: "W16 QUAD-TURBO", type: "HYPER GT", color: 0x315b89, copy: "A landmark hyper-GT whose every proportion is engineered around effortless, high-speed composure.", image: "bugatti-chiron.jpg", photoTitle: "Bugatti Chiron, GIMS 2018, Le Grand-Saconnex (1X7A1765).jpg", artist: "Matti Blume", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Bugatti_Chiron,_GIMS_2018,_Le_Grand-Saconnex_(1X7A1765).jpg" },
  { id: "jesko", name: "Koenigsegg Jesko", class: "12 / HYPERCAR", power: "V8 TWIN-TURBO", type: "HYPERCAR", color: 0xc9c3aa, copy: "A Swedish hypercar built around advanced aerodynamics, extreme power and uncompromising detail.", image: "koenigsegg-jesko.jpg", photoTitle: "Koenigsegg Jesko, GIMS 2019, Le Grand-Saconnex (GIMS1047).jpg", artist: "Matti Blume", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Koenigsegg_Jesko,_GIMS_2019,_Le_Grand-Saconnex_(GIMS1047).jpg" },
  { id: "huayra", name: "Pagani Huayra", class: "13 / HAND-BUILT HYPERCAR", power: "V12 TWIN-TURBO", type: "HYPERCAR", color: 0x263e5b, copy: "An artisanal Italian creation where exposed engineering, flowing forms and hand-finished materials meet.", image: "pagani-huayra.jpg", photoTitle: "Pagani Huayra - Flickr - andrewbasterfield.jpg", artist: "Andrew Basterfield", license: "CC BY-SA 2.0", source: "https://commons.wikimedia.org/wiki/File:Pagani_Huayra_-_Flickr_-_andrewbasterfield.jpg" },
  { id: "lexusLC", name: "Lexus LC 500", class: "14 / LUXURY COUPÉ", power: "V8", type: "GRAND TOURER", color: 0xddd8c9, copy: "A Japanese luxury coupé with a naturally aspirated V8, dramatic surfacing and a quietly crafted cabin.", image: "lexus-lc-500.jpg", photoTitle: "Lexus LC 500 URZ100 White Nova Glass Flake 01.jpg", artist: "Ethan Llamas", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Lexus_LC_500_URZ100_White_Nova_Glass_Flake_01.jpg" },
  { id: "rangeRover", name: "Range Rover SV Coupé", class: "15 / BESPOKE SUV", power: "V8", type: "LUXURY SUV", color: 0x495544, copy: "A rare two-door interpretation of Range Rover luxury, presented as a design-led collector's study.", image: "range-rover-sv-coupe.jpg", photoTitle: "Range Rover SV Coupe Genf 2018.jpg", artist: "Alexander Migl", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Range_Rover_SV_Coupe_Genf_2018.jpg" },
  { id: "gclass", name: "Mercedes-Benz G-Class", class: "16 / LUXURY 4×4", power: "V8", type: "LUXURY SUV", color: 0x5c655c, copy: "An unmistakable luxury 4×4 with a commanding upright stance and a meticulously finished interior.", image: "mercedes-g-class.jpg", photoTitle: "Mercedes-Benz G-Class Prototyp IAA 2023 1X7A0483.jpg", artist: "Alexander-93", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Mercedes-Benz_G-Class_Prototyp_IAA_2023_1X7A0483.jpg" },
  { id: "bentayga", name: "Bentley Bentayga S", class: "17 / PERFORMANCE SUV", power: "V8", type: "LUXURY SUV", color: 0x466057, copy: "A performance-minded grand touring SUV, bringing Bentley craftsmanship to a longer Hyderabad itinerary.", image: "bentley-bentayga-s.jpg", photoTitle: "Bentley Bentayga S 1X7A6397.jpg", artist: "Alexander Migl", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Bentley_Bentayga_S_1X7A6397.jpg" },
  { id: "romaSpider", name: "Ferrari Roma Spider", class: "18 / OPEN-TOP GRAND TOURER", power: "V8 TWIN-TURBO", type: "SPIDER", color: 0x8e1824, copy: "An open-top Ferrari with a relaxed grand-touring character and a clean, contemporary silhouette.", image: "ferrari-roma-spider.jpg", photoTitle: "Ferrari Roma Spider IMG 9546.jpg", artist: "Alexander-93", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Ferrari_Roma_Spider_IMG_9546.jpg" },
  { id: "aventador", name: "Lamborghini Aventador SVJ Roadster", class: "19 / OPEN-TOP SUPERCAR", power: "V12", type: "ROADSTER", color: 0xabc343, copy: "A limited-series V12 roadster with theatrical proportions and a design that needs no introduction.", image: "lamborghini-aventador-svj.jpg", photoTitle: "Lamborghini Aventador SVJ Roadster IMG 9580.jpg", artist: "Alexander-93", license: "CC BY-SA 4.0", source: "https://commons.wikimedia.org/wiki/File:Lamborghini_Aventador_SVJ_Roadster_IMG_9580.jpg" },
  { id: "taycan", name: "Porsche Taycan Turbo S", class: "20 / ELECTRIC GRAND TOURER", power: "DUAL-MOTOR EV", type: "ELECTRIC GT", color: 0x496b7b, copy: "All-electric Porsche performance, pairing rapid response with everyday refinement and a calm long-distance cabin.", image: "porsche-taycan-turbo-s.jpg", photoTitle: "Porsche Taycan Turbo S (48769113873) (cropped).jpg", artist: "Rutger van der Maar", license: "CC BY 2.0", source: "https://commons.wikimedia.org/wiki/File:Porsche_Taycan_Turbo_S_(48769113873)_(cropped).jpg" },
  { id: "bmwM4", name: "BMW M4 Competition", class: "21 / M PERFORMANCE COUPÉ", power: "3.0L TWIN-TURBO I6", type: "PERFORMANCE COUPÉ", color: 0x2375a8, copy: "A modern M car with a turbocharged inline-six, rear-biased performance character and a sharply sculpted two-door profile.", image: "", imageUrl: "https://media.sketchfab.com/models/c59ed0080e844e0d98f6c02190e8b0f2/thumbnails/417082e349784b30b9b703ae923b69be/0b259dd03c344afa86be64c8403e073e.jpeg", photoTitle: "2021 BMW M4 Competition — 3D model preview", artist: "Nazh Design", license: "CC BY 4.0", source: "https://sketchfab.com/3d-models/none-c59ed0080e844e0d98f6c02190e8b0f2" }
];

const vehicleModelAssets = {
  bentley: { uid: "2bb8aff1bbc54e9c9e59557f0484162d", title: "Bentley Continental GT V8 (2013)", creator: "Mona x Supercars" },
  ghost: { uid: "1f614e803fc24946b83bdc2dd9926d62", title: "Rolls-Royce Ghost", creator: "Kurojishi" },
  ferrari296: { uid: "c5a48523361440bf8460951f510bb5c4", title: "Ferrari 296 GTB (2022)", creator: "007" },
  huracan: { uid: "12956518b5084ee693c028d49d3eed0e", title: "Lamborghini Huracán EVO Spyder (2019)", creator: "Ddiaz Design" },
  mclaren720: { uid: "e820cf40821940bcafebf24bec693d16", title: "McLaren 720S Spider", creator: "Mpgs.studio3DModels" },
  porsche911: { uid: "4cef7c1e22ab40fd937507eae9a62cd8", title: "Porsche 911 Carrera S (2015)", creator: "chiwei" },
  amggt: { uid: "4d9e0a8cf9a844149bf6630da83eb97b", title: "Mercedes-Benz AMG GT (2015)", creator: "MMC Works" },
  db12: { uid: "f603d93210c04f2b8a8308afaa9da87d", title: "Aston Martin DB12 (2024)", creator: "tonielpro520" },
  mc20: { uid: "5fbd6778b93446a2920f08e551c8f4b6", title: "Maserati MC20", creator: "Jumping Jax" },
  audiR8: { uid: "aeade797240b41a98284b8de21a07fda", title: "Audi R8 V10", creator: "trystyrobot" },
  bugatti: { uid: "b28585c3e5bc4fc78db39d80fcd6b604", title: "Bugatti Chiron", creator: "Kevin" },
  jesko: { uid: "bba699ac8a1545fbacbc91c8dcbf5762", title: "Koenigsegg Jesko Absolut", creator: "Endercraft17" },
  huayra: { uid: "1dd0905daca245cb865a9e5affd61e4b", title: "Pagani Huayra R", creator: "Kevin" },
  lexusLC: { uid: "3f6118da005a457a9ce6d737e5d1e37d", title: "Lexus LC 500", creator: "Socksthecat" },
  rangeRover: { uid: "b75f47873c5b4ab8bc839525a32b3fda", title: "Land Rover Range Rover SV Coupé", creator: "Mona x Supercars" },
  gclass: { uid: "1a2a52b16cad4e618af347461817895c", title: "Mercedes-Benz G-Class W463", creator: "Lexyc16" },
  bentayga: { uid: "a24ffb3f7fee449fb18d58cd430f38a9", title: "Bentley Bentayga", creator: "amogusstrikesback2" },
  romaSpider: { uid: "c2a03739b66a4f8ea72e4299338ae443", title: "Ferrari Roma Spider", creator: "MimmoLagonigro" },
  aventador: { uid: "784e4656aca649cca55d6b18740a19b2", title: "Lamborghini Aventador SVJ", creator: "SDC PERFORMANCE" },
  taycan: { uid: "c6004141452e4d3ab048bf0fee52666d", title: "Porsche Taycan", creator: "Mikhail Hamanovich" },
  bmwM4: { uid: "c59ed0080e844e0d98f6c02190e8b0f2", title: "BMW M4 Competition (2021)", creator: "Nazh Design" }
};

class TextureFoundry {
  constructor(renderer) {
    this.renderer = renderer;
    this.seed = 7331;
    this.facade = this.createFacade();
    this.facadeBump = this.createFacadeBump();
    this.basalt = this.createStone("#11191d", "#46535a", "basalt");
    this.travertine = this.createStone("#8d826e", "#d0c3a6", "travertine");
    this.stoneBump = this.createStoneBump();
    this.asphalt = this.createAsphalt();
    this.asphaltRoughness = this.createAsphaltRoughness();
    this.helipad = this.createHelipad();
    this.blueprint = this.createBlueprint();
  }

  canvas() {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = 2048;
    return canvas;
  }

  random() {
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  texture(canvas, color = false, repeat = [1, 1]) {
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat[0], repeat[1]);
    texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    texture.generateMipmaps = true;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  createFacade() {
    const canvas = this.canvas();
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 2048, 0);
    gradient.addColorStop(0, "#261b0c");
    gradient.addColorStop(.24, "#493719");
    gradient.addColorStop(.5, "#171006");
    gradient.addColorStop(.74, "#66532d");
    gradient.addColorStop(1, "#24190a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 2048);
    for (let floor = 0; floor < 40; floor++) {
      const y = floor * 51.2;
      ctx.fillStyle = floor % 5 === 0 ? "rgba(226,184,89,.46)" : "rgba(255,226,154,.2)";
      ctx.fillRect(0, y, 2048, floor % 5 === 0 ? 5 : 2);
      for (let pane = 0; pane < 28; pane++) {
        const x = pane * 73.1 + 6;
        const lit = this.random() > .47;
        ctx.fillStyle = lit ? `rgba(255,${178 + Math.floor(this.random() * 65)},${110 + Math.floor(this.random() * 65)},${.24 + this.random() * .54})` : "rgba(12,8,3,.42)";
        ctx.fillRect(x, y + 7, 57, 37);
        ctx.fillStyle = "rgba(255,235,191,.16)";
        ctx.fillRect(x + 4, y + 10, 2, 30);
      }
    }
    for (let column = 0; column <= 28; column++) {
      ctx.fillStyle = column % 7 === 0 ? "rgba(255,210,111,.86)" : "rgba(255,226,154,.36)";
      ctx.fillRect(column * 73 - 1, 0, column % 7 === 0 ? 3 : 1, 2048);
    }
    return this.texture(canvas, true, [1.5, 6]);
  }

  createFacadeBump() {
    const canvas = this.canvas();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#777";
    ctx.fillRect(0, 0, 2048, 2048);
    for (let y = 0; y < 2048; y += 51.2) {
      ctx.fillStyle = "#c5c5c5";
      ctx.fillRect(0, y, 2048, 3);
    }
    for (let x = 0; x < 2048; x += 73) {
      ctx.fillStyle = "#555";
      ctx.fillRect(x, 0, 2, 2048);
    }
    return this.texture(canvas, false, [1.5, 6]);
  }

  createStone(base, highlight, kind) {
    const canvas = this.canvas();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 2048, 2048);
    for (let i = 0; i < 180; i++) {
      const x = this.random() * 2048;
      const y = this.random() * 2048;
      const radius = 30 + this.random() * 260;
      const shade = ctx.createRadialGradient(x, y, 0, x, y, radius);
      shade.addColorStop(0, `${highlight}55`);
      shade.addColorStop(1, `${base}00`);
      ctx.fillStyle = shade;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    if (kind === "travertine") {
      for (let i = 0; i < 140; i++) {
        const y = this.random() * 2048;
        ctx.beginPath();
        ctx.moveTo(0, y);
        for (let x = 0; x <= 2048; x += 64) ctx.lineTo(x, y + Math.sin(x * .008 + i) * (3 + this.random() * 10));
        ctx.strokeStyle = `rgba(54,44,31,${.04 + this.random() * .11})`;
        ctx.lineWidth = 1 + this.random() * 8;
        ctx.stroke();
      }
    } else {
      for (let i = 0; i < 280; i++) {
        const x = this.random() * 2048;
        const y = this.random() * 2048;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 100, y - 100, x - 100, y + 160, x + 280, y + 240);
        ctx.strokeStyle = `rgba(163,183,187,${.025 + this.random() * .1})`;
        ctx.lineWidth = 1 + this.random() * 3;
        ctx.stroke();
      }
    }
    for (let i = 0; i < 36000; i++) {
      const gray = Math.floor(90 + this.random() * 120);
      ctx.fillStyle = `rgba(${gray},${gray},${gray},${this.random() * .11})`;
      ctx.fillRect(this.random() * 2048, this.random() * 2048, 1.2, 1.2);
    }
    return this.texture(canvas, true, [2, 2]);
  }

  createStoneBump() {
    const canvas = this.canvas();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#808080";
    ctx.fillRect(0, 0, 2048, 2048);
    for (let i = 0; i < 220; i++) {
      ctx.beginPath();
      const y = this.random() * 2048;
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(550, y + this.random() * 40, 1200, y - this.random() * 40, 2048, y + this.random() * 70);
      ctx.strokeStyle = `rgba(${this.random() > .5 ? 210 : 70},${this.random() > .5 ? 210 : 70},${this.random() > .5 ? 210 : 70},.15)`;
      ctx.lineWidth = 1 + this.random() * 7;
      ctx.stroke();
    }
    return this.texture(canvas);
  }

  createAsphalt() {
    const canvas = this.canvas();
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 2048, 0);
    gradient.addColorStop(0, "#17130b");
    gradient.addColorStop(.48, "#332a18");
    gradient.addColorStop(1, "#0b0804");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2048, 2048);
    for (let i = 0; i < 105000; i++) {
      const a = .04 + this.random() * .18;
      ctx.fillStyle = `rgba(${this.random() > .5 ? 218 : 5},${this.random() > .5 ? 190 : 8},${this.random() > .5 ? 125 : 11},${a})`;
      ctx.fillRect(this.random() * 2048, this.random() * 2048, 1 + this.random() * 2, 1 + this.random() * 2);
    }
    ctx.setLineDash([95, 78]);
    ctx.lineWidth = 5;
    ctx.strokeStyle = "rgba(220,177,93,.83)";
    ctx.beginPath();
    ctx.moveTo(300, 0);
    ctx.lineTo(300, 2048);
    ctx.stroke();
    ctx.strokeStyle = "rgba(255,221,145,.9)";
    ctx.beginPath();
    ctx.moveTo(1748, 0);
    ctx.lineTo(1748, 2048);
    ctx.stroke();
    ctx.setLineDash([]);
    return this.texture(canvas, true, [1, 5]);
  }

  createAsphaltRoughness() {
    const canvas = this.canvas();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#585858";
    ctx.fillRect(0, 0, 2048, 2048);
    for (let i = 0; i < 120000; i++) {
      const tone = Math.floor(70 + this.random() * 150);
      ctx.fillStyle = `rgba(${tone},${tone},${tone},${.1 + this.random() * .3})`;
      ctx.fillRect(this.random() * 2048, this.random() * 2048, 1.5, 1.5);
    }
    return this.texture(canvas);
  }

  createHelipad() {
    const canvas = this.canvas();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#25292b";
    ctx.fillRect(0, 0, 2048, 2048);
    ctx.strokeStyle = "rgba(255,224,151,.24)";
    ctx.lineWidth = 3;
    for (let i = 0; i <= 32; i++) {
      const p = i * 64;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 2048); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(2048, p); ctx.stroke();
    }
    ctx.strokeStyle = "#dfd9c6";
    ctx.lineWidth = 18;
    ctx.beginPath(); ctx.arc(1024, 1024, 650, 0, Math.PI * 2); ctx.stroke();
    ctx.font = "700 680px Inter, Arial, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#f4dfaa"; ctx.fillText("H", 1024, 1030);
    ctx.font = "500 40px monospace";
    ctx.fillStyle = "#d3b16b"; ctx.fillText("NIZAM SKY / 540 FT", 1024, 1690);
    return this.texture(canvas, true);
  }

  createBlueprint() {
    const canvas = this.canvas();
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#0a0804";
    ctx.fillRect(0, 0, 2048, 2048);
    ctx.strokeStyle = "rgba(255,209,94,.22)";
    ctx.lineWidth = 1;
    for (let i = 0; i <= 64; i++) {
      const p = i * 32;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 2048); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(2048, p); ctx.stroke();
    }
    ctx.strokeStyle = "rgba(211,177,107,.8)";
    ctx.lineWidth = 5;
    ctx.strokeRect(240, 240, 1568, 1568);
    ctx.strokeRect(440, 440, 1168, 1168);
    ctx.fillStyle = "#d3b16b";
    ctx.font = "500 64px monospace";
    ctx.fillText("NIZAM SKY / SECTION 042", 320, 365);
    return this.texture(canvas, true);
  }
}

const WaterSurfaceShader = {
  uniforms: {
    uTime: { value: 0 },
    uScrollVelocity: { value: 0 },
    uColor: { value: new THREE.Color("#866323") },
    uDeepColor: { value: new THREE.Color("#130d05") }
  },
  vertexShader: `
    uniform float uTime;
    uniform float uScrollVelocity;
    varying vec2 vUv;
    varying vec3 vWorld;
    varying vec3 vNormalWorld;
    void main() {
      vUv = uv;
      vec3 p = position;
      float motion = clamp(abs(uScrollVelocity) * 0.045, 0.0, 0.9);
      float waveA = sin(p.x * 1.9 + uTime * 0.85) * 0.11;
      float waveB = cos(p.y * 2.45 - uTime * 0.61) * 0.075;
      float waveC = sin((p.x + p.y) * 3.1 + uTime * 0.44) * 0.035;
      p.z += waveA + waveB + waveC + motion * sin(p.x * 5.0 - uTime * 2.4) * 0.08;
      vec4 worldPosition = modelMatrix * vec4(p, 1.0);
      vWorld = worldPosition.xyz;
      vNormalWorld = normalize(mat3(modelMatrix) * vec3(-cos(p.x * 1.9 + uTime * .85) * .2, sin(p.y * 2.45 - uTime * .61) * .15, 1.0));
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uDeepColor;
    varying vec2 vUv;
    varying vec3 vWorld;
    varying vec3 vNormalWorld;
    void main() {
      vec3 n = normalize(vNormalWorld);
      vec3 viewDirection = normalize(cameraPosition - vWorld);
      float fresnel = pow(1.0 - max(dot(n, viewDirection), 0.0), 2.6);
      float causticA = sin(vUv.x * 57.0 + uTime * 1.1) * cos(vUv.y * 43.0 - uTime * .8);
      float causticB = sin((vUv.x + vUv.y) * 72.0 - uTime * .65);
      float caustics = smoothstep(.18, .92, causticA * causticB * .5 + .5);
      float ripple = sin(vUv.x * 35.0 + uTime) * sin(vUv.y * 29.0 - uTime * .72) * .045;
      vec3 color = mix(uDeepColor, uColor, .32 + fresnel * .58 + ripple);
      color += vec3(.62, .39, .1) * caustics * .32;
      color = mix(color, vec3(1.0, .8, .42), fresnel * .75);
      gl_FragColor = vec4(color, .88);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
};

const LiquidDistortionShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uVelocity: { value: 0 },
    uMouse: { value: new THREE.Vector2(.5, .5) },
    uWarp: { value: 0 },
    uResolution: { value: new THREE.Vector2(1, 1) }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uVelocity;
    uniform vec2 uMouse;
    uniform float uWarp;
    uniform vec2 uResolution;
    varying vec2 vUv;
    void main() {
      vec2 uv = vUv;
      float speed = clamp(abs(uVelocity) * .0018, 0.0, .026);
      float warp = clamp(uWarp, 0.0, 1.0);
      float radius = distance(uv, uMouse);
      float shock = sin(radius * 55.0 - uTime * 2.3) * exp(-radius * 5.0) * warp;
      float liquid = sin(uv.y * 18.0 + uTime * 1.5) * speed;
      uv.x += liquid + shock * .012;
      uv.y += cos(uv.x * 15.0 - uTime) * speed * .42 + shock * .008;
      float aberration = (speed * .55 + abs(shock) * .0035);
      vec4 red = texture2D(tDiffuse, uv + vec2(aberration, 0.0));
      vec4 green = texture2D(tDiffuse, uv);
      vec4 blue = texture2D(tDiffuse, uv - vec2(aberration, 0.0));
      gl_FragColor = vec4(red.r, green.g, blue.b, green.a);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `
};

function box(group, geometry, material, position, options = {}) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  mesh.castShadow = options.castShadow ?? false;
  mesh.receiveShadow = options.receiveShadow ?? false;
  if (options.rotation) mesh.rotation.set(...options.rotation);
  if (options.name) mesh.name = options.name;
  group.add(mesh);
  return mesh;
}

function tubeBetween(group, start, end, radius, material, radialSegments = 7) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = new THREE.Vector3().subVectors(b, a);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments), material);
  mesh.position.copy(a).add(b).multiplyScalar(.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(mesh);
  return mesh;
}

function buildBridge(scene, materials) {
  const bridge = new THREE.Group();
  scene.add(bridge);
  const road = box(bridge, new THREE.BoxGeometry(130, .72, 7), materials.bridgeDeck, [0, 1.5, 32], { castShadow: true });
  road.name = "Durgam Cheruvu cable bridge deck";
  for (const x of [-39, 39]) {
    const apex = [x, 30, 32];
    tubeBetween(bridge, [x - 5, 1.8, 32], apex, .34, materials.goldSteel, 10);
    tubeBetween(bridge, [x + 5, 1.8, 32], apex, .34, materials.goldSteel, 10);
    tubeBetween(bridge, [x - 5, 1.8, 32], [x + 5, 1.8, 32], .2, materials.goldSteel, 8);
    const beacon = new THREE.PointLight(0xffd36b, 19, 28, 2);
    beacon.position.set(x, 30, 32);
    bridge.add(beacon);
    const pylonLamp = new THREE.Mesh(new THREE.SphereGeometry(.43, 16, 16), materials.beaconCyan);
    pylonLamp.position.set(x, 30, 32);
    bridge.add(pylonLamp);
    for (let cable = -6; cable <= 6; cable++) {
      const deckX = x + cable * .95;
      tubeBetween(bridge, apex, [deckX, 2, 32], .035, cable % 2 ? materials.cyanCable : materials.goldCable, 5);
    }
  }
  for (let i = 0; i < 20; i++) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 8), i % 2 ? materials.beaconCyan : materials.beaconGold);
    lamp.position.set(-61 + i * 6.4, 2.05, 29.3);
    bridge.add(lamp);
  }
  const water = new THREE.Mesh(new THREE.PlaneGeometry(190, 62, 120, 48), new THREE.ShaderMaterial({
    ...WaterSurfaceShader,
    uniforms: THREE.UniformsUtils.clone(WaterSurfaceShader.uniforms),
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false
  }));
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -.25, 45);
  water.material.uniforms.uColor.value.set("#30230d");
  water.material.uniforms.uDeepColor.value.set("#080603");
  scene.add(water);
  sceneState.waterUniforms.push(water.material.uniforms);
}

function buildCity(scene, foundry, materials) {
  const city = new THREE.Group();
  city.name = "Hyderabad procedural skyline";
  scene.add(city);
  const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x100b04, map: foundry.asphalt, roughness: .82, metalness: .12 });
  const ground = box(city, new THREE.PlaneGeometry(460, 350), groundMaterial, [0, -.52, -44], { receiveShadow: true, rotation: [-Math.PI / 2, 0, 0] });
  ground.name = "Deccan night ground";
  const towerBlocks = [materials.cityGlass, materials.cityDark, materials.cityBronze];
  const windows = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ color: 0xffc66e, side: THREE.DoubleSide, transparent: true, opacity: .8 }),
    7000
  );
  const dummy = new THREE.Object3D();
  let count = 0;
  for (let i = 0; i < 84; i++) {
    const ring = Math.floor(i / 21);
    const lane = i % 21;
    const side = lane % 2 ? 1 : -1;
    const x = side * (28 + (lane % 9) * 10 + Math.sin(i * 5) * 2);
    const z = -112 + ring * 31 + (lane % 4) * 5;
    const width = 4 + (i * 13 % 8);
    const depth = 4 + (i * 7 % 7);
    const height = 11 + (i * 29 % 58);
    const building = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), towerBlocks[i % towerBlocks.length]);
    building.position.set(x, height / 2 - .3, z);
    building.castShadow = i % 5 === 0;
    city.add(building);
    const floors = Math.floor(height / 3.1);
    for (let floor = 0; floor < floors; floor++) {
      for (let pane = 0; pane < Math.max(2, Math.floor(width / 1.35)); pane++) {
        if ((i * 19 + floor * 7 + pane * 5) % 4 !== 0 && count < 7000) {
          dummy.position.set(x - width * .4 + pane * width * .8 / Math.floor(width / 1.35), floor * 3.1 + 1.2, z + depth / 2 + .03);
          dummy.rotation.set(0, 0, 0);
          dummy.scale.set(.36 + (i % 3) * .07, .52, 1);
          dummy.updateMatrix();
          windows.setMatrixAt(count++, dummy.matrix);
        }
      }
    }
    if (i % 7 === 0) {
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(.22, 8, 8), materials.beaconGold);
      beacon.position.set(x, height + .5, z);
      city.add(beacon);
      const glow = new THREE.PointLight(0xffbb60, 7, 14);
      glow.position.copy(beacon.position);
      city.add(glow);
    }
  }
  windows.count = count;
  city.add(windows);
  const road = box(city, new THREE.PlaneGeometry(250, 13), new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: foundry.asphalt,
    roughnessMap: foundry.asphaltRoughness,
    roughness: .16,
    metalness: .56
  }), [-5, -.43, 70], { rotation: [-Math.PI / 2, 0, 0] });
  road.name = "Wet Outer Ring Road";
  for (const x of [-11.2, 1.2]) {
    const line = box(city, new THREE.BoxGeometry(.13, .022, 240), materials.laneMarking, [x, -.39, 70]);
    line.name = "Luminescent highway lane";
  }
  buildBridge(scene, materials);
  return city;
}

function createCar(scene, materials) {
  const car = new THREE.Group();
  car.name = "NIZAM SKY articulated grand tourer";
  const chassisShape = new THREE.Shape();
  chassisShape.moveTo(-3.1, .52);
  chassisShape.lineTo(-2.95, .88);
  chassisShape.lineTo(-1.85, 1.08);
  chassisShape.lineTo(-.95, 1.8);
  chassisShape.lineTo(1.1, 1.83);
  chassisShape.lineTo(2.15, 1.12);
  chassisShape.lineTo(3.1, .91);
  chassisShape.lineTo(3.25, .48);
  chassisShape.lineTo(2.85, .3);
  chassisShape.lineTo(-2.8, .3);
  chassisShape.closePath();
  const bodyGeometry = new THREE.ExtrudeGeometry(chassisShape, { depth: 2.08, bevelEnabled: true, bevelSegments: 4, steps: 1, bevelSize: .13, bevelThickness: .1 });
  bodyGeometry.translate(0, 0, -1.04);
  const bodyMaterial = new THREE.MeshPhysicalMaterial({ color: 0x838981, metalness: .88, roughness: .19, clearcoat: 1, clearcoatRoughness: .06 });
  const chassis = new THREE.Mesh(bodyGeometry, bodyMaterial);
  chassis.name = "Vehicle body";
  chassis.castShadow = true;
  car.add(chassis);
  const glassMaterial = new THREE.MeshPhysicalMaterial({ color: 0x101e26, metalness: .62, roughness: .08, transparent: true, opacity: .9, clearcoat: 1 });
  const canopyShape = new THREE.Shape();
  canopyShape.moveTo(-1.72, 1.02);
  canopyShape.lineTo(-.85, 1.84);
  canopyShape.lineTo(.9, 1.84);
  canopyShape.lineTo(1.84, 1.05);
  canopyShape.closePath();
  const canopyGeo = new THREE.ExtrudeGeometry(canopyShape, { depth: 1.64, bevelEnabled: true, bevelSegments: 2, bevelSize: .035, bevelThickness: .03 });
  canopyGeo.translate(0, 0, -.82);
  car.add(new THREE.Mesh(canopyGeo, glassMaterial));
  const alloy = new THREE.MeshStandardMaterial({ color: 0x9ea9aa, metalness: 1, roughness: .2 });
  const tire = new THREE.MeshStandardMaterial({ color: 0x080a0c, metalness: .25, roughness: .74 });
  const caliperMat = new THREE.MeshStandardMaterial({ color: 0xd4af67, metalness: .82, roughness: .23, emissive: 0x624a1a, emissiveIntensity: .65 });
  const wheels = [];
  for (const x of [-2.05, 2.05]) {
    for (const z of [-1.04, 1.04]) {
      const wheel = new THREE.Group();
      wheel.position.set(x, .48, z);
      const rubber = new THREE.Mesh(new THREE.CylinderGeometry(.51, .51, .29, 32, 1), tire);
      rubber.rotation.x = Math.PI / 2;
      wheel.add(rubber);
      const rim = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .31, 32, 1), alloy);
      rim.rotation.x = Math.PI / 2;
      wheel.add(rim);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(.09, .09, .34, 20), materials.goldSteel);
      hub.rotation.x = Math.PI / 2;
      wheel.add(hub);
      for (let spoke = 0; spoke < 10; spoke++) {
        const angle = spoke / 10 * Math.PI * 2;
        const spokeMesh = new THREE.Mesh(new THREE.BoxGeometry(.035, .6, .045), alloy);
        spokeMesh.position.set(Math.sin(angle) * .04, Math.cos(angle) * .04, z > 0 ? .07 : -.07);
        spokeMesh.rotation.z = angle;
        wheel.add(spokeMesh);
      }
      const caliper = new THREE.Mesh(new THREE.BoxGeometry(.18, .42, .17), caliperMat);
      caliper.position.set(.17, .03, z > 0 ? .14 : -.14);
      wheel.add(caliper);
      car.add(wheel);
      wheels.push(wheel);
    }
  }
  const headlightMat = new THREE.MeshBasicMaterial({ color: 0xb9edff });
  for (const z of [-.67, .67]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.12, .15, .55), headlightMat);
    lamp.position.set(3.12, .82, z);
    car.add(lamp);
    const beam = new THREE.SpotLight(0x9de8ff, 32, 36, .34, .72, 1.1);
    beam.position.set(3.2, .8, z);
    beam.target.position.set(18, .2, z * 1.5);
    car.add(beam, beam.target);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(.085, .13, 1.78), materials.beaconRed);
  tail.position.set(-3.06, .83, 0);
  car.add(tail);
  const wheelGlow = new THREE.PointLight(0x4cbfea, 3, 8);
  wheelGlow.position.set(0, .65, 0);
  car.add(wheelGlow);
  const headlightGlare = new THREE.PointLight(0x92e4ff, 18, 12);
  headlightGlare.position.set(3.6, .75, 0);
  car.add(headlightGlare);
  scene.add(car);
  return { car, wheels };
}

function buildHotel(scene, foundry, materials) {
  const hotel = new THREE.Group();
  hotel.name = "42 storey NIZAM SKY glass and Deccan limestone tower";
  scene.add(hotel);
  const floorHeight = 160 / 42;
  const width = 22;
  const depth = 18;
  const facadeMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xb9a77f, map: foundry.facade, bumpMap: foundry.facadeBump, bumpScale: .06,
    metalness: .58, roughness: .18, transmission: .42, thickness: .55, transparent: true, opacity: .29,
    side: THREE.DoubleSide, clearcoat: .8, clearcoatRoughness: .12
  });
  const sideMaterial = facadeMaterial.clone();
  sideMaterial.opacity = .39;
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xb7aa8c, map: foundry.travertine, bumpMap: foundry.stoneBump, bumpScale: .12, roughness: .71, metalness: .12 });
  const metal = materials.goldSteel;
  box(hotel, new THREE.BoxGeometry(width, 160, .16), facadeMaterial, [0, 80, -depth / 2]);
  box(hotel, new THREE.BoxGeometry(.16, 160, depth), sideMaterial, [-width / 2, 80, 0]);
  box(hotel, new THREE.BoxGeometry(.16, 160, depth), sideMaterial, [width / 2, 80, 0]);
  for (let floor = 1; floor <= 42; floor++) {
    const y = floor * floorHeight;
    const feature = [1, 4, 24, 35, 36, 37, 38, 39, 40, 42].includes(floor);
    const slab = new THREE.Mesh(new THREE.BoxGeometry(width + .7, feature ? .34 : .2, depth + .55), floor % 4 === 0 ? stoneMaterial : materials.floorPlate);
    slab.position.set(0, y, 0);
    slab.receiveShadow = true;
    hotel.add(slab);
    if (floor % 2 === 0 || feature) {
      for (const x of [-width / 2, width / 2]) {
        box(hotel, new THREE.BoxGeometry(.34, .1, depth + .65), metal, [x, y + .17, 0]);
      }
    }
    const specialCutaway = [1, 4, 24, 38, 42].includes(floor);
    const frontPanels = specialCutaway
      ? [[-width / 2 + 2.7, 4.5], [width / 2 - 2.7, 4.5]]
      : [[0, width - .5]];
    for (const [x, panelWidth] of frontPanels) {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(panelWidth, floorHeight - .22), facadeMaterial);
      pane.position.set(x, y - floorHeight / 2, depth / 2 - .06);
      hotel.add(pane);
    }
    if (floor % 7 === 0) {
      const belt = new THREE.Mesh(new THREE.BoxGeometry(width + .9, .16, depth + .65), metal);
      belt.position.set(0, y + .4, 0);
      hotel.add(belt);
    }
  }
  for (const x of [-width / 2, width / 2]) {
    for (const z of [-depth / 2, depth / 2]) {
      const column = box(hotel, new THREE.BoxGeometry(.48, 162, .48), metal, [x, 80, z], { castShadow: true });
      column.name = "Bronze structural megacolumn";
    }
  }
  for (let mullion = -4; mullion <= 4; mullion++) {
    box(hotel, new THREE.BoxGeometry(.075, 160, .12), materials.cyanFrame, [mullion * 2.35, 80, depth / 2 + .08]);
  }
  const podium = box(hotel, new THREE.BoxGeometry(30, 12, 26), stoneMaterial, [0, -5.3, 0], { castShadow: true, receiveShadow: true });
  podium.name = "Three level travertine arrival podium";
  const podiumGlass = new THREE.Mesh(new THREE.BoxGeometry(29, 8, .14), facadeMaterial);
  podiumGlass.position.set(0, -3.2, 13.05);
  hotel.add(podiumGlass);

  const coreMat = new THREE.MeshPhysicalMaterial({ color: 0xffd36b, emissive: 0xa96814, emissiveIntensity: 1.55, transparent: true, opacity: .25, roughness: .12, metalness: .35 });
  const elevator = new THREE.Group();
  const shaft = box(elevator, new THREE.BoxGeometry(2.8, 166, 2.8), coreMat, [0, 78, 0]);
  shaft.name = "Biometric glass elevator core";
  for (const x of [-1.55, 1.55]) {
    box(elevator, new THREE.BoxGeometry(.08, 166, .08), materials.cyanFrame, [x, 78, 0]);
  }
  const liftCar = box(elevator, new THREE.BoxGeometry(1.8, 3, 1.7), materials.elevatorCab, [0, 5, 0]);
  liftCar.name = "Moving private elevator car";
  hotel.add(elevator);
  sceneState.elevator = liftCar;

  const lobby = new THREE.Group();
  hotel.add(lobby);
  const lobbyY = floorHeight * 1.5;
  const marbleFloor = new THREE.Mesh(new THREE.BoxGeometry(17, .18, 13), new THREE.MeshStandardMaterial({ color: 0xffffff, map: foundry.travertine, bumpMap: foundry.stoneBump, bumpScale: .14, roughness: .23, metalness: .22 }));
  marbleFloor.position.set(0, lobbyY, 1.2);
  lobby.add(marbleFloor);
  for (const x of [-7.2, 7.2]) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.36, .52, 10.2, 12), stoneMaterial);
    column.position.set(x, lobbyY + 5, 1);
    lobby.add(column);
    const capital = new THREE.Mesh(new THREE.CylinderGeometry(.75, .44, .42, 12), metal);
    capital.position.set(x, lobbyY + 10.1, 1);
    lobby.add(capital);
  }
  const reception = box(lobby, new THREE.BoxGeometry(3.2, 1.3, 1.1), materials.reception, [5.4, lobbyY + 1, 6]);
  reception.name = "Nizam reception monolith";
  const blueprintDisplay = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 3.2),
    new THREE.MeshBasicMaterial({ map: foundry.blueprint, transparent: true, opacity: .7, side: THREE.DoubleSide })
  );
  blueprintDisplay.position.set(7.5, lobbyY + 5.2, 8.91);
  lobby.add(blueprintDisplay);
  for (let tier = 0; tier < 3; tier++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45 - tier * .36, .075, 10, 52), materials.goldSteel);
    ring.position.set(-3.8, lobbyY + 8.6 + tier * .72, 3.1);
    ring.rotation.x = Math.PI / 2;
    lobby.add(ring);
    const crystalCount = 8 + tier * 4;
    for (let crystal = 0; crystal < crystalCount; crystal++) {
      const angle = crystal / crystalCount * Math.PI * 2;
      const drop = new THREE.Mesh(new THREE.OctahedronGeometry(.13 + (crystal % 3) * .04), materials.chandelierCrystal);
      drop.position.set(-3.8 + Math.cos(angle) * (1.45 - tier * .36), lobbyY + 7.9 + tier * .72, 3.1 + Math.sin(angle) * (1.45 - tier * .36));
      lobby.add(drop);
    }
  }
  const chandelierLight = new THREE.PointLight(0xffce73, 110, 30, 2);
  chandelierLight.position.set(-3.8, lobbyY + 8.8, 3.1);
  lobby.add(chandelierLight);

  const spaY = floorHeight * 4;
  for (let pool = 0; pool < 3; pool++) {
    const x = -6 + pool * 6;
    const basin = box(hotel, new THREE.BoxGeometry(4.5, .7, 4.5), materials.basalt, [x, spaY + .5, 2]);
    basin.name = "Carved basalt hydrotherapy basin";
    const water = new THREE.Mesh(new THREE.PlaneGeometry(4.15, 4.15, 48, 48), new THREE.ShaderMaterial({
      ...WaterSurfaceShader, uniforms: THREE.UniformsUtils.clone(WaterSurfaceShader.uniforms),
      side: THREE.DoubleSide, transparent: true, depthWrite: false
    }));
    water.rotation.x = -Math.PI / 2;
    water.position.set(x, spaY + .88, 2);
    water.material.uniforms.uColor.value.set("#94702a");
    water.material.uniforms.uDeepColor.value.set("#171006");
    hotel.add(water);
    sceneState.waterUniforms.push(water.material.uniforms);
    const poolGlow = new THREE.PointLight(0xffc653, 20, 9, 2);
    poolGlow.position.set(x, spaY + 1.4, 2);
    hotel.add(poolGlow);
  }
  for (let col = 0; col < 8; col++) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.38, .56, 4.6, 10), materials.basalt);
    column.position.set(-9 + col * 2.6, spaY + 2.4, col % 2 ? -5.5 : 8);
    hotel.add(column);
  }
  const steamCount = 150;
  const steamPositions = new Float32Array(steamCount * 3);
  const steamOrigins = new Float32Array(steamCount * 3);
  for (let particle = 0; particle < steamCount; particle++) {
    const poolIndex = particle % 3;
    const x = -6 + poolIndex * 6 + Math.sin(particle * 7.13) * 1.8;
    const y = spaY + 1.4 + (particle % 17) * .13;
    const z = 2 + Math.cos(particle * 3.17) * 1.7;
    steamPositions.set([x, y, z], particle * 3);
    steamOrigins.set([x, y, z], particle * 3);
  }
  const steamGeometry = new THREE.BufferGeometry();
  steamGeometry.setAttribute("position", new THREE.BufferAttribute(steamPositions, 3));
  const steamCloud = new THREE.Points(steamGeometry, new THREE.PointsMaterial({
    color: 0xffdf9a, size: .38, transparent: true, opacity: .16, blending: THREE.AdditiveBlending, depthWrite: false, sizeAttenuation: true
  }));
  hotel.add(steamCloud);
  sceneState.steam = { geometry: steamGeometry, origins: steamOrigins, count: steamCount };

  const diningY = floorHeight * 24;
  const pavilion = new THREE.Group();
  pavilion.position.set(14.5, diningY, 3);
  hotel.add(pavilion);
  const diningFloor = box(pavilion, new THREE.BoxGeometry(21, .5, 14), materials.floorPlate, [0, 0, 0]);
  diningFloor.name = "Cantilevered Golconda dining deck";
  const glassDining = new THREE.Mesh(new THREE.BoxGeometry(20.3, 7.4, 13.2), facadeMaterial);
  glassDining.position.y = 3.9;
  pavilion.add(glassDining);
  for (const x of [-10.2, 10.2]) {
    for (const z of [-6.6, 6.6]) box(pavilion, new THREE.BoxGeometry(.3, 7.6, .3), metal, [x, 3.9, z]);
  }
  for (let table = 0; table < 5; table++) {
    const x = -7.5 + (table % 3) * 7.5;
    const z = table < 3 ? -3.3 : 3.4;
    box(pavilion, new THREE.CylinderGeometry(1.15, 1.15, .14, 32), materials.travertineTop, [x, 1.25, z]);
    box(pavilion, new THREE.CylinderGeometry(.12, .2, 1.1, 12), metal, [x, .68, z]);
    const candle = new THREE.PointLight(0xffa94f, 4, 4, 2);
    candle.position.set(x, 1.65, z);
    pavilion.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(.06, 8, 8), materials.beaconGold);
    flame.position.set(x, 1.7, z);
    pavilion.add(flame);
  }
  for (let branch = 0; branch < 9; branch++) {
    const theta = branch / 9 * Math.PI * 2;
    const end = [Math.cos(theta) * (2.1 + branch % 3 * .3), 5 + branch % 4 * .42, Math.sin(theta) * (2.1 + branch % 2 * .4)];
    tubeBetween(pavilion, [0, 1.7, 0], end, .045, materials.goldSteel, 6);
    const leaf = new THREE.Mesh(new THREE.IcosahedronGeometry(.27, 1), materials.treeLeaf);
    leaf.position.set(...end);
    leaf.scale.set(1.2, .5, .8);
    pavilion.add(leaf);
  }

  for (const floor of [35, 38, 40]) {
    const y = floor * floorHeight;
    const suite = new THREE.Group();
    suite.position.set(0, y, 0);
    hotel.add(suite);
    const roomFloor = box(suite, new THREE.BoxGeometry(17, .12, 9), materials.travertineTop, [0, .15, 1.2]);
    roomFloor.name = `Royal residence floor ${floor}`;
    for (const x of [-8, 8]) {
      const pier = new THREE.Mesh(new THREE.CylinderGeometry(.3, .39, 3.5, 12), materials.travertine);
      pier.position.set(x, 1.9, 2);
      suite.add(pier);
    }
    box(suite, new THREE.BoxGeometry(4.1, 1.1, 1.15), materials.sofa, [-4.6, .86, 2.8]);
    box(suite, new THREE.BoxGeometry(1.45, .34, 2.25), materials.bed, [4.1, .45, -1]);
    box(suite, new THREE.BoxGeometry(1.1, .48, .54), materials.bed, [5.4, .58, -1.8]);
    const plunge = new THREE.Mesh(new THREE.BoxGeometry(3.8, .2, 2.4), materials.poolWater);
    plunge.position.set(5, .38, 5);
    suite.add(plunge);
    const suiteGlow = new THREE.PointLight(0xffca76, 17, 17, 2);
    suiteGlow.position.set(-1, 3, 1);
    suite.add(suiteGlow);
  }

  const poolY = 160;
  const infinityBase = box(hotel, new THREE.BoxGeometry(22, .58, 14.5), materials.glassBottom, [0, poolY, 15.7], { castShadow: true });
  infinityBase.name = "14 metre cantilevered transparent glass pool floor";
  const poolSurface = new THREE.Mesh(new THREE.PlaneGeometry(21.3, 13.8, 120, 80), new THREE.ShaderMaterial({
    ...WaterSurfaceShader,
    uniforms: THREE.UniformsUtils.clone(WaterSurfaceShader.uniforms),
    side: THREE.DoubleSide,
    transparent: true,
    depthWrite: false
  }));
  poolSurface.rotation.x = -Math.PI / 2;
  poolSurface.position.set(0, poolY + .42, 15.7);
  hotel.add(poolSurface);
  sceneState.waterUniforms.push(poolSurface.material.uniforms);
  for (const x of [-11, 11]) {
    const side = box(hotel, new THREE.BoxGeometry(.3, 2.15, 14.8), materials.poolGlass, [x, poolY + 1.05, 15.7]);
    side.name = "Low-iron glass infinity pool side";
  }
  box(hotel, new THREE.BoxGeometry(22, 2.1, .3), materials.poolGlass, [0, poolY + 1.03, 22.9]);
  const edgeLight = box(hotel, new THREE.BoxGeometry(22, .09, .08), materials.cyanEmitter, [0, poolY + 2.05, 23.08]);
  edgeLight.name = "Glowing glass infinity edge";
  const heliTexture = foundry.helipad;
  const heliMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: heliTexture, roughness: .65, metalness: .17, side: THREE.DoubleSide });
  const helipad = box(hotel, new THREE.CylinderGeometry(8, 8, .5, 96), heliMat, [0, poolY + 3.3, -1]);
  helipad.name = "Rooftop helipad with H landing marking";
  for (let i = 0; i < 8; i++) {
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(.28, 12, 12), i % 2 ? materials.beaconCyan : materials.beaconGold);
    const angle = i / 8 * Math.PI * 2;
    beacon.position.set(Math.cos(angle) * 7.5, poolY + 3.85, -1 + Math.sin(angle) * 7.5);
    hotel.add(beacon);
    const light = new THREE.PointLight(i % 2 ? 0xffefbf : 0xffbd5e, 22, 18, 2);
    light.position.copy(beacon.position);
    hotel.add(light);
  }
  const crown = box(hotel, new THREE.ConeGeometry(2.5, 10, 4), materials.goldSteel, [0, 169, -1], { rotation: [0, Math.PI / 4, 0] });
  crown.name = "Nizam crown spire";
  const coreTop = box(hotel, new THREE.BoxGeometry(3.2, 6, 3.2), materials.cyanEmitter, [0, 164, 0]);
  coreTop.name = "Illuminated elevator crown";

  const vaultY = -8.5;
  const vaultFloor = new THREE.Mesh(new THREE.CylinderGeometry(12, 12, .7, 72), materials.basalt);
  vaultFloor.position.set(0, vaultY, 0);
  hotel.add(vaultFloor);
  const turntable = new THREE.Mesh(new THREE.CylinderGeometry(7.5, 7.5, .3, 72), materials.turntable);
  turntable.position.set(0, vaultY + .5, 0);
  hotel.add(turntable);
  const vaultPulse = new THREE.PointLight(0xffa43d, 40, 22, 2);
  vaultPulse.position.set(0, vaultY + 2.3, 0);
  hotel.add(vaultPulse);
  for (let i = 0; i < 8; i++) {
    const column = new THREE.Mesh(new THREE.CylinderGeometry(.52, .64, 10, 10), materials.basalt);
    const angle = i / 8 * Math.PI * 2;
    column.position.set(Math.cos(angle) * 9.5, vaultY + 5, Math.sin(angle) * 9.5);
    hotel.add(column);
  }
  const vaultCarColors = [0x9b9d98, 0x85151f, 0x354752];
  for (let car = 0; car < 3; car++) {
    const silhouette = box(hotel, new THREE.BoxGeometry(2.9, .62, 1.18), new THREE.MeshPhysicalMaterial({ color: vaultCarColors[car], metalness: .82, roughness: .24, clearcoat: .9 }), [Math.cos(car / 3 * Math.PI * 2) * 4.5, vaultY + 1, Math.sin(car / 3 * Math.PI * 2) * 4.5]);
    silhouette.rotation.y = car * Math.PI * 2 / 3;
    silhouette.name = "Private vault supercar display";
    for (const side of [-1, 1]) {
      const tire = new THREE.Mesh(new THREE.CylinderGeometry(.35, .35, .18, 16), materials.tire);
      tire.rotation.z = Math.PI / 2;
      tire.position.set(silhouette.position.x + side * .75, vaultY + .62, silhouette.position.z);
      hotel.add(tire);
    }
  }

  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-93, .12, 85), new THREE.Vector3(-73, .12, 57),
    new THREE.Vector3(-48, .12, 48), new THREE.Vector3(-28, .12, 39),
    new THREE.Vector3(-12, .12, 31), new THREE.Vector3(0, .12, 24),
    new THREE.Vector3(0, .12, 18)
  ], false, "catmullrom", .3);
  const carResult = createCar(scene, materials);
  sceneState.car = carResult.car;
  sceneState.carWheels = carResult.wheels;
  sceneState.carPath = path;
  return hotel;
}

function createMaterials(foundry) {
  const facade = new THREE.MeshPhysicalMaterial({
    color: 0x49391f, map: foundry.facade, bumpMap: foundry.facadeBump, bumpScale: .08,
    metalness: .58, roughness: .24, transparent: true, opacity: .38, side: THREE.DoubleSide,
    clearcoat: .85, clearcoatRoughness: .1
  });
  const basalt = new THREE.MeshStandardMaterial({ color: 0xffffff, map: foundry.basalt, bumpMap: foundry.stoneBump, bumpScale: .15, roughness: .82, metalness: .12 });
  const travertine = new THREE.MeshStandardMaterial({ color: 0xffffff, map: foundry.travertine, bumpMap: foundry.stoneBump, bumpScale: .12, roughness: .56, metalness: .18 });
  const goldSteel = new THREE.MeshStandardMaterial({ color: 0xc3a766, metalness: .91, roughness: .24, emissive: 0x35240c, emissiveIntensity: .28 });
  const floorPlate = new THREE.MeshStandardMaterial({ color: 0x3c3322, metalness: .5, roughness: .34 });
  const cyanFrame = new THREE.MeshStandardMaterial({ color: 0xffd36b, metalness: .8, roughness: .18, emissive: 0x8a5a13, emissiveIntensity: .72 });
  const beaconCyan = new THREE.MeshBasicMaterial({ color: 0xffd36b });
  const beaconGold = new THREE.MeshBasicMaterial({ color: 0xffca70 });
  const beaconRed = new THREE.MeshBasicMaterial({ color: 0xffa43d });
  const waterMaterial = new THREE.ShaderMaterial({ ...WaterSurfaceShader, uniforms: THREE.UniformsUtils.clone(WaterSurfaceShader.uniforms), transparent: true, depthWrite: false, side: THREE.DoubleSide });
  return {
    facade, basalt, travertine, goldSteel, floorPlate, cyanFrame, beaconCyan, beaconGold, beaconRed,
    cityGlass: new THREE.MeshPhysicalMaterial({ color: 0x2a2113, map: foundry.facade, metalness: .55, roughness: .28, clearcoat: .5 }),
    cityDark: new THREE.MeshStandardMaterial({ color: 0x18130a, metalness: .42, roughness: .45 }),
    cityBronze: new THREE.MeshStandardMaterial({ color: 0x3b301b, metalness: .65, roughness: .35 }),
    bridgeDeck: new THREE.MeshStandardMaterial({ color: 0x454746, map: foundry.asphalt, roughness: .44, metalness: .4 }),
    cyanCable: new THREE.MeshStandardMaterial({ color: 0xffd778, emissive: 0x98621a, emissiveIntensity: 1.8, metalness: .8 }),
    goldCable: new THREE.MeshStandardMaterial({ color: 0xd5b16b, emissive: 0x704c1e, emissiveIntensity: .55, metalness: .9 }),
    laneMarking: new THREE.MeshBasicMaterial({ color: 0xffd778 }),
    reception: new THREE.MeshStandardMaterial({ color: 0x343b3c, map: foundry.basalt, roughness: .3, metalness: .45 }),
    chandelierCrystal: new THREE.MeshPhysicalMaterial({ color: 0xffdc98, emissive: 0xb37c28, emissiveIntensity: 1.4, metalness: .74, roughness: .14 }),
    travertineTop: travertine,
    treeLeaf: new THREE.MeshStandardMaterial({ color: 0x475847, roughness: .82, metalness: .08 }),
    sofa: new THREE.MeshStandardMaterial({ color: 0x72583d, roughness: .92 }),
    bed: new THREE.MeshStandardMaterial({ color: 0xd1c4a9, roughness: .83 }),
    poolWater: waterMaterial,
    glassBottom: new THREE.MeshPhysicalMaterial({ color: 0xffd778, transparent: true, opacity: .3, transmission: .75, thickness: .65, roughness: .08, metalness: .12, side: THREE.DoubleSide }),
    poolGlass: new THREE.MeshPhysicalMaterial({ color: 0xffd36b, transparent: true, opacity: .22, transmission: .7, thickness: .6, roughness: .09, side: THREE.DoubleSide }),
    cyanEmitter: new THREE.MeshStandardMaterial({ color: 0xffc653, emissive: 0xc07b18, emissiveIntensity: 2.1, metalness: .54, roughness: .2 }),
    elevatorCab: new THREE.MeshPhysicalMaterial({ color: 0xffe6a3, transparent: true, opacity: .7, metalness: .5, roughness: .12, emissive: 0x8a5717, emissiveIntensity: 1.1 }),
    turntable: new THREE.MeshStandardMaterial({ color: 0x232b30, roughness: .25, metalness: .72 }),
    tire: new THREE.MeshStandardMaterial({ color: 0x07090b, roughness: .76, metalness: .18 }),
    waterMaterial
  };
}

function createWorld() {
  const canvas = $("#worldCanvas");
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
    stencil: false,
    depth: true
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x040302, 1);
  sceneState.renderer = renderer;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#040302");
  scene.fog = new THREE.FogExp2("#040302", .0038);
  sceneState.scene = scene;
  const camera = new THREE.PerspectiveCamera(42, 1, .1, 900);
  camera.position.set(118, 71, 150);
  sceneState.camera = camera;

  const ambient = new THREE.HemisphereLight(0xffe6b2, 0x100b04, 1.7);
  scene.add(ambient);
  const moon = new THREE.DirectionalLight(0xffe6bd, 3.5);
  moon.position.set(-95, 145, 110);
  moon.castShadow = true;
  moon.shadow.mapSize.set(1024, 1024);
  moon.shadow.camera.left = -110;
  moon.shadow.camera.right = 110;
  moon.shadow.camera.top = 180;
  moon.shadow.camera.bottom = -80;
  moon.shadow.bias = -.0002;
  scene.add(moon);
  const warmSky = new THREE.PointLight(0xffc15a, 360, 170, 2);
  warmSky.name = "Primary warm fill";
  warmSky.position.set(12, 54, 29);
  scene.add(warmSky);
  const cyanSky = new THREE.PointLight(0xffd36b, 280, 150, 2);
  cyanSky.name = "Primary cool fill";
  cyanSky.position.set(-34, 73, 15);
  scene.add(cyanSky);

  const foundry = new TextureFoundry(renderer);
  const materials = createMaterials(foundry);
  buildCity(scene, foundry, materials);
  const hotel = buildHotel(scene, foundry, materials);
  sceneState.hotel = hotel;

  const starPositions = new Float32Array(2100 * 3);
  let seed = 113;
  for (let i = 0; i < 2100; i++) {
    seed = (seed * 16807) % 2147483647;
    starPositions[i * 3] = (seed / 2147483647 - .5) * 660;
    seed = (seed * 16807) % 2147483647;
    starPositions[i * 3 + 1] = 45 + seed / 2147483647 * 290;
    seed = (seed * 16807) % 2147483647;
    starPositions[i * 3 + 2] = -250 + seed / 2147483647 * 350;
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xffe2a2, size: .7, transparent: true, opacity: .75, sizeAttenuation: true }));
  scene.add(stars);

  const sparkleCount = 1100;
  const sparklePositions = new Float32Array(sparkleCount * 3);
  const sparkleSizes = new Float32Array(sparkleCount);
  const sparklePhases = new Float32Array(sparkleCount);
  for (let i = 0; i < sparkleCount; i++) {
    seed = (seed * 16807) % 2147483647;
    sparklePositions[i * 3] = (seed / 2147483647 - .5) * 190;
    seed = (seed * 16807) % 2147483647;
    sparklePositions[i * 3 + 1] = -12 + seed / 2147483647 * 188;
    seed = (seed * 16807) % 2147483647;
    sparklePositions[i * 3 + 2] = -105 + seed / 2147483647 * 180;
    seed = (seed * 16807) % 2147483647;
    sparkleSizes[i] = 2.2 + seed / 2147483647 * 5.8;
    seed = (seed * 16807) % 2147483647;
    sparklePhases[i] = seed / 2147483647 * Math.PI * 2;
  }
  const sparkleGeometry = new THREE.BufferGeometry();
  sparkleGeometry.setAttribute("position", new THREE.BufferAttribute(sparklePositions, 3));
  sparkleGeometry.setAttribute("aSize", new THREE.BufferAttribute(sparkleSizes, 1));
  sparkleGeometry.setAttribute("aPhase", new THREE.BufferAttribute(sparklePhases, 1));
  const sparkleMaterial = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uPointer: { value: new THREE.Vector2() },
      uVelocity: { value: 0 },
      uProgress: { value: 0 }
    },
    vertexShader: `
      attribute float aSize;
      attribute float aPhase;
      uniform float uTime;
      uniform vec2 uPointer;
      uniform float uVelocity;
      uniform float uProgress;
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec3 p = position;
        p.x += sin(uTime * .38 + aPhase) * 1.8 + uPointer.x * 2.3;
        p.y += cos(uTime * .29 + aPhase * 1.17) * 1.45 + uProgress * (mod(aPhase, 2.0) - 1.0) * 2.6;
        p.z += sin(uTime * .24 + aPhase * .83) * 1.7 + uPointer.y * 2.0;
        vec4 mvPosition = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        float speed = clamp(abs(uVelocity) * .75, 0.0, .8);
        gl_PointSize = aSize * (32.0 / max(24.0, -mvPosition.z)) * (1.0 + speed * .7);
        vAlpha = .3 + .7 * (.5 + .5 * sin(uTime * (1.2 + mod(aPhase, 2.0)) + aPhase));
        float palette = mod(aPhase, 3.0);
        vColor = palette < 1.0 ? vec3(1.0, .72, .35) : (palette < 2.0 ? vec3(1.0, .88, .56) : vec3(1.0, .53, .2));
      }
    `,
    fragmentShader: `
      varying float vAlpha;
      varying vec3 vColor;
      void main() {
        vec2 point = gl_PointCoord - .5;
        float radius = length(point);
        float halo = exp(-radius * 10.0);
        float core = 1.0 - smoothstep(.015, .12, radius);
        float rays = exp(-abs(point.x) * 38.0) * exp(-abs(point.y) * 6.5)
                   + exp(-abs(point.y) * 38.0) * exp(-abs(point.x) * 6.5);
        float alpha = (halo * .2 + core * .9 + rays * .16) * vAlpha;
        if (alpha < .015) discard;
        gl_FragColor = vec4(vColor * (1.0 + core * .8), alpha);
      }
    `
  });
  const sparkles = new THREE.Points(sparkleGeometry, sparkleMaterial);
  sparkles.frustumCulled = false;
  scene.add(sparkles);
  sceneState.sparkles = sparkleMaterial;

  const cameraPoints = [
    [112, 67, 144], [77, 42, 106], [42, 21, 72], [25, 11, 43],
    [22, 13, 29], [22, 18, 30], [28, 92, 30], [26, 145, 33],
    [7, 164, 37], [12, -2, 34]
  ];
  const targetPoints = [
    [0, 20, 0], [0, 13, 0], [0, 8, 0], [0, 8, 0],
    [0, 8, 0], [0, 16, 0], [2, 92, 0], [0, 145, 0],
    [0, 160, 12], [0, -8, 0]
  ];
  sceneState.cameraSpline = new THREE.CatmullRomCurve3(cameraPoints.map(point => new THREE.Vector3(...point)), false, "centripetal", .42);
  sceneState.targetSpline = new THREE.CatmullRomCurve3(targetPoints.map(point => new THREE.Vector3(...point)), false, "centripetal", .42);
  sceneState.baseCamera.copy(sceneState.cameraSpline.getPointAt(0));
  sceneState.baseTarget.copy(sceneState.targetSpline.getPointAt(0));

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), .78, .62, .78);
  composer.addPass(bloom);
  const liquidPass = new ShaderPass(LiquidDistortionShader);
  liquidPass.uniforms.uResolution.value.set(1, 1);
  composer.addPass(liquidPass);
  sceneState.composer = composer;
  sceneState.bloomPass = bloom;
  sceneState.liquidPass = liquidPass;
  window.nizamTextures = foundry;
  return foundry;
}

function resizeWorld() {
  const width = Math.max(1, Math.round(document.documentElement.clientWidth));
  const height = Math.max(1, Math.round(window.visualViewport?.height || window.innerHeight));
  sceneState.width = width;
  sceneState.height = height;
  sceneState.camera.aspect = width / Math.max(1, height);
  sceneState.camera.updateProjectionMatrix();
  sceneState.renderer.setSize(width, height, false);
  sceneState.composer.setSize(width, height);
  sceneState.liquidPass.uniforms.uResolution.value.set(width, height);
  if (sceneState.vehicleRenderer) {
    const canvasBounds = $("#vehicleCanvas").getBoundingClientRect();
    const vehicleWidth = Math.max(1, Math.round(canvasBounds.width));
    const vehicleHeight = Math.max(1, Math.round(canvasBounds.height));
    sceneState.vehicleRenderer.setSize(vehicleWidth, vehicleHeight, false);
    sceneState.vehicleCamera.aspect = vehicleWidth / vehicleHeight;
    sceneState.vehicleCamera.updateProjectionMatrix();
  }
}

function lowerRenderingQuality() {
  if (sceneState.performanceLevel === 0) {
    sceneState.performanceLevel = 1;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, .9);
    sceneState.renderer.setPixelRatio(pixelRatio);
    sceneState.composer.setPixelRatio(pixelRatio);
    sceneState.renderer.shadowMap.enabled = false;
  } else if (sceneState.performanceLevel === 1) {
    sceneState.performanceLevel = 2;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, .8);
    sceneState.renderer.setPixelRatio(pixelRatio);
    sceneState.composer.setPixelRatio(pixelRatio);
    sceneState.bloomPass.enabled = false;
    sceneState.liquidPass.enabled = false;
    sceneState.scene.traverse(object => {
      if (object.isPointLight && object.name !== "Primary warm fill" && object.name !== "Primary cool fill") {
        object.visible = false;
      }
    });
  }
  resizeWorld();
}

function updateCameraFromScroll(progress) {
  const u = clamp(progress);
  const cameraPosition = sceneState.cameraSpline.getPointAt(u);
  const target = sceneState.targetSpline.getPointAt(u);
  sceneState.camera.position.copy(cameraPosition);
  sceneState.cameraTarget.copy(target);
  sceneState.camera.lookAt(target);
  sceneState.baseCamera.copy(cameraPosition);
  sceneState.baseTarget.copy(target);
}

function updateVehicle(progress) {
  const car = sceneState.car;
  if (!car || !sceneState.carPath) return;
  const arrivalProgress = clamp(progress / .18);
  const idleRoll = progress < .018 ? clamp(sceneState.time * .000012, 0, .72) : 0;
  const driveProgress = Math.min(.995, arrivalProgress * .995 + idleRoll * (1 - arrivalProgress));
  const point = sceneState.carPath.getPointAt(driveProgress);
  const tangent = sceneState.carPath.getTangentAt(driveProgress);
  car.position.copy(point);
  car.position.y += .08 + Math.sin(sceneState.time * .003) * .025;
  car.rotation.y = Math.atan2(-tangent.z, tangent.x);
  const progressDelta = driveProgress - sceneState.carProgress;
  const spin = clamp(progressDelta * sceneState.carPath.getLength() / .52, -.65, .65);
  for (const wheel of sceneState.carWheels) wheel.rotation.z -= spin;
  sceneState.carProgress = driveProgress;
}

function updateWaterAndPost() {
  const velocity = sceneState.velocity;
  for (const uniforms of sceneState.waterUniforms) {
    uniforms.uTime.value = sceneState.time * .001;
    uniforms.uScrollVelocity.value = velocity;
  }
  const uniforms = sceneState.liquidPass.uniforms;
  uniforms.uTime.value = sceneState.time * .001;
  uniforms.uVelocity.value = velocity;
  uniforms.uMouse.value.copy(sceneState.pointer);
  uniforms.uWarp.value = sceneState.warp;
}

function hotelPageSize() {
  return window.matchMedia("(max-width: 700px)").matches ? 4 : 8;
}

function renderHotelDirectory() {
  const search = $("#hotelSearch");
  const area = $("#hotelArea");
  const grid = $("#hotelGrid");
  if (!search || !area || !grid) return;
  const query = search.value.trim().toLocaleLowerCase();
  const selectedArea = area.value;
  const matches = hotelListings.filter(hotel => {
    const matchesText = `${hotel.name} ${hotel.area} ${hotel.style}`.toLocaleLowerCase().includes(query);
    return matchesText && (selectedArea === "all" || hotel.area === selectedArea);
  });
  const pageSize = hotelPageSize();
  const pageCount = Math.max(1, Math.ceil(matches.length / pageSize));
  sceneState.hotelPage = clamp(sceneState.hotelPage, 0, pageCount - 1);
  const start = sceneState.hotelPage * pageSize;
  const visibleHotels = matches.slice(start, start + pageSize);
  grid.replaceChildren();
  if (!visibleHotels.length) {
    const empty = document.createElement("p");
    empty.className = "hotel-empty";
    empty.textContent = "NO HYDERABAD ADDRESSES MATCH YOUR SEARCH.";
    grid.append(empty);
  }
  for (const [offset, hotel] of visibleHotels.entries()) {
    const card = document.createElement("article");
    card.className = "hotel-card";
    card.setAttribute("role", "listitem");
    const link = document.createElement("a");
    link.className = "hotel-card-link";
    link.href = hotel.site;
    if (hotel.page) {
      link.setAttribute("aria-label", `Explore ${hotel.name}, a private sky-estate concept`);
      link.addEventListener("click", event => {
        event.preventDefault();
        navigatePage(hotel.page);
      });
    } else {
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", `Visit ${hotel.name} official website in a new tab`);
    }
    const photo = document.createElement("span");
    photo.className = "hotel-card-photo";
    const image = document.createElement("img");
    image.src = hotel.photo.image;
    image.alt = hotel.photo.note;
    image.loading = "lazy";
    image.decoding = "async";
    image.draggable = false;
    const number = document.createElement("span");
    number.className = "hotel-card-number";
    number.textContent = String(start + offset + 1).padStart(2, "0");
    photo.append(image, number);
    const copy = document.createElement("span");
    copy.className = "hotel-card-copy";
    const location = document.createElement("span");
    location.className = "hotel-card-area";
    location.textContent = hotel.area.toUpperCase();
    const name = document.createElement("strong");
    name.textContent = hotel.name;
    const style = document.createElement("small");
    style.textContent = hotel.style;
    const outlink = document.createElement("span");
    outlink.className = "hotel-card-outlink";
    outlink.setAttribute("aria-hidden", "true");
    outlink.textContent = "↗";
    copy.append(location, name, style, outlink);
    link.append(photo, copy);
    const credit = document.createElement("div");
    credit.className = "hotel-credit";
    credit.title = `${hotel.photo.title} — ${hotel.photo.artist}; ${hotel.photo.license}`;
    const creditLink = document.createElement("a");
    creditLink.href = hotel.photo.source;
    creditLink.target = "_blank";
    creditLink.rel = "noopener noreferrer";
    creditLink.textContent = hotel.photo.artist === "Unsplash contributors"
      ? "REPRESENTATIVE IMAGE / NOT THIS PROPERTY"
      : `PHOTO: ${hotel.photo.artist} / ${hotel.photo.license}`;
    credit.append(creditLink);
    const modelButton = document.createElement("button");
    modelButton.className = "hotel-model-button";
    modelButton.type = "button";
    modelButton.textContent = "3D";
    modelButton.setAttribute("aria-label", `Open the illustrative 3D architecture for ${hotel.name}`);
    modelButton.title = "Open interactive architectural concept";
    modelButton.addEventListener("click", () => openHotelModel(hotel));
    card.append(link, credit, modelButton);
    grid.append(card);
  }
  $("#hotelCount").textContent = `${matches.length} ${matches.length === 1 ? "LISTING" : "LISTINGS"}`;
  $("#hotelPageStatus").textContent = `${String(sceneState.hotelPage + 1).padStart(2, "0")} / ${String(pageCount).padStart(2, "0")}`;
  $("#hotelPrevious").disabled = sceneState.hotelPage === 0;
  $("#hotelNext").disabled = sceneState.hotelPage >= pageCount - 1;
}

function createHotelBuildingModel(hotel) {
  const index = Math.max(0, hotelListings.indexOf(hotel));
  const description = `${hotel.name} ${hotel.style}`.toLowerCase();
  const palace = /palace|heritage/.test(description);
  const resort = /resort|garden|lakefront/.test(description);
  const colors = [0x9b8064, 0xa58a55, 0x89785d, 0x8b7044, 0xb19469, 0x917a52];
  const facadeColor = palace ? 0xb89c74 : colors[index % colors.length];
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: facadeColor, roughness: .48, metalness: .22 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: palace ? 0x88765e : 0x3a2a12,
    roughness: .2,
    metalness: .34,
    transparent: true,
    opacity: .88,
    clearcoat: .8,
    clearcoatRoughness: .18
  });
  const darkGlass = new THREE.MeshStandardMaterial({ color: 0x191207, roughness: .24, metalness: .45 });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd5b16b, metalness: .78, roughness: .22, emissive: 0x553509, emissiveIntensity: .35 });
  const litWindow = new THREE.MeshStandardMaterial({ color: 0xf6d49a, emissive: 0xe6a348, emissiveIntensity: 1.1, roughness: .28 });
  const coolWindow = new THREE.MeshStandardMaterial({ color: 0xffdf9a, emissive: 0x9b6418, emissiveIntensity: .9, roughness: .25 });
  const ground = new THREE.MeshStandardMaterial({ color: 0x171208, roughness: .45, metalness: .55 });
  const addBox = (width, height, depth, x, y, z, material) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };
  addBox(13, .22, 12, 0, -.18, 0, ground);
  addBox(8.7, .38, 7.6, 0, .12, 0, gold);
  addBox(8.45, .34, 7.35, 0, .3, 0, ground);
  addBox(3.2, .055, 9.7, 5.2, .06, -.2, coolWindow);

  const towerHeight = palace ? 5.8 : 9.4 + (index % 4) * .8;
  const towerWidth = palace ? 5.9 : 5.8;
  const towerDepth = palace ? 4.2 : 4.5;
  const podiumHeight = palace ? 1.15 : 1.55;
  const floors = palace ? 5 : 8 + (index % 5);
  addBox(7.5, podiumHeight, 6.2, 0, podiumHeight / 2 + .34, 0, stone);
  addBox(towerWidth, towerHeight, towerDepth, 0, podiumHeight + towerHeight / 2 + .28, 0, palace ? stone : glass);

  if (resort) {
    addBox(2.4, 3.2, 3.1, -3.2, 1.95, .15, stone);
    addBox(2.4, 3.7, 3.1, 3.2, 2.2, -.15, stone);
  }
  const floorHeight = towerHeight / floors;
  const columns = palace ? 6 : 8;
  const windowMaterials = { lit: litWindow, cool: coolWindow, dark: darkGlass };
  const windowMatrices = { lit: [], cool: [], dark: [] };
  const windowGeometry = new THREE.BoxGeometry(.38, .38, .055);
  const windowTransform = new THREE.Object3D();
  const addWindow = (materialKey, x, y, z, side = false) => {
    windowTransform.position.set(x, y, z);
    windowTransform.rotation.set(0, side ? Math.PI / 2 : 0, 0);
    windowTransform.updateMatrix();
    windowMatrices[materialKey].push(windowTransform.matrix.clone());
  };
  for (let floor = 0; floor < floors; floor++) {
    const y = podiumHeight + .42 + floor * floorHeight;
    addBox(towerWidth + .12, .055, towerDepth + .12, 0, y, 0, floor % 3 === 0 ? gold : darkGlass);
    for (let column = 0; column < columns; column++) {
      const x = -towerWidth * .42 + column * (towerWidth * .84 / (columns - 1));
      const lit = (floor * 7 + column * 11 + index) % 4 === 0;
      const materialKey = lit ? "lit" : (column % 3 === 0 ? "cool" : "dark");
      const windowY = y + floorHeight * .47;
      addWindow(materialKey, x, windowY, towerDepth / 2 + .035);
      addWindow(materialKey, x, windowY, -towerDepth / 2 - .035);
      if (column < 5) {
        const sideZ = -towerDepth * .38 + column * (towerDepth * .19);
        addWindow(materialKey, towerWidth / 2 + .035, windowY, sideZ, true);
        addWindow(materialKey, -towerWidth / 2 - .035, windowY, sideZ, true);
      }
    }
  }
  Object.entries(windowMatrices).forEach(([materialKey, matrices]) => {
    const windows = new THREE.InstancedMesh(windowGeometry, windowMaterials[materialKey], matrices.length);
    matrices.forEach((matrix, instanceIndex) => windows.setMatrixAt(instanceIndex, matrix));
    windows.instanceMatrix.needsUpdate = true;
    windows.computeBoundingSphere();
    group.add(windows);
  });

  const roofY = podiumHeight + towerHeight + .32;
  addBox(towerWidth + .32, .16, towerDepth + .32, 0, roofY, 0, gold);
  if (palace) {
    for (let dome = -1; dome <= 1; dome++) {
      const x = dome * 1.75;
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(.42, .52, .78, 16), stone);
      drum.position.set(x, roofY + .45, 0);
      group.add(drum);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(.55, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), gold);
      cap.position.set(x, roofY + .82, 0);
      group.add(cap);
      const finial = new THREE.Mesh(new THREE.ConeGeometry(.12, .5, 10), gold);
      finial.position.set(x, roofY + 1.35, 0);
      group.add(finial);
    }
  } else {
    addBox(towerWidth * .42, .2, towerDepth * .4, 0, roofY + .24, 0, gold);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(.38, 1.2 + index % 3 * .2, 8), gold);
    crown.position.set(0, roofY + .92, 0);
    group.add(crown);
  }
  for (let side = -1; side <= 1; side += 2) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.09, .13, 1.4, 8), gold);
    trunk.position.set(side * 5.1, .62, 3.6);
    group.add(trunk);
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(.66, 1), new THREE.MeshStandardMaterial({ color: 0x496b5a, roughness: .85 }));
    foliage.position.set(side * 5.1, 1.65, 3.6);
    foliage.scale.set(.85, 1.2, .85);
    group.add(foliage);
  }

  if (hotel.photo?.image) {
    new THREE.TextureLoader().load(
      hotel.photo.image,
      texture => {
        if (!sceneState.hotelModelActive || sceneState.vehicleModel !== group) {
          texture.dispose();
          return;
        }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.anisotropy = Math.min(8, sceneState.vehicleRenderer.capabilities.getMaxAnisotropy());
        const aspect = texture.image.width / texture.image.height;
        const maxWidth = towerWidth * .94;
        const maxHeight = towerHeight * .78;
        const photoWidth = Math.min(maxWidth, maxHeight * aspect);
        const photoHeight = photoWidth / aspect;
        const photoY = podiumHeight + towerHeight / 2 + .28;
        const photoZ = towerDepth / 2 + .075;
        const photo = new THREE.Mesh(
          new THREE.PlaneGeometry(photoWidth, photoHeight),
          new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, toneMapped: false })
        );
        photo.name = "Property reference photo facade";
        photo.position.set(0, photoY, photoZ);
        photo.renderOrder = 2;
        group.add(photo);
        addBox(photoWidth + .08, .045, .045, 0, photoY + photoHeight / 2, photoZ + .015, gold);
        addBox(photoWidth + .08, .045, .045, 0, photoY - photoHeight / 2, photoZ + .015, gold);
        addBox(.045, photoHeight + .08, .045, -photoWidth / 2, photoY, photoZ + .015, gold);
        addBox(.045, photoHeight + .08, .045, photoWidth / 2, photoY, photoZ + .015, gold);
      },
      undefined,
      error => console.warn(`Unable to load hotel reference photo: ${hotel.photo.image}`, error)
    );
  }
  return group;
}

function disposeObjectTree(root) {
  const geometries = new Set();
  const materials = new Set();
  const textures = new Set();
  root.traverse(object => {
    if (object.geometry) geometries.add(object.geometry);
    const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
    objectMaterials.filter(Boolean).forEach(material => {
      materials.add(material);
      if (material.map) textures.add(material.map);
    });
  });
  geometries.forEach(geometry => geometry.dispose());
  materials.forEach(material => material.dispose());
  textures.forEach(texture => texture.dispose());
}

function openHotelModel(hotel) {
  if (sceneState.hotelModelActive) closeHotelModel();
  $("#vehicleModelFrame").removeAttribute("src");
  $("#vehicleStage").classList.remove("has-remote-model");
  sceneState.vehicleRemoteModel = false;
  const canvas = $("#vehicleCanvas");
  canvas.setAttribute("aria-label", `Interactive 3D architectural model of ${hotel.name}; drag to rotate`);
  sceneState.vehicleDisplayModel = sceneState.vehicleModel;
  sceneState.vehicleDisplayModel.removeFromParent();
  sceneState.vehicleModel = createHotelBuildingModel(hotel);
  sceneState.vehicleScene.add(sceneState.vehicleModel);
  sceneState.hotelModelActive = true;
  sceneState.activeHotel = hotel;
  sceneState.vehicleYaw = 0;
  sceneState.vehicleTargetYaw = 0;
  sceneState.vehiclePitch = 0;
  sceneState.vehicleTargetPitch = 0;
  sceneState.vehicleCamera.position.set(15, 10, 18);
  sceneState.vehicleCamera.lookAt(0, 5, 0);
  $("#hotelModelCanvasHost").append(canvas);
  $("#hotelModelTitle").textContent = hotel.name.toUpperCase();
  $("#hotelModelSubtitle").textContent = `${hotel.area.toUpperCase()} / ${hotel.style}`;
  $("#hotelModelDisclosure").textContent = "PROPERTY PHOTO + PROCEDURAL 3D / APPROXIMATION, NOT A VERIFIED SURVEY";
  const visitLink = $("#hotelModelVisit");
  visitLink.hidden = Boolean(hotel.page);
  if (!hotel.page) {
    visitLink.href = hotel.site;
    visitLink.textContent = "OFFICIAL HOTEL ↗";
  }
  $("#hotelModelOverlay").hidden = false;
  document.body.classList.add("hotel-model-open");
  resizeWorld();
  $("#hotelModelClose").focus();
}

function closeHotelModel() {
  if (!sceneState.hotelModelActive) return;
  const hotelModel = sceneState.vehicleModel;
  hotelModel.removeFromParent();
  disposeObjectTree(hotelModel);
  sceneState.vehicleModel = sceneState.vehicleDisplayModel;
  sceneState.vehicleScene.add(sceneState.vehicleModel);
  sceneState.hotelModelActive = false;
  sceneState.activeHotel = null;
  sceneState.vehicleYaw = 0;
  sceneState.vehicleTargetYaw = 0;
  sceneState.vehiclePitch = 0;
  sceneState.vehicleTargetPitch = 0;
  sceneState.vehicleCamera.position.set(8.7, 4.1, 12.4);
  sceneState.vehicleCamera.lookAt(0, .7, 0);
  $("#vehicleStage").append($("#vehicleCanvas"));
  $("#vehicleCanvas").setAttribute("aria-label", "Interactive 3D vehicle model; move or drag to rotate");
  $("#hotelModelOverlay").hidden = true;
  document.body.classList.remove("hotel-model-open");
  resizeWorld();
  if (currentPage === "fleet") setSelectedVehicle(sceneState.selectedVehicle);
  $("#hotelModelClose").blur();
}

function vehicleImageSource(vehicle) {
  return vehicle.imageUrl || `assets/cars/${vehicle.image}`;
}

function vehicleModelEmbedUrl(model) {
  const options = new URLSearchParams({
    autostart: "1",
    preload: "1",
    ui_infos: "0",
    ui_controls: "1",
    ui_watermark: "1",
    ui_help: "0",
    ui_settings: "0",
    ui_vr: "0",
    ui_ar: "0",
    ui_fullscreen: "1",
    transparent: "1",
    ui_theme: "dark"
  });
  return `https://sketchfab.com/models/${model.uid}/embed?${options}`;
}

function renderVehiclePicker() {
  const grid = $("#vehicleGrid");
  if (!grid) return;
  grid.replaceChildren();
  vehicleCatalog.forEach((vehicle, index) => {
    const card = document.createElement("button");
    card.className = "vehicle-card";
    card.type = "button";
    card.dataset.vehicle = vehicle.id;
    card.setAttribute("role", "listitem");
    card.setAttribute("aria-pressed", "false");
    const model = vehicleModelAssets[vehicle.id];
    card.setAttribute("aria-label", `${vehicle.name}; interactive 3D model by ${model.creator}, CC BY 4.0`);
    card.title = `${vehicle.photoTitle} — ${vehicle.artist}; ${vehicle.license}. 3D model: ${model.title} by ${model.creator}, CC BY 4.0.`;
    const image = document.createElement("img");
    image.src = vehicleImageSource(vehicle);
    image.alt = "";
    image.loading = index < 6 ? "eager" : "lazy";
    image.decoding = "async";
    image.draggable = false;
    const name = document.createElement("strong");
    name.textContent = vehicle.name.toUpperCase();
    card.append(image, name);
    card.addEventListener("click", () => {
      setSelectedVehicle(vehicle.id);
      card.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion ? "auto" : "smooth" });
    });
    grid.append(card);
  });
  $("#vehicleCount").textContent = `01 — ${String(vehicleCatalog.length).padStart(2, "0")}`;
}

function setSelectedVehicle(id) {
  const vehicle = vehicleCatalog.find(item => item.id === id);
  if (!vehicle) return;
  sceneState.selectedVehicle = id;
  const isModelPreview = Boolean(vehicle.imageUrl);
  $("#vehiclePhoto").src = vehicleImageSource(vehicle);
  $("#vehiclePhoto").alt = isModelPreview
    ? `${vehicle.name} 3D model preview by ${vehicle.artist}`
    : `${vehicle.name}, photographed by ${vehicle.artist}`;
  $(".vehicle-photo-label").textContent = isModelPreview ? "3D MODEL PREVIEW" : "REAL PHOTOGRAPH";
  $("#vehicleClass").textContent = vehicle.class;
  $("#vehicleTitle").textContent = vehicle.name.toUpperCase();
  $("#vehicleDescription").textContent = vehicle.copy;
  $("#vehiclePower").textContent = vehicle.power;
  $("#vehicleType").textContent = vehicle.type;
  const photoCredit = $("#vehiclePhotoCredit");
  photoCredit.href = vehicle.source;
  photoCredit.textContent = isModelPreview
    ? `MODEL PREVIEW: ${vehicle.artist} / ${vehicle.license}`
    : `PHOTO: ${vehicle.artist} / ${vehicle.license}`;
  photoCredit.title = `${vehicle.photoTitle} — ${vehicle.artist}; ${vehicle.license}`;
  const model = vehicleModelAssets[id];
  const modelFrame = $("#vehicleModelFrame");
  const modelCredit = $("#vehicleModelCredit");
  $("#drive").classList.toggle("remote-model-active", Boolean(model));
  if (model) {
    const modelPage = `https://sketchfab.com/models/${model.uid}`;
    modelFrame.title = `${model.title}, interactive 360-degree 3D model`;
    modelFrame.loading = currentPage === "fleet" ? "eager" : "lazy";
    const embedUrl = vehicleModelEmbedUrl(model);
    if (modelFrame.src !== embedUrl) modelFrame.src = embedUrl;
    $("#vehicleStage").classList.add("has-remote-model");
    modelCredit.href = modelPage;
    modelCredit.textContent = `360° MODEL: ${model.title} / ${model.creator} / CC BY 4.0`;
    modelCredit.title = `${model.title} by ${model.creator} — Sketchfab, CC BY 4.0`;
    sceneState.vehicleRemoteModel = true;
  } else {
    $("#vehicleStage").classList.remove("has-remote-model");
    modelFrame.removeAttribute("src");
    modelCredit.removeAttribute("href");
    modelCredit.textContent = "";
    modelCredit.title = "";
    sceneState.vehicleRemoteModel = false;
  }
  $("#vehicleOrbitLabel").textContent = model
    ? "360° MODEL / DRAG TO ORBIT · SCROLL TO ZOOM"
    : "3D STUDY / MOVE OR DRAG TO ORBIT";
  $$(".vehicle-card").forEach(card => {
    const selected = card.dataset.vehicle === id;
    card.classList.toggle("active", selected);
    card.setAttribute("aria-pressed", String(selected));
  });
  sceneState.vehicleModel?.traverse(object => {
    if (object.isMesh && object.name === "Vehicle body" && object.material.color) {
      object.material.color.setHex(vehicle.color);
    }
  });
  updateFleetSummary();
}

function updateFleetSummary() {
  const vehicle = vehicleCatalog.find(item => item.id === sceneState.selectedVehicle);
  const offer = fleetOffers[sceneState.selectedPackage];
  if (!vehicle || !offer) return;
  $$(".fleet-package").forEach(button => {
    const selected = button.dataset.package === sceneState.selectedPackage;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  $("#fleetSelection").textContent = `${vehicle.name.toUpperCase()} — ${offer.title}`;
  $("#fleetTotal").textContent = `₹ ${formatINR(offer.price)}`;
  $("#fleetReserve").dataset.reserve = `${vehicle.name} — ${offer.label} — ₹ ${formatINR(offer.price)}`;
}

function createVehicleShowroom() {
  const canvas = $("#vehicleCanvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.15));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;
  renderer.setClearColor(0x000000, 0);
  sceneState.vehicleRenderer = renderer;

  const scene = new THREE.Scene();
  sceneState.vehicleScene = scene;
  scene.add(new THREE.HemisphereLight(0xffe6b2, 0x100b04, 2.2));
  const keyLight = new THREE.DirectionalLight(0xffe6c1, 3.1);
  keyLight.position.set(-5, 10, 8);
  scene.add(keyLight);
  const cyanLight = new THREE.PointLight(0xffd36b, 24, 25, 2);
  cyanLight.position.set(-6, 3, -2);
  scene.add(cyanLight);
  const goldLight = new THREE.PointLight(0xd4af37, 19, 22, 2);
  goldLight.position.set(6, 4, 3);
  scene.add(goldLight);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 70),
    new THREE.MeshStandardMaterial({ color: 0x10151b, metalness: .55, roughness: .3 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -.42;
  scene.add(floor);
  const grid = new THREE.GridHelper(34, 34, 0xc99732, 0x46351b);
  grid.position.y = -.405;
  grid.material.transparent = true;
  grid.material.opacity = .24;
  scene.add(grid);

  const model = sceneState.car.clone(true);
  model.position.set(0, -.34, 0);
  model.rotation.set(0, 0, 0);
  model.scale.setScalar(1.25);
  model.traverse(object => {
    if (!object.isMesh) return;
    object.material = Array.isArray(object.material)
      ? object.material.map(material => material.clone())
      : object.material.clone();
  });
  scene.add(model);
  sceneState.vehicleModel = model;
  sceneState.vehicleDisplayModel = model;
  sceneState.vehicleCamera = new THREE.PerspectiveCamera(36, 1, .1, 100);
  sceneState.vehicleCamera.position.set(8.7, 4.1, 12.4);
  sceneState.vehicleCamera.lookAt(0, .7, 0);
}

function setupVehicleOrbit() {
  const canvas = $("#vehicleCanvas");
  canvas.addEventListener("pointerdown", event => {
    sceneState.vehicleDragging = true;
    sceneState.vehicleDragX = event.clientX;
    sceneState.vehicleDragYaw = sceneState.vehicleTargetYaw;
    sceneState.vehicleDragPitch = sceneState.vehicleTargetPitch;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener("pointermove", event => {
    const bounds = canvas.getBoundingClientRect();
    if (sceneState.vehicleDragging) {
      sceneState.vehicleTargetYaw = sceneState.vehicleDragYaw - (event.clientX - sceneState.vehicleDragX) * .012;
      sceneState.vehicleTargetPitch = clamp(sceneState.vehicleDragPitch + (event.clientY - bounds.top - bounds.height / 2) * .0015, -.28, .28);
      return;
    }
    if (event.pointerType === "mouse" && bounds.width && bounds.height) {
      const horizontal = clamp((event.clientX - bounds.left) / bounds.width);
      const vertical = clamp((event.clientY - bounds.top) / bounds.height);
      sceneState.vehicleTargetYaw = (horizontal - .5) * Math.PI * 2;
      sceneState.vehicleTargetPitch = (.5 - vertical) * .44;
    }
  });
  const stopDrag = event => {
    sceneState.vehicleDragging = false;
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
  };
  canvas.addEventListener("pointerup", stopDrag);
  canvas.addEventListener("pointercancel", stopDrag);
  canvas.addEventListener("pointerleave", () => {
    if (sceneState.vehicleDragging) return;
    sceneState.vehicleTargetYaw = 0;
    sceneState.vehicleTargetPitch = 0;
  });
  canvas.addEventListener("wheel", event => {
    if (!sceneState.hotelModelActive) return;
    event.preventDefault();
    const target = new THREE.Vector3(0, 5, 0);
    const offset = sceneState.vehicleCamera.position.clone().sub(target);
    const distance = clamp(offset.length() * Math.exp(event.deltaY * .001), 10, 34);
    sceneState.vehicleCamera.position.copy(target).add(offset.normalize().multiplyScalar(distance));
    sceneState.vehicleCamera.lookAt(target);
  }, { passive: false });
}

function updateElevation(progress) {
  const height = sceneState.cameraTarget.y;
  const feet = Math.round(clamp((height + 8) / 168) * 540);
  $("#altimeterValue").textContent = `${feet < 0 ? "−" + Math.abs(feet) : feet} FT`;
  $("#altimeterFill").style.height = `${clamp((height + 8) / 168) * 100}%`;
  if (sceneState.isWarped) return;
  const floor = progress < .12 ? "ORR" : progress < .28 ? "L01" : progress < .43 ? "L04" : progress < .62 ? "L24" : progress < .82 ? "L38" : progress < .96 ? "L42" : "B2";
  $$(".altimeter-levels button").forEach(button => button.classList.toggle("active", button.textContent === floor));
}

function chapterForProgress(progress) {
  const index = Math.min(5, Math.floor(clamp(progress) * 6));
  const names = ["THE MIDNIGHT APPROACH", "THE GLASS MONOLITH", "THE GRAND ARRIVAL", "GOLCONDA / LEVEL 24", "THE INFINITY WATERLINE", "THE PRIVATE MOTOR VAULT"];
  $("#sceneCounter").textContent = `SCENE ${String(index + 1).padStart(2, "0")} / 06`;
  $("#sceneName").textContent = names[index];
  $$(".story-beat").forEach((beat, beatIndex) => beat.classList.toggle("active", beatIndex === index));
}

function updateChapterUI(page) {
  const index = chapterOrder.indexOf(page);
  document.body.dataset.page = page;
  $("#chapterReadout").textContent = `NOW VIEWING — ${chapterNames[index]}`;
  $("#chapterRailCurrent").textContent = chapterNames[index];
  $$("[data-page-link]").forEach(button => {
    const active = button.dataset.pageLink === page;
    button.classList.toggle("active", active);
    if (active) button.setAttribute("aria-current", "page");
    else button.removeAttribute("aria-current");
  });
  gsap.to("#topLaserFill", {
    width: `${((index + 1) / chapterOrder.length) * 100}%`,
    duration: reducedMotion ? .1 : .45,
    ease: "power2.out"
  });
  $("#previousChapter").disabled = index === 0;
  $("#nextChapter").disabled = index === chapterOrder.length - 1;
}

function showChapter(page) {
  const index = chapterOrder.indexOf(page);
  const panel = $(`[data-page-panel="${page}"]`);
  if (index < 0 || !panel) return;
  currentPage = page;
  $$(".chapter-panel").forEach(chapter => {
    const active = chapter === panel;
    chapter.classList.toggle("is-current", active);
    chapter.hidden = !active;
    chapter.setAttribute("aria-hidden", String(!active));
    if (active) chapter.removeAttribute("inert");
    else chapter.setAttribute("inert", "");
  });
  updateChapterUI(page);
  if (page === "fleet") {
    setSelectedVehicle(sceneState.selectedVehicle);
    resizeWorld();
  } else {
    $("#vehicleModelFrame").removeAttribute("src");
    $("#vehicleStage").classList.remove("has-remote-model");
    sceneState.vehicleRemoteModel = false;
  }
  if (page === "hotels") renderHotelDirectory();
  const targetProgress = chapterProgress[page];
  sceneState.velocity = .22;
  manifestoTween?.kill();
  $("#manifestoText").textContent = "";
  if (page === "philosophy") {
    const sentence = "WE DON’T RENT ROOMS. WE HAND YOU THE HYDERABAD SKYLINE.";
    const reveal = { amount: 0 };
    manifestoTween = gsap.to(reveal, {
      amount: sentence.length,
      duration: reducedMotion ? .1 : 1.8,
      ease: "none",
      onUpdate: () => { $("#manifestoText").textContent = sentence.slice(0, Math.floor(reveal.amount)); }
    });
  }
  gsap.to(sceneState, {
    progress: targetProgress,
    duration: reducedMotion ? .1 : 1.1,
    ease: "power3.inOut",
    onUpdate: () => {
      sceneState.progress = clamp(sceneState.progress);
      updateCameraFromScroll(sceneState.progress);
      updateVehicle(sceneState.progress);
      chapterForProgress(sceneState.progress);
      updateElevation(sceneState.progress);
    }
  });
}

function navigatePage(page) {
  if (!chapterOrder.includes(page) || page === currentPage || pageTransitionLocked) return;
  if (sceneState.isWarped) {
    closePortal();
    gsap.delayedCall(reducedMotion ? .1 : 1.65, () => navigatePage(page));
    return;
  }
  pageTransitionLocked = true;
  gsap.killTweensOf(sceneState);
  const outgoing = currentPage === "opening"
    ? $("#openingScreen")
    : currentPage === "cover"
      ? $("#scrollHero .story-beat.active")
      : $(`[data-page-panel="${currentPage}"]`);
  if (page === "cover") chapterForProgress(0);
  const incoming = page === "cover"
    ? $('#scrollHero .story-beat[data-beat="0"]')
    : $(`[data-page-panel="${page}"]`);
  if (!outgoing || !incoming) {
    pageTransitionLocked = false;
    return;
  }
  const fracture = $("#chapterFracture");
  const shutterLeft = $(".shutter-left", fracture);
  const shutterRight = $(".shutter-right", fracture);
  const closeDuration = reducedMotion ? .08 : .36;
  const openDuration = reducedMotion ? .08 : .42;
  fracture.classList.add("is-active");
  gsap.set(fracture, { visibility: "visible" });
  gsap.set([shutterLeft, shutterRight], { clearProps: "transform" });
  gsap.set(shutterLeft, { xPercent: -100 });
  gsap.set(shutterRight, { xPercent: 100 });
  const turn = gsap.timeline({
    onComplete: () => {
      fracture.classList.remove("is-active");
      gsap.set(fracture, { visibility: "hidden" });
      pageTransitionLocked = false;
    }
  });
  turn.to(shutterLeft, { xPercent: 0, duration: closeDuration, ease: "power3.in" }, 0)
    .to(shutterRight, { xPercent: 0, duration: closeDuration, ease: "power3.in" }, 0)
    .to(outgoing, { x: -28, rotateY: 7, autoAlpha: 0, duration: closeDuration * .72, ease: "power2.in" }, 0)
    .to(".chapter-laser", { scaleY: 1, opacity: 1, duration: closeDuration * .35, ease: "power2.out" }, closeDuration * .55)
    .add(() => {
      if (outgoing === $("#openingScreen")) {
        outgoing.classList.add("is-leaving");
        outgoing.setAttribute("aria-hidden", "true");
        outgoing.setAttribute("inert", "");
      } else if (outgoing !== $("#scrollHero .story-beat[data-beat=\"0\"]")) {
        outgoing.classList.remove("is-current");
        outgoing.setAttribute("aria-hidden", "true");
        outgoing.setAttribute("inert", "");
      }
      if (incoming !== $("#scrollHero .story-beat[data-beat=\"0\"]")) {
        incoming.classList.add("is-current");
        incoming.setAttribute("aria-hidden", "false");
        incoming.removeAttribute("inert");
      }
      gsap.set(incoming, { x: 45, rotateY: -8, autoAlpha: 0, transformOrigin: "left center" });
      showChapter(page);
    }, closeDuration)
    .to(incoming, { x: 0, rotateY: 0, autoAlpha: 1, duration: openDuration, ease: "power3.out" }, closeDuration)
    .to(shutterLeft, { xPercent: -100, duration: openDuration, ease: "power3.inOut" }, closeDuration + .02)
    .to(shutterRight, { xPercent: 100, duration: openDuration, ease: "power3.inOut" }, closeDuration + .02)
    .to(".chapter-laser", { scaleY: .15, opacity: 0, duration: openDuration * .65, ease: "power2.in" }, closeDuration + .02);
}

function portalCameraPosition(key) {
  const spec = portalSpecs[key];
  return new THREE.Vector3(...spec.camera);
}

function setPortalDetails(key) {
  const spec = portalSpecs[key];
  sceneState.selectedPortal = key;
  $("#activeFloorLabel").textContent = spec.label;
  $("#activeFloorTitle").innerHTML = spec.title;
  $("#activeFloorCopy").textContent = spec.description;
  $("#specElevation").textContent = spec.elevation;
  $("#specArea").textContent = spec.area;
  $("#specMaterial").textContent = spec.material;
  $("#specTariff").textContent = spec.tariff;
  $("#drawerCode").textContent = `${key === "b2" ? "B2" : key === "orr" ? "ORR" : "L" + key} / ${spec.drawerElevation}`;
  $("#drawerTitle").innerHTML = spec.title;
  $("#drawerDescription").textContent = spec.description;
  $("#drawerElevation").textContent = spec.drawerElevation;
  $("#drawerArea").textContent = spec.drawerArea;
  $("#drawerTariff").textContent = spec.drawerTariff;
  $(".drawer-reserve").dataset.reserve = `${spec.label} — ${spec.drawerTariff}`;
  $$("[data-portal]").forEach(button => button.classList.toggle("active", button.dataset.portal === key));
  const index = ["42", "38", "24", "4", "1", "b2"].indexOf(key);
  $("#activeFloorNumber").textContent = `${String(Math.max(0, index) + 1).padStart(2, "0")} / 06`;
  const altimeterPortal = { "42": "L42", "38": "L38", "24": "L24", "4": "L04", "1": "L01", b2: "B2", orr: "ORR" }[key];
  const targetPosition = portalCameraPosition(key);
  const focusHeights = { "42": 160, "38": 145, "24": 92, "4": 15, "1": 8, b2: -8, orr: 2 };
  const target = new THREE.Vector3(spec.camera[0] * .06, focusHeights[key], spec.camera[2] * .25);
  sceneState.cameraTarget.copy(target);
  updateElevation(spec.chapter / 5);
  $$(".altimeter-levels button").forEach(button => button.classList.toggle("active", button.textContent === altimeterPortal));
  return { targetPosition, target };
}

function warpToPortal(key) {
  const normalizedKey = key === "b2" || key === "orr" ? key : String(key);
  if (!portalSpecs[normalizedKey]) return;
  if (sceneState.isWarped) {
    sceneState.warpTimeline?.kill();
    gsap.killTweensOf(sceneState.camera.position);
    gsap.killTweensOf(sceneState.camera);
    gsap.killTweensOf(sceneState);
    $("#specDrawer").classList.remove("is-open");
    $("#specDrawer").setAttribute("aria-hidden", "true");
    $("#specDrawer").setAttribute("inert", "");
  }
  const camera = sceneState.camera;
  const destination = portalCameraPosition(normalizedKey);
  const start = camera.position.clone();
  const startTarget = sceneState.cameraTarget.clone();
  const detail = setPortalDetails(normalizedKey);
  const pullback = start.clone().add(new THREE.Vector3(0, 24, 46));
  const controlOne = pullback.clone().lerp(destination, .28).add(new THREE.Vector3(0, 27, 16));
  const controlTwo = destination.clone().lerp(start, .18).add(new THREE.Vector3(9, 18, 13));
  const spline = new THREE.CatmullRomCurve3([start, controlOne, controlTwo, destination], false, "centripetal", .45);
  const flight = { progress: 0 };
  const destinationTarget = detail.target;
  sceneState.isWarped = true;
  gsap.to(sceneState, { warp: 1, duration: .18, ease: "power2.out", overwrite: true });
  const timeline = gsap.timeline({
    onComplete: () => {
      $("#specDrawer").classList.add("is-open");
      $("#specDrawer").setAttribute("aria-hidden", "false");
      $("#specDrawer").removeAttribute("inert");
      sceneState.warp = .08;
    }
  });
  sceneState.warpTimeline = timeline;
  timeline.to(camera.position, {
    x: pullback.x, y: pullback.y, z: pullback.z, duration: .5, ease: "power2.in",
    onUpdate: () => camera.lookAt(startTarget)
  });
  timeline.to(camera, { fov: 88, duration: .5, ease: "power2.inOut", onUpdate: () => camera.updateProjectionMatrix() }, 0);
  timeline.to(flight, {
    progress: 1, duration: 1.7, ease: "power3.inOut",
    onUpdate: () => {
      camera.position.copy(spline.getPointAt(flight.progress));
      sceneState.cameraTarget.copy(startTarget).lerp(destinationTarget, flight.progress);
      camera.lookAt(sceneState.cameraTarget);
    }
  });
  timeline.to(camera, { fov: 42, duration: .7, ease: "power2.out", onUpdate: () => camera.updateProjectionMatrix() }, 1.55);
  timeline.to(sceneState, { warp: 0, duration: .9, ease: "power2.out" }, 1.7);
  timeline.add(() => {
    camera.position.copy(destination);
    sceneState.cameraTarget.copy(destinationTarget);
    camera.lookAt(destinationTarget);
  }, 2.2);
}

function closePortal() {
  if (!sceneState.isWarped) return;
  sceneState.warpTimeline?.kill();
  $("#specDrawer").classList.remove("is-open");
  $("#specDrawer").setAttribute("aria-hidden", "true");
  $("#specDrawer").setAttribute("inert", "");
  const camera = sceneState.camera;
  const pulled = camera.position.clone().add(new THREE.Vector3(0, 20, 38));
  gsap.timeline({
    onComplete: () => {
      sceneState.isWarped = false;
      camera.fov = 42;
      camera.updateProjectionMatrix();
      updateCameraFromScroll(sceneState.progress);
      updateElevation(sceneState.progress);
    }
  }).addLabel("zoomout")
    .to(camera.position, { x: pulled.x, y: pulled.y, z: pulled.z, duration: .48, ease: "power2.in" })
    .to(camera, { fov: 80, duration: .48, ease: "power2.inOut", onUpdate: () => camera.updateProjectionMatrix() }, 0)
    .to(camera.position, {
      x: sceneState.baseCamera.x, y: sceneState.baseCamera.y, z: sceneState.baseCamera.z,
      duration: 1.05, ease: "power3.inOut"
    })
    .to(camera, { fov: 42, duration: .7, ease: "power2.out", onUpdate: () => camera.updateProjectionMatrix() }, .9)
    .to(sceneState, { warp: 0, duration: .7 }, .8);
}

function setupInteractions() {
  let depthTarget = null;
  const resetDepthMotion = target => {
    if (!target) return;
    target.style.rotate = "none";
    target.style.translate = "none";
  };
  document.addEventListener("pointermove", event => {
    sceneState.pointer.set(event.clientX / window.innerWidth, 1 - event.clientY / window.innerHeight);
    const depth = event.target.closest("button:not(:disabled),a,[role='button']");
    if (event.pointerType === "touch" || reducedMotion) {
      resetDepthMotion(depthTarget);
      depthTarget = null;
    } else {
      if (depth !== depthTarget) {
        resetDepthMotion(depthTarget);
        depthTarget = depth;
        if (depth && !depth.classList.contains("depth-motion")) {
          depth.style.setProperty("--depth-transition", getComputedStyle(depth).transition);
          depth.classList.add("depth-motion");
        }
      }
      if (depth) {
        const bounds = depth.getBoundingClientRect();
        const x = clamp((event.clientX - bounds.left) / bounds.width - .5, -.5, .5);
        const y = clamp((event.clientY - bounds.top) / bounds.height - .5, -.5, .5);
        const tiltX = -y * 5;
        const tiltY = x * 5;
        const angle = Math.hypot(tiltX, tiltY);
        depth.style.rotate = angle > .001
          ? `${tiltX / angle} ${tiltY / angle} 0 ${angle}deg`
          : "none";
        const lift = 5 + (1 - Math.min(1, Math.hypot(x, y) * 1.414)) * 3;
        depth.style.translate = `0 -2px ${lift}px`;
      }
    }
    const card = event.target.closest(".hotel-card,.vehicle-card,.fleet-package,.fleet-card,.estate-visual,.suite-art,.vehicle-stage");
    if (card && event.pointerType !== "touch") {
      const bounds = card.getBoundingClientRect();
      const x = clamp((event.clientX - bounds.left) / bounds.width - .5, -.5, .5);
      const y = clamp((event.clientY - bounds.top) / bounds.height - .5, -.5, .5);
      card.style.setProperty("--card-tilt-x", `${x * 4}deg`);
      card.style.setProperty("--card-tilt-y", `${y * -4}deg`);
    }
  }, { passive: true });
  document.addEventListener("pointerout", event => {
    const depth = event.target.closest("button,a,[role='button']");
    if (depth && depth === depthTarget && !depth.contains(event.relatedTarget)) {
      resetDepthMotion(depth);
      depthTarget = null;
    }
    const card = event.target.closest(".hotel-card,.vehicle-card,.fleet-package,.fleet-card,.estate-visual,.suite-art,.vehicle-stage");
    if (card && !card.contains(event.relatedTarget)) {
      card.style.setProperty("--card-tilt-x", "0deg");
      card.style.setProperty("--card-tilt-y", "0deg");
    }
  });
  window.addEventListener("pointermove", event => {
    sceneState.pointerWorld.set((event.clientX / window.innerWidth) * 2 - 1, 1 - (event.clientY / window.innerHeight) * 2);
  }, { passive: true });

  $$("[data-page-link]").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    navigatePage(button.dataset.pageLink);
    $("#chapterRail").open = false;
    $(".hud-nav").classList.remove("open");
    $(".mobile-menu").setAttribute("aria-expanded", "false");
    document.body.classList.remove("menu-open");
  }));
  $("#enterExperience").addEventListener("click", () => navigatePage("cover"));
  $("#previousChapter").addEventListener("click", () => {
    const index = chapterOrder.indexOf(currentPage);
    if (index > 0) navigatePage(chapterOrder[index - 1]);
  });
  $("#nextChapter").addEventListener("click", () => {
    const index = chapterOrder.indexOf(currentPage);
    if (index < chapterOrder.length - 1) navigatePage(chapterOrder[index + 1]);
  });
  document.addEventListener("keydown", event => {
    if (currentPage === "opening" || sceneState.hotelModelActive || !$("#reservationModal").hidden || sceneState.isWarped || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowRight") $("#nextChapter").click();
    if (event.key === "ArrowLeft") $("#previousChapter").click();
  });

  $$("[data-portal]").forEach(button => button.addEventListener("click", () => warpToPortal(button.dataset.portal)));
  $("#zoomOutButton").addEventListener("click", closePortal);
  $(".drawer-close").addEventListener("click", closePortal);
  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      if (sceneState.hotelModelActive) closeHotelModel();
      else if (!$("#reservationModal").hidden) closeReservation();
      else closePortal();
    }
  });
  $("#hotelModelClose").addEventListener("click", closeHotelModel);

  $$(".fleet-package").forEach(button => button.addEventListener("click", () => {
    sceneState.selectedPackage = button.dataset.package;
    updateFleetSummary();
  }));
  $("#hotelSearch").addEventListener("input", () => {
    clearTimeout(hotelFilterTimer);
    hotelFilterTimer = setTimeout(() => {
      sceneState.hotelPage = 0;
      renderHotelDirectory();
    }, 100);
  });
  $("#hotelArea").addEventListener("change", () => {
    sceneState.hotelPage = 0;
    renderHotelDirectory();
  });
  $("#hotelPrevious").addEventListener("click", () => {
    sceneState.hotelPage = Math.max(0, sceneState.hotelPage - 1);
    renderHotelDirectory();
  });
  $("#hotelNext").addEventListener("click", () => {
    sceneState.hotelPage += 1;
    renderHotelDirectory();
  });
  $("#vehiclePrevious").addEventListener("click", () => {
    $("#vehiclePickerViewport").scrollBy({ left: -$("#vehiclePickerViewport").clientWidth * .78, behavior: reducedMotion ? "auto" : "smooth" });
  });
  $("#vehicleNext").addEventListener("click", () => {
    $("#vehiclePickerViewport").scrollBy({ left: $("#vehiclePickerViewport").clientWidth * .78, behavior: reducedMotion ? "auto" : "smooth" });
  });

  $$("[data-reserve]").forEach(button => button.addEventListener("click", () => openReservation(button.dataset.reserve)));
  $(".modal-close").addEventListener("click", closeReservation);
  $(".confirmation-close").addEventListener("click", closeReservation);
  $("#reservationModal").addEventListener("click", event => {
    if (event.target === $("#reservationModal")) closeReservation();
  });
  $("#reservationForm").addEventListener("submit", event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const details = new FormData(form);
    const name = details.get("guestName").toString().trim();
    $(".confirmation-copy").textContent = `Thank you, ${name}. Your request for ${details.get("selection")} is ready for our Hyderabad concierge. We’ll be in touch to personalise your arrival.`;
    $(".reservation-form-view").hidden = true;
    $(".reservation-confirmation").hidden = false;
    $(".confirmation-close").focus();
  });

  const menuButton = $(".mobile-menu");
  menuButton.addEventListener("click", () => {
    const isOpen = menuButton.getAttribute("aria-expanded") !== "true";
    menuButton.setAttribute("aria-expanded", String(isOpen));
    $(".hud-nav").classList.toggle("open", isOpen);
    document.body.classList.toggle("menu-open", isOpen);
  });
}

function openReservation(selection) {
  $("#reservationSelection").value = selection;
  $(".reservation-form-view").hidden = false;
  $(".reservation-confirmation").hidden = true;
  $("#reservationModal").hidden = false;
  document.body.classList.add("modal-open");
  $(".modal-close").focus();
}

function closeReservation() {
  $("#reservationModal").hidden = true;
  document.body.classList.remove("modal-open");
}

function renderFrame(now) {
  const delta = Math.min(.05, Math.max(.001, (now - sceneState.time) / 1000 || .016));
  sceneState.time = now;
  sceneState.velocity *= Math.exp(-delta * 3.71);
  if (document.visibilityState === "visible" && delta < .1 && sceneState.performanceLevel < 2) {
    if (!sceneState.performanceSampleStart) sceneState.performanceSampleStart = now;
    sceneState.performanceSampleFrames += 1;
    if (now - sceneState.performanceSampleStart >= 1800) {
      const fps = sceneState.performanceSampleFrames * 1000 / (now - sceneState.performanceSampleStart);
      sceneState.performanceSampleStart = now;
      sceneState.performanceSampleFrames = 0;
      if (fps < 28) lowerRenderingQuality();
    }
  } else {
    sceneState.performanceSampleStart = 0;
    sceneState.performanceSampleFrames = 0;
  }
  if (!sceneState.isWarped) {
    const cameraFollow = 1 - Math.exp(-delta * 7.67);
    sceneState.camera.position.lerp(sceneState.baseCamera, cameraFollow);
    sceneState.cameraTarget.lerp(sceneState.baseTarget, cameraFollow);
    sceneState.camera.lookAt(sceneState.cameraTarget);
  }
  if (sceneState.elevator) {
    const minY = 3;
    const maxY = 158;
    const liftPhase = (now * .000075) % 2;
    sceneState.elevator.position.y = minY + (liftPhase < 1 ? liftPhase : 2 - liftPhase) * (maxY - minY);
  }
  if (sceneState.car) {
    updateVehicle(sceneState.progress);
  }
  if (sceneState.steam) {
    const positions = sceneState.steam.geometry.attributes.position.array;
    for (let particle = 0; particle < sceneState.steam.count; particle++) {
      const offset = particle * 3;
      const phase = now * .00024 + particle * .73;
      positions[offset] = sceneState.steam.origins[offset] + Math.sin(phase) * .16;
      positions[offset + 1] = sceneState.steam.origins[offset + 1] + ((phase % 3.4) + 3.4) % 3.4;
      positions[offset + 2] = sceneState.steam.origins[offset + 2] + Math.cos(phase * .76) * .14;
    }
    sceneState.steam.geometry.attributes.position.needsUpdate = true;
  }
  if (sceneState.sparkles) {
    sceneState.sparkles.uniforms.uTime.value = now * .001;
    sceneState.sparkles.uniforms.uPointer.value.copy(sceneState.pointerWorld);
    sceneState.sparkles.uniforms.uVelocity.value = sceneState.velocity;
    sceneState.sparkles.uniforms.uProgress.value = sceneState.progress;
  }
  updateWaterAndPost();
  if (sceneState.performanceLevel === 2) sceneState.renderer.render(sceneState.scene, sceneState.camera);
  else sceneState.composer.render(delta);
  if (sceneState.vehicleRenderer && sceneState.vehicleModel && (
    sceneState.hotelModelActive || (currentPage === "fleet" && !sceneState.vehicleRemoteModel)
  )) {
    if (sceneState.hotelModelActive && !sceneState.vehicleDragging) {
      sceneState.vehicleTargetYaw = (sceneState.vehicleTargetYaw + delta * .12) % (Math.PI * 2);
    }
    const turn = target => THREE.MathUtils.euclideanModulo(target + Math.PI, Math.PI * 2) - Math.PI;
    const yawDelta = turn(sceneState.vehicleTargetYaw - sceneState.vehicleYaw);
    sceneState.vehicleYaw += yawDelta * Math.min(1, delta * 8);
    sceneState.vehiclePitch += (sceneState.vehicleTargetPitch - sceneState.vehiclePitch) * Math.min(1, delta * 8);
    sceneState.vehicleModel.rotation.set(sceneState.vehiclePitch, sceneState.vehicleYaw, 0);
    sceneState.vehicleRenderer.render(sceneState.vehicleScene, sceneState.vehicleCamera);
  }
  requestAnimationFrame(renderFrame);
}

function init() {
  createWorld();
  createVehicleShowroom();
  renderHotelDirectory();
  renderVehiclePicker();
  setSelectedVehicle(sceneState.selectedVehicle);
  updateFleetSummary();
  updateCameraFromScroll(0);
  chapterForProgress(0);
  updateElevation(0);
  $$(".chapter-panel").forEach(panel => {
    panel.classList.remove("is-current");
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    panel.setAttribute("inert", "");
  });
  resizeWorld();
  setupInteractions();
  setupVehicleOrbit();
  const handleViewportResize = () => {
    resizeWorld();
    renderHotelDirectory();
  };
  window.addEventListener("resize", handleViewportResize, { passive: true });
  window.visualViewport?.addEventListener("resize", resizeWorld, { passive: true });
  if (reducedMotion) {
    sceneState.progress = 0;
    updateCameraFromScroll(0);
  }
  requestAnimationFrame(renderFrame);
}

init();
