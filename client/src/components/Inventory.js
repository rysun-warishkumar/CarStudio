import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import {
  Plus,
  Search,
  Package,
  AlertTriangle,
  Edit,
  Trash2,
  Eye,
  TrendingUp,
  TrendingDown,
  Filter,
  BarChart3,
  PlusCircle,
  MinusCircle,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Inventory = () => {
  const [activeTab, setActiveTab] = useState('items');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view');
  const [showStockModal, setShowStockModal] = useState(false);
  const [stockModalType, setStockModalType] = useState('add');
  const [selectedStockItem, setSelectedStockItem] = useState(null);
  const [filters, setFilters] = useState({
    lowStock: false,
    category: '',
    status: 'all'
  });
  const queryClient = useQueryClient();

  // Fetch inventory items
  const { data: inventoryData, isLoading: inventoryLoading, refetch: refetchInventory } = useQuery(
    ['inventory', searchTerm, filters],
    async () => {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filters.lowStock) params.append('low_stock', 'true');
      if (filters.category) params.append('category', filters.category);
      
      const response = await axios.get(`/api/inventory?${params.toString()}`);
      return response.data;
    }
  );

  // Fetch inventory statistics
  const { data: statsData, isLoading: statsLoading, refetch: refetchStats } = useQuery(
    'inventory-stats',
    async () => {
      const response = await axios.get('/api/inventory/stats/overview');
      return response.data;
    }
  );

  // Fetch low stock alerts
  const { data: lowStockData, isLoading: lowStockLoading, refetch: refetchLowStock } = useQuery(
    'low-stock-alerts',
    async () => {
      const response = await axios.get('/api/inventory/alerts/low-stock');
      return response.data;
    }
  );

  // Create inventory item mutation
  const createItemMutation = useMutation(
    async (itemData) => {
      const response = await axios.post('/api/inventory', itemData);
      return response.data;
    },
    {
      onSuccess: () => {
        refetchInventory();
        refetchStats();
        refetchLowStock();
        toast.success('Inventory item created successfully');
        closeModal();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to create inventory item');
      }
    }
  );

  // Update inventory item mutation
  const updateItemMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.put(`/api/inventory/${id}`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        refetchInventory();
        refetchStats();
        refetchLowStock();
        toast.success('Inventory item updated successfully');
        closeModal();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update inventory item');
      }
    }
  );

  // Delete inventory item mutation
  const deleteItemMutation = useMutation(
    async (itemId) => {
      await axios.delete(`/api/inventory/${itemId}`);
    },
    {
      onSuccess: () => {
        refetchInventory();
        refetchStats();
        refetchLowStock();
        toast.success('Inventory item deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to delete inventory item');
      }
    }
  );

  // Add stock mutation
  const addStockMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.post(`/api/inventory/${id}/add-stock`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        refetchInventory();
        refetchStats();
        refetchLowStock();
        toast.success('Stock added successfully');
        closeStockModal();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to add stock');
      }
    }
  );

  // Remove stock mutation
  const removeStockMutation = useMutation(
    async ({ id, data }) => {
      const response = await axios.post(`/api/inventory/${id}/remove-stock`, data);
      return response.data;
    },
    {
      onSuccess: () => {
        refetchInventory();
        refetchStats();
        refetchLowStock();
        toast.success('Stock removed successfully');
        closeStockModal();
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to remove stock');
      }
    }
  );

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this inventory item?')) {
      deleteItemMutation.mutate(id);
    }
  };

  const openModal = (item, type) => {
    setSelectedItem(item);
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedItem(null);
  };

  const openStockModal = (item, type) => {
    setSelectedStockItem(item);
    setStockModalType(type);
    setShowStockModal(true);
  };

  const closeStockModal = () => {
    setShowStockModal(false);
    setSelectedStockItem(null);
  };

  const handleSubmit = (formData) => {
    if (modalType === 'add') {
      createItemMutation.mutate(formData);
    } else {
      updateItemMutation.mutate({ id: selectedItem.id, data: formData });
    }
  };

  const handleStockSubmit = (formData) => {
    if (stockModalType === 'add') {
      addStockMutation.mutate({ id: selectedStockItem.id, data: formData });
    } else {
      removeStockMutation.mutate({ id: selectedStockItem.id, data: formData });
    }
  };

  const getStockStatus = (currentStock, minStock) => {
    if (currentStock <= 0) return { status: 'out', color: 'text-red-600', bg: 'bg-red-50' };
    if (currentStock <= minStock) return { status: 'low', color: 'text-orange-600', bg: 'bg-orange-50' };
    return { status: 'good', color: 'text-green-600', bg: 'bg-green-50' };
  };

  const isLoading = inventoryLoading || statsLoading || lowStockLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  const inventoryItems = inventoryData?.items || [];
  const stats = statsData?.stats || {};
  const lowStockItems = lowStockData?.lowStockItems || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage stock levels, track consumption, and handle low stock alerts
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => openModal(null, 'add')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Items</p>
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{stats.totalItems || 0}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Value</p>
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-20 rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">₹{stats.totalValue?.toLocaleString() || 0}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <AlertTriangle className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Low Stock Items</p>
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{stats.lowStockItems || 0}</p>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Categories</p>
              {statsLoading ? (
                <div className="animate-pulse bg-gray-200 h-8 w-16 rounded mt-1"></div>
              ) : (
                <p className="text-2xl font-bold text-gray-900">{statsData?.categoryStats?.length || 0}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-orange-600 mr-2" />
            <h3 className="text-sm font-medium text-orange-800">Low Stock Alerts</h3>
          </div>
          <div className="mt-2">
            <p className="text-sm text-orange-700">
              {lowStockItems.length} item{lowStockItems.length > 1 ? 's' : ''} need{lowStockItems.length > 1 ? '' : 's'} restocking
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'items', name: 'Inventory Items', count: inventoryItems.length },
              { id: 'alerts', name: 'Low Stock Alerts', count: lowStockItems.length },
              { id: 'transactions', name: 'Recent Transactions', count: statsData?.recentTransactions?.length || 0 }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.name}
                {tab.count > 0 && (
                  <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search inventory items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent w-full"
              />
            </div>
            <div className="mt-4 sm:mt-0 flex space-x-3">
              <select
                value={filters.lowStock}
                onChange={(e) => setFilters({ ...filters, lowStock: e.target.value === 'true' })}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">All Stock Levels</option>
                <option value="true">Low Stock Only</option>
              </select>
              <button className="btn btn-secondary">
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'items' && (
            <div className="overflow-x-auto">
              {inventoryLoading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Item
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stock Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unit Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {inventoryItems.map((item) => {
                      const stockStatus = getStockStatus(item.current_stock, item.min_stock_level);
                      return (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">{item.name}</div>
                              <div className="text-sm text-gray-500">{item.description}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.category || 'Uncategorized'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {item.current_stock} {item.unit}
                            </div>
                            <div className="text-xs text-gray-500">
                              Min: {item.min_stock_level} {item.unit}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.cost_per_unit?.toLocaleString() || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.bg} ${stockStatus.color}`}>
                              {stockStatus.status === 'out' ? 'Out of Stock' : 
                               stockStatus.status === 'low' ? 'Low Stock' : 'In Stock'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => openModal(item, 'view')}
                                className="text-primary-600 hover:text-primary-900"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openModal(item, 'edit')}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openStockModal(item, 'add')}
                                className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                              >
                                <PlusCircle className="h-4 w-4 mr-1" />
                                Add Stock
                              </button>
                              <button
                                onClick={() => openStockModal(item, 'remove')}
                                className="text-orange-600 hover:text-orange-900"
                              >
                                <MinusCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(item.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="space-y-4">
              {lowStockLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : (
                lowStockItems.map((item) => {
                  const stockStatus = getStockStatus(item.current_stock, item.min_stock_level);
                  return (
                    <div key={item.id} className="border border-orange-200 rounded-lg p-4 bg-orange-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">{item.name}</h4>
                          <p className="text-sm text-gray-500">{item.description}</p>
                          <div className="mt-2 flex items-center space-x-4">
                            <span className="text-sm text-gray-600">
                              Current: {item.current_stock} {item.unit}
                            </span>
                            <span className="text-sm text-gray-600">
                              Minimum: {item.min_stock_level} {item.unit}
                            </span>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${stockStatus.bg} ${stockStatus.color}`}>
                              {stockStatus.status === 'out' ? 'Out of Stock' : 'Low Stock'}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => openStockModal(item, 'add')}
                            className="btn btn-primary btn-sm"
                          >
                            <PlusCircle className="h-4 w-4 mr-1" />
                            Add Stock
                          </button>
                          <button
                            onClick={() => openModal(item, 'edit')}
                            className="btn btn-secondary btn-sm"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="space-y-4">
              {statsLoading ? (
                <div className="flex items-center justify-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : statsData?.recentTransactions?.length > 0 ? (
                statsData.recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{transaction.item_name}</h4>
                        <p className="text-sm text-gray-500">{transaction.notes}</p>
                        <div className="mt-2 flex items-center space-x-4">
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                            transaction.transaction_type === 'in' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {transaction.transaction_type === 'in' ? (
                              <TrendingUp className="h-3 w-3 mr-1" />
                            ) : (
                              <TrendingDown className="h-3 w-3 mr-1" />
                            )}
                            {transaction.transaction_type.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-600">
                            Quantity: {transaction.quantity}
                          </span>
                          <span className="text-sm text-gray-600">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                  <p>No recent transactions found</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Inventory Item Modal */}
      {showModal && (
        <InventoryItemModal
          item={selectedItem}
          type={modalType}
          onClose={closeModal}
          onSubmit={handleSubmit}
          isLoading={createItemMutation.isLoading || updateItemMutation.isLoading}
        />
      )}

      {/* Stock Management Modal */}
      {showStockModal && (
        <StockManagementModal
          item={selectedStockItem}
          type={stockModalType}
          onClose={closeStockModal}
          onSubmit={handleStockSubmit}
          isLoading={addStockMutation.isLoading || removeStockMutation.isLoading}
        />
      )}
    </div>
  );
};

// Inventory Item Modal Component
const InventoryItemModal = ({ item, type, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    category: item?.category || '',
    unit: item?.unit || 'pieces',
    current_stock: item?.current_stock || 0,
    min_stock_level: item?.min_stock_level || 0,
    cost_per_unit: item?.cost_per_unit || 0,
    supplier: item?.supplier || '',
    is_active: item?.is_active !== false
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {type === 'add' ? 'Add Inventory Item' : type === 'edit' ? 'Edit Inventory Item' : 'View Inventory Item'}
          </h3>
          
          {type !== 'view' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows="3"
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="pieces">Pieces</option>
                    <option value="liters">Liters</option>
                    <option value="kg">Kilograms</option>
                    <option value="meters">Meters</option>
                    <option value="boxes">Boxes</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                  <input
                    type="number"
                    name="current_stock"
                    value={formData.current_stock}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Stock Level</label>
                  <input
                    type="number"
                    name="min_stock_level"
                    value={formData.min_stock_level}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost per Unit (₹)</label>
                  <input
                    type="number"
                    name="cost_per_unit"
                    value={formData.cost_per_unit}
                    onChange={handleChange}
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <input
                    type="text"
                    name="supplier"
                    value={formData.supplier}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  name="is_active"
                  checked={formData.is_active}
                  onChange={handleChange}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">Active</label>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Saving...' : type === 'add' ? 'Create Item' : 'Update Item'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{formData.name}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{formData.description || 'No description'}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <p className="mt-1 text-sm text-gray-900">{formData.category || 'Uncategorized'}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Unit</label>
                  <p className="mt-1 text-sm text-gray-900">{formData.unit}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                  <p className="mt-1 text-sm text-gray-900">{formData.current_stock} {formData.unit}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Min Stock Level</label>
                  <p className="mt-1 text-sm text-gray-900">{formData.min_stock_level} {formData.unit}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Cost per Unit</label>
                  <p className="mt-1 text-sm text-gray-900">₹{formData.cost_per_unit?.toLocaleString() || 0}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Supplier</label>
                  <p className="mt-1 text-sm text-gray-900">{formData.supplier || 'Not specified'}</p>
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Stock Management Modal Component
const StockManagementModal = ({ item, type, onClose, onSubmit, isLoading }) => {
  const [formData, setFormData] = useState({
    quantity: '',
    reference_type: type === 'add' ? 'purchase' : 'usage',
    notes: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {type === 'add' ? 'Add Stock' : 'Remove Stock'} - {item?.name}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Quantity</label>
              <input
                type="number"
                name="quantity"
                value={formData.quantity}
                onChange={handleChange}
                required
                min="0.01"
                step="0.01"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Reference Type</label>
              <select
                name="reference_type"
                value={formData.reference_type}
                onChange={handleChange}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                {type === 'add' ? (
                  <>
                    <option value="purchase">Purchase</option>
                    <option value="return">Return</option>
                    <option value="adjustment">Adjustment</option>
                  </>
                ) : (
                  <>
                    <option value="usage">Usage</option>
                    <option value="adjustment">Adjustment</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows="3"
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="Optional notes about this transaction..."
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className={`btn ${type === 'add' ? 'btn-primary' : 'btn-danger'}`}
              >
                {isLoading ? 'Processing...' : type === 'add' ? 'Add Stock' : 'Remove Stock'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Inventory;
