const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class ShopifyService {
  constructor(shopDomain, accessToken) {
    this.shopDomain = shopDomain;
    this.accessToken = accessToken;
    this.baseUrl = `https://${shopDomain}/admin/api/2025-01`;
  }

  async request(endpoint) {
    const url = `${this.baseUrl}${endpoint}`;
    const res = await fetch(url, {
      headers: {
        'X-Shopify-Access-Token': this.accessToken,
        'Content-Type': 'application/json'
      }
    });
    return res.json();
  }

  async getAllProducts() {
    const data = await this.request('/products.json');
    return data.products || [];
  }

  async getAllCustomers() {
    const data = await this.request('/customers.json');
    return data.customers || [];
  }

  async getAllOrders() {
    const data = await this.request('/orders.json');
    return data.orders || [];
  }

  async testConnection() {
    try {
      const data = await this.request('/shop.json');
      return { success: true, shop: data.shop };
    } catch (err) {
      return { success: false, error: err.message };
    }
  }
}

module.exports = ShopifyService;
