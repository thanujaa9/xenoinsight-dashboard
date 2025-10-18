// src/routes/shopify.js
const express = require('express');
const prisma = require('../utils/db');
const { authenticateToken, authenticateTenant } = require('../middleware/auth');
const ShopifyService = require('../services/shopifyService');

const router = express.Router();

router.get('/test/:tenantId', authenticateToken, authenticateTenant, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    
    if (!tenant || !tenant.shopifyAccessToken) {
      return res.status(400).json({ error: 'Tenant not found or missing Shopify credentials' });
    }

    const shopify = new ShopifyService(tenant.shopifyDomain, tenant.shopifyAccessToken);
    const result = await shopify.testConnection();
    res.json(result);
  } catch (error) {
    console.error('Test connection error:', error);
    res.status(500).json({ error: 'Connection test failed' });
  }
});

router.post('/sync/:tenantId', authenticateToken, authenticateTenant, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });

    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    
    if (!tenant.isActive || !tenant.shopifyAccessToken) {
      return res.status(400).json({ error: 'Store is disconnected or missing access token' });
    }

    const shopify = new ShopifyService(tenant.shopifyDomain, tenant.shopifyAccessToken);

    console.log(`🚀 Starting enhanced sync for tenant: ${tenantId}`);

    const results = {
      products: 0,
      customers: 0,
      orders: 0,
      deletedProducts: 0,
      deletedCustomers: 0,
      deletedOrders: 0,
      totalRevenue: 0,
      success: true,
      message: 'Full sync completed with deletion handling'
    };

    console.log('📦 Fetching products...');
    const shopifyProducts = await shopify.getAllProducts();
    
    console.log('👥 Fetching customers...');
    const shopifyCustomers = await shopify.getAllCustomers();
    
    console.log('📋 Fetching orders...');
    const shopifyOrders = await shopify.getAllOrders();

    const currentProductIds = shopifyProducts.map(p => p.id.toString());
    const currentCustomerIds = shopifyCustomers.map(c => c.id.toString());
    const currentOrderIds = shopifyOrders.map(o => o.id.toString());

    console.log(`Found ${shopifyProducts.length} products, ${shopifyCustomers.length} customers, ${shopifyOrders.length} orders`);

    console.log('🔄 Syncing products...');
    for (const product of shopifyProducts) {
      try {
        await prisma.product.upsert({
          where: { 
            tenantId_shopifyProductId: { 
              tenantId, 
              shopifyProductId: product.id.toString() 
            } 
          },
          update: {
            title: product.title || 'Untitled Product',
            description: product.body_html,
            handle: product.handle,
            vendor: product.vendor,
            productType: product.product_type,
            tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
            status: product.status || 'active',
            images: product.images?.map(img => img.src) || [],
            variants: product.variants || null,
            price: product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : 0,
            compareAtPrice: product.variants?.[0]?.compare_at_price ? parseFloat(product.variants[0].compare_at_price) : null,
            updatedAt: new Date()
          },
          create: {
            tenantId,
            shopifyProductId: product.id.toString(),
            title: product.title || 'Untitled Product',
            description: product.body_html,
            handle: product.handle,
            vendor: product.vendor,
            productType: product.product_type,
            tags: product.tags ? product.tags.split(',').map(tag => tag.trim()) : [],
            status: product.status || 'active',
            images: product.images?.map(img => img.src) || [],
            variants: product.variants || null,
            price: product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : 0,
            compareAtPrice: product.variants?.[0]?.compare_at_price ? parseFloat(product.variants[0].compare_at_price) : null
          }
        });
        results.products++;
      } catch (error) {
        console.error(`Failed to sync product ${product.id}:`, error);
      }
    }

    console.log('🔄 Syncing customers...');
    for (const customer of shopifyCustomers) {
      try {
        await prisma.customer.upsert({
          where: { 
            tenantId_shopifyCustomerId: { 
              tenantId, 
              shopifyCustomerId: customer.id.toString() 
            } 
          },
          update: {
            email: customer.email,
            firstName: customer.first_name,
            lastName: customer.last_name,
            phone: customer.phone,
            totalSpent: customer.total_spent ? parseFloat(customer.total_spent) : 0,
            ordersCount: customer.orders_count || 0,
            updatedAt: new Date()
          },
          create: {
            tenantId,
            shopifyCustomerId: customer.id.toString(),
            email: customer.email,
            firstName: customer.first_name,
            lastName: customer.last_name,
            phone: customer.phone,
            totalSpent: customer.total_spent ? parseFloat(customer.total_spent) : 0,
            ordersCount: customer.orders_count || 0
          }
        });
        results.customers++;
      } catch (error) {
        console.error(`Failed to sync customer ${customer.id}:`, error);
      }
    }

    console.log('🔄 Syncing orders...');
    for (const order of shopifyOrders) {
      try {
        let customerId = null;
        if (order.customer?.id) {
          const customer = await prisma.customer.findUnique({
            where: {
              tenantId_shopifyCustomerId: {
                tenantId,
                shopifyCustomerId: order.customer.id.toString()
              }
            }
          });
          customerId = customer?.id || null;
        }

        const orderData = {
          customerId,
          orderNumber: order.name || order.order_number?.toString(),
          totalPrice: parseFloat(order.total_price || 0),
          subtotalPrice: parseFloat(order.subtotal_price || 0),
          taxesIncluded: order.taxes_included || false,
          currency: order.currency || 'USD',
          financialStatus: order.financial_status,
          fulfillmentStatus: order.fulfillment_status,
          email: order.email,
          processedAt: order.processed_at ? new Date(order.processed_at) : null,
          updatedAt: new Date()
        };

        const savedOrder = await prisma.order.upsert({
          where: { 
            tenantId_shopifyOrderId: { 
              tenantId, 
              shopifyOrderId: order.id.toString() 
            } 
          },
          update: orderData,
          create: {
            tenantId,
            shopifyOrderId: order.id.toString(),
            ...orderData
          }
        });

        if (order.line_items?.length > 0) {
          await prisma.orderItem.deleteMany({ where: { orderId: savedOrder.id } });

          for (const lineItem of order.line_items) {
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
                orderId: savedOrder.id,
                productId,
                title: lineItem.title || 'Unknown Item',
                quantity: lineItem.quantity || 1,
                price: parseFloat(lineItem.price || 0)
              }
            });
          }
        }

        results.orders++;
        results.totalRevenue += parseFloat(order.total_price || 0);
      } catch (error) {
        console.error(`Failed to sync order ${order.id}:`, error);
      }
    }

    console.log('🗑️ Cleaning up deleted records...');

    const deletedProducts = await prisma.product.deleteMany({
      where: {
        tenantId,
        shopifyProductId: {
          notIn: currentProductIds.length > 0 ? currentProductIds : ['__NONE__']
        }
      }
    });
    results.deletedProducts = deletedProducts.count;

    const deletedCustomers = await prisma.customer.deleteMany({
      where: {
        tenantId,
        shopifyCustomerId: {
          notIn: currentCustomerIds.length > 0 ? currentCustomerIds : ['__NONE__']
        }
      }
    });
    results.deletedCustomers = deletedCustomers.count;

    const deletedOrders = await prisma.order.deleteMany({
      where: {
        tenantId,
        shopifyOrderId: {
          notIn: currentOrderIds.length > 0 ? currentOrderIds : ['__NONE__']
        }
      }
    });
    results.deletedOrders = deletedOrders.count;

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { updatedAt: new Date() }
    });

    console.log(`✅ Enhanced sync completed for tenant ${tenantId}:`, results);

    res.json({
      success: true,
      ...results,
      message: `Sync completed! Added/Updated: ${results.products} products, ${results.customers} customers, ${results.orders} orders. Deleted: ${results.deletedProducts} products, ${results.deletedCustomers} customers, ${results.deletedOrders} orders.`
    });

  } catch (error) {
    console.error('❌ Enhanced sync failed:', error);
    res.status(500).json({ 
      error: 'Sync failed', 
      details: error.message,
      success: false
    });
  }
});

// Individual sync endpoints for specific data types
router.post('/sync/products/:tenantId', authenticateToken, authenticateTenant, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    
    if (!tenant || !tenant.shopifyAccessToken) {
      return res.status(400).json({ error: 'Missing Shopify credentials' });
    }

    const shopify = new ShopifyService(tenant.shopifyDomain, tenant.shopifyAccessToken);
    const products = await shopify.getAllProducts();
    
    let synced = 0;
    for (const product of products) {
      await prisma.product.upsert({
        where: { tenantId_shopifyProductId: { tenantId, shopifyProductId: product.id.toString() } },
        update: {
          title: product.title,
          description: product.body_html,
          vendor: product.vendor,
          productType: product.product_type,
          price: product.variants?.[0]?.price || 0,
          updatedAt: new Date()
        },
        create: {
          tenantId,
          shopifyProductId: product.id.toString(),
          title: product.title,
          description: product.body_html,
          vendor: product.vendor,
          productType: product.product_type,
          price: product.variants?.[0]?.price || 0
        }
      });
      synced++;
    }

    res.json({ success: true, synced, total: products.length });
  } catch (error) {
    console.error('Products sync error:', error);
    res.status(500).json({ error: 'Products sync failed' });
  }
});

router.post('/sync/customers/:tenantId', authenticateToken, authenticateTenant, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    
    if (!tenant || !tenant.shopifyAccessToken) {
      return res.status(400).json({ error: 'Missing Shopify credentials' });
    }

    const shopify = new ShopifyService(tenant.shopifyDomain, tenant.shopifyAccessToken);
    const customers = await shopify.getAllCustomers();
    
    let synced = 0;
    for (const customer of customers) {
      await prisma.customer.upsert({
        where: { tenantId_shopifyCustomerId: { tenantId, shopifyCustomerId: customer.id.toString() } },
        update: {
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          totalSpent: customer.total_spent,
          ordersCount: customer.orders_count,
          updatedAt: new Date()
        },
        create: {
          tenantId,
          shopifyCustomerId: customer.id.toString(),
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          totalSpent: customer.total_spent,
          ordersCount: customer.orders_count
        }
      });
      synced++;
    }

    res.json({ success: true, synced, total: customers.length });
  } catch (error) {
    console.error('Customers sync error:', error);
    res.status(500).json({ error: 'Customers sync failed' });
  }
});

router.post('/sync/orders/:tenantId', authenticateToken, authenticateTenant, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    
    if (!tenant || !tenant.shopifyAccessToken) {
      return res.status(400).json({ error: 'Missing Shopify credentials' });
    }

    const shopify = new ShopifyService(tenant.shopifyDomain, tenant.shopifyAccessToken);
    const orders = await shopify.getAllOrders();
    
    let synced = 0;
    for (const order of orders) {
      await prisma.order.upsert({
        where: { tenantId_shopifyOrderId: { tenantId, shopifyOrderId: order.id.toString() } },
        update: {
          orderNumber: order.order_number?.toString(),
          totalPrice: order.total_price,
          currency: order.currency,
          financialStatus: order.financial_status,
          email: order.email,
          updatedAt: new Date()
        },
        create: {
          tenantId,
          shopifyOrderId: order.id.toString(),
          orderNumber: order.order_number?.toString(),
          totalPrice: order.total_price,
          currency: order.currency,
          financialStatus: order.financial_status,
          email: order.email
        }
      });
      synced++;
    }

    res.json({ success: true, synced, total: orders.length });
  } catch (error) {
    console.error('Orders sync error:', error);
    res.status(500).json({ error: 'Orders sync failed' });
  }
});

router.post('/webhook/:tenantId', async (req, res) => {
  const { tenantId } = req.params;
  const data = req.body;
  console.log(`📩 Webhook for tenant ${tenantId}:`, data);

  res.status(200).send('ok');
});

module.exports = router;