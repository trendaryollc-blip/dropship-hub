import { Supplier } from "@/types/product";

export interface ExtendedSupplier extends Supplier {
  categories: string[];
  monthlyOrders: number;
  avgProcessingTime: string;
  returnPolicy: string;
  communicationScore: number;
  shippingMethods: string[];
  certifications: string[];
  yearEstablished: number;
  responseRate: number;
  qualityScore: number;
  priceCompetitiveness: number;
}

export const allSuppliers: ExtendedSupplier[] = [
  {
    id: "s1", name: "TechSource Global", location: "Shenzhen, China",
    reliabilityScore: 92, shippingDays: 7, rating: 4.8, reviews: 12400,
    responseTime: "< 4 hours", trustBadge: "gold", orderCompletionRate: 98.5, disputeRate: 0.8,
    categories: ["Electronics", "Gadgets", "Smart Home"],
    monthlyOrders: 45000, avgProcessingTime: "1-2 days", returnPolicy: "30-day returns",
    communicationScore: 90, shippingMethods: ["ePacket", "AliExpress Standard", "DHL"],
    certifications: ["ISO 9001", "CE", "FCC"], yearEstablished: 2015, responseRate: 97,
    qualityScore: 91, priceCompetitiveness: 95,
  },
  {
    id: "s2", name: "PrimeDrop Fulfillment", location: "Los Angeles, US",
    reliabilityScore: 96, shippingDays: 3, rating: 4.9, reviews: 8200,
    responseTime: "< 2 hours", trustBadge: "gold", orderCompletionRate: 99.2, disputeRate: 0.3,
    categories: ["All Categories", "Electronics", "Fashion", "Home"],
    monthlyOrders: 32000, avgProcessingTime: "Same day", returnPolicy: "60-day returns",
    communicationScore: 98, shippingMethods: ["USPS", "UPS", "FedEx"],
    certifications: ["ISO 9001", "BBB A+"], yearEstablished: 2018, responseRate: 99,
    qualityScore: 97, priceCompetitiveness: 78,
  },
  {
    id: "s3", name: "EuropaSupply", location: "Berlin, Germany",
    reliabilityScore: 88, shippingDays: 5, rating: 4.6, reviews: 5600,
    responseTime: "< 6 hours", trustBadge: "silver", orderCompletionRate: 97.1, disputeRate: 1.2,
    categories: ["Home & Kitchen", "Beauty", "Health"],
    monthlyOrders: 18000, avgProcessingTime: "1-3 days", returnPolicy: "14-day returns",
    communicationScore: 85, shippingMethods: ["DHL", "GLS", "Hermes"],
    certifications: ["CE", "GS", "EU Ecolabel"], yearEstablished: 2016, responseRate: 94,
    qualityScore: 88, priceCompetitiveness: 82,
  },
  {
    id: "s4", name: "CJ Direct", location: "Yiwu, China",
    reliabilityScore: 85, shippingDays: 10, rating: 4.5, reviews: 28000,
    responseTime: "< 8 hours", trustBadge: "silver", orderCompletionRate: 96.8, disputeRate: 1.8,
    categories: ["All Categories", "Fashion", "Accessories"],
    monthlyOrders: 89000, avgProcessingTime: "1-3 days", returnPolicy: "30-day returns",
    communicationScore: 82, shippingMethods: ["CJPacket", "ePacket", "DHL"],
    certifications: ["ISO 9001"], yearEstablished: 2014, responseRate: 91,
    qualityScore: 83, priceCompetitiveness: 97,
  },
  {
    id: "s5", name: "NordicTrade Co", location: "Stockholm, Sweden",
    reliabilityScore: 90, shippingDays: 4, rating: 4.7, reviews: 3200,
    responseTime: "< 3 hours", trustBadge: "gold", orderCompletionRate: 98.9, disputeRate: 0.5,
    categories: ["Fashion", "Home", "Sports"],
    monthlyOrders: 12000, avgProcessingTime: "1-2 days", returnPolicy: "30-day returns",
    communicationScore: 93, shippingMethods: ["DHL", "PostNord", "UPS"],
    certifications: ["ISO 14001", "OEKO-TEX"], yearEstablished: 2019, responseRate: 98,
    qualityScore: 92, priceCompetitiveness: 75,
  },
  {
    id: "s6", name: "AsiaMart Direct", location: "Guangzhou, China",
    reliabilityScore: 80, shippingDays: 12, rating: 4.3, reviews: 42000,
    responseTime: "< 12 hours", trustBadge: "bronze", orderCompletionRate: 95.5, disputeRate: 2.5,
    categories: ["Electronics", "Toys", "Automotive"],
    monthlyOrders: 67000, avgProcessingTime: "2-4 days", returnPolicy: "15-day returns",
    communicationScore: 72, shippingMethods: ["AliExpress Standard", "Cainiao", "EMS"],
    certifications: ["CE"], yearEstablished: 2012, responseRate: 85,
    qualityScore: 76, priceCompetitiveness: 98,
  },
  {
    id: "s7", name: "WestCoast Supply", location: "Toronto, Canada",
    reliabilityScore: 94, shippingDays: 4, rating: 4.8, reviews: 4800,
    responseTime: "< 2 hours", trustBadge: "gold", orderCompletionRate: 99.0, disputeRate: 0.4,
    categories: ["Health", "Beauty", "Home & Kitchen"],
    monthlyOrders: 15000, avgProcessingTime: "Same day", returnPolicy: "45-day returns",
    communicationScore: 96, shippingMethods: ["Canada Post", "UPS", "FedEx"],
    certifications: ["ISO 9001", "Health Canada"], yearEstablished: 2020, responseRate: 99,
    qualityScore: 95, priceCompetitiveness: 80,
  },
  {
    id: "s8", name: "Pacific Rim Trading", location: "Ho Chi Minh, Vietnam",
    reliabilityScore: 87, shippingDays: 8, rating: 4.6, reviews: 9800,
    responseTime: "< 5 hours", trustBadge: "silver", orderCompletionRate: 97.5, disputeRate: 1.0,
    categories: ["Fashion", "Textiles", "Accessories"],
    monthlyOrders: 28000, avgProcessingTime: "2-3 days", returnPolicy: "30-day returns",
    communicationScore: 86, shippingMethods: ["Vietnam Post", "DHL", "FedEx"],
    certifications: ["ISO 9001", "WRAP"], yearEstablished: 2017, responseRate: 95,
    qualityScore: 89, priceCompetitiveness: 93,
  },
  {
    id: "s9", name: "DropShip US Warehouse", location: "Dallas, US",
    reliabilityScore: 95, shippingDays: 2, rating: 4.9, reviews: 6100,
    responseTime: "< 1 hour", trustBadge: "gold", orderCompletionRate: 99.5, disputeRate: 0.2,
    categories: ["All Categories"],
    monthlyOrders: 52000, avgProcessingTime: "Same day", returnPolicy: "60-day returns",
    communicationScore: 99, shippingMethods: ["UPS", "FedEx", "USPS"],
    certifications: ["ISO 9001", "BBB A+", "Shopify Partner"], yearEstablished: 2021, responseRate: 100,
    qualityScore: 98, priceCompetitiveness: 72,
  },
  {
    id: "s10", name: "Mumbai Makers Hub", location: "Mumbai, India",
    reliabilityScore: 78, shippingDays: 14, rating: 4.2, reviews: 15000,
    responseTime: "< 10 hours", trustBadge: "bronze", orderCompletionRate: 94.8, disputeRate: 3.1,
    categories: ["Jewelry", "Fashion", "Home Decor"],
    monthlyOrders: 22000, avgProcessingTime: "3-5 days", returnPolicy: "15-day returns",
    communicationScore: 70, shippingMethods: ["India Post", "DHL", "Blue Dart"],
    certifications: ["ISO 9001"], yearEstablished: 2013, responseRate: 82,
    qualityScore: 74, priceCompetitiveness: 99,
  },
  {
    id: "s11", name: "Tokyo Tech Supply", location: "Tokyo, Japan",
    reliabilityScore: 91, shippingDays: 6, rating: 4.7, reviews: 4200,
    responseTime: "< 3 hours", trustBadge: "gold", orderCompletionRate: 98.8, disputeRate: 0.6,
    categories: ["Electronics", "Beauty", "Gadgets"],
    monthlyOrders: 11000, avgProcessingTime: "1-2 days", returnPolicy: "30-day returns",
    communicationScore: 94, shippingMethods: ["Japan Post", "DHL", "FedEx"],
    certifications: ["ISO 9001", "PSE", "JIS"], yearEstablished: 2019, responseRate: 97,
    qualityScore: 96, priceCompetitiveness: 70,
  },
  {
    id: "s12", name: "BrazilTrade Express", location: "Sao Paulo, Brazil",
    reliabilityScore: 82, shippingDays: 11, rating: 4.4, reviews: 7600,
    responseTime: "< 7 hours", trustBadge: "silver", orderCompletionRate: 96.2, disputeRate: 1.9,
    categories: ["Fashion", "Sports", "Accessories"],
    monthlyOrders: 14000, avgProcessingTime: "2-4 days", returnPolicy: "20-day returns",
    communicationScore: 80, shippingMethods: ["Correios", "DHL", "Latam Cargo"],
    certifications: ["INMETRO"], yearEstablished: 2017, responseRate: 88,
    qualityScore: 81, priceCompetitiveness: 90,
  },
];

export function getSupplierById(id: string): ExtendedSupplier | undefined {
  return allSuppliers.find((s) => s.id === id);
}

export function findBackupSuppliers(
  primarySupplierId: string,
  category?: string
): ExtendedSupplier[] {
  const primary = allSuppliers.find((s) => s.id === primarySupplierId);
  if (!primary) return [];

  return allSuppliers
    .filter((s) => s.id !== primarySupplierId)
    .filter((s) => !category || s.categories.some((c) => c === category || c === "All Categories"))
    .sort((a, b) => {
      const scoreA = a.reliabilityScore * 0.4 + a.communicationScore * 0.3 + a.qualityScore * 0.3;
      const scoreB = b.reliabilityScore * 0.4 + b.communicationScore * 0.3 + b.qualityScore * 0.3;
      return scoreB - scoreA;
    });
}
