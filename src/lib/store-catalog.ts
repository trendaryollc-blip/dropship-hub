// Curated catalog of store platforms for the Store Connecting page.
// Each entry includes credential fields, setup guides, and direct links
// so non-technical users can connect their stores without coding.

export type StoreCategory = "E-commerce Platform" | "Marketplace" | "Custom";

export interface SetupStep {
  text: string;
  highlight?: string; // text to bold/highlight in the step
}

export interface StoreField {
  key: string;
  label: string;
  placeholder: string;
  type: "text" | "password" | "url";
  required: boolean;
  helpText?: string;
}

export interface StorePlatform {
  id: string;
  name: string;
  category: StoreCategory;
  description: string;
  color: string;
  bg: string;
  fields: StoreField[];
  keyUrl: string; // direct link to API key / developer page
  keyUrlLabel?: string; // label for the link (default: "Get API Key")
  setupGuide: SetupStep[];
  apiDocsUrl?: string;
}

export const STORE_CATALOG: StorePlatform[] = [
  // ── Featured ──────────────────────────────────────────────────────────
  {
    id: "trendaryo",
    name: "Trendaryo",
    category: "E-commerce Platform",
    description: "Your store — full two-way sync for products, orders & inventory.",
    color: "#e11d48",
    bg: "#fff1f2",
    keyUrl: "https://trendaryo.com",
    keyUrlLabel: "Visit Trendaryo",
    fields: [
      { key: "url", label: "Store URL", placeholder: "https://trendaryo.com", type: "url", required: true },
      { key: "backendUrl", label: "Backend API URL", placeholder: "https://trendaryo-llc-backend.vercel.app", type: "url", required: true },
      { key: "apiKey", label: "API Key", placeholder: "trend_xxxxxxxxxxxxx", type: "password", required: true, helpText: "Create via POST /api/keys with your admin account" },
    ],
    setupGuide: [
      { text: "Log in to your Trendaryo admin dashboard." },
      { text: "Go to ", highlight: "Settings → API Keys" },
      { text: "Click ", highlight: "Generate New Key" },
      { text: "Copy the API key and paste it above." },
      { text: "Enter your store URL and backend API URL." },
    ],
  },

  // ── E-commerce Platforms ──────────────────────────────────────────────
  {
    id: "shopify",
    name: "Shopify",
    category: "E-commerce Platform",
    description: "World's most popular e-commerce platform. Push products directly to your Shopify store.",
    color: "#5e8e3e",
    bg: "#f0f7e8",
    keyUrl: "https://admin.shopify.com/settings/apps",
    fields: [
      { key: "storeDomain", label: "Store Domain", placeholder: "your-store.myshopify.com", type: "url", required: true },
      { key: "accessToken", label: "Access Token", placeholder: "shpat_xxxxxxxxxxxxx", type: "password", required: true },
    ],
    setupGuide: [
      { text: "Open your Shopify Admin → ", highlight: "Settings" },
      { text: "Click ", highlight: "Apps and sales channels" },
      { text: "Click ", highlight: "Develop apps" },
      { text: "Click ", highlight: "Create an app" },
      { text: "Name it (e.g., \"DropShip Hub\") → click ", highlight: "Create" },
      { text: "Under API credentials, click ", highlight: "Configure" },
      { text: "Select scopes: ", highlight: "read_products, write_products" },
      { text: "Click ", highlight: "Install app" },
      { text: "Copy the ", highlight: "Admin API access token" },
      { text: "Your store domain is ", highlight: "your-store.myshopify.com" },
    ],
    apiDocsUrl: "https://shopify.dev/docs/api/admin-rest",
  },
  {
    id: "woocommerce",
    name: "WooCommerce",
    category: "E-commerce Platform",
    description: "WordPress e-commerce plugin. Connect your WooCommerce store with REST API keys.",
    color: "#7b61ff",
    bg: "#f0edff",
    keyUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
    keyUrlLabel: "WooCommerce API Docs",
    fields: [
      { key: "url", label: "Store URL", placeholder: "https://yourstore.com", type: "url", required: true },
      { key: "apiKey", label: "Consumer Key", placeholder: "ck_xxxxxxxxxxxxx", type: "password", required: true },
      { key: "apiSecret", label: "Consumer Secret", placeholder: "cs_xxxxxxxxxxxxx", type: "password", required: true },
    ],
    setupGuide: [
      { text: "Open your WordPress Admin → ", highlight: "WooCommerce → Settings" },
      { text: "Click the ", highlight: "Advanced" },
      { text: "Click ", highlight: "REST API" },
      { text: "Click ", highlight: "Add key" },
      { text: "Add a description (e.g., \"DropShip Hub\") and set permissions to ", highlight: "Read/Write" },
      { text: "Click ", highlight: "Generate API key" },
      { text: "Copy the ", highlight: "Consumer key" },
      { text: "Copy the ", highlight: "Consumer secret" },
    ],
    apiDocsUrl: "https://woocommerce.github.io/woocommerce-rest-api-docs/",
  },
  {
    id: "bigcommerce",
    name: "BigCommerce",
    category: "E-commerce Platform",
    description: "Enterprise e-commerce platform. Connect via Storefront API tokens.",
    color: "#34313f",
    bg: "#f0eff1",
    keyUrl: "https://developer.bigcommerce.com/docs/storefront/api-overview",
    keyUrlLabel: "BigCommerce API Docs",
    fields: [
      { key: "storeHash", label: "Store Hash", placeholder: "xxxxxxx", type: "text", required: true, helpText: "From your store URL: store-xxxxxx.mybigcommerce.com" },
      { key: "accessToken", label: "Access Token", placeholder: "xxxxxxxxxxxxxxxxxxxxxxxx", type: "password", required: true },
    ],
    setupGuide: [
      { text: "Log in to your BigCommerce Admin → ", highlight: "Storefront" },
      { text: "Click ", highlight: "Storefront API Tokens" },
      { text: "Click ", highlight: "Create API Token" },
      { text: "Name it (e.g., \"DropShip Hub\") and set allowed scopes: ", highlight: "Products (read/write), Orders (read)" },
      { text: "Click ", highlight: "Save" },
      { text: "Copy the ", highlight: "Access Token" },
      { text: "Your Store Hash is in your URL: ", highlight: "store-xxxxxx.mybigcommerce.com" },
    ],
    apiDocsUrl: "https://developer.bigcommerce.com/docs/storefront/api-overview",
  },
  {
    id: "wix",
    name: "Wix",
    category: "E-commerce Platform",
    description: "Website builder with online store. Connect via Wix API.",
    color: "#0c6efc",
    bg: "#e8f2ff",
    keyUrl: "https://dev.wix.com",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "xxxxxxxx-xxxx-xxxx-xxxx", type: "password", required: true },
      { key: "storeUrl", label: "Store URL", placeholder: "https://yourstore.wixsite.com/mystore", type: "url", required: true },
    ],
    setupGuide: [
      { text: "Go to ", highlight: "dev.wix.com" },
      { text: "Sign in with your Wix account" },
      { text: "Click ", highlight: "Create New Project" },
      { text: "Choose your site → copy the ", highlight: "API Key" },
      { text: "Your store URL is your Wix site URL" },
    ],
    apiDocsUrl: "https://dev.wix.com/docs/develop-websites-sdk",
  },

  // ── Marketplaces ──────────────────────────────────────────────────────
  {
    id: "amazon",
    name: "Amazon",
    category: "Marketplace",
    description: "Sell on the world's largest marketplace. Connect via Selling Partner API (SP-API).",
    color: "#ff9900",
    bg: "#fff8ee",
    keyUrl: "https://sellercentral.amazon.com/sellingpartner/developerconsole",
    fields: [
      { key: "sellerId", label: "Seller ID", placeholder: "A1B2C3D4E5F6G7", type: "text", required: true },
      { key: "mwsAuthToken", label: "SP-API Refresh Token", placeholder: "Atzr|...", type: "password", required: true },
    ],
    setupGuide: [
      { text: "Log in to ", highlight: "Amazon Seller Central" },
      { text: "Go to ", highlight: "Apps and Services → Develop Apps" },
      { text: "Complete the ", highlight: "Developer Profile" },
      { text: "Click ", highlight: "+ Add new app client" },
      { text: "Select ", highlight: "SP API" },
      { text: "Choose roles: ", highlight: "select all roles for full access" },
      { text: "Click ", highlight: "Save and exit" },
      { text: "Copy your ", highlight: "Client ID (Seller ID)" },
      { text: "Under LWA credentials, copy ", highlight: "Client identifier" },
      { text: "Click ", highlight: "Authorize app" },
      { text: "Copy the generated ", highlight: "Refresh Token" },
    ],
    apiDocsUrl: "https://developer-docs.amazon.com/sp-api/docs",
  },
  {
    id: "ebay",
    name: "eBay",
    category: "Marketplace",
    description: "Auction & buy-it-now marketplace. Connect via eBay RESTful API.",
    color: "#e53238",
    bg: "#fde8e8",
    keyUrl: "https://developer.ebay.com/",
    fields: [
      { key: "appId", label: "App ID (Client ID)", placeholder: "YourApp-PRD-xxxx-xxxx", type: "text", required: true },
      { key: "certId", label: "Cert ID (Client Secret)", placeholder: "PRD-xxxx-xxxx-xxxx", type: "password", required: true },
      { key: "accessToken", label: "User Token", placeholder: "v%^1%^...", type: "password", required: true },
    ],
    setupGuide: [
      { text: "Go to ", highlight: "developer.ebay.com" },
      { text: "Sign in or create a developer account" },
      { text: "Click ", highlight: "My Account → Application Keysets" },
      { text: "Click ", highlight: "Create a keyset" },
      { text: "Select ", highlight: "Production" },
      { text: "Copy your ", highlight: "App ID (Client ID)" },
      { text: "Copy your ", highlight: "Cert ID (Client Secret)" },
      { text: "Click ", highlight: "User Tokens" },
      { text: "Under \"Get a Token from eBay via Your Application\", click ", highlight: "+ Add eBay Redirect URL" },
      { text: "Enter any redirect URL → click ", highlight: "Save" },
      { text: "Copy the generated ", highlight: "RuName" },
      { text: "Click ", highlight: "Get a Token from eBay via Your Application" },
      { text: "Log in and authorize → copy the ", highlight: "User Token" },
    ],
    apiDocsUrl: "https://developer.ebay.com/api-docs/static/overview.html",
  },
  {
    id: "etsy",
    name: "Etsy",
    category: "Marketplace",
    description: "Handmade & vintage marketplace. Connect via Etsy Open API.",
    color: "#f1641e",
    bg: "#fff0e8",
    keyUrl: "https://www.etsy.com/developers/your-apps",
    fields: [
      { key: "apiKey", label: "API Key", placeholder: "xxxxxxxxxxxxxxxxxxxx", type: "password", required: true },
      { key: "shopId", label: "Shop ID", placeholder: "12345678", type: "text", required: true },
    ],
    setupGuide: [
      { text: "Go to ", highlight: "etsy.com/developers" },
      { text: "Sign in with your Etsy account" },
      { text: "Click ", highlight: "Create a New App" },
      { text: "Fill in app name and details → submit" },
      { text: "Copy your ", highlight: "API Key" },
      { text: "Find your Shop ID: ", highlight: "Shop Manager → Settings → Info" },
    ],
    apiDocsUrl: "https://developer.etsy.com/documentation",
  },

  // ── Custom ────────────────────────────────────────────────────────────
  {
    id: "custom",
    name: "Custom Store",
    category: "Custom",
    description: "Connect any store you built from scratch. Just enter the URL.",
    color: "#f59e0b",
    bg: "#fef9e7",
    keyUrl: "",
    keyUrlLabel: "",
    fields: [
      { key: "url", label: "Store URL", placeholder: "https://yourstore.com", type: "url", required: true },
      { key: "apiKey", label: "API Key (optional)", placeholder: "Leave blank if no auth needed", type: "password", required: false, helpText: "If your store has an API endpoint, enter the key here" },
    ],
    setupGuide: [
      { text: "Enter your store's URL above" },
      { text: "If your store has an API, enter the API key (optional)" },
      { text: "If no API is available, we'll store your product data for management" },
    ],
  },
];

export const STORE_CATEGORIES: StoreCategory[] = ["E-commerce Platform", "Marketplace", "Custom"];

export function getStorePlatform(id: string): StorePlatform | undefined {
  return STORE_CATALOG.find((p) => p.id === id);
}
