// ====================================================================
// X-MILE PLATFORM DATA SERVICE & CORE DOMAIN MODELS
// Connecting Parts A, B, and C with full data integrity & persistence
// Tagline: "Every MILE Matters, Every FARMER Matters."
// ====================================================================

export type UserRole =
  | "FARMER"
  | "BUYER"
  | "FPO_ADMIN"
  | "MACHINERY_PROVIDER"
  | "TRANSPORT_PROVIDER"
  | "STORAGE_PROVIDER"
  | "EXPERT"
  | "ADMIN";

export interface UserProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  role: UserRole;
  preferredLanguage: string;
  state: string;
  district: string;
  village: string;
  isVerified: boolean;
  farmAreaAcres?: number;
  businessName?: string;
}

export interface Plot {
  id: string;
  code: string;
  name: string;
  areaAcres: number;
  soilType: "Black Cotton" | "Red Loamy" | "Alluvial" | "Sandy Loam" | "Laterite";
  irrigationSource: "Borewell" | "Canal" | "Drip Irrigation" | "Rainfed" | "Sprinkler";
  currentCrop: string;
  cropStage: "Land Prep" | "Sowing" | "Vegetative" | "Flowering" | "Maturity" | "Harvest Ready";
  sowingDate: string;
  expectedHarvestDate: string;
}

export interface FarmProfile {
  id: string;
  farmerId: string;
  farmName: string;
  surveyNumber: string;
  totalAreaAcres: number;
  state: string;
  district: string;
  village: string;
  plots: Plot[];
}

export interface CropPlan {
  id: string;
  cropName: string;
  variety: string;
  season: "Kharif" | "Rabi" | "Zaid";
  durationDays: number;
  plotCode: string;
  areaAcres: number;
  expectedYieldKg: number;
  targetSellingPricePerKg: number;
  estimatedCost: number;
  estimatedRevenue: number;
  breakEvenPricePerKg: number;
  breakEvenYieldKg: number;
  assumptions: {
    seedCostPerAcre: number;
    fertilizerCostPerAcre: number;
    laborCostPerAcre: number;
    irrigationCostPerAcre: number;
    machineryCostPerAcre: number;
  };
  sources: string;
  status: "DRAFT" | "CONFIRMED" | "IN_PROGRESS" | "HARVESTED";
}

export interface MarketplaceListing {
  id: string;
  farmerId: string;
  farmerName: string;
  farmerPhone: string;
  cropName: string;
  variety: string;
  category: "standard" | "surplus";
  quantityKg: number;
  qualityGrade: "A" | "B" | "C";
  qualityScore: number;
  askingPricePerKg: number;
  harvestDate: string;
  pickupLocation: string;
  district: string;
  state: string;
  images: string[];
  status: "ACTIVE" | "UNDER_OFFER" | "POOLED" | "FULFILLED";
  isVerifiedLot: boolean;
}

export interface MarketplaceOffer {
  id: string;
  listingId: string;
  cropName: string;
  buyerName: string;
  buyerCompany: string;
  offeredPricePerKg: number;
  offeredQuantityKg: number;
  destinationCity: string;
  paymentTerms: string;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  createdAt: string;
}

export interface AgriCycleResidue {
  id: string;
  farmerName: string;
  phone: string;
  residueType: "Paddy Straw" | "Cotton Stalk" | "Sugarcane Bagasse" | "Maize Stover" | "Mustard Husk";
  cropSource: string;
  quantityQuintals: number;
  moisturePercent: number;
  condition: "Baled" | "Loose" | "Chopped";
  intendedUse: "Biofuel & Pellets" | "Paper Pulp" | "Mushroom Bed" | "Composting";
  location: string;
  district: string;
  pricePerQuintal: number;
  status: "AVAILABLE" | "OFFER_RECEIVED" | "COLLECTED";
  co2SavedKg: number;
}

export interface FpoGroup {
  id: string;
  name: string;
  registrationNumber: string;
  district: string;
  state: string;
  membersCount: number;
  contactPerson: string;
  phone: string;
  supportedCrops: string[];
  activePoolLots: number;
}

export interface AggregatedLot {
  id: string;
  fpoId: string;
  fpoName: string;
  lotCode: string;
  cropName: string;
  targetQuantityKg: number;
  collectedQuantityKg: number;
  qualityGrade: "A" | "B" | "C";
  targetPricePerKg: number;
  poolStatus: "OPEN" | "AGGREGATING" | "READY_FOR_SALE" | "SOLD";
  contributions: {
    farmerId: string;
    farmerName: string;
    quantityKg: number;
    grade: "A" | "B" | "C";
    timestamp: string;
  }[];
}

export interface MachineryItem {
  id: string;
  providerName: string;
  phone: string;
  equipmentType: "Tractor (45-55 HP)" | "Combine Harvester" | "Laser Land Leveler" | "Rotavator" | "Drone Sprayer" | "Power Tiller";
  brandModel: string;
  serviceLocation: string;
  district: string;
  rateBasis: "Hourly" | "Per Acre";
  rateAmount: number;
  operatorIncluded: boolean;
  fuelIncluded: boolean;
  isAvailable: boolean;
}

export interface MachineryBooking {
  id: string;
  equipmentId: string;
  equipmentName: string;
  farmerName: string;
  bookingDate: string;
  durationUnits: number;
  rateBasis: string;
  totalCost: number;
  status: "CONFIRMED" | "IN_PROGRESS" | "COMPLETED";
}

export interface SoilReport {
  id: string;
  plotCode: string;
  testDate: string;
  labName: string;
  ph: number;
  organicCarbonPercent: number;
  nitrogenKgPerHa: number;
  phosphorusKgPerHa: number;
  potassiumKgPerHa: number;
  electricalConductivity: number;
  micronutrients: {
    zinc: "Adequate" | "Deficient";
    iron: "Adequate" | "Deficient";
    boron: "Adequate" | "Deficient";
  };
  rotationRecommendations: string[];
  notes: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  cropName: string;
  date: string;
  type: "SOWING" | "IRRIGATION" | "FERTILIZER" | "HARVEST" | "BUYER_DEMAND";
  plotCode?: string;
  notes: string;
  status: "UPCOMING" | "DONE";
}

export interface KvkCenter {
  id: string;
  name: string;
  type: "ICAR-KVK" | "State Agri University" | "ICAR Research Station";
  district: string;
  state: string;
  phone: string;
  email: string;
  address: string;
  specialties: string[];
  isVerified: boolean;
}

export interface ExpertReferral {
  id: string;
  farmerName: string;
  kvkName: string;
  cropName: string;
  issueDescription: string;
  urgency: "Normal" | "High";
  status: "SUBMITTED" | "REVIEWED" | "RESOLVED";
  expertAdvice?: string;
  createdAt: string;
}

export interface FarmRecordItem {
  id: string;
  type: "EXPENSE" | "REVENUE";
  category: "Seeds" | "Fertilizers" | "Pesticides" | "Labor" | "Machinery" | "Produce Sale" | "Residue Sale" | "Transport";
  amount: number;
  date: string;
  plotCode: string;
  description: string;
}

export interface StorageFacility {
  id: string;
  name: string;
  type: "Cold Storage" | "Dry Warehouse" | "Silo / Grain Terminal";
  district: string;
  state: string;
  totalCapacityMt: number;
  availableCapacityMt: number;
  acceptedCommodities: string[];
  ratePerMonthQuintal: number;
  tempRangeCelsius?: string;
  phone: string;
  isWdraRegistered: boolean;
}

export interface AgriInputItem {
  id: string;
  category: "Certified Seeds" | "Bio-Fertilizer" | "Micro-Nutrients" | "Organic Pest Repellent" | "Drip Equipment";
  productName: string;
  brand: string;
  packSize: string;
  mrp: number;
  bestPrice: number;
  sellerName: string;
  sellerLocation: string;
  isLicensedDealer: boolean;
  inStock: boolean;
}

export interface CropTriageCase {
  id: string;
  cropName: string;
  variety: string;
  symptoms: string;
  weatherCondition: string;
  urgency: "Moderate" | "Severe";
  imageUrl: string;
  initialObservations: string[];
  recommendedAction: string;
  kvkReferralSent: boolean;
  createdAt: string;
}

export interface WaterLog {
  id: string;
  plotCode: string;
  date: string;
  source: "Borewell" | "Canal" | "Drip" | "Sprinkler";
  durationHours: number;
  estLiters: number;
  notes: string;
}

export interface WeighmentRecord {
  id: string;
  orderId: string;
  produceName: string;
  grossWeightKg: number;
  tareWeightKg: number;
  netWeightKg: number;
  moisturePercent: number;
  qualityGrade: "A" | "B" | "C";
  collectorName: string;
  weighmentDate: string;
  farmerConfirmed: boolean;
  buyerConfirmed: boolean;
}

export interface InstitutionalDemand {
  id: string;
  institutionName: string;
  institutionType: "State Civil Supplies" | "Mid-Day Meal Agency" | "Agri-Export Terminal" | "Processing Giant";
  commodity: string;
  requiredGrade: "A" | "B";
  quantityMetricTons: number;
  deliveryPeriod: string;
  destinationHub: string;
  targetRatePerQuintal: number;
  fpoProposalStatus: "OPEN_FOR_FPO_BIDS" | "BID_SUBMITTED" | "CONTRACT_AWARDED";
}

export interface LearningArticle {
  id: string;
  title: string;
  cropCategory: "Cereals & Pulses" | "Horticulture & Fruits" | "Vegetables" | "Cash Crops" | "Soil & Water";
  season: "All Season" | "Kharif" | "Rabi";
  readTime: string;
  summary: string;
  reviewedBy: string;
  verifiedSource: string;
  content: string[];
}

export interface GovernmentScheme {
  id: string;
  name: string;
  shortCode: string;
  ministry: string;
  benefitSummary: string;
  subsidyPercentage?: number;
  maxBenefitAmount?: string;
  eligibility: string[];
  documentsRequired: string[];
  applyUrl: string;
  category: "Income Support" | "Crop Insurance" | "Solar & Irrigation" | "Infrastructure Fund" | "Organic Farming";
}

export interface PlatformNotification {
  id: string;
  title: string;
  message: string;
  category: "MARKET" | "ORDER" | "WEATHER" | "SCHEME" | "EXPERT" | "SYSTEM";
  timestamp: string;
  isRead: boolean;
  linkUrl?: string;
}

// ====================================================================
// DEFAULT INITIAL SEED DATA (Indian Agricultural Ground Realities)
// ====================================================================

export const DEFAULT_USER: UserProfile = {
  id: "usr-farmer-01",
  name: "Rameshwar Patel",
  phone: "+91 98765 43210",
  email: "rameshwar.patel@xmile.org",
  role: "FARMER",
  preferredLanguage: "hi",
  state: "Karnataka",
  district: "Tumakuru",
  village: "Kunigal",
  isVerified: true,
  farmAreaAcres: 7.5,
};

export const DEFAULT_FARM: FarmProfile = {
  id: "farm-01",
  farmerId: "usr-farmer-01",
  farmName: "Shree Krishna Agri Farm",
  surveyNumber: "SY-142/3A",
  totalAreaAcres: 7.5,
  state: "Karnataka",
  district: "Tumakuru",
  village: "Kunigal",
  plots: [
    {
      id: "plot-01",
      code: "PLOT-NORTH",
      name: "North Plot (Canal Fed)",
      areaAcres: 3.5,
      soilType: "Red Loamy",
      irrigationSource: "Drip Irrigation",
      currentCrop: "Tomato (Hybrid Shivam)",
      cropStage: "Vegetative",
      sowingDate: "2026-09-15",
      expectedHarvestDate: "2026-11-20",
    },
    {
      id: "plot-02",
      code: "PLOT-SOUTH",
      name: "South Well Plot",
      areaAcres: 2.5,
      soilType: "Black Cotton",
      irrigationSource: "Borewell",
      currentCrop: "Onion (Nashik Red)",
      cropStage: "Flowering",
      sowingDate: "2026-08-10",
      expectedHarvestDate: "2026-11-15",
    },
    {
      id: "plot-03",
      code: "PLOT-EAST",
      name: "East Rainfed Plot",
      areaAcres: 1.5,
      soilType: "Sandy Loam",
      irrigationSource: "Sprinkler",
      currentCrop: "Chilli (Byadgi Super)",
      cropStage: "Harvest Ready",
      sowingDate: "2026-07-20",
      expectedHarvestDate: "2026-11-05",
    },
  ],
};

export const SEED_CROP_PLANS: CropPlan[] = [
  {
    id: "plan-01",
    cropName: "Tomato (Shivam Hybrid)",
    variety: "Shivam / US-440",
    season: "Rabi",
    durationDays: 85,
    plotCode: "PLOT-NORTH",
    areaAcres: 3.5,
    expectedYieldKg: 42000,
    targetSellingPricePerKg: 18,
    estimatedCost: 245000,
    estimatedRevenue: 756000,
    breakEvenPricePerKg: 5.83,
    breakEvenYieldKg: 13611,
    assumptions: {
      seedCostPerAcre: 12000,
      fertilizerCostPerAcre: 18000,
      laborCostPerAcre: 22000,
      irrigationCostPerAcre: 6000,
      machineryCostPerAcre: 12000,
    },
    sources: "ICAR Horticultural Experiment Station, Hessaraghatta & APMC Benchmark",
    status: "IN_PROGRESS",
  },
  {
    id: "plan-02",
    cropName: "Onion (Nashik Red)",
    variety: "Bhima Super",
    season: "Kharif",
    durationDays: 110,
    plotCode: "PLOT-SOUTH",
    areaAcres: 2.5,
    expectedYieldKg: 28000,
    targetSellingPricePerKg: 24,
    estimatedCost: 165000,
    estimatedRevenue: 672000,
    breakEvenPricePerKg: 5.89,
    breakEvenYieldKg: 6875,
    assumptions: {
      seedCostPerAcre: 15000,
      fertilizerCostPerAcre: 16000,
      laborCostPerAcre: 20000,
      irrigationCostPerAcre: 5000,
      machineryCostPerAcre: 10000,
    },
    sources: "ICAR-Directorate of Onion and Garlic Research (DOGR)",
    status: "CONFIRMED",
  },
];

export const SEED_MARKET_LISTINGS: MarketplaceListing[] = [
  {
    id: "list-01",
    farmerId: "usr-farmer-01",
    farmerName: "Rameshwar Patel",
    farmerPhone: "+91 98765 43210",
    cropName: "Tomato",
    variety: "US-440 Hybrid",
    category: "standard",
    quantityKg: 5000,
    qualityGrade: "A",
    qualityScore: 92,
    askingPricePerKg: 19,
    harvestDate: "2026-11-04",
    pickupLocation: "Kunigal Road, Tumakuru",
    district: "Tumakuru",
    state: "Karnataka",
    images: ["/tomato.png"],
    status: "ACTIVE",
    isVerifiedLot: true,
  },
  {
    id: "list-02",
    farmerId: "usr-farmer-02",
    farmerName: "Basavaraj Gowda",
    farmerPhone: "+91 98451 12345",
    cropName: "Onion",
    variety: "Nashik Red",
    category: "standard",
    quantityKg: 8500,
    qualityGrade: "A",
    qualityScore: 89,
    askingPricePerKg: 25,
    harvestDate: "2026-11-08",
    pickupLocation: "NH-48 Sira Hub",
    district: "Tumakuru",
    state: "Karnataka",
    images: [],
    status: "ACTIVE",
    isVerifiedLot: true,
  },
  {
    id: "list-03",
    farmerId: "usr-farmer-03",
    farmerName: "Smt. Shailaja Devi",
    farmerPhone: "+91 94481 99887",
    cropName: "Byadgi Chilli",
    variety: "Kaddi Super Red",
    category: "standard",
    quantityKg: 2200,
    qualityGrade: "A",
    qualityScore: 95,
    askingPricePerKg: 185,
    harvestDate: "2026-11-02",
    pickupLocation: "Gubbi Village Center",
    district: "Tumakuru",
    state: "Karnataka",
    images: [],
    status: "ACTIVE",
    isVerifiedLot: true,
  },
  {
    id: "list-04",
    farmerId: "usr-farmer-04",
    farmerName: "Anand Murthy",
    farmerPhone: "+91 97410 44556",
    cropName: "Tomato (Ripe Bulk)",
    variety: "Shivam",
    category: "surplus",
    quantityKg: 3200,
    qualityGrade: "B",
    qualityScore: 78,
    askingPricePerKg: 12,
    harvestDate: "2026-11-01",
    pickupLocation: "Tiptur Mandi Gate",
    district: "Tumakuru",
    state: "Karnataka",
    images: [],
    status: "ACTIVE",
    isVerifiedLot: true,
  },
];

export const SEED_BUYER_OFFERS: MarketplaceOffer[] = [
  {
    id: "off-01",
    listingId: "list-01",
    cropName: "Tomato",
    buyerName: "Venkatesh Rao",
    buyerCompany: "FreshHarvest Retail Chains Ltd.",
    offeredPricePerKg: 18.5,
    offeredQuantityKg: 5000,
    destinationCity: "Bengaluru",
    paymentTerms: "Escrow on Verified Weighment",
    status: "PENDING",
    createdAt: "2026-11-01T09:30:00Z",
  },
  {
    id: "off-02",
    listingId: "list-02",
    cropName: "Onion",
    buyerName: "Deepak Agarwal",
    buyerCompany: "Apex Agro Exports India",
    offeredPricePerKg: 24.5,
    offeredQuantityKg: 8500,
    destinationCity: "Chennai",
    paymentTerms: "X-MILE Milestone Escrow",
    status: "ACCEPTED",
    createdAt: "2026-10-31T14:15:00Z",
  },
];

export const SEED_AGRICYCLE: AgriCycleResidue[] = [
  {
    id: "agr-01",
    farmerName: "Rameshwar Patel",
    phone: "+91 98765 43210",
    residueType: "Paddy Straw",
    cropSource: "Sona Masoori Rice",
    quantityQuintals: 140,
    moisturePercent: 12.5,
    condition: "Baled",
    intendedUse: "Biofuel & Pellets",
    location: "Kunigal Taluk Farm Gate",
    district: "Tumakuru",
    pricePerQuintal: 210,
    status: "AVAILABLE",
    co2SavedKg: 9800,
  },
  {
    id: "agr-02",
    farmerName: "Manjunath Swamy",
    phone: "+91 99012 33445",
    residueType: "Sugarcane Bagasse",
    cropSource: "Co-86032 Cane",
    quantityQuintals: 280,
    moisturePercent: 18.0,
    condition: "Loose",
    intendedUse: "Paper Pulp",
    location: "Mandya Highway Sector",
    district: "Mandya",
    pricePerQuintal: 175,
    status: "AVAILABLE",
    co2SavedKg: 15400,
  },
  {
    id: "agr-03",
    farmerName: "Harish Reddy",
    phone: "+91 98455 66778",
    residueType: "Cotton Stalk",
    cropSource: "Bt Cotton",
    quantityQuintals: 95,
    moisturePercent: 10.0,
    condition: "Chopped",
    intendedUse: "Composting",
    location: "Raichur Cotton Belt",
    district: "Raichur",
    pricePerQuintal: 190,
    status: "COLLECTED",
    co2SavedKg: 6650,
  },
];

export const SEED_FPOS: FpoGroup[] = [
  {
    id: "fpo-01",
    name: "Tumakuru Krishi Samriddhi Farmer Producer Co. Ltd.",
    registrationNumber: "U01100KA2021PTC145892",
    district: "Tumakuru",
    state: "Karnataka",
    membersCount: 420,
    contactPerson: "Dr. K. S. Somasekhar (Director)",
    phone: "+91 81622 55440",
    supportedCrops: ["Tomato", "Onion", "Chilli", "Ragi", "Maize"],
    activePoolLots: 3,
  },
  {
    id: "fpo-02",
    name: "Sahyadri Agro Horticultural FPO",
    registrationNumber: "U01403KA2022PTC160123",
    district: "Shivamogga",
    state: "Karnataka",
    membersCount: 310,
    contactPerson: "Narayana Hegde",
    phone: "+91 81822 77889",
    supportedCrops: ["Arecanut", "Ginger", "Turmeric", "Banana"],
    activePoolLots: 2,
  },
];

export const SEED_AGGREGATED_LOTS: AggregatedLot[] = [
  {
    id: "lot-01",
    fpoId: "fpo-01",
    fpoName: "Tumakuru Krishi Samriddhi FPO",
    lotCode: "LOT-TOM-2026-08",
    cropName: "Tomato",
    targetQuantityKg: 25000,
    collectedQuantityKg: 18500,
    qualityGrade: "A",
    targetPricePerKg: 19.5,
    poolStatus: "AGGREGATING",
    contributions: [
      {
        farmerId: "usr-farmer-01",
        farmerName: "Rameshwar Patel",
        quantityKg: 5000,
        grade: "A",
        timestamp: "2026-10-30",
      },
      {
        farmerId: "usr-farmer-02",
        farmerName: "Basavaraj Gowda",
        quantityKg: 6500,
        grade: "A",
        timestamp: "2026-10-31",
      },
      {
        farmerId: "usr-farmer-05",
        farmerName: "Venkatappa",
        quantityKg: 7000,
        grade: "A",
        timestamp: "2026-11-01",
      },
    ],
  },
  {
    id: "lot-02",
    fpoId: "fpo-01",
    fpoName: "Tumakuru Krishi Samriddhi FPO",
    lotCode: "LOT-ONI-2026-04",
    cropName: "Onion",
    targetQuantityKg: 40000,
    collectedQuantityKg: 40000,
    qualityGrade: "A",
    targetPricePerKg: 25.0,
    poolStatus: "READY_FOR_SALE",
    contributions: [
      {
        farmerId: "usr-farmer-02",
        farmerName: "Basavaraj Gowda",
        quantityKg: 15000,
        grade: "A",
        timestamp: "2026-10-28",
      },
      {
        farmerId: "usr-farmer-06",
        farmerName: "Siddaramaiah",
        quantityKg: 25000,
        grade: "A",
        timestamp: "2026-10-29",
      },
    ],
  },
];

export const SEED_MACHINERY: MachineryItem[] = [
  {
    id: "mach-01",
    providerName: "Veerabhadreshwara Krishi Yantra Seva",
    phone: "+91 98801 22334",
    equipmentType: "Tractor (45-55 HP)",
    brandModel: "Mahindra 575 DI (With Disc Plough & Rotavator)",
    serviceLocation: "Kunigal & Magadi Border",
    district: "Tumakuru",
    rateBasis: "Hourly",
    rateAmount: 850,
    operatorIncluded: true,
    fuelIncluded: true,
    isAvailable: true,
  },
  {
    id: "mach-02",
    providerName: "Kaveri Agro Tech Hub",
    phone: "+91 94480 33445",
    equipmentType: "Combine Harvester",
    brandModel: "Preet 987 Track Harvester",
    serviceLocation: "Gubbi, Koratagere",
    district: "Tumakuru",
    rateBasis: "Per Acre",
    rateAmount: 2600,
    operatorIncluded: true,
    fuelIncluded: true,
    isAvailable: true,
  },
  {
    id: "mach-03",
    providerName: "Drona Agri Sprayers",
    phone: "+91 97400 11223",
    equipmentType: "Drone Sprayer",
    brandModel: "IoTech 10L Precision Drone",
    serviceLocation: "Tumakuru Rural",
    district: "Tumakuru",
    rateBasis: "Per Acre",
    rateAmount: 450,
    operatorIncluded: true,
    fuelIncluded: false,
    isAvailable: true,
  },
  {
    id: "mach-04",
    providerName: "Annapurna Farm Machinery",
    phone: "+91 98450 66778",
    equipmentType: "Laser Land Leveler",
    brandModel: "Spectra Precision Dual Laser",
    serviceLocation: "Sira & Pavagada",
    district: "Tumakuru",
    rateBasis: "Hourly",
    rateAmount: 950,
    operatorIncluded: true,
    fuelIncluded: true,
    isAvailable: true,
  },
];

export const SEED_SOIL_REPORTS: SoilReport[] = [
  {
    id: "soil-01",
    plotCode: "PLOT-NORTH",
    testDate: "2026-08-25",
    labName: "District Soil Testing Laboratory, Tumakuru (Govt. of Karnataka)",
    ph: 6.8,
    organicCarbonPercent: 0.65,
    nitrogenKgPerHa: 220,
    phosphorusKgPerHa: 24,
    potassiumKgPerHa: 280,
    electricalConductivity: 0.45,
    micronutrients: {
      zinc: "Deficient",
      iron: "Adequate",
      boron: "Adequate",
    },
    rotationRecommendations: [
      "Rotate with Pulses (Chickpea / Green Gram) to fix atmospheric nitrogen",
      "Apply 25 kg/ha Zinc Sulphate before transplanting next solanaceous crop",
      "Incorporate green manure (Dhaincha / Sunnhemp) to boost organic carbon",
    ],
    notes: "Optimum pH range for vegetable cultivation. Organic carbon is moderate.",
  },
  {
    id: "soil-02",
    plotCode: "PLOT-SOUTH",
    testDate: "2026-07-15",
    labName: "University of Agricultural Sciences (UAS) Bangalore soil testing cell",
    ph: 7.6,
    organicCarbonPercent: 0.48,
    nitrogenKgPerHa: 185,
    phosphorusKgPerHa: 19,
    potassiumKgPerHa: 340,
    electricalConductivity: 0.62,
    micronutrients: {
      zinc: "Adequate",
      iron: "Deficient",
      boron: "Deficient",
    },
    rotationRecommendations: [
      "Follow onion with a leguminous crop or fodder sorghum",
      "Foliar spray of 0.2% Borax during vegetative development",
      "Apply well-decomposed FYM (Farm Yard Manure) at 10 tons/ha",
    ],
    notes: "Slightly alkaline clay soil. Good potash reserves.",
  },
];

export const SEED_CALENDAR_EVENTS: CalendarEvent[] = [
  {
    id: "cal-01",
    title: "Tomato Top Dressing & Staking",
    cropName: "Tomato",
    date: "2026-11-04",
    type: "FERTILIZER",
    plotCode: "PLOT-NORTH",
    notes: "Apply 25kg Urea + 15kg MOP per acre and secure bamboo stakes.",
    status: "UPCOMING",
  },
  {
    id: "cal-02",
    title: "Byadgi Chilli Prime Harvest Window",
    cropName: "Chilli",
    date: "2026-11-06",
    type: "HARVEST",
    plotCode: "PLOT-EAST",
    notes: "Hand-picking deep red mature pods in dry morning conditions.",
    status: "UPCOMING",
  },
  {
    id: "cal-03",
    title: "Buyer Bulk Procurement: Bengaluru Retail Syndicate",
    cropName: "Tomato",
    date: "2026-11-08",
    type: "BUYER_DEMAND",
    notes: "Demand of 15,000 kg Grade A Tomato at ₹19.5/kg. Pickup via X-MILE logistics.",
    status: "UPCOMING",
  },
  {
    id: "cal-04",
    title: "Onion Bulb Development Drip Irrigation",
    cropName: "Onion",
    date: "2026-11-05",
    type: "IRRIGATION",
    plotCode: "PLOT-SOUTH",
    notes: "Run 3.5 hours drip cycle with water soluble 0:52:34.",
    status: "UPCOMING",
  },
];

export const SEED_KVKS: KvkCenter[] = [
  {
    id: "kvk-01",
    name: "ICAR - Krishi Vigyan Kendra, Hirehalli",
    type: "ICAR-KVK",
    district: "Tumakuru",
    state: "Karnataka",
    phone: "+91 81622 43214",
    email: "kvk.tumakuru@icar.gov.in",
    address: "Hirehalli Post, NH-48, Tumakuru, Karnataka 572168",
    specialties: ["Horticulture Crops", "Integrated Pest Management (IPM)", "Soil Health", "Organic Practices"],
    isVerified: true,
  },
  {
    id: "kvk-02",
    name: "KVK Konehally, Tiptur",
    type: "State Agri University",
    district: "Tumakuru",
    state: "Karnataka",
    phone: "+91 81342 94450",
    email: "kvktiptur@uasbangalore.edu.in",
    address: "Konehally Farm, Tiptur Taluk, Tumakuru 572202",
    specialties: ["Coconut & Intercropping", "Millet Processing", "Farm Machinery Demonstration"],
    isVerified: true,
  },
  {
    id: "kvk-03",
    name: "ICAR-Indian Institute of Horticultural Research (IIHR)",
    type: "ICAR Research Station",
    district: "Bengaluru Rural",
    state: "Karnataka",
    phone: "+91 80284 66421",
    email: "director.iihr@icar.gov.in",
    address: "Hessaraghatta Lake Post, Bengaluru, Karnataka 560089",
    specialties: ["High-Yield Hybrid Varieties", "Protected Cultivation", "Post-Harvest Technology"],
    isVerified: true,
  },
];

export const SEED_FARM_RECORDS: FarmRecordItem[] = [
  {
    id: "rec-01",
    type: "EXPENSE",
    category: "Seeds",
    amount: 18500,
    date: "2026-09-12",
    plotCode: "PLOT-NORTH",
    description: "Purchased US-440 Tomato hybrid seedlings from licensed nursery",
  },
  {
    id: "rec-02",
    type: "EXPENSE",
    category: "Machinery",
    amount: 8500,
    date: "2026-09-14",
    plotCode: "PLOT-NORTH",
    description: "Deep disc ploughing & bed preparation with Mahindra Tractor",
  },
  {
    id: "rec-03",
    type: "EXPENSE",
    category: "Fertilizers",
    amount: 14200,
    date: "2026-09-22",
    plotCode: "PLOT-SOUTH",
    description: "DAP & Potash basal dose for Onion plot",
  },
  {
    id: "rec-04",
    type: "REVENUE",
    category: "Produce Sale",
    amount: 112000,
    date: "2026-10-25",
    plotCode: "PLOT-EAST",
    description: "First picking of Byadgi Chilli dispatched to Hubli APMC buyer",
  },
  {
    id: "rec-05",
    type: "REVENUE",
    category: "Residue Sale",
    amount: 18200,
    date: "2026-10-29",
    plotCode: "PLOT-NORTH",
    description: "AgriCycle collection: 90 quintals paddy straw collected by bio-pellet factory",
  },
];

export const SEED_STORAGE: StorageFacility[] = [
  {
    id: "stor-01",
    name: "Karnataka State Warehousing Corporation (KSWC) Tumakuru",
    type: "Dry Warehouse",
    district: "Tumakuru",
    state: "Karnataka",
    totalCapacityMt: 12000,
    availableCapacityMt: 3400,
    acceptedCommodities: ["Paddy", "Maize", "Ragi", "Pulses", "Oilseeds"],
    ratePerMonthQuintal: 8.5,
    phone: "+91 81622 78910",
    isWdraRegistered: true,
  },
  {
    id: "stor-02",
    name: "GreenFrost Agro Cold Chain Park",
    type: "Cold Storage",
    district: "Tumakuru",
    state: "Karnataka",
    totalCapacityMt: 4500,
    availableCapacityMt: 1200,
    acceptedCommodities: ["Tomato", "Chilli", "Onion", "Mango", "Carrot"],
    ratePerMonthQuintal: 42.0,
    tempRangeCelsius: "2°C to 12°C Controlled Atmosphere",
    phone: "+91 99001 88776",
    isWdraRegistered: true,
  },
  {
    id: "stor-03",
    name: "Nelamangala Integrated Logistics & Cold Terminal",
    type: "Cold Storage",
    district: "Bengaluru Rural",
    state: "Karnataka",
    totalCapacityMt: 8000,
    availableCapacityMt: 2150,
    acceptedCommodities: ["Fruits", "Vegetables", "Dairy Ingredients", "Processed Pulp"],
    ratePerMonthQuintal: 48.0,
    tempRangeCelsius: "-2°C to 8°C Humidity 85-95%",
    phone: "+91 80277 34560",
    isWdraRegistered: true,
  },
];

export const SEED_AGRI_INPUTS: AgriInputItem[] = [
  {
    id: "inp-01",
    category: "Certified Seeds",
    productName: "US-440 Tomato Seeds (10g pouch)",
    brand: "US Agriseeds",
    packSize: "10 grams (approx 3,000 seeds)",
    mrp: 1450,
    bestPrice: 1320,
    sellerName: "Sri Balaji Krishi Kendra, Tumakuru",
    sellerLocation: "Mandi Road, Tumakuru",
    isLicensedDealer: true,
    inStock: true,
  },
  {
    id: "inp-02",
    category: "Bio-Fertilizer",
    productName: "Rhizobium & PSB Bio-Fertilizer Consortia",
    brand: "Karnataka Agro Bio-Tech",
    packSize: "1 Liter bottle",
    mrp: 320,
    bestPrice: 280,
    sellerName: "Raitha Seva Kendra (RSK), Kunigal",
    sellerLocation: "Taluk Office Road, Kunigal",
    isLicensedDealer: true,
    inStock: true,
  },
  {
    id: "inp-03",
    category: "Micro-Nutrients",
    productName: "Soluble Chelated Zinc (Zn-EDTA 12%)",
    brand: "Multiplex Agriculture",
    packSize: "500 grams",
    mrp: 410,
    bestPrice: 360,
    sellerName: "Annapurna Agro Agencies",
    sellerLocation: "B.H. Road, Tumakuru",
    isLicensedDealer: true,
    inStock: true,
  },
  {
    id: "inp-04",
    category: "Drip Equipment",
    productName: "Inline Drip Lateral 16mm (Class II, 40cm spacing)",
    brand: "Jain Irrigation Systems",
    packSize: "500 Meter Bundle",
    mrp: 4200,
    bestPrice: 3850,
    sellerName: "Kaveri Drip Solutions",
    sellerLocation: "APMC Yard, Sira",
    isLicensedDealer: true,
    inStock: true,
  },
];

export const SEED_SCHEMES: GovernmentScheme[] = [
  {
    id: "sch-01",
    name: "Pradhan Mantri Kisan Samman Nidhi",
    shortCode: "PM-KISAN",
    ministry: "Ministry of Agriculture & Farmers Welfare, GoI",
    benefitSummary: "Direct financial support of ₹6,000 per year in 3 equal installments of ₹2,000 directly into Aadhaar-seeded bank accounts.",
    maxBenefitAmount: "₹6,000 / year",
    eligibility: [
      "All small and marginal landholding farmer families",
      "Valid landownership records (Khata / RTC / Pahani)",
      "Aadhaar-seeded operational bank account",
    ],
    documentsRequired: ["Aadhaar Card", "Land Ownership RTC / 7/12", "Bank Passbook", "Active Mobile Number"],
    applyUrl: "https://pmkisan.gov.in",
    category: "Income Support",
  },
  {
    id: "sch-02",
    name: "Pradhan Mantri Fasal Bima Yojana",
    shortCode: "PMFBY",
    ministry: "Ministry of Agriculture & Farmers Welfare, GoI",
    benefitSummary: "Comprehensive crop insurance shield against non-preventable natural risks (drought, flood, unseasonal rain, pest outbreaks) from pre-sowing to post-harvest.",
    subsidyPercentage: 85,
    eligibility: [
      "All farmers growing notified crops in notified insurance units",
      "Both loanee and non-loanee farmers",
      "Applicable for Food crops, Oilseeds, and Annual Commercial/Horticultural crops",
    ],
    documentsRequired: ["Sowing Certificate", "Land Record Extract", "Aadhaar Card", "Cancelled Cheque"],
    applyUrl: "https://pmfby.gov.in",
    category: "Crop Insurance",
  },
  {
    id: "sch-03",
    name: "PM-KUSUM (Component B & C Solar Pumps)",
    shortCode: "PM-KUSUM",
    ministry: "Ministry of New and Renewable Energy (MNRE), GoI",
    benefitSummary: "Up to 60% subsidy for standalone solar agricultural water pumps (3 HP to 10 HP) and solarization of existing grid-connected agriculture pumps.",
    subsidyPercentage: 60,
    maxBenefitAmount: "Up to ₹2,50,000 per installation",
    eligibility: [
      "Individual farmers, water user associations, and FPOs",
      "Sufficient land area for solar PV panel installation",
      "Existing borewell / open well source",
    ],
    documentsRequired: ["RTC / Land record", "Borewell yield certificate", "Identity proof", "Electricity consumer ID (if grid)"],
    applyUrl: "https://pmkusum.mnre.gov.in",
    category: "Solar & Irrigation",
  },
  {
    id: "sch-04",
    name: "Agriculture Infrastructure Fund",
    shortCode: "AIF",
    ministry: "Ministry of Agriculture & Farmers Welfare, GoI",
    benefitSummary: "Medium-to-long term debt financing facility for post-harvest management infrastructure with 3% per annum interest subvention up to ₹2 Crores.",
    maxBenefitAmount: "Interest subvention on loans up to ₹2 Crore",
    eligibility: [
      "Primary Agricultural Credit Societies (PACS), FPOs, Agri-entrepreneurs, Startups",
      "Projects for cold stores, sorting/grading units, warehouses, assaying units",
    ],
    documentsRequired: ["Detailed Project Report (DPR)", "KYC documents", "Land title / Lease agreement", "Bank loan sanction letter"],
    applyUrl: "https://agriinfra.dac.gov.in",
    category: "Infrastructure Fund",
  },
];

export const SEED_LEARNING_ARTICLES: LearningArticle[] = [
  {
    id: "art-01",
    title: "Scientific Drip Fertigation Protocol for Commercial Tomato",
    cropCategory: "Vegetables",
    season: "All Season",
    readTime: "6 min read",
    summary: "Proven fertigation schedule and nutrient ratios (N:P:K) for maximizing first-grade tomato yields while curbing blossom end rot.",
    reviewedBy: "Dr. K. S. Somasekhar, Senior Agronomist (ICAR-KVK)",
    verifiedSource: "Indian Council of Agricultural Research (ICAR)",
    content: [
      "Transplanting to 30 Days (Vegetative): Focus on root establishment using 19:19:19 water-soluble grade at 2.5 kg/acre twice weekly.",
      "Flowering Stage (30 to 55 Days): Shift to high-phosphorus ratio (12:61:0) at 3 kg/acre to induce robust flower clusters and minimize early flower drop.",
      "Fruit Setting & Sizing (55 to 80 Days): Introduce Potassium Nitrate (13:0:45) combined with Calcium Nitrate to prevent blossom end rot and achieve firm, vibrant pericarp.",
      "Watering Discipline: Maintain soil moisture between 65% and 80% field capacity; avoid moisture fluctuation that triggers fruit cracking.",
    ],
  },
  {
    id: "art-02",
    title: "Post-Harvest Curing & Storage Techniques for Nashik Red Onion",
    cropCategory: "Vegetables",
    season: "Rabi",
    readTime: "5 min read",
    summary: "How farm-level field curing and shaded drying prevent neck rot and post-harvest weight loss during extended storage.",
    reviewedBy: "ICAR-Directorate of Onion and Garlic Research (DOGR)",
    verifiedSource: "National Horticultural Research and Development Foundation (NHRDF)",
    content: [
      "Field Curing: Leave harvested bulbs in the field for 3 to 5 days, covering bulbs with the foliage of adjacent rows to prevent sunscald.",
      "Shade Curing: Transfer to a ventilated shed for 10-15 days until outer scales turn crisp, papery, and the neck is completely dried and constricted.",
      "Storage Structure: Utilize low-cost bottom-ventilated mud/bamboo structures with ambient air circulation; maintain relative humidity below 70%.",
      "Sorting & Grading: Reject thick-necked, sprouted, or bruised onions before stacking in bins to prevent fungal transmission.",
    ],
  },
  {
    id: "art-03",
    title: "Converting Crop Residue into Revenue: AgriCycle Guide",
    cropCategory: "Soil & Water",
    season: "Kharif",
    readTime: "4 min read",
    summary: "Turn paddy straw, cotton stalks, and sugarcane trash into cash via local biomass aggregators instead of burning.",
    reviewedBy: "AgriCycle Technical Operations Unit, X-MILE",
    verifiedSource: "Bureau of Energy Efficiency (BEE) & Ministry of New & Renewable Energy",
    content: [
      "Air Quality & Soil Carbon: Field burning loses 100% of organic carbon, 80% of nitrogen, and produces toxic PM2.5. Off-farm collection preserves farm ecosystem health.",
      "Baling Standards: Commercial bio-coal and pellet plants accept bales with moisture under 14%. Keep bales elevated on plastic sheets to prevent moisture absorption.",
      "X-MILE Transport Coordination: Once listed on AgriCycle, local aggregators send balers and commercial pickup vehicles directly to your field gate.",
    ],
  },
];

export const SEED_INSTITUTIONAL_DEMANDS: InstitutionalDemand[] = [
  {
    id: "inst-01",
    institutionName: "Karnataka Food & Civil Supplies Corporation (KFCSC)",
    institutionType: "State Civil Supplies",
    commodity: "Ragi (Finger Millet) & Maize",
    requiredGrade: "A",
    quantityMetricTons: 500,
    deliveryPeriod: "Nov 15 - Dec 20, 2026",
    destinationHub: "Central Food Depot, Tumakuru",
    targetRatePerQuintal: 4290,
    fpoProposalStatus: "OPEN_FOR_FPO_BIDS",
  },
  {
    id: "inst-02",
    institutionName: "Kisan Agro Processing Industries Pvt. Ltd.",
    institutionType: "Processing Giant",
    commodity: "Processing Tomato (Brix > 4.5)",
    requiredGrade: "A",
    quantityMetricTons: 250,
    deliveryPeriod: "Nov 10 - Nov 30, 2026",
    destinationHub: "Food Park, Vasanthanarasapura, Tumakuru",
    targetRatePerQuintal: 1850,
    fpoProposalStatus: "BID_SUBMITTED",
  },
];

export const SEED_NOTIFICATIONS: PlatformNotification[] = [
  {
    id: "notif-01",
    title: "New Buyer Offer Received",
    message: "FreshHarvest Retail submitted an offer of ₹18.5/kg for your 5,000 kg Tomato listing.",
    category: "MARKET",
    timestamp: "10 mins ago",
    isRead: false,
    linkUrl: "/buyer",
  },
  {
    id: "notif-02",
    title: "Weather Advisory: Light Evening Showers",
    message: "Scattered showers predicted in Tumakuru district over next 36 hrs. Defer pesticide spraying.",
    category: "WEATHER",
    timestamp: "2 hours ago",
    isRead: false,
  },
  {
    id: "notif-03",
    title: "PMFBY Enrollment Window Open",
    message: "Rabi 2026 crop insurance enrollment open until Nov 30. Check your eligibility in Schemes Hub.",
    category: "SCHEME",
    timestamp: "1 day ago",
    isRead: true,
    linkUrl: "/schemes",
  },
  {
    id: "notif-04",
    title: "FPO Pool Update",
    message: "Your FPO lot LOT-TOM-2026-08 reached 18,500 kg (74% aggregated). Ready for buyer matchmaking.",
    category: "ORDER",
    timestamp: "2 days ago",
    isRead: true,
    linkUrl: "/fpo",
  },
];

// ====================================================================
// PLATFORM STORAGE SERVICE (Durable Client/Server Interface)
// ====================================================================

const STORAGE_KEYS = {
  USER: "xmile_user_profile",
  FARM: "xmile_farm_profile",
  CROP_PLANS: "xmile_crop_plans",
  LISTINGS: "xmile_market_listings",
  OFFERS: "xmile_market_offers",
  AGRICYCLE: "xmile_agricycle_listings",
  FPOS: "xmile_fpos",
  LOTS: "xmile_aggregated_lots",
  MACHINERY: "xmile_machinery_items",
  MACHINERY_BOOKINGS: "xmile_machinery_bookings",
  SOIL_REPORTS: "xmile_soil_reports",
  CALENDAR: "xmile_calendar_events",
  FARM_RECORDS: "xmile_farm_records",
  WATER_LOGS: "xmile_water_logs",
  WEIGHMENTS: "xmile_weighments",
  NOTIFICATIONS: "xmile_notifications",
  REFERRALS: "xmile_expert_referrals",
};

export class PlatformDb {
  private static getItem<T>(key: string, defaultValue: T): T {
    if (typeof window === "undefined") return defaultValue;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        return JSON.parse(stored) as T;
      }
    } catch {
      // storage unavailable
    }
    return defaultValue;
  }

  private static setItem<T>(key: string, value: T): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage unavailable
    }
  }

  // --- Profiles & Roles ---
  static getUser(): UserProfile {
    return this.getItem(STORAGE_KEYS.USER, DEFAULT_USER);
  }

  static updateUser(user: Partial<UserProfile>): UserProfile {
    const current = this.getUser();
    const updated = { ...current, ...user };
    this.setItem(STORAGE_KEYS.USER, updated);
    return updated;
  }

  // --- Farm & Plots ---
  static getFarm(): FarmProfile {
    return this.getItem(STORAGE_KEYS.FARM, DEFAULT_FARM);
  }

  static updateFarm(farm: FarmProfile): void {
    this.setItem(STORAGE_KEYS.FARM, farm);
  }

  static addPlot(plot: Omit<Plot, "id">): Plot {
    const farm = this.getFarm();
    const newPlot: Plot = {
      ...plot,
      id: `plot-${Date.now()}`,
    };
    farm.plots.push(newPlot);
    farm.totalAreaAcres = farm.plots.reduce((sum, p) => sum + Number(p.areaAcres), 0);
    this.updateFarm(farm);
    return newPlot;
  }

  // --- Crop Plans ---
  static getCropPlans(): CropPlan[] {
    return this.getItem(STORAGE_KEYS.CROP_PLANS, SEED_CROP_PLANS);
  }

  static addCropPlan(plan: Omit<CropPlan, "id">): CropPlan {
    const plans = this.getCropPlans();
    const newPlan: CropPlan = {
      ...plan,
      id: `plan-${Date.now()}`,
    };
    plans.unshift(newPlan);
    this.setItem(STORAGE_KEYS.CROP_PLANS, plans);
    return newPlan;
  }

  // --- Marketplace Listings ---
  static getListings(): MarketplaceListing[] {
    return this.getItem(STORAGE_KEYS.LISTINGS, SEED_MARKET_LISTINGS);
  }

  static addListing(listing: Omit<MarketplaceListing, "id" | "status" | "isVerifiedLot">): MarketplaceListing {
    const listings = this.getListings();
    const newListing: MarketplaceListing = {
      ...listing,
      id: `list-${Date.now()}`,
      status: "ACTIVE",
      isVerifiedLot: true,
    };
    listings.unshift(newListing);
    this.setItem(STORAGE_KEYS.LISTINGS, listings);
    return newListing;
  }

  // --- Marketplace Offers ---
  static getOffers(): MarketplaceOffer[] {
    return this.getItem(STORAGE_KEYS.OFFERS, SEED_BUYER_OFFERS);
  }

  static addOffer(offer: Omit<MarketplaceOffer, "id" | "status" | "createdAt">): MarketplaceOffer {
    const offers = this.getOffers();
    const newOffer: MarketplaceOffer = {
      ...offer,
      id: `off-${Date.now()}`,
      status: "PENDING",
      createdAt: new Date().toISOString(),
    };
    offers.unshift(newOffer);
    this.setItem(STORAGE_KEYS.OFFERS, offers);
    return newOffer;
  }

  static updateOfferStatus(offerId: string, status: "ACCEPTED" | "REJECTED"): void {
    const offers = this.getOffers();
    const target = offers.find((o) => o.id === offerId);
    if (target) {
      target.status = status;
      this.setItem(STORAGE_KEYS.OFFERS, offers);
    }
  }

  // --- AgriCycle Residue ---
  static getAgriCycleListings(): AgriCycleResidue[] {
    return this.getItem(STORAGE_KEYS.AGRICYCLE, SEED_AGRICYCLE);
  }

  static addAgriCycleListing(item: Omit<AgriCycleResidue, "id" | "status" | "co2SavedKg">): AgriCycleResidue {
    const items = this.getAgriCycleListings();
    const co2SavedKg = Math.round(Number(item.quantityQuintals) * 70); // approx 70kg CO2 avoided per quintal
    const newItem: AgriCycleResidue = {
      ...item,
      id: `agr-${Date.now()}`,
      status: "AVAILABLE",
      co2SavedKg,
    };
    items.unshift(newItem);
    this.setItem(STORAGE_KEYS.AGRICYCLE, items);
    return newItem;
  }

  // --- FPOs & Lots ---
  static getFpos(): FpoGroup[] {
    return this.getItem(STORAGE_KEYS.FPOS, SEED_FPOS);
  }

  static getAggregatedLots(): AggregatedLot[] {
    return this.getItem(STORAGE_KEYS.LOTS, SEED_AGGREGATED_LOTS);
  }

  static contributeToLot(lotId: string, farmerName: string, quantityKg: number, grade: "A" | "B" | "C"): void {
    const lots = this.getAggregatedLots();
    const lot = lots.find((l) => l.id === lotId);
    if (lot) {
      lot.collectedQuantityKg += quantityKg;
      lot.contributions.push({
        farmerId: `usr-${Date.now()}`,
        farmerName,
        quantityKg,
        grade,
        timestamp: new Date().toISOString().split("T")[0],
      });
      if (lot.collectedQuantityKg >= lot.targetQuantityKg) {
        lot.poolStatus = "READY_FOR_SALE";
      }
      this.setItem(STORAGE_KEYS.LOTS, lots);
    }
  }

  // --- Machinery ---
  static getMachinery(): MachineryItem[] {
    return this.getItem(STORAGE_KEYS.MACHINERY, SEED_MACHINERY);
  }

  static getMachineryBookings(): MachineryBooking[] {
    return this.getItem(STORAGE_KEYS.MACHINERY_BOOKINGS, []);
  }

  static bookMachinery(booking: Omit<MachineryBooking, "id" | "status">): MachineryBooking {
    const bookings = this.getMachineryBookings();
    const newBooking: MachineryBooking = {
      ...booking,
      id: `mb-${Date.now()}`,
      status: "CONFIRMED",
    };
    bookings.unshift(newBooking);
    this.setItem(STORAGE_KEYS.MACHINERY_BOOKINGS, bookings);
    return newBooking;
  }

  // --- Soil Reports ---
  static getSoilReports(): SoilReport[] {
    return this.getItem(STORAGE_KEYS.SOIL_REPORTS, SEED_SOIL_REPORTS);
  }

  static addSoilReport(report: Omit<SoilReport, "id">): SoilReport {
    const reports = this.getSoilReports();
    const newReport: SoilReport = {
      ...report,
      id: `soil-${Date.now()}`,
    };
    reports.unshift(newReport);
    this.setItem(STORAGE_KEYS.SOIL_REPORTS, reports);
    return newReport;
  }

  // --- Calendar Events ---
  static getCalendarEvents(): CalendarEvent[] {
    return this.getItem(STORAGE_KEYS.CALENDAR, SEED_CALENDAR_EVENTS);
  }

  static addCalendarEvent(event: Omit<CalendarEvent, "id">): CalendarEvent {
    const events = this.getCalendarEvents();
    const newEvent: CalendarEvent = {
      ...event,
      id: `cal-${Date.now()}`,
    };
    events.unshift(newEvent);
    this.setItem(STORAGE_KEYS.CALENDAR, events);
    return newEvent;
  }

  // --- Farm Records (Income & Expenses) ---
  static getFarmRecords(): FarmRecordItem[] {
    return this.getItem(STORAGE_KEYS.FARM_RECORDS, SEED_FARM_RECORDS);
  }

  static addFarmRecord(record: Omit<FarmRecordItem, "id">): FarmRecordItem {
    const records = this.getFarmRecords();
    const newRecord: FarmRecordItem = {
      ...record,
      id: `rec-${Date.now()}`,
    };
    records.unshift(newRecord);
    this.setItem(STORAGE_KEYS.FARM_RECORDS, records);
    return newRecord;
  }

  // --- Expert Referrals ---
  static getExpertReferrals(): ExpertReferral[] {
    return this.getItem(STORAGE_KEYS.REFERRALS, []);
  }

  static addExpertReferral(ref: Omit<ExpertReferral, "id" | "status" | "createdAt">): ExpertReferral {
    const refs = this.getExpertReferrals();
    const newRef: ExpertReferral = {
      ...ref,
      id: `ref-${Date.now()}`,
      status: "SUBMITTED",
      createdAt: new Date().toISOString(),
      expertAdvice: "Case assigned to KVK Senior Agronomist. Response expected within 24 working hours.",
    };
    refs.unshift(newRef);
    this.setItem(STORAGE_KEYS.REFERRALS, refs);
    return newRef;
  }

  // --- Notifications ---
  static getNotifications(): PlatformNotification[] {
    return this.getItem(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
  }

  static markNotificationRead(id: string): void {
    const notifs = this.getNotifications();
    const target = notifs.find((n) => n.id === id);
    if (target) {
      target.isRead = true;
      this.setItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
    }
  }

  static addNotification(notif: Omit<PlatformNotification, "id" | "isRead" | "timestamp">): PlatformNotification {
    const notifs = this.getNotifications();
    const newNotif: PlatformNotification = {
      ...notif,
      id: `notif-${Date.now()}`,
      isRead: false,
      timestamp: "Just now",
    };
    notifs.unshift(newNotif);
    this.setItem(STORAGE_KEYS.NOTIFICATIONS, notifs);
    return newNotif;
  }
}
