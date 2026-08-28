export interface ManualOrderDetails {
  platform: string;
  platformName: string;
  productUrl: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  shippingAddress: string;
  instructions: string;
}

export function generateManualOrderDetails(params: {
  platform: string;
  platformProductId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  shippingAddress: {
    fullName: string;
    phone: string;
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  storeUrl?: string;
}): ManualOrderDetails {
  const addr = params.shippingAddress;
  const addressStr = `${addr.fullName}\n${addr.street}\n${addr.city}, ${addr.state} ${addr.zipCode}\n${addr.country}\nPhone: ${addr.phone}`;

  const platformUrls: Record<string, string> = {
    aliexpress: `https://www.aliexpress.com/item/${params.platformProductId}.html`,
    amazon: `https://www.amazon.com/dp/${params.platformProductId}`,
    ebay: `https://www.ebay.com/itm/${params.platformProductId}`,
    alibaba: `https://www.alibaba.com/product-detail/${params.platformProductId}.html`,
    dhgate: `https://www.dhgate.com/product/${params.platformProductId}.html`,
    temu: `https://www.temu.com/search?search_key=${encodeURIComponent(params.productName)}`,
    shein: `https://www.shein.com/search?search_key=${encodeURIComponent(params.productName)}`,
    banggood: `https://www.banggood.com/search/${params.platformProductId}.html`,
    custom: params.storeUrl || "",
  };

  const instructions: Record<string, string> = {
    aliexpress: `1. Open the product link\n2. Select quantity: ${params.quantity}\n3. Click "Buy Now"\n4. Paste shipping address below\n5. Complete payment\n6. Copy order confirmation number back to DropShip Hub`,
    amazon: `1. Open the product link\n2. Add ${params.quantity} to cart\n3. Proceed to checkout\n4. Paste shipping address below\n5. Complete payment\n6. Copy order number back to DropShip Hub`,
    ebay: `1. Open the product link\n2. Buy ${params.quantity} now\n3. Enter shipping address below\n4. Complete payment\n5. Copy order number back to DropShip Hub`,
    alibaba: `1. Open the product link\n2. Contact supplier for ${params.quantity} units\n3. Negotiate price if needed\n4. Place order with shipping address below\n5. Copy order number back to DropShip Hub`,
    custom: `1. Open your supplier's website\n2. Find the product: ${params.productName}\n3. Order ${params.quantity} units\n4. Use shipping address below\n5. Copy order number back to DropShip Hub`,
  };

  return {
    platform: params.platform,
    platformName: platformUrls[params.platform] ? params.platform : "supplier",
    productUrl: platformUrls[params.platform] || "",
    productName: params.productName,
    quantity: params.quantity,
    unitPrice: params.unitPrice,
    shippingAddress: addressStr,
    instructions: instructions[params.platform] || instructions.custom,
  };
}

export function getSupplierUrl(platform: string, platformProductId: string, storeUrl?: string): string {
  const urls: Record<string, string> = {
    aliexpress: `https://www.aliexpress.com/item/${platformProductId}.html`,
    amazon: `https://www.amazon.com/dp/${platformProductId}`,
    ebay: `https://www.ebay.com/itm/${platformProductId}`,
    alibaba: `https://www.alibaba.com/product-detail/${platformProductId}.html`,
    dhgate: `https://www.dhgate.com/product/${platformProductId}.html`,
    custom: storeUrl || "",
  };
  return urls[platform] || "";
}
