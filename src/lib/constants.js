// src/lib/constants.js

export const BUSINESS_TYPES = {
  sari_sari: {
    label: 'Sari-sari Store',
    icon: 'storefront-outline',
    color: '#1A56A0',
    categories: ['Beverages','Snacks','Canned Goods','Rice & Grains','Condiments','Hygiene','Cigarettes','Candy','Others'],
    expenseCategories: ['Supplier/Restock','Utilities','Rent','Transport','Packaging','Others'],
  },
  carinderia: {
    label: 'Carinderia / Food Stall',
    icon: 'restaurant-outline',
    color: '#B45309',
    categories: ['Rice Meals','Viand','Soup','Drinks','Dessert','Others'],
    expenseCategories: ['Ingredients','LPG/Fuel','Utilities','Rent','Labor','Packaging','Others'],
  },
  salon: {
    label: 'Salon / Beauty Service',
    icon: 'cut-outline',
    color: '#5B21B6',
    categories: ['Haircut','Hair Color','Hair Treatment','Nails','Facial','Waxing','Others'],
    expenseCategories: ['Products/Supplies','Utilities','Rent','Staff Wages','Equipment','Others'],
  },
  bakery: {
    label: 'Bakery / Panaderya',
    icon: 'cafe-outline',
    color: '#92400E',
    categories: ['Bread','Pastries','Cakes','Drinks','Savory','Others'],
    expenseCategories: ['Ingredients/Flour','LPG/Fuel','Utilities','Rent','Packaging','Staff Wages','Others'],
  },
  pharmacy: {
    label: 'Pharmacy / Botika',
    icon: 'medkit-outline',
    color: '#065F46',
    categories: ['Prescription','OTC Medicines','Vitamins','First Aid','Personal Care','Others'],
    expenseCategories: ['Medicines/Stock','Utilities','Rent','Staff Wages','Equipment','Others'],
  },
  hardware: {
    label: 'Hardware Store',
    icon: 'hammer-outline',
    color: '#374151',
    categories: ['Tools','Electrical','Plumbing','Paint','Fasteners','Lumber','Others'],
    expenseCategories: ['Supplier/Restock','Utilities','Rent','Transport','Staff Wages','Others'],
  },
  boutique: {
    label: 'Boutique / Clothing Shop',
    icon: 'shirt-outline',
    color: '#BE185D',
    categories: ['Women\'s Wear','Men\'s Wear','Children\'s Wear','Accessories','Footwear','Others'],
    expenseCategories: ['Merchandise/Stock','Utilities','Rent','Transport','Packaging','Staff Wages','Others'],
  },
  general: {
    label: 'General Business',
    icon: 'business-outline',
    color: '#4B5563',
    categories: ['Products','Services','Others'],
    expenseCategories: ['Supplies','Utilities','Rent','Transport','Staff Wages','Others'],
  },
};

// Returns the matching business type definition, falling back to 'general' for unknown types.
export function getBusinessType(type) {
  return BUSINESS_TYPES[type] || BUSINESS_TYPES.general;
}

export const TIERS = {
  libre: { id: 'libre', label: 'Libre',  price: 0,   color: '#0F6E56' },
  cloud: { id: 'cloud', label: 'Cloud',  price: 299, color: '#1A56A0' },
  pro:   { id: 'pro',   label: 'Pro',    price: 799, color: '#5B21B6' },
};

export const TIER_FEATURES = {
  libre: ['pos','inventory','dashboard','expenses','alerts','ai_advisor'],
  cloud: ['pos','inventory','dashboard','expenses','alerts','ai_advisor','cloud_sync','multi_device','exports','team_basic'],
  pro:   ['pos','inventory','dashboard','expenses','alerts','ai_advisor','cloud_sync','multi_device','exports','team_full','ai_forecast','tax_estimation','priority_support'],
};

export function hasFeature(userTier, feature) {
  return (TIER_FEATURES[userTier] || TIER_FEATURES.libre).includes(feature);
}

export const UPGRADE_TRIGGERS = {
  device_loss:    { after_days: 14, feature: 'cloud_sync', tier: 'cloud' },
  remote_access:  { after_logins: 10, feature: 'multi_device', tier: 'cloud' },
  export_attempt: { on_action: 'export', feature: 'exports', tier: 'cloud' },
  milestone_100:  { at_transactions: 100, feature: 'cloud_sync', tier: 'cloud' },
};
