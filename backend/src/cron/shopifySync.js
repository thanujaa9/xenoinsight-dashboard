// src/cron/shopifySync.js 
const cron = require('node-cron');
const prisma = require('../lib/prisma');
const ShopifyService = require('../services/shopifyService');
const DataSyncService = require('../services/dataSyncService');

cron.schedule('*/30 * * * *', async () => {
  console.log('⏰ Starting scheduled Shopify sync...');
  
  try {
    
    const tenants = await prisma.tenant.findMany({
      where: {
        isActive: true,
        shopifyAccessToken: {
          not: null 
        }
      }
    });

    console.log(`🏪 Found ${tenants.length} active connected stores to sync`);

    for (const tenant of tenants) {
      try {
        console.log(`🔄 Syncing tenant: ${tenant.name} (${tenant.shopifyDomain})`);
        
        const shopifyService = new ShopifyService(tenant.shopifyDomain, tenant.shopifyAccessToken);
        const syncService = new DataSyncService(tenant.id, shopifyService);
        
        if (!(await syncService.canSync())) {
          console.log(`⚠️ Skipping ${tenant.name} - cannot sync (inactive or missing token)`);
          continue;
        }

        const result = await syncService.syncAllData();
        
        if (result.success) {
          console.log(`✅ Sync completed for ${tenant.name}:`, {
            products: result.products,
            customers: result.customers,
            orders: result.orders,
            deleted: {
              products: result.deletedProducts,
              customers: result.deletedCustomers,
              orders: result.deletedOrders
            }
          });
        } else {
          console.error(`❌ Sync failed for ${tenant.name}:`, result.message);
        }
        
      } catch (error) {
        console.error(`❌ Error syncing tenant ${tenant.name}:`, error);
        
        if (error.message.includes('Unauthorized') || error.message.includes('401')) {
          console.log(`🔒 Disabling tenant ${tenant.name} due to auth error`);
          await prisma.tenant.update({
            where: { id: tenant.id },
            data: { 
              isActive: false,
              updatedAt: new Date()
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Cron job failed:', error);
  }
  
  console.log('⏰ Scheduled sync completed');
});

console.log('🕒 Shopify sync cron job initialized (runs every 30 minutes)');