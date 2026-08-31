// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getProduct") {
    const product = extractProduct();
    sendResponse(product);
  }
  return true;
});

function extractProduct() {
  const url = window.location.href;
  const hostname = window.location.hostname;
  
  let product = {
    title: "",
    price: null,
    image: "",
    url: url,
    source: detectSource(hostname),
  };

  // Generic extraction patterns
  // Title: look for h1, product title classes
  const titleEl = document.querySelector("h1") || 
                  document.querySelector('[class*="product-title"]') ||
                  document.querySelector('[class*="item-title"]') ||
                  document.querySelector('[data-testid="product-title"]');
  if (titleEl) product.title = titleEl.textContent.trim();

  // Price: look for price elements
  const priceEl = document.querySelector('[class*="price"]') ||
                  document.querySelector('[data-testid="price"]') ||
                  document.querySelector('[itemprop="price"]');
  if (priceEl) {
    const priceText = priceEl.textContent || priceEl.getAttribute("content") || "";
    const priceMatch = priceText.match(/[\d,]+\.?\d*/);
    if (priceMatch) product.price = parseFloat(priceMatch[0].replace(",", ""));
  }

  // Image: look for main product image
  const imgEl = document.querySelector('[class*="product-image"] img') ||
                document.querySelector('[data-testid="product-image"]') ||
                document.querySelector('#imgBlkFront') ||
                document.querySelector('[itemprop="image"]');
  if (imgEl) product.image = imgEl.src || imgEl.getAttribute("src") || "";

  return product;
}

function detectSource(hostname) {
  if (hostname.includes("aliexpress")) return "aliexpress";
  if (hostname.includes("amazon")) return "amazon";
  if (hostname.includes("cjdropshipping")) return "cj";
  if (hostname.includes("ebay")) return "ebay";
  if (hostname.includes("walmart")) return "walmart";
  if (hostname.includes("etsy")) return "etsy";
  return "unknown";
}
