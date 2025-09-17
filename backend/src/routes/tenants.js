// src/routes/tenants.js
const express = require('express');
const prisma = require('../utils/db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, async (req, res) => {
  try {
    const userTenants = await prisma.userTenant.findMany({
      where: { userId: req.user.id },
      include: {
        tenant: {
          select: {
            id: true,
            name: true,
            shopifyDomain: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
            shopifyAccessToken: true
          }
        }
      }
    });
    
    const tenantsWithStats = await Promise.all(userTenants.map(async (ut) => {
        const tenantId = ut.tenant.id;
        const [customerCount, productCount, orderCount, revenue] = await prisma.$transaction([
            prisma.customer.count({ where: { tenantId } }),
            prisma.product.count({ where: { tenantId } }),
            prisma.order.count({ where: { tenantId } }),
            prisma.order.aggregate({
                where: { tenantId },
                _sum: { totalPrice: true }
            })
        ]);

        return {
            id: ut.tenant.id,
            name: ut.tenant.name,
            shopifyDomain: ut.tenant.shopifyDomain,
            isActive: ut.tenant.isActive,
            createdAt: ut.tenant.createdAt,
            updatedAt: ut.tenant.updatedAt,
            role: ut.role,
            connectionStatus: (ut.tenant.isActive && ut.tenant.shopifyAccessToken) ? 'connected' : 'disconnected',
            stats: {
                customers: customerCount,
                products: productCount,
                orders: orderCount,
                totalRevenue: revenue._sum.totalPrice || 0
            }
        };
    }));

    res.json({
      tenants: tenantsWithStats
    });
  } catch (error) {
    console.error('Get tenants error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, shopifyDomain, shopifyAccessToken } = req.body;

    if (!name || !shopifyDomain) {
      return res.status(400).json({ 
        error: 'Store name and Shopify domain are required' 
      });
    }

    const existingTenant = await prisma.tenant.findUnique({
      where: { shopifyDomain }
    });

    if (existingTenant) {
      return res.status(400).json({ 
        error: 'This Shopify store is already connected' 
      });
    }

    const tenant = await prisma.tenant.create({
      data: {
        name,
        shopifyDomain,
        shopifyAccessToken: shopifyAccessToken || null,
        isActive: true
      }
    });

    await prisma.userTenant.create({
      data: {
        userId: req.user.id,
        tenantId: tenant.id,
        role: 'admin'
      }
    });

    res.status(201).json({
      message: 'Shopify store connected successfully',
      tenant: {
        id: tenant.id,
        name: tenant.name,
        shopifyDomain: tenant.shopifyDomain,
        isActive: tenant.isActive,
        role: 'admin',
        connectionStatus: shopifyAccessToken ? 'connected' : 'disconnected'
      }
    });
  } catch (error) {
    console.error('Create tenant error:', error);
    res.status(500).json({ error: 'Failed to connect Shopify store' });
  }
});

router.post('/:tenantId/disconnect', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId
        }
      }
    });

    if (!userTenant || userTenant.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        shopifyAccessToken: null,
        isActive: false,
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Store disconnected successfully. Data has been preserved.',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        shopifyDomain: updatedTenant.shopifyDomain,
        isActive: updatedTenant.isActive,
        connectionStatus: 'disconnected'
      }
    });

  } catch (error) {
    console.error('Disconnect tenant error:', error);
    res.status(500).json({ error: 'Failed to disconnect store' });
  }
});

router.post('/:tenantId/reconnect', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { shopifyAccessToken } = req.body;

    if (!shopifyAccessToken) {
      return res.status(400).json({ error: 'Shopify access token is required' });
    }

    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId
        }
      }
    });

    if (!userTenant || userTenant.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    
    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        shopifyAccessToken,
        isActive: true,
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Store reconnected successfully!',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        shopifyDomain: updatedTenant.shopifyDomain,
        isActive: updatedTenant.isActive,
        connectionStatus: 'connected'
      }
    });

  } catch (error) {
    console.error('Reconnect tenant error:', error);
    res.status(500).json({ error: 'Failed to reconnect store' });
  }
});

router.get('/:tenantId', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId
        }
      },
      include: {
        tenant: true
      }
    });

    if (!userTenant) {
      return res.status(403).json({ error: 'Access denied to this tenant' });
    }

    const stats = await prisma.$transaction([
      prisma.customer.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.order.aggregate({
        where: { tenantId },
        _sum: { totalPrice: true }
      })
    ]);

    res.json({
      tenant: {
        ...userTenant.tenant,
        role: userTenant.role,
        connectionStatus: userTenant.tenant.isActive && userTenant.tenant.shopifyAccessToken ? 'connected' : 'disconnected',
        stats: {
          customers: stats[0],
          products: stats[1],
          orders: stats[2],
          totalRevenue: stats[3]._sum.totalPrice || 0
        }
      }
    });
  } catch (error) {
    console.error('Get tenant details error:', error);
    res.status(500).json({ error: 'Failed to fetch tenant details' });
  }
});

router.put('/:tenantId', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { name } = req.body; 

    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId
        }
      }
    });

    if (!userTenant || userTenant.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const updatedTenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name && { name }),
        updatedAt: new Date()
      }
    });

    res.json({
      message: 'Tenant updated successfully',
      tenant: {
        id: updatedTenant.id,
        name: updatedTenant.name,
        shopifyDomain: updatedTenant.shopifyDomain,
        isActive: updatedTenant.isActive,
        connectionStatus: updatedTenant.isActive && updatedTenant.shopifyAccessToken ? 'connected' : 'disconnected'
      }
    });

  } catch (error) {
    console.error('Update tenant error:', error);
    res.status(500).json({ error: 'Failed to update tenant' });
  }
});

router.delete('/:tenantId', authenticateToken, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { confirm } = req.body; 

    if (!confirm || confirm !== 'DELETE') {
      return res.status(400).json({ 
        error: 'To permanently delete this tenant and all its data, send { "confirm": "DELETE" }' 
      });
    }

    const userTenant = await prisma.userTenant.findUnique({
      where: {
        userId_tenantId: {
          userId: req.user.id,
          tenantId
        }
      }
    });

    if (!userTenant || userTenant.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    await prisma.tenant.delete({
      where: { id: tenantId }
    });

    res.json({ message: 'Tenant and all associated data deleted permanently' });
  } catch (error) {
    console.error('Delete tenant error:', error);
    res.status(500).json({ error: 'Failed to delete tenant' });
  }
});

module.exports = router;