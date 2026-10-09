/**
 * Believable Pakistani Travel Agency Context Datasets
 * Contains rich, culturally authentic names, Pakistani cities & neighborhoods,
 * synthetic contact details, local suppliers, and travel packages.
 */

export const PAKISTANI_FIRST_NAMES = [
  "Muhammad", "Hamza", "Ayesha", "Usman", "Fatima", "Bilal", "Saad", "Hira",
  "Zainab", "Ali", "Omer", "Maryam", "Ahmed", "Kashif", "Sana", "Tariq",
  "Asim", "Noman", "Zubair", "Hassan", "Farhan", "Mahnoor", "Rabia", "Iqra",
  "Waqas", "Shahid", "Kamran", "Sadia", "Khadija", "Salman", "Imran", "Bushra",
  "Mehwish", "Zeeshan", "Adeel", "Fahad", "Shazia", "Amina", "Nasir", "Adnan",
  "Junaid", "Naveed", "Sidra", "Huma", "Atif", "Arsalan", "Danish", "Jawad",
];

export const PAKISTANI_LAST_NAMES = [
  "Khan", "Ahmed", "Raza", "Noor", "Siddiqui", "Hassan", "Malik", "Farooqi",
  "Ghani", "Chaudhry", "Bhatti", "Qureshi", "Abbasi", "Ansari", "Mirza", "Sheikh",
  "Shah", "Memon", "Butt", "Iqbal", "Mahmood", "Yousuf", "Rasheed", "Rehman",
  "Dar", "Akhtar", "Zahid", "Jamil", "Baig", "Hashmi", "Saeed", "Tariq",
];

export const PAKISTANI_CITIES_AND_AREAS = [
  { city: "Karachi", area: "DHA Phase 6", province: "Sindh" },
  { city: "Karachi", area: "Clifton Block 4", province: "Sindh" },
  { city: "Karachi", area: "Gulshan-e-Iqbal Block 13D", province: "Sindh" },
  { city: "Karachi", area: "PECHS Block 2", province: "Sindh" },
  { city: "Karachi", area: "North Nazimabad Block H", province: "Sindh" },
  { city: "Karachi", area: "Gulistan-e-Johar Block 7", province: "Sindh" },
  { city: "Karachi", area: "Bahria Town Sector B", province: "Sindh" },
  { city: "Lahore", area: "Gulberg III", province: "Punjab" },
  { city: "Lahore", area: "DHA Phase 5", province: "Punjab" },
  { city: "Lahore", area: "Johar Town Phase 1", province: "Punjab" },
  { city: "Lahore", area: "Model Town Block C", province: "Punjab" },
  { city: "Lahore", area: "Cantt", province: "Punjab" },
  { city: "Islamabad", area: "Sector F-10/2", province: "ICT" },
  { city: "Islamabad", area: "Sector F-7 Markaz", province: "ICT" },
  { city: "Islamabad", area: "Sector G-11/3", province: "ICT" },
  { city: "Islamabad", area: "Bahria Enclave Sector A", province: "ICT" },
  { city: "Rawalpindi", area: "Bahria Town Phase 4", province: "Punjab" },
  { city: "Rawalpindi", area: "Chaklala Scheme 3", province: "Punjab" },
  { city: "Faisalabad", area: "Civil Lines", province: "Punjab" },
  { city: "Multan", area: "Gulgasht Colony", province: "Punjab" },
  { city: "Peshawar", area: "Hayatabad Phase 2", province: "KPK" },
  { city: "Hyderabad", area: "Latifabad Unit 7", province: "Sindh" },
];

export const CORPORATE_CLIENT_NAMES = [
  "Indus Tech Solutions (Pvt) Ltd",
  "Habib Synthetics Ltd",
  "Fauji Fertilizer Distributors",
  "Matrix Logistics Karachi",
  "Khyber Trading Corporation",
  "Packages Mills Corporate Group",
  "Crescent Textile Mills Ltd",
  "Engro Chemicals Regional Office",
  "Apex Pharmaceuticals Multan",
  "Al-Meezan Investment Advisors",
  "Atlas Honda Dealership Network",
  "National Foods Corporate Services",
];

export const DEMO_USERS_SPEC = [
  {
    role: "owner",
    firstName: "Tariq",
    lastName: "Siddiqui",
    email: "owner@travelflow.demo",
    phone: "+92 300 1122334",
    branchCode: "KHI",
    title: "Chief Executive Officer & Founder",
  },
  {
    role: "admin",
    firstName: "Asim",
    lastName: "Farooqi",
    email: "admin@travelflow.demo",
    phone: "+92 300 2233445",
    branchCode: "KHI",
    title: "General Manager / System Admin",
  },
  {
    role: "manager",
    firstName: "Bilal",
    lastName: "Ahmed",
    email: "manager.khi@travelflow.demo",
    phone: "+92 300 3344556",
    branchCode: "KHI",
    title: "Karachi Branch Manager",
  },
  {
    role: "manager",
    firstName: "Usman",
    lastName: "Ghani",
    email: "manager.lhr@travelflow.demo",
    phone: "+92 300 4455667",
    branchCode: "LHR",
    title: "Lahore Branch Manager",
  },
  {
    role: "agent",
    firstName: "Hamza",
    lastName: "Khan",
    email: "agent.hamza@travelflow.demo",
    phone: "+92 300 5566778",
    branchCode: "KHI",
    title: "Senior Travel Consultant (Umrah & Hajj)",
  },
  {
    role: "agent",
    firstName: "Ayesha",
    lastName: "Fatima",
    email: "agent.ayesha@travelflow.demo",
    phone: "+92 300 6677889",
    branchCode: "KHI",
    title: "Holiday & Honeymoon Specialist",
  },
  {
    role: "agent",
    firstName: "Saad",
    lastName: "Hassan",
    email: "agent.saad@travelflow.demo",
    phone: "+92 300 7788990",
    branchCode: "KHI",
    title: "Corporate Ticketing Agent",
  },
  {
    role: "agent",
    firstName: "Zainab",
    lastName: "Noor",
    email: "agent.zainab@travelflow.demo",
    phone: "+92 300 8899001",
    branchCode: "LHR",
    title: "Senior Outbound Consultant",
  },
  {
    role: "agent",
    firstName: "Fahad",
    lastName: "Raza",
    email: "agent.fahad@travelflow.demo",
    phone: "+92 300 9900112",
    branchCode: "LHR",
    title: "Northern Areas & Domestic Specialist",
  },
  {
    role: "agent",
    firstName: "Hira",
    lastName: "Malik",
    email: "agent.hira@travelflow.demo",
    phone: "+92 300 0011223",
    branchCode: "ISB",
    title: "Visa & International Tours Officer",
  },
  {
    role: "accountant",
    firstName: "Kashif",
    lastName: "Mehmood",
    email: "accountant@travelflow.demo",
    phone: "+92 300 1230044",
    branchCode: "KHI",
    title: "Chief Accountant & Financial Controller",
  },
  {
    role: "operations",
    firstName: "Faisal",
    lastName: "Nadeem",
    email: "operations@travelflow.demo",
    phone: "+92 300 2340055",
    branchCode: "KHI",
    title: "Operations & Ticketing Coordinator",
  },
];

export const DEMO_SUPPLIERS_SPEC = [
  {
    name: "Pakistan International Airlines (PIA)",
    category: "Airline",
    contactPerson: "Khurram Shahzad",
    email: "agents@piac.demo",
    phone: "+92 21 111 786 786",
    city: "Karachi",
    country: "Pakistan",
    address: "PIA Head Office, Jinnah International Airport",
    serviceTypes: ["flight"],
  },
  {
    name: "Airblue Ltd",
    category: "Airline",
    contactPerson: "Nadeem Akhtar",
    email: "sales.corporate@airblue.demo",
    phone: "+92 51 111 247 258",
    city: "Islamabad",
    country: "Pakistan",
    address: "ISE Towers, Jinnah Avenue, Blue Area",
    serviceTypes: ["flight"],
  },
  {
    name: "SereneAir (Pvt) Ltd",
    category: "Airline",
    contactPerson: "Arif Mehmood",
    email: "b2b@sereneair.demo",
    phone: "+92 51 111 737 363",
    city: "Islamabad",
    country: "Pakistan",
    address: "Sector F-7/2, Jinnah Avenue",
    serviceTypes: ["flight"],
  },
  {
    name: "Emirates Airline Pakistan",
    category: "Airline",
    contactPerson: "Shahid Lateef",
    email: "trade.pakistan@emirates.demo",
    phone: "+92 21 35683333",
    city: "Karachi",
    country: "Pakistan",
    address: "Avari Towers, Fatima Jinnah Road",
    serviceTypes: ["flight"],
  },
  {
    name: "FlyDubai Commercial Hub",
    category: "Airline",
    contactPerson: "Zeeshan Haider",
    email: "support.pk@flydubai.demo",
    phone: "+92 21 35631234",
    city: "Karachi",
    country: "Pakistan",
    address: "Clifton Centre, Clifton",
    serviceTypes: ["flight"],
  },
  {
    name: "Saudia Airlines (Saudi Arabian Airlines)",
    category: "Airline",
    contactPerson: "Tariq Al-Harbi",
    email: "agencydesk.khi@saudia.demo",
    phone: "+92 21 35684444",
    city: "Karachi",
    country: "Pakistan",
    address: "Hotel Metropole, Club Road",
    serviceTypes: ["flight"],
  },
  {
    name: "Al-Safwah Umrah & Hospitality Group",
    category: "Umrah Operator",
    contactPerson: "Sheikh Abdul Rehman",
    email: "contracts@alsafwah-umrah.demo",
    phone: "+966 12 555 1234",
    city: "Makkah",
    country: "Saudi Arabia",
    address: "Abraj Al Bait Complex, Makkah",
    serviceTypes: ["hotel", "transfer", "visa"],
  },
  {
    name: "Millennium Makkah & Madinah Hotels",
    category: "Hotel Provider",
    contactPerson: "Mohammad Al-Qurashi",
    email: "b2b@millennium-sa.demo",
    phone: "+966 12 566 9876",
    city: "Makkah",
    country: "Saudi Arabia",
    address: "Ajyad Street, Makkah",
    serviceTypes: ["hotel"],
  },
  {
    name: "Alpha Tours DMC Dubai",
    category: "Tour Operator",
    contactPerson: "Sami Mansoor",
    email: "reservations@alphatours.demo",
    phone: "+971 4 294 9888",
    city: "Dubai",
    country: "United Arab Emirates",
    address: "Business Bay, Tower B, Dubai",
    serviceTypes: ["hotel", "transfer", "activity"],
  },
  {
    name: "Serena Hotels & Resorts Pakistan",
    category: "Hotel Provider",
    contactPerson: "Munir Abbasi",
    email: "reservations@serena.demo",
    phone: "+92 51 287 4000",
    city: "Islamabad",
    country: "Pakistan",
    address: "Khayaban-e-Suhrawardy, Islamabad",
    serviceTypes: ["hotel", "activity"],
  },
  {
    name: "Shangrila Resort Skardu",
    category: "Tour Operator",
    contactPerson: "Col. (R) Jamil",
    email: "info@shangrilaresorts.demo",
    phone: "+92 5815 450146",
    city: "Skardu",
    country: "Pakistan",
    address: "Kachura Lake, Skardu, Gilgit-Baltistan",
    serviceTypes: ["hotel", "transfer", "activity"],
  },
  {
    name: "GVC Global Visa Concierge",
    category: "Visa Partner",
    contactPerson: "Danish Mumtaz",
    email: "operations@gvc-visa.demo",
    phone: "+92 21 3537 9900",
    city: "Karachi",
    country: "Pakistan",
    address: "Ocean Mall Executive Tower, Clifton",
    serviceTypes: ["visa", "insurance"],
  },
];

export interface TravelPackageTemplate {
  title: string;
  travelType: string;
  destination: string;
  defaultDurationDays: number;
  services: Array<{
    category: "flight" | "hotel" | "transfer" | "visa" | "activity" | "insurance";
    supplierName: string;
    title: string;
    description: string;
    unitCost: number;
    unitSelling: number;
  }>;
}

export const TRAVEL_PACKAGES: TravelPackageTemplate[] = [
  {
    title: "15-Day Economy Umrah Package (Makkah & Madinah)",
    travelType: "Umrah",
    destination: "Saudi Arabia (Makkah & Madinah)",
    defaultDurationDays: 15,
    services: [
      {
        category: "flight",
        supplierName: "Pakistan International Airlines (PIA)",
        title: "Return Flight Ticket: KHI/LHR to JED/MED",
        description: "Direct return economy flight ticket with 40kg baggage",
        unitCost: 110000,
        unitSelling: 135000,
      },
      {
        category: "hotel",
        supplierName: "Al-Safwah Umrah & Hospitality Group",
        title: "8 Nights Makkah Hotel (3-Star, Shuttle Service)",
        description: "Quad sharing room with breakfast, 24/7 bus to Haram",
        unitCost: 65000,
        unitSelling: 85000,
      },
      {
        category: "hotel",
        supplierName: "Millennium Makkah & Madinah Hotels",
        title: "6 Nights Madinah Central Area Hotel",
        description: "Walking distance 250m to Masjid an-Nabawi",
        unitCost: 55000,
        unitSelling: 72000,
      },
      {
        category: "visa",
        supplierName: "Al-Safwah Umrah & Hospitality Group",
        title: "Saudi Umrah Tourist Visa & Medical Insurance",
        description: "Full Umrah electronic visa with mandatory health cover",
        unitCost: 32000,
        unitSelling: 42000,
      },
      {
        category: "transfer",
        supplierName: "Al-Safwah Umrah & Hospitality Group",
        title: "Complete Ziyarat & Intercity AC Bus Transfers",
        description: "Jeddah - Makkah - Madinah - Airport luxury coaster transfers",
        unitCost: 18000,
        unitSelling: 26000,
      },
    ],
  },
  {
    title: "10-Day VIP Umrah 5-Star Experience",
    travelType: "Umrah",
    destination: "Saudi Arabia (Makkah & Madinah)",
    defaultDurationDays: 10,
    services: [
      {
        category: "flight",
        supplierName: "Saudia Airlines (Saudi Arabian Airlines)",
        title: "Return Economy Flights on Saudia",
        description: "Direct flight to Medina, return from Jeddah",
        unitCost: 155000,
        unitSelling: 185000,
      },
      {
        category: "hotel",
        supplierName: "Al-Safwah Umrah & Hospitality Group",
        title: "5 Nights Makkah 5-Star Clock Tower Suite",
        description: "Haram view deluxe twin room with international buffet breakfast",
        unitCost: 195000,
        unitSelling: 245000,
      },
      {
        category: "hotel",
        supplierName: "Millennium Makkah & Madinah Hotels",
        title: "4 Nights Madinah 5-Star Hotel",
        description: "Steps from Prophet's Mosque, executive floor access",
        unitCost: 140000,
        unitSelling: 180000,
      },
      {
        category: "transfer",
        supplierName: "Al-Safwah Umrah & Hospitality Group",
        title: "Private GMC Yukon Chauffeur Transfers",
        description: "Private VIP airport and intercity transfers throughout stay",
        unitCost: 65000,
        unitSelling: 90000,
      },
      {
        category: "visa",
        supplierName: "Al-Safwah Umrah & Hospitality Group",
        title: "Express Umrah Visa & VIP Processing",
        description: "Priority electronic visa endorsement with ground assistance",
        unitCost: 35000,
        unitSelling: 50000,
      },
    ],
  },
  {
    title: "5-Day Dubai Family Vacation & Desert Adventure",
    travelType: "Holiday",
    destination: "Dubai, UAE",
    defaultDurationDays: 5,
    services: [
      {
        category: "flight",
        supplierName: "FlyDubai Commercial Hub",
        title: "Return Economy Flight to Dubai (DXB)",
        description: "Direct flight with 30kg baggage and meals",
        unitCost: 78000,
        unitSelling: 98000,
      },
      {
        category: "hotel",
        supplierName: "Alpha Tours DMC Dubai",
        title: "4 Nights 4-Star City Centre Hotel Deira",
        description: "Family deluxe suite with daily buffet breakfast",
        unitCost: 58000,
        unitSelling: 75000,
      },
      {
        category: "visa",
        supplierName: "Alpha Tours DMC Dubai",
        title: "30-Day UAE Tourist Visa & COVID Insurance",
        description: "Fast-track UAE immigration entry permit",
        unitCost: 22000,
        unitSelling: 32000,
      },
      {
        category: "activity",
        supplierName: "Alpha Tours DMC Dubai",
        title: "Desert Safari BBQ & Marina Dhow Cruise Tour",
        description: "Dune bashing, live shows, international buffet & Marina cruise",
        unitCost: 18000,
        unitSelling: 28000,
      },
      {
        category: "transfer",
        supplierName: "Alpha Tours DMC Dubai",
        title: "Private Airport Return Transfers",
        description: "Private AC Hiace transfer from DXB to hotel and return",
        unitCost: 12000,
        unitSelling: 19000,
      },
    ],
  },
  {
    title: "8-Day Turkey Istanbul & Cappadocia Honeymoon",
    travelType: "Honeymoon",
    destination: "Turkey (Istanbul & Cappadocia)",
    defaultDurationDays: 8,
    services: [
      {
        category: "flight",
        supplierName: "Emirates Airline Pakistan",
        title: "Return International Flights via Dubai to Istanbul",
        description: "Emirates return flights with 30kg baggage allowance",
        unitCost: 165000,
        unitSelling: 210000,
      },
      {
        category: "hotel",
        supplierName: "Alpha Tours DMC Dubai",
        title: "4 Nights Istanbul Boutique Hotel in Sultanahmet",
        description: "Walking distance to Blue Mosque and Hagia Sophia with breakfast",
        unitCost: 95000,
        unitSelling: 130000,
      },
      {
        category: "hotel",
        supplierName: "Alpha Tours DMC Dubai",
        title: "3 Nights Cappadocia Cave Suite Hotel",
        description: "Panoramic terrace cave room overlooking Goreme balloon launch",
        unitCost: 110000,
        unitSelling: 155000,
      },
      {
        category: "activity",
        supplierName: "Alpha Tours DMC Dubai",
        title: "Cappadocia Hot Air Balloon Sunrise Experience",
        description: "60-minute standard flight with champagne toast and certificate",
        unitCost: 55000,
        unitSelling: 80000,
      },
      {
        category: "visa",
        supplierName: "GVC Global Visa Concierge",
        title: "Turkey Electronic Visa / Sticker Visa Consultancy",
        description: "File preparation, travel insurance, biometric booking",
        unitCost: 25000,
        unitSelling: 45000,
      },
    ],
  },
  {
    title: "7-Day Northern Pakistan Luxury Explorer (Hunza & Skardu)",
    travelType: "Domestic Tour",
    destination: "Gilgit-Baltistan (Hunza & Skardu)",
    defaultDurationDays: 7,
    services: [
      {
        category: "flight",
        supplierName: "Pakistan International Airlines (PIA)",
        title: "Return Domestic Flights: Islamabad to Skardu/Gilgit",
        description: "Scenic northern mountain flight with baggage",
        unitCost: 45000,
        unitSelling: 62000,
      },
      {
        category: "hotel",
        supplierName: "Serena Hotels & Resorts Pakistan",
        title: "3 Nights Hunza Serena Inn (Rakaposhi View)",
        description: "Deluxe room with balcony overlooking Hunza Valley",
        unitCost: 65000,
        unitSelling: 92000,
      },
      {
        category: "hotel",
        supplierName: "Shangrila Resort Skardu",
        title: "3 Nights Shangrila Resort Lower Kachura Lake",
        description: "Lakeside executive cottage with continental breakfast",
        unitCost: 75000,
        unitSelling: 105000,
      },
      {
        category: "transfer",
        supplierName: "Shangrila Resort Skardu",
        title: "Private 4x4 Land Cruiser with Professional Driver",
        description: "Full-time dedicated 4WD vehicle for Baltit Fort, Attabad & Khunjerab",
        unitCost: 50000,
        unitSelling: 75000,
      },
    ],
  },
  {
    title: "UK Standard Visit Visa Consultancy & Travel Planning",
    travelType: "Visa Consultancy",
    destination: "United Kingdom",
    defaultDurationDays: 14,
    services: [
      {
        category: "visa",
        supplierName: "GVC Global Visa Concierge",
        title: "UK Standard Visitor Visa Processing & Document Audit",
        description: "SOP drafting, financial documentation check, UKVI file assembly",
        unitCost: 28000,
        unitSelling: 65000,
      },
      {
        category: "insurance",
        supplierName: "GVC Global Visa Concierge",
        title: "Worldwide Comprehensive Travel Health Insurance (60 Days)",
        description: "USD 50,000 emergency medical and evacuation coverage",
        unitCost: 8500,
        unitSelling: 18000,
      },
      {
        category: "flight",
        supplierName: "Pakistan International Airlines (PIA)",
        title: "Flexible Flight Reservation for Visa Itinerary",
        description: "Verified airline PNR hold for embassy submission",
        unitCost: 3500,
        unitSelling: 12000,
      },
    ],
  },
  {
    title: "Corporate Delegation Riyadh & Dubai Business Tour",
    travelType: "Corporate",
    destination: "Saudi Arabia & UAE",
    defaultDurationDays: 6,
    services: [
      {
        category: "flight",
        supplierName: "Emirates Airline Pakistan",
        title: "Multi-city Corporate Flight: KHI - DXB - RUH - KHI",
        description: "Business flex booking with priority boarding and change flexibility",
        unitCost: 220000,
        unitSelling: 275000,
      },
      {
        category: "hotel",
        supplierName: "Alpha Tours DMC Dubai",
        title: "5 Nights Business Hotel Suites (DIFC / Olaya)",
        description: "Executive club access with conference room credits",
        unitCost: 160000,
        unitSelling: 215000,
      },
      {
        category: "transfer",
        supplierName: "Alpha Tours DMC Dubai",
        title: "Dedicated Chauffeur Car for Executive Meetings",
        description: "Full-day Mercedes E-Class chauffeur service for business summit",
        unitCost: 55000,
        unitSelling: 80000,
      },
    ],
  },
];

export const OFFICE_EXPENSE_TEMPLATES = [
  {
    title: "Monthly Branch Office Rent",
    category: "Office Rent",
    code: "6000",
    minAmount: 120000,
    maxAmount: 220000,
    paidTo: "Property Management Directorate",
    paymentMethod: "Bank Transfer",
  },
  {
    title: "Electricity & Power Utility Bill (K-Electric / LESCO / IESCO)",
    category: "Utilities",
    code: "6010",
    minAmount: 45000,
    maxAmount: 95000,
    paidTo: "Electric Power Supply Utility",
    paymentMethod: "Online",
  },
  {
    title: "High-Speed Commercial Fiber Internet & Cloud Telephony",
    category: "Telephone & Internet",
    code: "6210",
    minAmount: 18000,
    maxAmount: 28000,
    paidTo: "Nayatel / PTCL Enterprise",
    paymentMethod: "Online",
  },
  {
    title: "Staff Tea, Water Dispensers & Daily Refreshments",
    category: "Office Supplies",
    code: "6200",
    minAmount: 12000,
    maxAmount: 25000,
    paidTo: "Local Grocery & Water Supplier",
    paymentMethod: "Cash",
  },
  {
    title: "Digital Marketing & Meta Social Media Advertising",
    category: "Marketing & Advertising",
    code: "6300",
    minAmount: 35000,
    maxAmount: 85000,
    paidTo: "Meta Ads Ireland / Google Ads",
    paymentMethod: "Bank Transfer",
  },
  {
    title: "GDS Sabre / Amadeus Terminal Access Fees",
    category: "IT & Software Subscriptions",
    code: "6220",
    minAmount: 25000,
    maxAmount: 45000,
    paidTo: "Travelport / Sabre Central Desks",
    paymentMethod: "Bank Transfer",
  },
  {
    title: "Monthly Staff Payroll & Sales Commissions",
    category: "Salaries & Wages",
    code: "6100",
    minAmount: 450000,
    maxAmount: 850000,
    paidTo: "Employee Salary Accounts (HBL)",
    paymentMethod: "Bank Transfer",
  },
  {
    title: "Stationery, Quotation Binders & Official Stamp Paper",
    category: "Printing & Stationery",
    code: "6230",
    minAmount: 8000,
    maxAmount: 18000,
    paidTo: "City Stationery Pechs",
    paymentMethod: "Cash",
  },
];

// Helper functions for randomized synthetic demo data
export function generateSyntheticPakistaniPhone(counter: number): string {
  const prefixes = ["300", "301", "302", "321", "333", "345", "312"];
  const prefix = prefixes[counter % prefixes.length];
  const num = String(1000000 + (counter * 37) % 9000000);
  return `+92 ${prefix} ${num.slice(0, 3)} ${num.slice(3)}`;
}

export function generateSyntheticCNIC(counter: number, province: string = "Sindh"): string {
  let districtCode = "42101"; // Karachi
  if (province === "Punjab") districtCode = "35202"; // Lahore
  if (province === "ICT") districtCode = "61101"; // Islamabad
  if (province === "KPK") districtCode = "17301"; // Peshawar

  const middle = String(2000000 + (counter * 71) % 7000000);
  const check = (counter % 9) + 1;
  return `${districtCode}-${middle}-${check}`;
}

export function generateSyntheticPassport(counter: number): string {
  const letters = ["AA", "BK", "CP", "DX", "EZ"];
  const prefix = letters[counter % letters.length];
  const digits = String(3000000 + (counter * 53) % 6000000);
  return `${prefix}${digits}`;
}
