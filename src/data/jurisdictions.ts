// Jurisdiction sub-divisions for countries where law varies regionally.
// Countries not listed here have a single national jurisdiction and the
// selector step is skipped.
export const JURISDICTIONS: Record<string, string[]> = {
  US: [
    "Federal",
    "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut",
    "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho",
    "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine",
    "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri",
    "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico",
    "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon",
    "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee",
    "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia",
    "Wisconsin", "Wyoming",
  ],
  CA: [
    "Federal", "Alberta", "British Columbia", "Manitoba", "New Brunswick",
    "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia", "Nunavut",
    "Ontario", "Prince Edward Island", "Quebec", "Saskatchewan", "Yukon",
  ],
  AU: [
    "Commonwealth (Federal)", "Australian Capital Territory", "New South Wales",
    "Northern Territory", "Queensland", "South Australia", "Tasmania", "Victoria",
    "Western Australia",
  ],
  GB: ["England and Wales", "Scotland", "Northern Ireland"],
  DE: [
    "Federal", "Baden-Württemberg", "Bavaria", "Berlin", "Brandenburg", "Bremen",
    "Hamburg", "Hesse", "Lower Saxony", "Mecklenburg-Vorpommern", "North Rhine-Westphalia",
    "Rhineland-Palatinate", "Saarland", "Saxony", "Saxony-Anhalt", "Schleswig-Holstein",
    "Thuringia",
  ],
  CH: [
    "Federal", "Aargau", "Appenzell Ausserrhoden", "Appenzell Innerrhoden", "Basel-Landschaft",
    "Basel-Stadt", "Bern", "Fribourg", "Geneva", "Glarus", "Graubünden", "Jura", "Lucerne",
    "Neuchâtel", "Nidwalden", "Obwalden", "Schaffhausen", "Schwyz", "Solothurn",
    "St. Gallen", "Ticino", "Thurgau", "Uri", "Valais", "Vaud", "Zug", "Zürich",
  ],
  IN: [
    "Union (Federal)", "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar",
    "Chhattisgarh", "Goa", "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand",
    "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya",
    "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu",
    "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal",
    "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
  ],
  AE: [
    "Federal", "Abu Dhabi", "Ajman", "Dubai", "Fujairah", "Ras Al Khaimah", "Sharjah",
    "Umm Al Quwain", "DIFC (Dubai International Financial Centre)", "ADGM (Abu Dhabi Global Market)",
  ],
  BR: [
    "Federal", "Acre", "Alagoas", "Amapá", "Amazonas", "Bahia", "Ceará", "Distrito Federal",
    "Espírito Santo", "Goiás", "Maranhão", "Mato Grosso", "Mato Grosso do Sul", "Minas Gerais",
    "Pará", "Paraíba", "Paraná", "Pernambuco", "Piauí", "Rio de Janeiro", "Rio Grande do Norte",
    "Rio Grande do Sul", "Rondônia", "Roraima", "Santa Catarina", "São Paulo", "Sergipe", "Tocantins",
  ],
  MX: [
    "Federal", "Aguascalientes", "Baja California", "Baja California Sur", "Campeche",
    "Chiapas", "Chihuahua", "Coahuila", "Colima", "Durango", "Guanajuato", "Guerrero",
    "Hidalgo", "Jalisco", "Mexico City", "México State", "Michoacán", "Morelos", "Nayarit",
    "Nuevo León", "Oaxaca", "Puebla", "Querétaro", "Quintana Roo", "San Luis Potosí", "Sinaloa",
    "Sonora", "Tabasco", "Tamaulipas", "Tlaxcala", "Veracruz", "Yucatán", "Zacatecas",
  ],
  AR: [
    "Federal", "Buenos Aires", "Buenos Aires (City)", "Catamarca", "Chaco", "Chubut",
    "Córdoba", "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
    "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
    "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
  ],
  ZA: [
    "National", "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
    "Mpumalanga", "Northern Cape", "North West", "Western Cape",
  ],
  NG: [
    "Federal", "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue",
    "Borno", "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT (Abuja)",
    "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara",
    "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
    "Sokoto", "Taraba", "Yobe", "Zamfara",
  ],
  PK: ["Federal", "Punjab", "Sindh", "Khyber Pakhtunkhwa", "Balochistan", "Islamabad Capital Territory", "Gilgit-Baltistan", "Azad Jammu and Kashmir"],
  MY: ["Federal", "Johor", "Kedah", "Kelantan", "Malacca", "Negeri Sembilan", "Pahang", "Penang", "Perak", "Perlis", "Sabah", "Sarawak", "Selangor", "Terengganu", "Kuala Lumpur", "Labuan", "Putrajaya"],
  ES: ["National", "Andalusia", "Aragon", "Asturias", "Balearic Islands", "Basque Country", "Canary Islands", "Cantabria", "Castile and León", "Castile-La Mancha", "Catalonia", "Extremadura", "Galicia", "La Rioja", "Madrid", "Murcia", "Navarre", "Valencia"],
  IT: ["National", "Abruzzo", "Aosta Valley", "Apulia", "Basilicata", "Calabria", "Campania", "Emilia-Romagna", "Friuli-Venezia Giulia", "Lazio", "Liguria", "Lombardy", "Marche", "Molise", "Piedmont", "Sardinia", "Sicily", "Trentino-Alto Adige", "Tuscany", "Umbria", "Veneto"],
  RU: ["Federal", "Republic", "Krai", "Oblast", "Federal City", "Autonomous Okrug"],
  CN: ["National", "Beijing", "Shanghai", "Tianjin", "Chongqing", "Guangdong", "Hong Kong SAR", "Macau SAR", "Other Province"],
  BE: ["Federal", "Flanders", "Wallonia", "Brussels-Capital Region"],
  NL: ["National", "Drenthe", "Flevoland", "Friesland", "Gelderland", "Groningen", "Limburg", "North Brabant", "North Holland", "Overijssel", "South Holland", "Utrecht", "Zeeland"],
};

export function getJurisdictions(countryCode: string): string[] {
  return JURISDICTIONS[countryCode] ?? [];
}
