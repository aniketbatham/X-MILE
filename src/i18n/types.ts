export type LocaleCode =
  | "en" // English
  | "as" // Assamese (অসমীয়া)
  | "bn" // Bengali (বাংলা)
  | "brx" // Bodo (बर')
  | "doi" // Dogri (डोगरी)
  | "gu" // Gujarati (ગુજરાતી)
  | "hi" // Hindi (हिन्दी)
  | "kn" // Kannada (ಕನ್ನಡ)
  | "ks" // Kashmiri (کٲشُر)
  | "kok" // Konkani (कोंकणी)
  | "mai" // Maithili (मैथिली)
  | "ml" // Malayalam (മലയാളം)
  | "mni" // Manipuri (ꯃꯤꯇꯩꯂꯣꯟ)
  | "mr" // Marathi (मराठी)
  | "ne" // Nepali (नेपाली)
  | "or" // Odia (ଓଡ଼ିଆ)
  | "pa" // Punjabi (ਪੰਜਾਬੀ)
  | "sa" // Sanskrit (संस्कृतम्)
  | "sat" // Santali (ᱥᱟᱱᱛᱟᱲᱤ)
  | "sd" // Sindhi (سنڌي)
  | "ta" // Tamil (தமிழ்)
  | "te" // Telugu (తెలుగు)
  | "ur"; // Urdu (اردو)

export type TextDirection = "ltr" | "rtl";

export interface LanguageInfo {
  code: LocaleCode;
  name: string; // English name
  nativeName: string; // Native name in own script
  script: string;
  dir: TextDirection;
  region: string;
  flagEmoji?: string;
  fontFamily?: string;
}

export interface TranslationDictionary {
  common: {
    brandName: string;
    tagline: string;
    taglinePart1: string;
    taglinePart2: string;
    home: string;
    farmerPortal: string;
    buyerPortal: string;
    aiQuality: string;
    forecast: string;
    transaction: string;
    selectLanguage: string;
    close: string;
    search: string;
    loading: string;
    error: string;
    success: string;
    viewAll: string;
    details: string;
    status: string;
    quantity: string;
    kg: string;
    grade: string;
    price: string;
    submit: string;
    cancel: string;
    back: string;
    refresh: string;
    call: string;
    chatWithAi: string;
    allRightsReserved: string;
  };
  nav: {
    home: string;
    farmer: string;
    buyer: string;
    quality: string;
    forecast: string;
    transactions: string;
    farmerMode: string;
    buyerMode: string;
    language: string;
  };
  home: {
    heroBadge: string;
    heroTitlePart1: string;
    heroTitlePart2: string;
    heroSubtitle: string;
    farmerCta: string;
    buyerCta: string;
    verifiedQuality: string;
    organizedLogistics: string;
    fairPricing: string;
    processTitle: string;
    processSubtitle: string;
    step1: string;
    step2: string;
    step3: string;
    step4: string;
    step5: string;
    step6: string;
    step7: string;
    poolingTitle: string;
    poolingSubtitle: string;
    poolingStatLabel: string;
    poolingStatSub: string;
    modulesTitle: string;
    modulesSubtitle: string;
    farmerDesc: string;
    buyerDesc: string;
    qualityDesc: string;
    forecastDesc: string;
    transactionDesc: string;
    statFarmers: string;
    statBuyers: string;
    statProduceGraded: string;
    statFulfilled: string;
    footerAbout: string;
  };
  quality: {
    title: string;
    subtitle: string;
    step1Title: string;
    step1Desc: string;
    selectProduce: string;
    uploadInstructions: string;
    dragDrop: string;
    orBrowse: string;
    supportsFormats: string;
    analyzeButton: string;
    analyzingButton: string;
    scanningMessage: string;
    resultsTitle: string;
    gradeLabel: string;
    scoreLabel: string;
    confidenceLabel: string;
    suitabilityLabel: string;
    observationsTitle: string;
    defectsTitle: string;
    noDefects: string;
    disclaimerTitle: string;
    disclaimerText: string;
    produceTypes: {
      tomato: string;
      onion: string;
      potato: string;
      carrot: string;
      cabbage: string;
      brinjal: string;
      chilli: string;
    };
  };
  farmer: {
    title: string;
    subtitle: string;
    modeBadge: string;
    addProduceTitle: string;
    addProduceSubtitle: string;
    cropLabel: string;
    quantityLabel: string;
    dateLabel: string;
    runAiCheck: string;
    joinPool: string;
    addingToPool: string;
    poolNotice: string;
    myListingsTitle: string;
    activeOrdersTitle: string;
    noActiveOrders: string;
    acceptOrder: string;
    fulfillOrder: string;
    orderAccepted: string;
    orderInTransit: string;
    orderDelivered: string;
    statusPooled: string;
    statusReserved: string;
    statusDispatched: string;
  };
  buyer: {
    title: string;
    subtitle: string;
    modeBadge: string;
    reqTitle: string;
    reqSubtitle: string;
    cropRequired: string;
    quantityRequired: string;
    gradeTarget: string;
    destinationCity: string;
    matchSupply: string;
    matchingSupply: string;
    matchResultsTitle: string;
    pooledFromFarmers: string;
    optimizedRouteTitle: string;
    totalDistance: string;
    estimatedCost: string;
    placeReservation: string;
    reservationPlaced: string;
    recentOrdersTitle: string;
  };
  forecast: {
    title: string;
    subtitle: string;
    demandTrendTitle: string;
    trendIncreasing: string;
    trendStable: string;
    trendDecreasing: string;
    highDemandCrops: string;
    marketInsight: string;
    priceForecastTitle: string;
    seasonalOutlookTitle: string;
    procurementAdvice: string;
  };
  transaction: {
    title: string;
    subtitle: string;
    activeShipmentsTitle: string;
    milestoneTracking: string;
    orderId: string;
    crop: string;
    farmer: string;
    buyer: string;
    escrowStatus: string;
    paymentSecured: string;
    stepOrderPlaced: string;
    stepDispatched: string;
    stepInTransit: string;
    stepDelivered: string;
    deliveryConfirmed: string;
  };
  chatbot: {
    assistantName: string;
    tagline: string;
    welcomeMessage: string;
    placeholder: string;
    quickFarmer: string;
    quickBuyer: string;
    quickQuality: string;
    quickForecast: string;
    starter1: string;
    starter2: string;
    starter3: string;
    starter4: string;
    clearChat: string;
    closeChat: string;
    poweredBy: string;
  };
  firstVisit: {
    title: string;
    subtitle: string;
    tagline: string;
    searchPlaceholder: string;
    popularTitle: string;
    allLanguagesTitle: string;
    continueButton: string;
    changeAnytime: string;
  };
}
