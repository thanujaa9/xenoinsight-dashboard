// src/routes/analytics.js
const express = require('express');
const router = express.Router();
const prisma = require('../utils/db');
const { authenticateToken, authenticateTenant } = require('../middleware/auth');

router.get('/dashboard/:tenantId', authenticateToken, authenticateTenant, async (req, res) => {
  try {
    const { tenantId } = req.params;

    const [
      customerCount,
      orderCount,
      productCount,
      totalRevenueAgg,
    ] = await Promise.all([
      prisma.customer.count({ where: { tenantId } }),
      prisma.order.count({ where: { tenantId } }),
      prisma.product.count({ where: { tenantId } }),
      prisma.order.aggregate({
        where: { tenantId },
        _sum: { totalPrice: true },
      }),
    ]);

    const totalRevenue = Number(totalRevenueAgg._sum.totalPrice) || 0;

    const ordersForTrend = await prisma.order.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'asc' },
      select: { createdAt: true, totalPrice: true },
    });

    const dailyMap = {};
    ordersForTrend.forEach(o => {
      const date = o.createdAt.toISOString().split('T')[0];
      if (!dailyMap[date]) dailyMap[date] = { date, revenue: 0, orders: 0 };
      dailyMap[date].revenue += Number(o.totalPrice);
      dailyMap[date].orders += 1;
    });

    const ordersOverTime = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

    const orderStatusGroup = await prisma.order.groupBy({
      by: ['financialStatus'],
      where: { tenantId },
      _count: { financialStatus: true },
    });
    const orderStatus = orderStatusGroup.reduce((acc, cur) => {
      acc[cur.financialStatus || 'Unknown'] = cur._count.financialStatus;
      return acc;
    }, {});

    const customersWithOrders = await prisma.customer.findMany({
      where: { tenantId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        orders: {
          select: { totalPrice: true }
        }
      },
    });

    const customersComputed = customersWithOrders.map(c => {
      const totalSpent = c.orders.reduce((s, o) => s + Number(o.totalPrice), 0);
      return {
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        email: c.email,
        totalSpent,
        ordersCount: c.orders.length
      };
    });

    const topCustomers = customersComputed
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 5);

    const repeatCustomersCount = customersComputed.filter(c => c.ordersCount > 1).length;
    const repeatCustomerRate = customerCount > 0 ? (repeatCustomersCount / customerCount) * 100 : 0;

    const avgOrderValue = orderCount > 0 ? totalRevenue / orderCount : 0;

    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: { tenantId }
      },
      select: {
        productId: true,
        title: true,
        quantity: true,
        price: true,
        product: {
          select: {
            productType: true,
            title: true
          }
        }
      }
    });

    const productSales = {};
    orderItems.forEach(it => {
      const key = it.productId || it.title;
      if (!productSales[key]) {
        productSales[key] = {
          id: it.productId || key,
          title: (it.product && it.product.title) || it.title,
          price: Number(it.price || 0),
          sales: 0,
          revenue: 0,
          productType: (it.product && it.product.productType) || 'Unknown'
        };
      }
      productSales[key].sales += it.quantity;
      productSales[key].revenue += Number(it.price) * it.quantity;
    });

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.sales - a.sales)
      .slice(0, 5);

    const revenueByCategory = Object.values(productSales).reduce((acc, p) => {
      const cat = p.productType || 'Unspecified';
      if (!acc[cat]) acc[cat] = 0;
      acc[cat] += p.revenue;
      return acc;
    }, {});

    const revenueByCategoryArr = Object.keys(revenueByCategory).map(cat => ({
      category: cat,
      revenue: revenueByCategory[cat]
    })).sort((a, b) => b.revenue - a.revenue);

    const customersByDateRaw = await prisma.customer.findMany({
      where: { tenantId },
      select: { createdAt: true }
    });
    const createdMap = {};
    customersByDateRaw.forEach(c => {
      const d = c.createdAt.toISOString().split('T')[0];
      createdMap[d] = (createdMap[d] || 0) + 1;
    });
    const sortedDates = Object.keys(createdMap).sort();
    let cumulative = 0;
    const customerGrowth = sortedDates.map(date => {
      cumulative += createdMap[date];
      return { date, customers: cumulative };
    });

    res.json({
      stats: {
        customers: customerCount,
        orders: orderCount,
        products: productCount,
        totalRevenue,
        avgOrderValue,
        repeatCustomerRate
      },
      ordersOverTime, 
      orderStatus,
      topCustomers, 
      topProducts, 
      revenueByCategory: revenueByCategoryArr,
      customerGrowth, 
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/orders-by-date/:tenantId', authenticateToken, authenticateTenant, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
      ? new Date(startDate)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const orders = await prisma.order.findMany({
      where: {
        tenantId,
        createdAt: { gte: start, lte: end }
      },
      orderBy: { createdAt: 'asc' },
      select: {
        createdAt: true,
        totalPrice: true,
        currency: true
      }
    });

    const dailyStats = {};
    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = {
          date: dateKey,
          orderCount: 0,
          totalRevenue: 0,
          currency: order.currency
        };
      }
      dailyStats[dateKey].orderCount += 1;
      dailyStats[dateKey].totalRevenue += Number(order.totalPrice);
    });

    const chartData = Object.values(dailyStats).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );

    res.json({
      dateRange: { start, end },
      totalOrders: orders.length,
      totalRevenue: orders.reduce((sum, o) => sum + Number(o.totalPrice), 0),
      chartData
    });
  } catch (error) {
    console.error('Orders by date error:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
