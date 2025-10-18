import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

import { 
  Plus, 
  Store, 
  BarChart3, 
  RefreshCw, 
  Users, 
  ShoppingBag, 
  Calendar,
  Loader2,
  X,
  CheckCircle,
  AlertCircle,
  LogOut,
  TrendingUp,
  Unlink,
  Link,
  Trash2,
  AlertTriangle,
  Sparkles,
  Zap
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const TenantManagement = () => {
  const [tenants, setTenants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showReconnectModal, setShowReconnectModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [newTenant, setNewTenant] = useState({ name: '', shopifyDomain: '' });
  const [reconnectToken, setReconnectToken] = useState('');
  const [addTenantError, setAddTenantError] = useState('');
  const [reconnectError, setReconnectError] = useState('');
  const [addingTenant, setAddingTenant] = useState(false);
  const [reconnectingTenant, setReconnectingTenant] = useState(false);
  const [disconnectingTenants, setDisconnectingTenants] = useState(new Set());
  const [deletingTenants, setDeletingTenants] = useState(new Set());
  const [syncingTenants, setSyncingTenants] = useState(new Set());
  const [notification, setNotification] = useState(null);
  const navigate = useNavigate();
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const formatCurrency = (amount) => {
    const numericAmount = typeof amount === 'number' ? amount : 0;
    return new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    }).format(numericAmount);
  };

  const fetchTenants = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }
    
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/tenants`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTenants(response.data.tenants);
    } catch (err) {
      console.error('Failed to fetch tenants:', err);
      setError('Failed to load stores. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleAddTenant = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      setAddingTenant(true);
      setAddTenantError('');
      await axios.post(`${API_URL}/tenants`, newTenant, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowAddModal(false);
      setNewTenant({ name: '', shopifyDomain: '' });
      await fetchTenants();
      showNotification('Store connected successfully!');
    } catch (err) {
      setAddTenantError(err.response?.data?.error || 'Failed to add store.');
    } finally {
      setAddingTenant(false);
    }
  };

  const handleDisconnectTenant = async (tenantId) => {
    const token = localStorage.getItem('token');
    
    try {
      setDisconnectingTenants(prev => new Set(prev).add(tenantId));
      await axios.post(`${API_URL}/tenants/${tenantId}/disconnect`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchTenants();
      showNotification('Store disconnected successfully. Data has been preserved.');
    } catch (err) {
      console.error('Disconnect failed:', err);
      showNotification(err.response?.data?.error || 'Failed to disconnect store.', 'error');
    } finally {
      setDisconnectingTenants(prev => {
        const newSet = new Set(prev);
        newSet.delete(tenantId);
        return newSet;
      });
    }
  };

  const handleReconnectTenant = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      setReconnectingTenant(true);
      setReconnectError('');
      await axios.post(`${API_URL}/tenants/${selectedTenant.id}/reconnect`, {
        shopifyAccessToken: reconnectToken
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowReconnectModal(false);
      setReconnectToken('');
      setSelectedTenant(null);
      await fetchTenants();
      showNotification('Store reconnected successfully!');
    } catch (err) {
      setReconnectError(err.response?.data?.error || 'Failed to reconnect store.');
    } finally {
      setReconnectingTenant(false);
    }
  };

  const handleDeleteTenant = async () => {
    const token = localStorage.getItem('token');
    
    try {
      setDeletingTenants(prev => new Set(prev).add(selectedTenant.id));
      await axios.delete(`${API_URL}/tenants/${selectedTenant.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { confirm: 'DELETE' }
      });
      setShowDeleteModal(false);
      setSelectedTenant(null);
      await fetchTenants();
      showNotification('Store and all data deleted permanently.');
    } catch (err) {
      console.error('Delete failed:', err);
      showNotification(err.response?.data?.error || 'Failed to delete store.', 'error');
    } finally {
      setDeletingTenants(prev => {
        const newSet = new Set(prev);
        newSet.delete(selectedTenant.id);
        return newSet;
      });
    }
  };

  const handleSyncData = async (tenantId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      showNotification('You are not authenticated. Please log in again.', 'error');
      return;
    }
    
    try {
      setSyncingTenants(prev => new Set(prev).add(tenantId));
      const response = await axios.post(`${API_URL}/shopify/sync/${tenantId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      showNotification(
        `Sync completed! ${response.data.products || 0} products, ${response.data.customers || 0} customers, ${response.data.orders || 0} orders`
      );
      await fetchTenants(); 
      
    } catch (err) {
      console.error('Sync failed:', err);
      showNotification(err.response?.data?.error || 'Data sync failed.', 'error');
    } finally {
      setSyncingTenants(prev => {
        const newSet = new Set(prev);
        newSet.delete(tenantId);
        return newSet;
      });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (tenant) => {
    const isConnected = tenant.connectionStatus === 'connected';
    return (
      <div className="flex items-center min-w-fit">
        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30 animate-pulse' : 'bg-red-500 shadow-lg shadow-red-500/30'}`}></div>
        <span className={`ml-2 text-sm font-semibold whitespace-nowrap ${isConnected ? 'text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full' : 'text-red-700 bg-red-100 px-3 py-1 rounded-full'}`}>
          {isConnected ? 'Connected' : 'Disconnected'}
        </span>
      </div>
    );
  };

  const StoreCard = ({ tenant }) => {
    const isConnected = tenant.connectionStatus === 'connected';
    const isDisconnecting = disconnectingTenants.has(tenant.id);
    const isDeleting = deletingTenants.has(tenant.id);
    const isSyncing = syncingTenants.has(tenant.id);

    return (
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 hover:shadow-2xl hover:border-blue-200 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden group min-w-0">
        
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600"></div>
        
        <div className="p-6 border-b border-gray-50">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center min-w-0 flex-1">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
                <Store className="w-7 h-7 text-white" />
              </div>
              <div className="ml-4 min-w-0 flex-1">
                <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-700 transition-colors truncate">{tenant.name}</h3>
                <p className="text-sm text-gray-500 bg-gray-50 px-3 py-1 rounded-lg mt-1 truncate">{tenant.shopifyDomain}</p>
              </div>
            </div>
            <div className="flex-shrink-0">
              {getStatusBadge(tenant)}
            </div>
          </div>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="text-center p-4 bg-gradient-to-br from-blue-50 to-cyan-50 rounded-xl border border-blue-100 hover:border-blue-300 transition-all duration-200">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl mx-auto mb-3 shadow-lg">
                <Users className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-black text-gray-900">{tenant.stats?.customers || 0}</p>
              <p className="text-xs text-blue-700 font-semibold uppercase tracking-wide">Customers</p>
            </div>
            <div className="text-center p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border border-emerald-100 hover:border-emerald-300 transition-all duration-200">
              <div className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-xl mx-auto mb-3 shadow-lg">
                <ShoppingBag className="w-6 h-6 text-white" />
              </div>
              <p className="text-2xl font-black text-gray-900">{tenant.stats?.orders || 0}</p>
              <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wide">Orders</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between mb-6 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200">
            <div className="flex items-center">
              <Calendar className="w-5 h-5 text-blue-500 mr-3" />
              <span className="text-sm text-gray-700 font-medium">Last synced</span>
            </div>
            <span className="text-sm font-bold text-gray-900 bg-white px-3 py-1 rounded-lg shadow-sm">
              {formatDate(tenant.updatedAt)}
            </span>
          </div>
          
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => navigate(`/dashboard?tenantId=${tenant.id}`)}
                className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-xl hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics
              </button>
              <button
                onClick={() => handleSyncData(tenant.id)}
                disabled={!isConnected || isSyncing}
                className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {isSyncing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Syncing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2" />
                    Sync
                  </>
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {isConnected ? (
                <button
                  onClick={() => handleDisconnectTenant(tenant.id)}
                  disabled={isDisconnecting}
                  className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl hover:from-amber-600 hover:to-orange-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                >
                  {isDisconnecting ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Disconnecting...
                    </>
                  ) : (
                    <>
                      <Unlink className="w-5 h-5 mr-2" />
                      Disconnect
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={() => {
                    setSelectedTenant(tenant);
                    setShowReconnectModal(true);
                  }}
                  className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Link className="w-5 h-5 mr-2" />
                  Reconnect
                </button>
              )}
              
              <button
                onClick={() => {
                  setSelectedTenant(tenant);
                  setShowDeleteModal(true);
                }}
                disabled={isDeleting}
                className="flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-xl hover:from-red-600 hover:to-pink-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 mr-2" />
                    Delete
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center mb-8">
            <div className="space-y-2">
              <div className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-64 animate-pulse"></div>
              <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48 animate-pulse"></div>
            </div>
            <div className="flex space-x-3">
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-32 animate-pulse"></div>
              <div className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl w-24 animate-pulse"></div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl shadow-lg border border-gray-200 p-6">
                <div className="space-y-4 animate-pulse">
                  <div className="flex items-center">
                    <div className="w-14 h-14 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl"></div>
                    <div className="ml-4 space-y-2">
                      <div className="h-5 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-32"></div>
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-48"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[...Array(2)].map((_, j) => (
                      <div key={j} className="text-center space-y-2 p-4 rounded-xl bg-gray-100">
                        <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-xl mx-auto"></div>
                        <div className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-8 mx-auto"></div>
                        <div className="h-3 bg-gradient-to-r from-gray-200 to-gray-300 rounded w-16 mx-auto"></div>
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
                    <div className="h-12 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-cyan-50 to-blue-50">
      {notification && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-2xl shadow-2xl flex items-center backdrop-blur-lg border ${
          notification.type === 'success' 
            ? 'bg-emerald-500/90 text-white border-emerald-400 shadow-emerald-500/25' 
            : 'bg-red-500/90 text-white border-red-400 shadow-red-500/25'
        } animate-slide-in-from-right`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 mr-2" />
          ) : (
            <AlertCircle className="w-5 h-5 mr-2" />
          )}
          {notification.message}
        </div>
      )}

      <div className="bg-white/80 backdrop-blur-lg border-b border-gray-200/60 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-black bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 bg-clip-text text-transparent">
                Store Management
              </h1>
              <p className="text-gray-600 text-sm mt-1 font-medium">Connect and manage your Shopify stores with style</p>
            </div>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowAddModal(true)}
                className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-xl font-bold hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Plus className="w-5 h-5 mr-2" />
                Add Store
              </button>
              <button 
                onClick={handleLogout}
                className="flex items-center px-4 py-3 text-gray-700 hover:bg-white/60 rounded-xl transition-all duration-200 font-medium border border-gray-200 hover:border-gray-300 backdrop-blur-sm"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="bg-red-50 border-2 border-red-200 text-red-800 px-6 py-4 rounded-2xl flex items-center mb-6 shadow-lg">
            <AlertCircle className="w-6 h-6 mr-3 flex-shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {tenants.length === 0 && !loading && !error && (
          <div className="text-center py-16">
            <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl border border-gray-200 p-12 max-w-md mx-auto">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-cyan-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Store className="w-10 h-10 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">No Stores Connected</h2>
              <p className="text-gray-600 mb-6 font-medium">Get started by connecting your first Shopify store to begin your analytics journey.</p>
              <button 
                onClick={() => setShowAddModal(true)}
                className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-xl font-bold hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Connect Your First Store
              </button>
            </div>
          </div>
        )}

        {tenants.length > 0 && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <Store className="w-7 h-7 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-black text-gray-900">{tenants.length}</p>
                    <p className="text-sm text-blue-700 font-semibold uppercase tracking-wide">Total Stores</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-black text-gray-900">
                      {tenants.reduce((sum, t) => sum + (t.stats?.customers || 0), 0)}
                    </p>
                    <p className="text-sm text-blue-700 font-semibold uppercase tracking-wide">Total Customers</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <ShoppingBag className="w-7 h-7 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className="text-3xl font-black text-gray-900">
                      {tenants.reduce((sum, t) => sum + (t.stats?.orders || 0), 0)}
                    </p>
                    <p className="text-sm text-emerald-700 font-semibold uppercase tracking-wide">Total Orders</p>
                  </div>
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                <div className="flex items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-amber-500 to-orange-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <div className="ml-4 flex-1">
                    <p className="text-3xl font-black text-gray-900 truncate">
                      {formatCurrency(tenants.reduce((sum, t) => sum + Number(t.stats?.totalRevenue || 0), 0))}
                    </p>
                    <p className="text-sm text-amber-700 font-semibold uppercase tracking-wide">Total Revenue</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tenants.map((tenant) => (
                <StoreCard key={tenant.id} tenant={tenant} />
              ))}
            </div>
          </>
        )}
      </div>

      
      {showAddModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-gray-200">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl flex items-center justify-center mr-3">
                  <Plus className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-cyan-600 bg-clip-text text-transparent">Connect New Store</h2>
              </div>
              <button 
                onClick={() => {
                  setShowAddModal(false);
                  setAddTenantError('');
                  setNewTenant({ name: '', shopifyDomain: '' });
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {addTenantError && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center mb-4">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="font-semibold">{addTenantError}</span>
              </div>
            )}
            
            <form onSubmit={handleAddTenant} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-bold text-gray-700 mb-3">
                  Store Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={newTenant.name}
                  onChange={(e) => setNewTenant({ ...newTenant, name: e.target.value })}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium"
                  placeholder="e.g., My Awesome Store"
                  required
                />
              </div>
              <div>
                <label htmlFor="domain" className="block text-sm font-bold text-gray-700 mb-3">
                  Shopify Domain
                </label>
                <input
                  type="text"
                  id="domain"
                  value={newTenant.shopifyDomain}
                  onChange={(e) => setNewTenant({ ...newTenant, shopifyDomain: e.target.value })}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 font-medium"
                  placeholder="e.g., my-awesome-store.myshopify.com"
                  required
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setAddTenantError('');
                    setNewTenant({ name: '', shopifyDomain: '' });
                  }}
                  className="flex-1 py-4 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingTenant}
                  className="flex-1 py-4 px-4 bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-600 text-white rounded-xl font-bold hover:from-blue-700 hover:via-cyan-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:shadow-none"
                >
                  {addingTenant ? (
                    <>
                      <Loader2 className="w-5 h-5 inline-block mr-2 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5 inline-block mr-2" />
                      Connect Store
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      
      {showReconnectModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md border border-gray-200">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mr-3">
                  <Link className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent">Reconnect Store</h2>
              </div>
              <button 
                onClick={() => {
                  setShowReconnectModal(false);
                  setReconnectError('');
                  setReconnectToken('');
                  setSelectedTenant(null);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-xl"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl">
              <div className="flex items-start">
                <Link className="w-6 h-6 text-blue-600 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-bold text-blue-900 mb-1">Reconnecting {selectedTenant.name}</h4>
                  <p className="text-sm text-blue-700 font-medium">
                    Enter a new Shopify access token to restore the connection to your store. 
                    Your existing data will remain intact.
                  </p>
                </div>
              </div>
            </div>
            
            {reconnectError && (
              <div className="bg-red-50 border-2 border-red-200 text-red-800 px-4 py-3 rounded-xl flex items-center mb-4">
                <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0" />
                <span className="font-semibold">{reconnectError}</span>
              </div>
            )}
            
            <form onSubmit={handleReconnectTenant} className="space-y-6">
              <div>
                <label htmlFor="accessToken" className="block text-sm font-bold text-gray-700 mb-3">
                  Shopify Access Token
                </label>
                <input
                  type="password"
                  id="accessToken"
                  value={reconnectToken}
                  onChange={(e) => setReconnectToken(e.target.value)}
                  className="w-full px-4 py-4 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all duration-200 font-medium"
                  placeholder="Enter new access token..."
                  required
                />
                <p className="text-xs text-gray-600 mt-2 font-medium bg-gray-50 px-3 py-2 rounded-lg">
                  Get this from your Shopify app settings or admin panel
                </p>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowReconnectModal(false);
                    setReconnectError('');
                    setReconnectToken('');
                    setSelectedTenant(null);
                  }}
                  className="flex-1 py-4 px-4 border-2 border-gray-300 text-gray-700 rounded-xl font-bold hover:bg-gray-50 hover:border-gray-400 transition-all duration-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reconnectingTenant}
                  className="flex-1 py-4 px-4 bg-gradient-to-r from-emerald-600 to-green-600 text-white rounded-xl font-bold hover:from-emerald-700 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:shadow-none"
                >
                  {reconnectingTenant ? (
                    <>
                      <Loader2 className="w-5 h-5 inline-block mr-2 animate-spin" />
                      Reconnecting...
                    </>
                  ) : (
                    <>
                      <Link className="w-5 h-5 inline-block mr-2" />
                      Reconnect Store
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
     
      {showDeleteModal && selectedTenant && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-200">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl flex items-center justify-center mr-3">
                <AlertTriangle className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-2xl font-bold bg-gradient-to-r from-red-600 to-pink-600 bg-clip-text text-transparent">Permanent Deletion Warning</h2>
            </div>
            
            <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-6">
              <p className="text-red-800 font-bold mb-4">
                This action will permanently delete <span className="bg-red-200 px-2 py-1 rounded font-black">{selectedTenant.name}</span> and <span className="font-black">ALL</span> associated data including:
              </p>
              <ul className="list-disc list-inside text-red-700 font-semibold mb-4 space-y-1">
                <li>Customers</li>
                <li>Products</li>
                <li>Orders</li>
                <li>All historical analytics data</li>
              </ul>
              <p className="text-red-800 font-black text-center bg-red-200 py-2 rounded-lg">This cannot be undone!</p>
            </div>
            
            <p className="text-gray-700 mb-2 font-bold">Type <span className="bg-gray-200 px-2 py-1 rounded font-black">DELETE</span> to confirm</p>
            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-4 py-4 border-2 border-red-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-200 font-bold text-center"
            />
            <div className="flex justify-end space-x-4 mt-8">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setSelectedTenant(null);
                  setDeleteConfirmText('');
                }}
                className="flex-1 py-4 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteTenant}
                disabled={deleteConfirmText !== 'DELETE' || deletingTenants.has(selectedTenant.id)}
                className="flex-1 py-4 px-4 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-bold hover:from-red-700 hover:to-pink-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:shadow-none"
              >
                {deletingTenants.has(selectedTenant.id) ? (
                  <>
                    <Loader2 className="w-5 h-5 inline-block mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-5 h-5 inline-block mr-2" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default TenantManagement;
