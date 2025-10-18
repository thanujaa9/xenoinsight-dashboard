import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
  Users,
  ShoppingBag,
  TrendingUp,
  Package,
  LogOut,
  AlertCircle,
  User,
  Package2,
  Loader2,
  DollarSign,
  Repeat,
  BarChart3,
  Calendar,
  Filter,
  Star,
  UserCheck,
  ArrowLeft,
  Store
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  BarElement
} from 'chart.js';
import { Line, Pie, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  BarElement
);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [rangeData, setRangeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rangeLoading, setRangeLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchParams] = useSearchParams();
  const tenantId = searchParams.get('tenantId');
  const navigate = useNavigate();

  const [startDate, setStartDate] = useState(() => {
    const d = new Date(Date.now() - 29 * 24 * 60 * 60 * 1000);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const formatCurrency = (amount) => {
    const numericAmount = typeof amount === 'number' ? amount : Number(amount) || 0;
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  };

  const fetchDashboard = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    if (!tenantId) {
      setError('No store selected. Please go back to store management.');
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const resp = await axios.get(`${API_URL}/analytics/dashboard/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(resp.data);
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [tenantId, navigate]);

  const fetchRange = useCallback(async (s, e) => {
    if (!tenantId) return;
    try {
      setRangeLoading(true);
      const token = localStorage.getItem('token');
      const resp = await axios.get(`${API_URL}/analytics/orders-by-date/${tenantId}`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { startDate: s, endDate: e }
      });
      setRangeData(resp.data.chartData || []);
    } catch (err) {
      console.error('Failed to fetch range data', err);
      setRangeData([]);
    } finally {
      setRangeLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    fetchRange(startDate, endDate);
  }, [fetchRange, startDate, endDate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const handleBack = () => {
    navigate('/tenants');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
            <Loader2 className="w-8 h-8 text-white animate-spin" />
          </div>
          <p className="text-gray-700 font-semibold text-lg">Loading your analytics...</p>
          <p className="text-gray-500 text-sm">Gathering insights for your business</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white/90 backdrop-blur-lg p-8 rounded-3xl shadow-2xl border border-gray-200">
            <div className="flex items-center text-red-600 mb-6">
              <div className="w-12 h-12 bg-red-100 rounded-2xl flex items-center justify-center mr-4">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h2 className="font-bold text-xl text-red-700">Oops! Something went wrong</h2>
                <p className="text-red-600 font-medium">{error}</p>
              </div>
            </div>
            <div className="flex space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 font-semibold"
              >
                <ArrowLeft className="w-5 h-5 mr-2" />
                Back to Stores
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-semibold"
              >
                Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }
  const stats = data.stats;
  const ordersPerCustomer = stats.customers > 0 ? (stats.orders / stats.customers) : 0;
  const topProductUnitsSold = data.topProducts.length > 0 ? data.topProducts[0].sales : 0;
  const activeCategories = data.revenueByCategory.length;

  const revenueTrendLabels = data.ordersOverTime.map(d => d.date);
  const revenueTrendData = data.ordersOverTime.map(d => d.revenue);
  const ordersTrendData = data.ordersOverTime.map(d => d.orders);

  const revenueChartData = {
    labels: revenueTrendLabels,
    datasets: [
      {
        type: 'line',
        label: 'Revenue',
        data: revenueTrendData,
        borderColor: '#3b82f6',
        backgroundColor: (ctx) => {
          const c = ctx.chart.ctx;
          const gradient = c.createLinearGradient(0, 0, 0, 300);
          gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
          gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
          return gradient;
        },
        fill: true,
        tension: 0.4,
        yAxisID: 'y',
        pointRadius: 5,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointHoverRadius: 7,
      },
      {
        type: 'line',
        label: 'Orders',
        data: ordersTrendData,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16,185,129,0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 5,
        pointBackgroundColor: '#10b981',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointHoverRadius: 7,
      }
    ]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { 
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 13, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 },
        callbacks: {
          label: (context) => {
            if (context.dataset.label === 'Revenue') return `${context.dataset.label}: ${formatCurrency(context.parsed.y)}`;
            return `${context.dataset.label}: ${Math.round(context.parsed.y)}`;
          }
        }
      }
    },
    scales: {
      x: { 
        grid: { display: false },
        ticks: { font: { size: 12, weight: '500' } }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Revenue (₹)',
          font: { size: 13, weight: '700' }
        },
        ticks: { 
          callback: (v) => `₹${(v/1000).toFixed(0)}k`,
          font: { size: 12 }
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Orders',
          font: { size: 13, weight: '700' }
        },
        grid: { drawOnChartArea: false },
        ticks: { 
          precision: 0,
          font: { size: 12 }
        }
      }
    }
  };

  const rangeLabels = (rangeData || []).map(d => d.date);
  const rangeRevenue = (rangeData || []).map(d => d.totalRevenue);
  const rangeOrders = (rangeData || []).map(d => d.orderCount);

  const rangeChartData = {
    labels: rangeLabels,
    datasets: [
      {
        type: 'bar',
        label: 'Revenue',
        data: rangeRevenue,
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: '#3b82f6',
        borderWidth: 2,
        borderRadius: 6,
        yAxisID: 'y'
      },
      {
        type: 'line',
        label: 'Orders',
        data: rangeOrders,
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: false,
        tension: 0.4,
        yAxisID: 'y1',
        pointRadius: 5,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointHoverRadius: 7,
      }
    ]
  };

  const customerGrowthData = {
    labels: data.customerGrowth.map(d => d.date),
    datasets: [
      {
        label: 'Total Customers',
        data: data.customerGrowth.map(d => Math.round(d.customers)), 
        borderColor: '#f59e0b',
        backgroundColor: (ctx) => {
          const c = ctx.chart.ctx;
          const g = c.createLinearGradient(0, 0, 0, 300);
          g.addColorStop(0, 'rgba(245,158,11,0.4)');
          g.addColorStop(1, 'rgba(245,158,11,0)');
          return g;
        },
        fill: true,
        tension: 0.4,
        pointRadius: 5,
        pointBackgroundColor: '#f59e0b',
        pointBorderColor: '#ffffff',
        pointBorderWidth: 3,
        pointHoverRadius: 7,
      }
    ]
  };

  const customerGrowthOptions = {
    ...chartOptions,
    scales: {
      x: { 
        grid: { display: false },
        ticks: { font: { size: 12, weight: '500' } }
      },
      y: { 
        title: { 
          display: true, 
          text: 'Customers',
          font: { size: 13, weight: '700' }
        },
        min: 0,
        max: Math.max(25, Math.max(...data.customerGrowth.map(d => d.customers)) + 5),
        ticks: { 
          stepSize: 5,
          callback: (v) => Math.round(v), 
          font: { size: 12 }
        }
      }
    },
    plugins: { 
      legend: { display: false },
      tooltip: {
        ...chartOptions.plugins.tooltip,
        callbacks: {
          label: (context) => `Customers: ${Math.round(context.parsed.y)}`
        }
      }
    }
  };

  // Order status pie data
  const orderStatusPieData = {
    labels: Object.keys(data.orderStatus),
    datasets: [
      {
        data: Object.values(data.orderStatus),
        backgroundColor: [
          'rgba(245, 158, 11, 0.9)',  
          'rgba(16, 185, 129, 0.9)',  
          'rgba(59, 130, 246, 0.9)', 
          'rgba(239, 68, 68, 0.9)'    
        ],
        borderColor: [
          '#f59e0b',
          '#10b981',
          '#3b82f6',
          '#ef4444'
        ],
        borderWidth: 3,
        hoverOffset: 12
      }
    ]
  };

  const pieOptions = {
    plugins: {
      legend: { 
        position: 'bottom',
        labels: {
          usePointStyle: true,
          padding: 20,
          font: { size: 12, weight: '600' }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#374151',
        borderWidth: 1,
        cornerRadius: 12,
        titleFont: { size: 14, weight: 'bold' },
        bodyFont: { size: 13 }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBack}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-xl transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 font-medium"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Stores
              </button>
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <BarChart3 className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                    Analytics Dashboard
                  </h1>
                  <p className="text-sm text-gray-600 font-medium">Real-time insights for your business growth</p>
                </div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-4 py-2 text-gray-700 hover:bg-white/60 rounded-xl transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300 backdrop-blur-sm shadow-sm hover:shadow-md"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total Customers */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-blue-300/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="w-7 h-7 text-white" />
              </div>
              <div className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold shadow-sm">
                +12%
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Total Customers</p>
            <p className="text-3xl font-black text-gray-900">{stats.customers.toLocaleString()}</p>
          </div>

          {/* Total Orders */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-emerald-300/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <ShoppingBag className="w-7 h-7 text-white" />
              </div>
              <div className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-bold shadow-sm">
                +8%
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Total Orders</p>
            <p className="text-3xl font-black text-gray-900">{stats.orders.toLocaleString()}</p>
          </div>

          {/* Total Revenue */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-amber-300/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-bold shadow-sm">
                +24%
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Total Revenue</p>
            <p className="text-2xl font-black text-gray-900 break-all">{formatCurrency(stats.totalRevenue)}</p>
          </div>

          {/* Total Products */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-purple-300/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Package className="w-7 h-7 text-white" />
              </div>
              <div className="text-xs bg-purple-100 text-purple-700 px-3 py-1 rounded-full font-bold shadow-sm">
                +5%
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Total Products</p>
            <p className="text-3xl font-black text-gray-900">{stats.products.toLocaleString()}</p>
          </div>

          {/* Average Order Value */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-indigo-300/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <DollarSign className="w-7 h-7 text-white" />
              </div>
              <div className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold shadow-sm">
                +3%
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Avg Order Value</p>
            <p className="text-2xl font-black text-gray-900">{formatCurrency(stats.avgOrderValue)}</p>
          </div>

          {/* Repeat Customers */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-gray-300/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-gray-500 to-gray-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Repeat className="w-7 h-7 text-white" />
              </div>
              <div className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-full font-bold shadow-sm">
                +7%
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Repeat Customers</p>
            <p className="text-3xl font-black text-gray-900">{stats.repeatCustomerRate.toFixed(1)}%</p>
          </div>

          {/* Orders per Customer */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-teal-300/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-teal-500 to-teal-600 rounded-2xl flex items-center justify-center shadow-lg">
                <UserCheck className="w-7 h-7 text-white" />
              </div>
              <div className="text-xs bg-teal-100 text-teal-700 px-3 py-1 rounded-full font-bold shadow-sm">
                +2%
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Orders per Customer</p>
            <p className="text-3xl font-black text-gray-900">{ordersPerCustomer.toFixed(1)}</p>
          </div>

          {/* Top Product Units Sold */}
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300 hover:scale-105 hover:border-pink-300/60">
            <div className="flex items-center justify-between mb-4">
              <div className="w-14 h-14 bg-gradient-to-r from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Star className="w-7 h-7 text-white" />
              </div>
              <div className="text-xs bg-pink-100 text-pink-700 px-3 py-1 rounded-full font-bold shadow-sm">
                Best
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-1 font-medium">Top Product Units Sold</p>
            <p className="text-3xl font-black text-gray-900">{topProductUnitsSold.toLocaleString()}</p>
          </div>
        </div>
      
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        
          <div className="xl:col-span-2 bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-8 hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg mr-3">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Revenue & Orders Trend</h2>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-xl">
                <TrendingUp className="w-4 h-4" />
                <span className="font-medium">Last 30 days</span>
              </div>
            </div>
            <div style={{ height: '350px' }}>
              <Line data={revenueChartData} options={chartOptions} />
            </div>
          </div>

          {/* Right Column - Customer Growth + Order Status */}
          <div className="space-y-6">
            {/* Customer Growth */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg mr-3">
                  <Users className="w-5 h-5 text-white" />
                </div>
                Customer Growth
              </h2>
              <div style={{ height: '200px' }}>
                <Line data={customerGrowthData} options={customerGrowthOptions} />
              </div>
            </div>

            {/* Order Status Pie Chart */}
            <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-6 hover:shadow-2xl transition-all duration-300">
              <h2 className="text-lg font-bold text-gray-900 mb-6 flex items-center">
                <div className="w-10 h-10 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center shadow-lg mr-3">
                  <ShoppingBag className="w-5 h-5 text-white" />
                </div>
                Order Status
              </h2>
              <div className="flex items-center justify-center" style={{ height: '200px' }}>
                <Pie data={orderStatusPieData} options={pieOptions} />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Date Range Filter Chart */}
        <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-8 hover:shadow-2xl transition-all duration-300 mb-8">
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-8">
            <div className="flex items-center mb-4 lg:mb-0">
              <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center shadow-lg mr-3">
                <Filter className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Orders by Date Range</h2>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-3 sm:space-y-0 sm:space-x-4 bg-gray-50 p-4 rounded-2xl">
              <div className="flex items-center space-x-3">
                <Calendar className="w-5 h-5 text-gray-500" />
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium shadow-sm" 
                />
                <span className="text-gray-500 font-medium">to</span>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="px-4 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium shadow-sm" 
                />
              </div>
              <button 
                onClick={() => fetchRange(startDate, endDate)} 
                className="px-6 py-2 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl text-sm font-bold transform hover:scale-105"
              >
                Apply Filter
              </button>
            </div>
          </div>
          {rangeLoading ? (
            <div className="flex items-center justify-center py-24">
              <div className="flex flex-col items-center space-y-4">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                  <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
                <p className="text-gray-600 text-lg font-semibold">Updating chart...</p>
                <p className="text-gray-500 text-sm">Analyzing your data</p>
              </div>
            </div>
          ) : (
            <div style={{ height: '350px' }}>
              <Line data={rangeChartData} options={{...chartOptions, scales: {...chartOptions.scales, y: {...chartOptions.scales.y, title: {display: true, text: 'Revenue (₹)', font: {size: 13, weight: '700'}}}}}} />
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-8 hover:shadow-2xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg mr-3">
                <User className="w-6 h-6 text-white" />
              </div>
              Top Customers by Revenue
            </h2>
            <ul className="space-y-5">
              {data.topCustomers.map((customer, index) => (
                <li key={customer.id} className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-blue-50/50 rounded-2xl hover:from-gray-100 hover:to-blue-100/50 transition-all duration-200 border border-gray-100 hover:border-blue-200 shadow-sm hover:shadow-md">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <User className="w-7 h-7 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg">
                        {index + 1}
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-lg">
                        {(customer.firstName || '') + ' ' + (customer.lastName || '')}
                      </p>
                      <p className="text-sm text-gray-600 font-medium">{customer.email}</p>
                      <p className="text-xs text-blue-600 font-semibold bg-blue-100 px-2 py-1 rounded-full inline-block mt-1">{customer.ordersCount} orders</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-gray-900 bg-white px-3 py-2 rounded-xl shadow-sm">
                    {formatCurrency(customer.totalSpent)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white/90 backdrop-blur-lg rounded-3xl shadow-xl border border-gray-200/60 p-8 hover:shadow-2xl transition-all duration-300">
            <h2 className="text-2xl font-bold text-gray-900 mb-8 flex items-center">
              <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg mr-3">
                <Package2 className="w-6 h-6 text-white" />
              </div>
              Top Products by Sales
            </h2>
            <ul className="space-y-5">
              {data.topProducts.map((product, index) => (
                <li key={product.id} className="flex items-center justify-between p-5 bg-gradient-to-r from-gray-50 to-emerald-50/50 rounded-2xl hover:from-gray-100 hover:to-emerald-100/50 transition-all duration-200 border border-gray-100 hover:border-emerald-200 shadow-sm hover:shadow-md">
                  <div className="flex items-center space-x-4">
                    <div className="relative">
                      <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                        <Package2 className="w-7 h-7 text-white" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center text-xs font-black text-white shadow-lg">
                        {index + 1}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-gray-900 text-lg truncate">{product.title}</p>
                      <p className="text-sm text-gray-600 font-medium">{product.sales} sold • {formatCurrency(product.revenue)} revenue</p>
                      <p className="text-xs text-emerald-600 font-semibold bg-emerald-100 px-2 py-1 rounded-full inline-block mt-1">{product.productType}</p>
                    </div>
                  </div>
                  <span className="text-xl font-black text-gray-900 bg-white px-3 py-2 rounded-xl shadow-sm flex-shrink-0">
                    {formatCurrency(product.price)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;