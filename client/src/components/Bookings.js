import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import {
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  User,
  Car,
  DollarSign,
  CheckCircle,
  XCircle,
  Edit,
  Eye,
  Settings
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const Bookings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [statusFilter, setStatusFilter] = useState(''); // Show all statuses by default
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState('view');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdateData, setStatusUpdateData] = useState({ status: '', notes: '' });
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const searchInputRef = useRef(null);

  // Debounce search term to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300); // 300ms delay

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch bookings
  const { data: bookings, isLoading, error } = useQuery(
    ['bookings', debouncedSearchTerm, selectedDate, statusFilter],
    async () => {
      const params = new URLSearchParams();
      if (debouncedSearchTerm) params.append('search', debouncedSearchTerm);
      if (selectedDate) params.append('date', selectedDate);
      // Always send status only if set (empty string means all)
      if (statusFilter) params.append('status', statusFilter);
      const response = await axios.get(`/api/bookings?${params.toString()}`);
      return response.data;
    }
  );

  // Update booking status mutation (admin only)
  const updateStatusMutation = useMutation(
    async ({ bookingId, status, notes }) => {
      await axios.put(`/api/bookings/${bookingId}/status`, { status, notes });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bookings');
        queryClient.invalidateQueries(['bookings', debouncedSearchTerm, selectedDate, statusFilter]);
        toast.success('Booking status updated successfully');
        setShowStatusModal(false);
        setStatusUpdateData({ status: '', notes: '' });
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to update booking status');
      }
    }
  );

  // Cancel booking mutation
  const cancelBookingMutation = useMutation(
    async (bookingId) => {
      await axios.put(`/api/bookings/${bookingId}/cancel`);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('bookings');
        toast.success('Booking cancelled successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to cancel booking');
      }
    }
  );

  const handleStatusUpdate = (bookingId, newStatus) => {
    if (user?.role === 'admin') {
      setStatusUpdateData({ status: newStatus, notes: '' });
      setSelectedBooking({ id: bookingId });
      setShowStatusModal(true);
    } else {
      updateStatusMutation.mutate({ bookingId, status: newStatus, notes: '' });
    }
  };

  const handleAdminStatusUpdate = () => {
    if (statusUpdateData.status && selectedBooking) {
      updateStatusMutation.mutate({
        bookingId: selectedBooking.id,
        status: statusUpdateData.status,
        notes: statusUpdateData.notes
      });
    }
  };

  const openStatusModal = (booking) => {
    setSelectedBooking(booking);
    setStatusUpdateData({ status: booking.status, notes: booking.notes || '' });
    setShowStatusModal(true);
  };

  const handleCancel = (bookingId) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      cancelBookingMutation.mutate(bookingId);
    }
  };

  const openModal = (booking, type) => {
    setSelectedBooking(booking);
    setModalType(type);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBooking(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-500 text-lg">Error loading bookings</div>
        <p className="text-gray-600 mt-2">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage service bookings and appointments
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => openModal(null, 'add')}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Booking
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <form onSubmit={(e) => e.preventDefault()}>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search bookings..."
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
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div className="flex items-end">
            <button className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors w-full">
              <Filter className="h-4 w-4 mr-2" />
              Apply Filters
            </button>
          </div>
          </div>
        </form>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Booking Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer & Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Services
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Notes
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bookings?.bookings?.map((booking) => (
                <tr key={booking.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="font-medium">#{booking.id}</div>
                      <div className="flex items-center mt-1">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </div>
                      <div className="flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-1 text-gray-400" />
                        {booking.booking_time}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1 text-gray-400" />
                        {booking.customer_name}
                      </div>
                      <div className="flex items-center mt-1">
                        <Car className="h-4 w-4 mr-1 text-gray-400" />
                        {booking.vehicle_make} {booking.vehicle_model}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {booking.vehicle_registration}
                      </div>
                    </div>
                  </td>
                                     <td className="px-6 py-4">
                     <div className="text-sm text-gray-900">
                       {booking.services && Array.isArray(booking.services) && booking.services.length > 0 ? (
                         booking.services.map((service, index) => (
                           <div key={index} className="mb-1">
                             <span className="font-medium">{service.service_name}</span>
                             <span className="text-gray-500 ml-2">x{service.quantity}</span>
                           </div>
                         ))
                       ) : (
                         <span className="text-gray-500">No services</span>
                       )}
                     </div>
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div className="flex items-center">
                        <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                        ₹{booking.total_amount?.toLocaleString()}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(booking.status)}`}>
                      {booking.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">
                      {booking.notes ? (
                        <div className="max-w-xs truncate" title={booking.notes}>
                          {booking.notes}
                        </div>
                      ) : (
                        <span className="text-gray-400">No notes</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => openModal(booking, 'view')}
                        className="text-primary-600 hover:text-primary-900"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => openModal(booking, 'edit')}
                        className="text-blue-600 hover:text-blue-900"
                        title="Edit Booking"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      {user?.role === 'admin' && (
                        <button
                          onClick={() => openStatusModal(booking)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Update Status (Admin)"
                        >
                          <Settings className="h-4 w-4" />
                        </button>
                      )}
                      {booking.status === 'confirmed' && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'in_progress')}
                          className="text-yellow-600 hover:text-yellow-900"
                          title="Start Work"
                        >
                          <Clock className="h-4 w-4" />
                        </button>
                      )}
                      {booking.status === 'in_progress' && (
                        <button
                          onClick={() => handleStatusUpdate(booking.id, 'completed')}
                          className="text-green-600 hover:text-green-900"
                          title="Mark Complete"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {booking.status !== 'cancelled' && booking.status !== 'completed' && (
                        <button
                          onClick={() => handleCancel(booking.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Cancel Booking"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {(!bookings?.bookings || bookings.bookings.length === 0) && (
          <div className="text-center py-12">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings found</h3>
            <p className="mt-1 text-sm text-gray-500">
              Get started by creating your first booking.
            </p>
            <div className="mt-6">
              <button
                onClick={() => openModal(null, 'add')}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors"
              >
                <Plus className="h-4 w-4 mr-2" />
                New Booking
              </button>
            </div>
          </div>
        )}
      </div>

                           {/* Booking Modal */}
        {showModal && (
          <BookingModal
            booking={selectedBooking}
            type={modalType}
            onClose={closeModal}
            onSuccess={() => {
              queryClient.invalidateQueries('bookings');
              queryClient.invalidateQueries(['bookings', debouncedSearchTerm, selectedDate, statusFilter]);
              queryClient.refetchQueries(['bookings', debouncedSearchTerm, selectedDate, statusFilter]);
              closeModal();
            }}
            queryClient={queryClient}
            searchTerm={debouncedSearchTerm}
            selectedDate={selectedDate}
            statusFilter={statusFilter}
          />
        )}

        {/* Status Update Modal (Admin Only) */}
        {showStatusModal && selectedBooking && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Update Booking Status
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Booking #{selectedBooking.id}
                    </label>
                    <p className="text-sm text-gray-500">
                      Customer: {selectedBooking.customer_name}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Status
                    </label>
                    <select
                      value={statusUpdateData.status}
                      onChange={(e) => setStatusUpdateData({
                        ...statusUpdateData,
                        status: e.target.value
                      })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select Status</option>
                      <option value="pending">Pending</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="in_progress">In Progress</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (Optional)
                    </label>
                    <textarea
                      value={statusUpdateData.notes}
                      onChange={(e) => setStatusUpdateData({
                        ...statusUpdateData,
                        notes: e.target.value
                      })}
                      rows={3}
                      placeholder="Add any notes about this status update..."
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    onClick={() => {
                      setShowStatusModal(false);
                      setStatusUpdateData({ status: '', notes: '' });
                    }}
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAdminStatusUpdate}
                    disabled={!statusUpdateData.status || updateStatusMutation.isLoading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
                  >
                    {updateStatusMutation.isLoading ? 'Updating...' : 'Update Status'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

 // Booking Modal Component
 const BookingModal = ({ booking, type, onClose, onSuccess, queryClient, searchTerm, selectedDate, statusFilter }) => {
  const [formData, setFormData] = useState({
    customer_id: booking?.customer_id || '',
    vehicle_id: booking?.vehicle_id || '',
    booking_date: booking?.booking_date || '',
    booking_time: booking?.booking_time || '',
    services: booking?.services || [],
    notes: booking?.notes || ''
  });
  const [showVehicleModal, setShowVehicleModal] = useState(false);

  // Fetch customers for dropdown
  const { data: customersData } = useQuery(
    'customers',
    async () => {
      const response = await axios.get('/api/customers');
      return response.data;
    }
  );

  // Fetch vehicles for the selected customer
  const { data: vehiclesData } = useQuery(
    ['vehicles', formData.customer_id],
    async () => {
      if (!formData.customer_id) return { vehicles: [] };
      const response = await axios.get(`/api/customers/${formData.customer_id}`);
      return response.data;
    },
    {
      enabled: !!formData.customer_id
    }
  );

  // Fetch services for dropdown
  const { data: servicesData } = useQuery(
    'services',
    async () => {
      const response = await axios.get('/api/services');
      return response.data;
    }
  );

           const { mutate: saveBooking, isLoading } = useMutation(
      async (data) => {
        if (type === 'add') {
          const response = await axios.post('/api/bookings', data);
          return response.data;
        } else {
          const response = await axios.put(`/api/bookings/${booking.id}`, data);
          return response.data;
        }
      },
      {
        onSuccess: (data) => {
          toast.success(`Booking ${type === 'add' ? 'created' : 'updated'} successfully`);
          // Force refresh the bookings data with all possible query keys
          queryClient.invalidateQueries('bookings');
          queryClient.invalidateQueries(['bookings', searchTerm, selectedDate, statusFilter]);
          // Also refetch to ensure immediate update
          setTimeout(() => {
            queryClient.refetchQueries(['bookings', searchTerm, selectedDate, statusFilter]);
          }, 100);
          onSuccess();
        },
        onError: (error) => {
          const errorMessage = error.response?.data?.error || error.response?.data?.message || `Failed to ${type} booking`;
          const errorDetails = error.response?.data?.details;
          
          if (errorDetails) {
            toast.error(`${errorMessage}: ${errorDetails}`);
          } else {
            toast.error(errorMessage);
          }
          
          // Log detailed error for debugging
          console.error('Booking error:', error.response?.data);
        }
      }
    );

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate that at least one service is selected
    if (!formData.services || formData.services.length === 0) {
      toast.error('Please select at least one service');
      return;
    }
    
    // Validate that all selected services exist and are active
    const invalidServices = formData.services.filter(service => {
      const serviceData = servicesData?.data?.find(s => s.id === service.service_id);
      return !serviceData || !serviceData.is_active;
    });
    
    if (invalidServices.length > 0) {
      const invalidIds = invalidServices.map(s => s.service_id).join(', ');
      toast.error(`Invalid or inactive services detected (IDs: ${invalidIds}). Please refresh the page and try again.`);
      return;
    }
    
    saveBooking(formData);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
      // Reset vehicle selection when customer changes
      ...(name === 'customer_id' && { vehicle_id: '' })
    });
  };

  if (type === 'view') {
    return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
          <div className="mt-3">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Booking Details</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Booking ID</label>
                <p className="mt-1 text-sm text-gray-900">#{booking.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer</label>
                <p className="mt-1 text-sm text-gray-900">{booking.customer_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                <p className="mt-1 text-sm text-gray-900">
                  {booking.vehicle_make} {booking.vehicle_model}
                </p>
                <p className="text-xs text-gray-500">{booking.vehicle_registration}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Date & Time</label>
                <p className="mt-1 text-sm text-gray-900">
                  {new Date(booking.booking_date).toLocaleDateString()} at {booking.booking_time}
                </p>
              </div>
                             <div>
                 <label className="block text-sm font-medium text-gray-700">Services</label>
                 <div className="mt-1 space-y-1">
                   {booking.services && Array.isArray(booking.services) && booking.services.length > 0 ? (
                     booking.services.map((service, index) => (
                       <div key={index} className="text-sm text-gray-900">
                         {service.service_name} - ₹{service.price} x {service.quantity}
                       </div>
                     ))
                   ) : (
                     <span className="text-gray-500">No services</span>
                   )}
                 </div>
               </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Amount</label>
                <p className="mt-1 text-sm text-gray-900">₹{booking.total_amount?.toLocaleString()}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Status</label>
                <p className="mt-1 text-sm text-gray-900">{booking.status}</p>
              </div>
              {booking.notes && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <p className="mt-1 text-sm text-gray-900 bg-gray-50 p-2 rounded border">
                    {booking.notes}
                  </p>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={onClose}
                className="btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

           return (
      <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
        <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
         <div className="mt-3">
           <h3 className="text-lg font-medium text-gray-900 mb-4">
             {type === 'add' ? 'Create New Booking' : 'Edit Booking'}
           </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer</label>
              <select
                name="customer_id"
                value={formData.customer_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Select Customer</option>
                {customersData?.customers?.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.first_name} {customer.last_name} - {customer.phone}
                  </option>
                ))}
              </select>
            </div>
                                                   <div>
                <label className="block text-sm font-medium text-gray-700">Vehicle</label>
                <div className="flex gap-2">
                  <select
                    name="vehicle_id"
                    value={formData.vehicle_id}
                    onChange={handleChange}
                    required
                    disabled={!formData.customer_id}
                    className="w-2/3 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                  >
                    <option value="">Select Vehicle</option>
                    {vehiclesData?.vehicles?.map((vehicle) => (
                      <option key={vehicle.id} value={vehicle.id}>
                        {vehicle.brand} {vehicle.model} - {vehicle.vehicle_number}
                      </option>
                    ))}
                    {vehiclesData?.vehicles?.length === 0 && (
                      <option value="" disabled>No vehicles found for this customer</option>
                    )}
                  </select>
                  {formData.customer_id && (
                    <button
                      type="button"
                      onClick={() => setShowVehicleModal(true)}
                      className="w-1/3 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                    >
                      + Add Vehicle
                    </button>
                  )}
                </div>
              </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  name="booking_date"
                  value={formData.booking_date}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Time</label>
                <input
                  type="time"
                  name="booking_time"
                  value={formData.booking_time}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Services</label>
              <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                {servicesData?.data?.map((service) => (
                  <label key={service.id} className={`flex items-center space-x-3 ${!service.is_active ? 'opacity-50 cursor-not-allowed' : ''}`}>
                    <input
                      type="checkbox"
                      name="services"
                      value={service.id}
                      checked={formData.services.some(s => s.service_id === service.id)}
                      disabled={!service.is_active}
                      onChange={(e) => {
                        const serviceId = parseInt(e.target.value);
                        const isChecked = e.target.checked;
                        setFormData(prev => ({
                          ...prev,
                          services: isChecked 
                            ? [...prev.services, { service_id: serviceId, quantity: 1, price: service.base_price }]
                            : prev.services.filter(s => s.service_id !== serviceId)
                        }));
                      }}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded disabled:opacity-50"
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {service.name}
                        {!service.is_active && (
                          <span className="ml-2 text-xs text-red-600 bg-red-100 px-2 py-1 rounded">Inactive</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">₹{service.base_price}</div>
                    </div>
                    {formData.services.some(s => s.service_id === service.id) && (
                      <input
                        type="number"
                        min="1"
                        value={formData.services.find(s => s.service_id === service.id)?.quantity || 1}
                        onChange={(e) => {
                          const quantity = parseInt(e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            services: prev.services.map(s => 
                              s.service_id === service.id 
                                ? { ...s, quantity, price: service.base_price * quantity }
                                : s
                            )
                          }));
                        }}
                        className="w-16 h-8 text-sm border border-gray-300 rounded px-2"
                      />
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
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
                {isLoading ? 'Saving...' : type === 'add' ? 'Create Booking' : 'Update Booking'}
              </button>
            </div>
                     </form>
         </div>
       </div>

               {/* Vehicle Modal */}
        {showVehicleModal && (
          <VehicleModal
            customerId={formData.customer_id}
            onClose={() => setShowVehicleModal(false)}
            onSuccess={() => {
              setShowVehicleModal(false);
              // Invalidate the vehicles query to refresh the dropdown
              window.location.reload(); // Simple refresh for now
            }}
          />
        )}
     </div>
   );
 };

// Vehicle Modal Component
const VehicleModal = ({ customerId, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    brand: '',
    model: '',
    year: '',
    color: '',
    vehicle_number: '',
    vehicle_type: 'sedan'
  });

  const { mutate: saveVehicle, isLoading } = useMutation(
    async (data) => {
      await axios.post(`/api/customers/${customerId}/vehicles`, data);
    },
    {
      onSuccess: () => {
        toast.success('Vehicle added successfully');
        onSuccess();
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Failed to add vehicle');
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    saveVehicle(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-[60]">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Vehicle</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Brand</label>
              <input
                type="text"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Model</label>
              <input
                type="text"
                name="model"
                value={formData.model}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Year</label>
                <input
                  type="number"
                  name="year"
                  value={formData.year}
                  onChange={handleChange}
                  min="1900"
                  max={new Date().getFullYear() + 1}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Color</label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Vehicle Type</label>
              <select
                name="vehicle_type"
                value={formData.vehicle_type}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="hatchback">Hatchback</option>
                <option value="sedan">Sedan</option>
                <option value="suv">SUV</option>
                <option value="luxury">Luxury</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Registration Number</label>
              <input
                type="text"
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleChange}
                required
                className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-primary-500 focus:border-primary-500"
              />
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
                {isLoading ? 'Adding...' : 'Add Vehicle'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Bookings;
