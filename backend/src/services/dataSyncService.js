// src/services/dataSyncService.js 
const prisma = require('../lib/prisma');

class DataSyncService {
  constructor(tenantId, shopifyService) {
    this.tenantId = tenantId;
    this.shopifyService = shopifyService;
  }

  async syncAllData() {
    console.log(`🚀 Starting full sync for tenant: ${this.tenantId}`);

    const results = {
      products: 0,
      customers: 0,
      orders: 0,
      totalRevenue: 0,
      productsFailed: 0,
      customersFailed: 0,
      ordersFailed: 0,
      deletedProducts: 0,
      deletedCustomers: 0,
      deletedOrders: 0,
      failedProducts: [],
      failedCustomers: [],
      failedOrders: [],
      success: true,
      message: 'Full sync completed'
    };

    try {
     
      console.log('📦 Fetching products...');
      const products = await this.shopifyService.getAllProducts();

      console.log('👥 Fetching customers...');
      const customers = await this.shopifyService.getAllCustomers();

      console.log('📋 Fetching orders...');
      const orders = await this.shopifyService.getAllOrders();

      const currentProductIds = products.map(p => p.id.toString());
      const currentCustomerIds = customers.map(c => c.id.toString());
      const currentOrderIds = orders.map(o => o.id.toString());

      console.log('🔄 Syncing products in parallel...');
      await Promise.allSettled(
        products.map(async (p) => {
          try {
            await this.syncProduct(this.tenantId, p);
            results.products++;
          } catch (err) {
            results.productsFailed++;
            results.failedProducts.push({ id: p.id, error: err.message });
          }
        })
      );

      console.log('🔄 Syncing customers in parallel...');
      await Promise.allSettled(
        customers.map(async (c) => {
          try {
            await this.syncCustomer(this.tenantId, c);
            results.customers++;
          } catch (err) {
            results.customersFailed++;
            results.failedCustomers.push({ id: c.id, error: err.message });
          }
        })
      );

      console.log('🔄 Syncing orders in parallel...');
      await Promise.allSettled(
        orders.map(async (o) => {
          try {
            await this.syncOrder(this.tenantId, o);
            results.orders++;
            results.totalRevenue += parseFloat(o.total_price || 0);
          } catch (err) {
            results.ordersFailed++;
            results.failedOrders.push({ id: o.id, error: err.message });
          }
        })
      );

      console.log('🗑️ Cleaning up deleted records...');
      
      const deletedProducts = await prisma.product.deleteMany({
        where: {
          tenantId: this.tenantId,
          shopifyProductId: {
            notIn: currentProductIds
          }
        }
      });
      results.deletedProducts = deletedProducts.count;

      const deletedCustomers = await prisma.customer.deleteMany({
        where: {
          tenantId: this.tenantId,
          shopifyCustomerId: {
            notIn: currentCustomerIds
          }
        }
      });
      results.deletedCustomers = deletedCustomers.count;

      const deletedOrders = await prisma.order.deleteMany({
        where: {
          tenantId: this.tenantId,
          shopifyOrderId: {
            notIn: currentOrderIds
          }
        }
      });
      results.deletedOrders = deletedOrders.count;

      await prisma.tenant.update({
        where: { id: this.tenantId },
        data: { updatedAt: new Date() }
      });

      console.log(`✅ Full sync completed for tenant ${this.tenantId}`, results);
      return results;
    } catch (error) {
      console.error(`❌ Full sync failed for tenant ${this.tenantId}:`, error);
      results.success = false;
      results.message = error.message;
      return results;
    }
  }

  async canSync() {
    const tenant = await prisma.tenant.findUnique({
      where: { id: this.tenantId }
    });
    
    return tenant && tenant.isActive && tenant.shopifyAccessToken;
  }

  async syncProduct(tenantId, shopifyProduct) {
    const productData = {
      title: shopifyProduct.title,
      description: shopifyProduct.body_html || null,
      handle: shopifyProduct.handle || null,
      vendor: shopifyProduct.vendor || null,
      productType: shopifyProduct.product_type || null,
      tags: shopifyProduct.tags ? shopifyProduct.tags.split(',').map(tag => tag.trim()) : [],
      status: shopifyProduct.status || 'active',
      images: shopifyProduct.images?.map(img => img.src) || [],
      variants: shopifyProduct.variants || null,
      price: shopifyProduct.variants?.[0]?.price ? parseFloat(shopifyProduct.variants[0].price) : 0,
      compareAtPrice: shopifyProduct.variants?.[0]?.compare_at_price ? parseFloat(shopifyProduct.variants[0].compare_at_price) : null,
      updatedAt: new Date()
    };

    return prisma.product.upsert({
      where: {
        tenantId_shopifyProductId: {
          tenantId,
          shopifyProductId: shopifyProduct.id.toString()
        }
      },
      update: productData,
      create: {
        tenantId,
        shopifyProductId: shopifyProduct.id.toString(),
        ...productData
      }
    });
  }

  async syncCustomer(tenantId, shopifyCustomer) {
    const customerData = {
      email: shopifyCustomer.email,
      firstName: shopifyCustomer.first_name,
      lastName: shopifyCustomer.last_name,
      phone: shopifyCustomer.phone,
      totalSpent: shopifyCustomer.total_spent ? parseFloat(shopifyCustomer.total_spent) : 0,
      ordersCount: shopifyCustomer.orders_count || 0,
      updatedAt: new Date()
    };

    return prisma.customer.upsert({
      where: {
        tenantId_shopifyCustomerId: {
          tenantId,
          shopifyCustomerId: shopifyCustomer.id.toString()
        }
      },
      update: customerData,
      create: {
        tenantId,
        shopifyCustomerId: shopifyCustomer.id.toString(),
        ...customerData
      }
    });
  }

  async syncOrder(tenantId, shopifyOrder) {
    let customerId = null;
    if (shopifyOrder.customer?.id) {
      const customer = await prisma.customer.findUnique({
        where: {
          tenantId_shopifyCustomerId: {
            tenantId,
            shopifyCustomerId: shopifyOrder.customer.id.toString()
          }
        }
      });
      customerId = customer?.id || null;
    }

    const orderData = {
      customerId,
      orderNumber: shopifyOrder.name || shopifyOrder.order_number?.toString(),
      totalPrice: parseFloat(shopifyOrder.total_price || 0),
      subtotalPrice: parseFloat(shopifyOrder.subtotal_price || 0),
      taxesIncluded: shopifyOrder.taxes_included || false,
      currency: shopifyOrder.currency || 'USD',
      financialStatus: shopifyOrder.financial_status,
      fulfillmentStatus: shopifyOrder.fulfillment_status,
      email: shopifyOrder.email,
      processedAt: shopifyOrder.processed_at ? new Date(shopifyOrder.processed_at) : null,
      updatedAt: new Date()
    };

    const result = await prisma.order.upsert({
      where: {
        tenantId_shopifyOrderId: {
          tenantId,
          shopifyOrderId: shopifyOrder.id.toString()
        }
      },
      update: orderData,
      create: {
        tenantId,
        shopifyOrderId: shopifyOrder.id.toString(),
        ...orderData
      }
    });

    if (shopifyOrder.line_items?.length > 0) {
      await prisma.orderItem.deleteMany({ where: { orderId: result.id } });

      await Promise.allSettled(
        shopifyOrder.line_items.map(async (lineItem) => {
          let productId = null;
          if (lineItem.product_id) {
            const product = await prisma.product.findUnique({
              where: {
                tenantId_shopifyProductId: {
                  tenantId,
                  shopifyProductId: lineItem.product_id.toString()
                }
              }
            });
            productId = product?.id || null;
          }

          await prisma.orderItem.create({
            data: {
              orderId: result.id,
              productId,
              title: lineItem.title,
              quantity: lineItem.quantity || 1,
              price: parseFloat(lineItem.price || 0)
            }
          });
        })
      );
    }

    return result;
  }
}

module.exports = DataSyncService;