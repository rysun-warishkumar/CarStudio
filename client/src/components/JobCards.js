import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { 
  FileText, 
  CheckCircle, 
  Clock, 
  User, 
  Camera, 
  Filter,
  Search,
  Plus,
  Eye,
  Edit,
  Trash2,
  Download,
  Upload,
  AlertCircle,
  Calendar,
  MapPin,
  Phone,
  Car
} from 'lucide-react';
import axios from 'axios';

const JobCards = () => {
  const [filters, setFilters] = useState({
    status: '',
    technician_id: '',
    date: '',
    search: ''
  });
  const [selectedJobCard, setSelectedJobCard] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch job cards
  const { data: jobCardsData, isLoading } = useQuery(
    ['jobCards', currentPage, filters],
    async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...filters
      });
      const response = await axios.get(`/api/job-cards?${params}`);
      return response.data;
    }
  );

  // Fetch technicians for assignment
  const { data: techniciansData } = useQuery(
    'technicians',
    async () => {
      const response = await axios.get('/api/staff/technicians/available');
      return response.data;
    }
  );

  // Fetch job card statistics
  const { data: statsData } = useQuery(
    'jobCardStats',
    async () => {
      const response = await axios.get('/api/job-cards/stats/overview');
      return response.data;
    }
  );

  // Update job card status
  const updateStatusMutation = useMutation(
    async ({ id, status, notes }) => {
      const response = await axios.put(`/api/job-cards/${id}/status`, {
        status,
        notes
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('jobCards');
        queryClient.invalidateQueries('jobCardStats');
        toast.success('Job card status updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update status');
      }
    }
  );

  // Assign technician
  const assignTechnicianMutation = useMutation(
    async ({ jobCardId, technicianId }) => {
      const response = await axios.put(`/api/job-cards/${jobCardId}/assign`, {
        technician_id: technicianId
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('jobCards');
        setShowAssignModal(false);
        toast.success('Technician assigned successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to assign technician');
      }
    }
  );

  // Upload photo
  const uploadPhotoMutation = useMutation(
    async ({ jobCardId, photoType, photoFile }) => {
      const formData = new FormData();
      formData.append('photo', photoFile);
      formData.append('photo_type', photoType);
      
      const response = await axios.post(`/api/job-cards/${jobCardId}/photos`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('jobCards');
        setShowPhotoModal(false);
        toast.success('Photo uploaded successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to upload photo');
      }
    }
  );

  const handleStatusUpdate = (jobCardId, newStatus) => {
    updateStatusMutation.mutate({
      id: jobCardId,
      status: newStatus,
      notes: `Status changed to ${newStatus}`
    });
  };

  const handleAssignTechnician = (jobCardId, technicianId) => {
    assignTechnicianMutation.mutate({
      jobCardId,
      technicianId
    });
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'assigned': return <Clock className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'qc_check': return <AlertCircle className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Cards</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage work orders, track progress, and handle quality control
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowPhotoModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            <Upload className="h-4 w-4 mr-2" />
            Upload Photos
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Job Cards</p>
                <p className="text-2xl font-semibold text-gray-900">{statsData.stats.totalJobCards}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">In Progress</p>
                <p className="text-2xl font-semibold text-gray-900">{statsData.stats.inProgressJobs}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Completed Today</p>
                <p className="text-2xl font-semibold text-gray-900">{statsData.stats.todayCompleted}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <User className="h-8 w-8 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Assigned Jobs</p>
                <p className="text-2xl font-semibold text-gray-900">{statsData.stats.assignedJobs}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="qc_check">QC Check</option>
              <option value="completed">Completed</option>
              <option value="delivered">Delivered</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Technician</label>
            <select
              value={filters.technician_id}
              onChange={(e) => setFilters({ ...filters, technician_id: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Technicians</option>
              {techniciansData?.technicians?.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.first_name} {tech.last_name}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters({ ...filters, date: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search customer, vehicle..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Job Cards List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Job Cards</h3>
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
                    Job Card
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer & Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Technician
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
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
                      <div className="text-sm font-medium text-gray-900">
                        JC-{jobCard.id.toString().padStart(4, '0')}
                      </div>
                      <div className="text-sm text-gray-500">
                        ₹{jobCard.total_amount}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          <Car className="h-10 w-10 text-gray-400" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {jobCard.first_name} {jobCard.last_name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {jobCard.vehicle_number} • {jobCard.brand} {jobCard.model}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {jobCard.technician_first_name ? (
                        <div className="text-sm text-gray-900">
                          {jobCard.technician_first_name} {jobCard.technician_last_name}
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedJobCard(jobCard);
                            setShowAssignModal(true);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Assign Technician
                        </button>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(jobCard.status)}`}>
                        {getStatusIcon(jobCard.status)}
                        <span className="ml-1">{jobCard.status.replace('_', ' ')}</span>
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(jobCard.booking_date).toLocaleDateString()}</div>
                      <div>{jobCard.booking_time}</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedJobCard(jobCard);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            setSelectedJobCard(jobCard);
                            setShowPhotoModal(true);
                          }}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Camera className="h-4 w-4" />
                        </button>
                        {jobCard.status !== 'delivered' && (
                          <select
                            value=""
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusUpdate(jobCard.id, e.target.value);
                              }
                            }}
                            className="text-sm border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Update Status</option>
                            {jobCard.status === 'assigned' && <option value="in_progress">Start Work</option>}
                            {jobCard.status === 'in_progress' && <option value="qc_check">Send to QC</option>}
                            {jobCard.status === 'qc_check' && <option value="completed">Complete</option>}
                            {jobCard.status === 'completed' && <option value="delivered">Deliver</option>}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {jobCardsData?.pagination && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((jobCardsData.pagination.current - 1) * 10) + 1} to{' '}
                {Math.min(jobCardsData.pagination.current * 10, jobCardsData.pagination.total)} of{' '}
                {jobCardsData.pagination.total} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Previous
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === jobCardsData.pagination.pages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Job Card Details Modal */}
      {showDetails && selectedJobCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Job Card Details - JC-{selectedJobCard.id.toString().padStart(4, '0')}
              </h3>
              <button
                onClick={() => setShowDetails(false)}
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
                  <p><span className="font-medium">Name:</span> {selectedJobCard.first_name} {selectedJobCard.last_name}</p>
                  <p><span className="font-medium">Phone:</span> {selectedJobCard.phone}</p>
                  <p><span className="font-medium">Email:</span> {selectedJobCard.email}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Vehicle Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Number:</span> {selectedJobCard.vehicle_number}</p>
                  <p><span className="font-medium">Brand:</span> {selectedJobCard.brand}</p>
                  <p><span className="font-medium">Model:</span> {selectedJobCard.model}</p>
                  <p><span className="font-medium">Type:</span> {selectedJobCard.vehicle_type}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Booking Details</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Date:</span> {new Date(selectedJobCard.booking_date).toLocaleDateString()}</p>
                  <p><span className="font-medium">Time:</span> {selectedJobCard.booking_time}</p>
                  <p><span className="font-medium">Total Amount:</span> ₹{selectedJobCard.total_amount}</p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedJobCard.status)}`}>
                      {selectedJobCard.status.replace('_', ' ')}
                    </span>
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Technician</h4>
                <div className="space-y-2 text-sm">
                  {selectedJobCard.technician_first_name ? (
                    <>
                      <p><span className="font-medium">Name:</span> {selectedJobCard.technician_first_name} {selectedJobCard.technician_last_name}</p>
                      <p><span className="font-medium">Phone:</span> {selectedJobCard.technician_phone}</p>
                    </>
                  ) : (
                    <p className="text-gray-500">No technician assigned</p>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setShowDetails(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Technician Modal */}
      {showAssignModal && selectedJobCard && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assign Technician</h3>
              <button
                onClick={() => setShowAssignModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Technician</label>
              <select
                id="technician-select"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose a technician</option>
                {techniciansData?.technicians?.map((tech) => (
                  <option key={tech.id} value={tech.id}>
                    {tech.first_name} {tech.last_name} ({tech.active_jobs} active jobs)
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const technicianId = document.getElementById('technician-select').value;
                  if (technicianId) {
                    handleAssignTechnician(selectedJobCard.id, technicianId);
                  }
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Photo Modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Upload Photo</h3>
              <button
                onClick={() => setShowPhotoModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Photo Type</label>
              <select
                id="photo-type"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="before">Before</option>
                <option value="during">During</option>
                <option value="after">After</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Photo</label>
              <input
                type="file"
                id="photo-file"
                accept="image/*"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowPhotoModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const photoType = document.getElementById('photo-type').value;
                  const photoFile = document.getElementById('photo-file').files[0];
                  if (photoFile && selectedJobCard) {
                    uploadPhotoMutation.mutate({
                      jobCardId: selectedJobCard.id,
                      photoType,
                      photoFile
                    });
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
              >
                Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobCards;
