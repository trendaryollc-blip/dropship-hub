const API_BASE = "https://your-app-url.vercel.app"; // User configures this

document.addEventListener("DOMContentLoaded", async () => {
  const tokenInput = document.getElementById("token-input");
  const saveTokenBtn = document.getElementById("save-token");
  const authSection = document.getElementById("auth-section");
  const productSection = document.getElementById("product-section");
  const loading = document.getElementById("loading");
  const productTitle = document.getElementById("product-title");
  const productPrice = document.getElementById("product-price");
  const saveBtn = document.getElementById("save-btn");
  const openDashboard = document.getElementById("open-dashboard");
  const status = document.getElementById("status");

  // Load saved token
  const { authToken } = await chrome.storage.local.get("authToken");
  if (authToken) {
    tokenInput.value = authToken;
    authSection.style.display = "none";
    productSection.style.display = "block";
    loadProduct();
  }

  // Save token
  saveTokenBtn.addEventListener("click", async () => {
    const token = tokenInput.value.trim();
    if (token) {
      await chrome.storage.local.set({ authToken: token });
      authSection.style.display = "none";
      productSection.style.display = "block";
      loadProduct();
    }
  });

  // Open dashboard
  openDashboard.addEventListener("click", () => {
    chrome.tabs.create({ url: `${API_BASE}/dashboard` });
  });

  async function loadProduct() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const response = await chrome.tabs.sendMessage(tab.id, { action: "getProduct" });
      
      if (response && response.title) {
        productTitle.textContent = response.title;
        if (response.price) {
          productPrice.textContent = `$${response.price.toFixed(2)}`;
          productPrice.classList.remove("null");
        } else {
          productPrice.textContent = "Price not detected";
          productPrice.classList.add("null");
        }
        loading.style.display = "none";
        productSection.style.display = "block";
      } else {
        productTitle.textContent = "No product detected on this page";
        loading.style.display = "none";
        productSection.style.display = "block";
      }
    } catch (e) {
      productTitle.textContent = "Could not detect product";
      loading.style.display = "none";
      productSection.style.display = "block";
    }
  }

  // Save product
  saveBtn.addEventListener("click", async () => {
    const { authToken } = await chrome.storage.local.get("authToken");
    if (!authToken) {
      status.textContent = "Please save your auth token first";
      status.className = "status error";
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = "Saving...";
    status.textContent = "";

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      const product = await chrome.tabs.sendMessage(tab.id, { action: "getProduct" });

      const res = await fetch(`${API_BASE}/api/chrome-extension/save`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(product),
      });

      if (res.ok) {
        status.textContent = "Product saved successfully!";
        status.className = "status success";
      } else {
        const data = await res.json();
        status.textContent = data.error || "Failed to save product";
        status.className = "status error";
      }
    } catch (e) {
      status.textContent = "Network error — check your connection";
      status.className = "status error";
    }

    saveBtn.disabled = false;
    saveBtn.textContent = "Save to DropShip Hub";
  });
});
