import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { 
  LogOut, 
  User, 
  Calendar, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Camera,
  Upload,
  Eye,
  Car,
  Wrench,
  TrendingUp,
  Activity
} from 'lucide-react';

const StaffDashboard = () => {
  const [staffUser, setStaffUser] = useState(null);
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [showJobDetails, setShowJobDetails] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [photoType, setPhotoType] = useState('before');
  const [photoFile, setPhotoFile] = useState(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('staffUser'));
    if (!user) {
      navigate('/staff/login');
      return;
    }
    setStaffUser(user);

    // Set up axios interceptor for staff token
    axios.interceptors.request.use((config) => {
      const token = localStorage.getItem('staffToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }, [navigate]);

  // Fetch assigned job cards
  const { data: jobCardsData, isLoading } = useQuery(
    ['staffJobCards', staffUser?.staffId],
    async () => {
      if (!staffUser?.staffId) return { jobCards: [] };
      const response = await axios.get(`/api/staff/${staffUser.staffId}/job-cards`);
      return response.data;
    },
    {
      enabled: !!staffUser?.staffId,
      refetchInterval: 30000 // Refresh every 30 seconds
    }
  );

  // Fetch staff performance stats
  const { data: performanceData } = useQuery(
    ['staffPerformance', staffUser?.staffId],
    async () => {
      if (!staffUser?.staffId) return null;
      const response = await axios.get(`/api/staff/${staffUser.staffId}/performance`);
      return response.data;
    },
    {
      enabled: !!staffUser?.staffId
    }
  );

  // Update job card status
  const updateStatusMutation = useMutation(
    async ({ jobCardId, status, notes }) => {
      await axios.put(`/api/job-cards/${jobCardId}/status`, { status, notes });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['staffJobCards', staffUser?.staffId]);
        queryClient.invalidateQueries(['staffPerformance', staffUser?.staffId]);
        toast.success('Job status updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update job status');
      }
    }
  );

  // Upload photo
  const uploadPhotoMutation = useMutation(
    async ({ jobCardId, photoType, file }) => {
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('photo_type', photoType);
      
      await axios.post(`/api/job-cards/${jobCardId}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['staffJobCards', staffUser?.staffId]);
        setShowPhotoUpload(false);
        setPhotoFile(null);
        toast.success('Photo uploaded successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to upload photo');
      }
    }
  );

  const handleLogout = () => {
    localStorage.removeItem('staffToken');
    localStorage.removeItem('staffUser');
    navigate('/staff/login');
  };

  const handleStatusUpdate = (jobCardId, newStatus) => {
    const notes = prompt('Add any notes about this status update (optional):');
    updateStatusMutation.mutate({ jobCardId, status: newStatus, notes });
  };

  const handlePhotoUpload = (jobCardId) => {
    if (!photoFile) {
      toast.error('Please select a photo');
      return;
    }
    uploadPhotoMutation.mutate({ jobCardId, photoType, file: photoFile });
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'qc_check': return 'bg-purple-100 text-purple-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!staffUser) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <Wrench className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">Staff Portal</h1>
                <p className="text-sm text-gray-500">
                  Welcome, {staffUser.firstName} {staffUser.lastName} ({staffUser.position})
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Performance Stats */}
        {performanceData && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Activity className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Jobs</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {performanceData.performance.totalJobs}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {performanceData.performance.completedJobs}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-purple-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completion Rate</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {performanceData.performance.completionRate}%
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Avg Time</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {Math.round(performanceData.performance.avgCompletionTime || 0)}m
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job Cards */}
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">My Job Cards</h2>
          </div>
          
          {isLoading ? (
            <div className="p-6 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Job Details
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer & Vehicle
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
                  {jobCardsData?.jobCards?.map((jobCard) => (
                    <tr key={jobCard.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">Job #{jobCard.id}</div>
                          <div className="flex items-center mt-1">
                            <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                            {new Date(jobCard.booking_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center mt-1">
                            <Clock className="h-4 w-4 mr-1 text-gray-400" />
                            {jobCard.booking_time}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1 text-gray-400" />
                            {jobCard.customer_name}
                          </div>
                          <div className="flex items-center mt-1">
                            <Car className="h-4 w-4 mr-1 text-gray-400" />
                            {jobCard.vehicle_brand} {jobCard.vehicle_model}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {jobCard.vehicle_number}
                          </div>
                        </div>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(jobCard.status)}`}>
                          {jobCard.status.replace('_', ' ')}
                        </span>
                      </td>
                      
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setSelectedJobCard(jobCard);
                              setShowJobDetails(true);
                            }}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          
                          <button
                            onClick={() => {
                              setSelectedJobCard(jobCard);
                              setShowPhotoUpload(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Upload Photo"
                          >
                            <Camera className="h-4 w-4" />
                          </button>
                          
                          {jobCard.status === 'assigned' && (
                            <button
                              onClick={() => handleStatusUpdate(jobCard.id, 'in_progress')}
                              className="text-yellow-600 hover:text-yellow-900"
                              title="Start Work"
                            >
                              <Clock className="h-4 w-4" />
                            </button>
                          )}
                          
                          {jobCard.status === 'in_progress' && (
                            <button
                              onClick={() => handleStatusUpdate(jobCard.id, 'qc_check')}
                              className="text-purple-600 hover:text-purple-900"
                              title="Ready for QC"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </button>
                          )}
                          
                          {jobCard.status === 'qc_check' && (
                            <button
                              onClick={() => handleStatusUpdate(jobCard.id, 'completed')}
                              className="text-green-600 hover:text-green-900"
                              title="Mark Complete"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {(!jobCardsData?.jobCards || jobCardsData.jobCards.length === 0) && (
                <div className="text-center py-12">
                  <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No job cards assigned</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    You don't have any job cards assigned to you at the moment.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Job Details Modal */}
      {showJobDetails && selectedJobCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Job Details - #{selectedJobCard.id}
              </h3>
              <button
                onClick={() => setShowJobDetails(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedJobCard.customer_name}</p>
                  <p><span className="font-medium">Phone:</span> {selectedJobCard.customer_phone}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Vehicle Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Vehicle:</span> {selectedJobCard.vehicle_brand} {selectedJobCard.vehicle_model}</p>
                  <p><span className="font-medium">Number:</span> {selectedJobCard.vehicle_number}</p>
                  <p><span className="font-medium">Color:</span> {selectedJobCard.vehicle_color}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <h4 className="font-medium text-gray-900 mb-3">Services</h4>
              <div className="space-y-2 text-sm">
                {selectedJobCard.services && selectedJobCard.services.map((service, index) => (
                  <div key={index} className="flex justify-between">
                    <span>{service.service_name}</span>
                    <span className="text-gray-500">₹{service.price} x {service.quantity}</span>
                  </div>
                ))}
              </div>
            </div>
            
            {selectedJobCard.notes && (
              <div className="mt-6">
                <h4 className="font-medium text-gray-900 mb-3">Notes</h4>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded border">
                  {selectedJobCard.notes}
                </p>
              </div>
            )}
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowJobDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Upload Modal */}
      {showPhotoUpload && selectedJobCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Photo</h3>
              <button
                onClick={() => setShowPhotoUpload(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Photo Type</label>
                <select
                  value={photoType}
                  onChange={(e) => setPhotoType(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="before">Before</option>
                  <option value="during">During</option>
                  <option value="after">After</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Photo</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files[0])}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowPhotoUpload(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePhotoUpload(selectedJobCard.id)}
                disabled={!photoFile || uploadPhotoMutation.isLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {uploadPhotoMutation.isLoading ? 'Uploading...' : 'Upload Photo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StaffDashboard;
