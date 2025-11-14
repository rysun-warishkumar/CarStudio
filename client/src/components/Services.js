import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import {
  Plus,
  Search,
  Package,
  Settings,
  Edit,
  Trash2,
  Eye,
  DollarSign,
  Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

const Services = () => {
  const [activeTab, setActiveTab] = useState('services');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view');
  const queryClient = useQueryClient();
  const searchInputRef = useRef(null);

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch services
  const { data: services, isLoading: servicesLoading } = useQuery(
    ['services', debouncedSearchTerm],
    async () => {
      const response = await axios.get(`/api/services?search=${debouncedSearchTerm}`);
      return response.data;
    }
  );

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery(
    'categories',
    async () => {
      const response = await axios.get('/api/services/categories');
      return response.data;
    }
  );

  // Fetch packages
  const { data: packages, isLoading: packagesLoading } = useQuery(
    ['packages', debouncedSearchTerm],
    async () => {
      const response = await axios.get(`/api/services/packages/all?search=${debouncedSearchTerm}`);
      return response.data;
    }
  );

  // Delete mutations
  const deleteServiceMutation = useMutation(
    async (serviceId) => {
      await axios.delete(`/api/services/${serviceId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('services');
        toast.success('Service deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete service');
      }
    }
  );

  const deletePackageMutation = useMutation(
    async (packageId) => {
      await axios.delete(`/api/services/packages/${packageId}`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('packages');
        toast.success('Package deleted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to delete package');
      }
    }
  );

  const handleDelete = (id, type) => {
    const confirmMessage = type === 'service' ? 'service' : 'package';
    if (window.confirm(`Are you sure you want to delete this ${confirmMessage}?`)) {
      if (type === 'service') {
        deleteServiceMutation.mutate(id);
      } else {
        deletePackageMutation.mutate(id);
      }
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

  const isLoading = servicesLoading || categoriesLoading || packagesLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Services</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your service catalog, categories, and packages
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={() => openModal(null, 'add')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add {activeTab === 'services' ? 'Service' : activeTab === 'packages' ? 'Package' : 'Category'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6">
            {[
              { id: 'services', name: 'Services', count: services?.data?.length || 0 },
              { id: 'packages', name: 'Packages', count: packages?.data?.length || 0 },
              { id: 'categories', name: 'Categories', count: categories?.data?.length || 0 }
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
                <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Search */}
        <div className="p-6 border-b border-gray-200">
          <form onSubmit={(e) => e.preventDefault()}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    return false;
                  }
                }}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </form>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'services' && (
            <ServicesList
              services={services?.data || []}
              onEdit={(service) => openModal(service, 'edit')}
              onView={(service) => openModal(service, 'view')}
              onDelete={(id) => handleDelete(id, 'service')}
            />
          )}
          {activeTab === 'packages' && (
            <PackagesList
              packages={packages?.data || []}
              onEdit={(pkg) => openModal(pkg, 'edit')}
              onView={(pkg) => openModal(pkg, 'view')}
              onDelete={(id) => handleDelete(id, 'package')}
            />
          )}
          {activeTab === 'categories' && (
            <CategoriesList
              categories={categories?.data || []}
              onEdit={(category) => openModal(category, 'edit')}
              onView={(category) => openModal(category, 'view')}
            />
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ServiceModal
          item={selectedItem}
          type={modalType}
          tab={activeTab}
          onClose={closeModal}
          onSuccess={() => {
            queryClient.invalidateQueries(['services']);
            queryClient.invalidateQueries(['packages']);
            queryClient.invalidateQueries(['categories']);
            closeModal();
          }}
        />
      )}
    </div>
  );
};

// Services List Component
const ServicesList = ({ services, onEdit, onView, onDelete }) => {
  if (services.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No services found</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by adding your first service.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {services.map((service) => (
        <div key={service.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">{service.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{service.description}</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  ₹{service.base_price?.toLocaleString()}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Clock className="h-4 w-4 mr-2" />
                  {service.duration_minutes} minutes
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <Package className="h-4 w-4 mr-2" />
                  {service.category_name}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => onView(service)}
                className="text-primary-600 hover:text-primary-900"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => onEdit(service)}
                className="text-blue-600 hover:text-blue-900"
                title="Edit Service"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(service.id)}
                className="text-red-600 hover:text-red-900"
                title="Delete Service"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Packages List Component
const PackagesList = ({ packages, onEdit, onView, onDelete }) => {
  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No packages found</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by adding your first package.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {packages.map((pkg) => (
        <div key={pkg.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">{pkg.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{pkg.description}</p>
              <div className="mt-4 space-y-2">
                <div className="flex items-center text-sm text-gray-600">
                  <DollarSign className="h-4 w-4 mr-2" />
                  ₹{pkg.price?.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Services:</span>
                  <div className="mt-1 space-y-1">
                    {pkg.services?.map((service, index) => (
                      <div key={index} className="text-xs text-gray-500">
                        • {service.service_name}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => onView(pkg)}
                className="text-primary-600 hover:text-primary-900"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => onEdit(pkg)}
                className="text-blue-600 hover:text-blue-900"
                title="Edit Package"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onDelete(pkg.id)}
                className="text-red-600 hover:text-red-900"
                title="Delete Package"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Categories List Component
const CategoriesList = ({ categories, onEdit, onView }) => {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12">
        <Settings className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">No categories found</h3>
        <p className="mt-1 text-sm text-gray-500">Get started by adding your first category.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {categories.map((category) => (
        <div key={category.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="text-lg font-medium text-gray-900">{category.name}</h3>
              <p className="text-sm text-gray-500 mt-1">{category.description}</p>
              <div className="mt-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Category ID:</span> {category.id}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => onView(category)}
                className="text-primary-600 hover:text-primary-900"
                title="View Details"
              >
                <Eye className="h-4 w-4" />
              </button>
              <button
                onClick={() => onEdit(category)}
                className="text-blue-600 hover:text-blue-900"
                title="Edit Category"
              >
                <Edit className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Service Modal Component
const ServiceModal = ({ item, type, tab, onClose, onSuccess }) => {
  // Map backend fields to modal state for edit
  const [formData, setFormData] = useState(() => {
    if (tab === 'services' && item) {
      return {
        name: item.name || '',
        description: item.description || '',
        base_price: item.base_price || '',
        duration: item.duration_minutes || '',
        image_url: item.image_url || '',
        category_id: item.category_id || '',
      };
    } else if (tab === 'packages' && item) {
      return {
        name: item.name || '',
        description: item.description || '',
        price: item.price || '',
        image_url: item.image_url || '',
        services: item.services || [],
      };
    } else if (tab === 'categories' && item) {
      return {
        name: item.name || '',
        description: item.description || '',
      };
    } else {
      // Defaults for add
      return {
        name: '',
        description: '',
        base_price: '',
        duration: '',
        image_url: '',
        category_id: '',
        price: '',
        services: [],
      };
    }
  });

  // State for service selection modal
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [selectedServices, setSelectedServices] = useState(() => {
    // Clean the services data to only include service_id and quantity
    if (formData.services && formData.services.length > 0) {
      return formData.services.map(service => ({
        service_id: service.service_id || service.id,
        quantity: parseInt(service.quantity) || 1
      }));
    }
    return [];
  });

  // Fetch categories for dropdown
  const { data: categoriesData } = useQuery(
    'categories',
    async () => {
      const response = await axios.get('/api/services/categories');
      return response.data;
    }
  );

  // Fetch available services for package creation
  const { data: availableServicesData } = useQuery(
    ['available-services'],
    async () => {
      const response = await axios.get('/api/services/packages/available-services');
      return response.data;
    },
    {
      enabled: tab === 'packages'
    }
  );

  const { mutate: saveItem, isLoading } = useMutation(
    async (data) => {
      if (type === 'add') {
        if (tab === 'services') {
          await axios.post('/api/services', data);
        } else if (tab === 'packages') {
          await axios.post('/api/services/packages', data);
        } else {
          await axios.post('/api/services/categories', data);
        }
      } else {
        if (tab === 'services') {
          await axios.put(`/api/services/${item.id}`, data);
        } else if (tab === 'packages') {
          await axios.put(`/api/services/packages/${item.id}`, data);
        } else {
          await axios.put(`/api/services/categories/${item.id}`, data);
        }
      }
    },
    {
      onSuccess: () => {
        const itemType = tab === 'services' ? 'Service' : tab === 'packages' ? 'Package' : 'Category';
        toast.success(`${itemType} ${type === 'add' ? 'added' : 'updated'} successfully`);
        onSuccess();
      },
      onError: (error) => {
        const itemType = tab === 'services' ? 'Service' : tab === 'packages' ? 'Package' : 'Category';
        console.error('Error details:', error.response?.data);
        toast.error(error.response?.data?.message || `Failed to ${type} ${itemType.toLowerCase()}`);
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    // Map modal state to backend fields for services
    let dataToSend = { ...formData };
    if (tab === 'services') {
      dataToSend = {
        name: formData.name,
        description: formData.description,
        base_price: formData.base_price,
        duration_minutes: formData.duration,
        image_url: formData.image_url,
        category_id: formData.category_id,
      };
    } else if (tab === 'packages') {
      // Clean the services data to only include service_id and quantity
      const cleanServices = selectedServices.map(service => ({
        service_id: parseInt(service.service_id),
        quantity: parseInt(service.quantity) || 1
      }));
      
      dataToSend = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        image_url: formData.image_url,
        services: cleanServices,
        is_active: 1, // Add this field for package updates
        validity_days: 365, // Add default validity days
      };
    }
    saveItem(dataToSend);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Handle service selection
  const handleServiceToggle = (service) => {
    const isSelected = selectedServices.find(s => s.service_id === service.id);
    if (isSelected) {
      setSelectedServices(selectedServices.filter(s => s.service_id !== service.id));
    } else {
      setSelectedServices([...selectedServices, { service_id: service.id, quantity: 1 }]);
    }
  };

  // Handle service quantity change
  const handleServiceQuantityChange = (serviceId, quantity) => {
    setSelectedServices(selectedServices.map(s => 
      s.service_id === serviceId ? { ...s, quantity: parseInt(quantity) || 1 } : s
    ));
  };

  if (type === 'view') {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              {tab === 'services' ? 'Service' : tab === 'packages' ? 'Package' : 'Category'} Details
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="mt-1 text-sm text-gray-900">{item.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Description</label>
                <p className="mt-1 text-sm text-gray-900">{item.description}</p>
              </div>
              {tab === 'services' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <p className="mt-1 text-sm text-gray-900">₹{item.price?.toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Duration</label>
                    <p className="mt-1 text-sm text-gray-900">{item.duration} minutes</p>
                  </div>
                </>
              )}
              {tab === 'packages' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Price</label>
                    <p className="mt-1 text-sm text-gray-900">₹{item.price?.toLocaleString()}</p>
                  </div>
                  {item.image_url && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Package Image</label>
                      <img src={item.image_url} alt="Package" className="mt-2 h-32 rounded shadow" />
                    </div>
                  )}
                  {item.services && item.services.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Included Services</label>
                      <div className="mt-2 space-y-2">
                        {item.services.map((service, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                            <div className="font-medium">{service.service_name}</div>
                            <div className="text-gray-600">Quantity: {service.quantity}</div>
                            <div className="text-gray-600">Price: ₹{service.price}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={onClose} className="btn btn-secondary">Close</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-full max-w-2xl shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            {type === 'add' ? 'Add New' : 'Edit'} {tab === 'services' ? 'Service' : tab === 'packages' ? 'Package' : 'Category'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4" encType="multipart/form-data">
            <div>
              <label className="block text-sm font-medium text-gray-700">Name</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            {tab === 'services' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Category</label>
                  <select
                    name="category_id"
                    value={formData.category_id}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select category</option>
                    {categoriesData?.data?.map((cat) => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    name="base_price"
                    value={formData.base_price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Duration (minutes)</label>
                  <input
                    type="number"
                    name="duration"
                    value={formData.duration}
                    onChange={handleChange}
                    required
                    min="1"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Service Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('image', file);
                      try {
                        const res = await axios.post('/api/services/upload-image', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        setFormData((prev) => ({ ...prev, image_url: res.data.imageUrl }));
                        toast.success('Image uploaded!');
                      } catch (err) {
                        toast.error('Image upload failed');
                      }
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="mt-2 h-20 rounded shadow" />
                  )}
                </div>
              </>
            )}
            {tab === 'packages' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Price</label>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={handleChange}
                    required
                    min="0"
                    step="0.01"
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Package Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files[0];
                      if (!file) return;
                      const formData = new FormData();
                      formData.append('image', file);
                      try {
                        const res = await axios.post('/api/services/packages/upload-image', formData, {
                          headers: { 'Content-Type': 'multipart/form-data' },
                        });
                        setFormData((prev) => ({ ...prev, image_url: res.data.imageUrl }));
                        toast.success('Image uploaded!');
                      } catch (err) {
                        toast.error('Image upload failed');
                      }
                    }}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                  />
                  {formData.image_url && (
                    <img src={formData.image_url} alt="Preview" className="mt-2 h-20 rounded shadow" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Services</label>
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowServiceModal(true)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-left text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {selectedServices.length > 0 
                        ? `${selectedServices.length} service(s) selected` 
                        : 'Select services for this package'
                      }
                    </button>
                    {selectedServices.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {selectedServices.map((selectedService) => {
                          const service = availableServicesData?.data?.find(s => s.id === selectedService.service_id);
                          return service ? (
                            <div key={selectedService.service_id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <span className="text-sm">{service.name}</span>
                              <input
                                type="number"
                                min="1"
                                value={selectedService.quantity}
                                onChange={(e) => handleServiceQuantityChange(selectedService.service_id, e.target.value)}
                                className="w-16 px-2 py-1 border rounded text-sm"
                              />
                            </div>
                          ) : null;
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
            <div className="mt-6 flex justify-end space-x-3">
              <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors">
                Cancel
              </button>
              <button type="submit" disabled={isLoading} className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50">
                {isLoading ? 'Saving...' : type === 'add' ? 'Add' : 'Update'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Service Selection Modal */}
      {showServiceModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
          <div className="relative top-10 mx-auto p-5 border w-3/4 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Select Services for Package</h3>
                <button
                  onClick={() => setShowServiceModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableServicesData?.data?.map((service) => {
                    const isSelected = selectedServices.find(s => s.service_id === service.id);
                    return (
                      <div
                        key={service.id}
                        className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                          isSelected ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => handleServiceToggle(service)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{service.name}</h4>
                            <p className="text-sm text-gray-600 mt-1">{service.description}</p>
                            <div className="mt-2 text-sm text-gray-500">
                              <span className="font-medium">Category:</span> {service.category_name}
                            </div>
                            <div className="mt-1 text-sm text-gray-500">
                              <span className="font-medium">Price:</span> ₹{service.base_price}
                            </div>
                          </div>
                          <div className="ml-4">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleServiceToggle(service)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                          </div>
                        </div>
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <label className="block text-sm font-medium text-gray-700">Quantity:</label>
                            <input
                              type="number"
                              min="1"
                              value={selectedServices.find(s => s.service_id === service.id)?.quantity || 1}
                              onChange={(e) => handleServiceQuantityChange(service.id, e.target.value)}
                              className="mt-1 w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowServiceModal(false)}
                  className="btn btn-secondary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
