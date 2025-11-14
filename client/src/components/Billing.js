import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { toast } from 'react-hot-toast';
import { 
  CreditCard, 
  DollarSign, 
  FileText,
  Search,
  Filter,
  Eye,
  Download,
  Printer,
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Receipt,
  Banknote,
  Smartphone,
  CreditCard as CardIcon,
  Building
} from 'lucide-react';
import axios from 'axios';

const Billing = () => {
  const [filters, setFilters] = useState({
    payment_status: '',
    date_from: '',
    date_to: '',
    search: ''
  });
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const queryClient = useQueryClient();

  // Fetch invoices
  const { data: invoicesData, isLoading } = useQuery(
    ['invoices', currentPage, filters],
    async () => {
      const params = new URLSearchParams({
        page: currentPage,
        limit: 10,
        ...filters
      });
      const response = await axios.get(`/api/billing?${params}`);
      return response.data;
    }
  );

  // Fetch billing statistics
  const { data: statsData } = useQuery(
    'billingStats',
    async () => {
      const response = await axios.get('/api/billing/stats/overview');
      return response.data;
    }
  );

  // Fetch outstanding invoices
  const { data: outstandingData } = useQuery(
    'outstandingInvoices',
    async () => {
      const response = await axios.get('/api/billing/outstanding/list');
      return response.data;
    }
  );

  // Update payment status
  const updatePaymentMutation = useMutation(
    async ({ id, paymentData }) => {
      const response = await axios.put(`/api/billing/${id}/payment`, paymentData);
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices');
        queryClient.invalidateQueries('billingStats');
        queryClient.invalidateQueries('outstandingInvoices');
        setShowPaymentModal(false);
        toast.success('Payment updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update payment');
      }
    }
  );

  // Generate invoice
  const generateInvoiceMutation = useMutation(
    async (bookingId) => {
      const response = await axios.post('/api/billing/generate-invoice', { booking_id: bookingId });
      return response.data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries('invoices');
        queryClient.invalidateQueries('billingStats');
        toast.success('Invoice generated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to generate invoice');
      }
    }
  );

  const handlePaymentUpdate = (invoiceId, paymentData) => {
    updatePaymentMutation.mutate({ id: invoiceId, paymentData });
  };

  const getPaymentStatusColor = (status) => {
    switch (status) {
      case 'paid': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'partial': return 'bg-blue-100 text-blue-800';
      case 'refunded': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPaymentMethodIcon = (method) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CardIcon className="h-4 w-4" />;
      case 'upi': return <Smartphone className="h-4 w-4" />;
      case 'bank_transfer': return <Building className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing & Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Generate invoices, process payments, and manage billing
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
          >
            <Plus className="h-4 w-4 mr-2" />
            Record Payment
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      {statsData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Receipt className="h-8 w-8 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Invoices</p>
                <p className="text-2xl font-semibold text-gray-900">{statsData.stats.totalInvoices}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <DollarSign className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Billed</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(statsData.stats.totalBilled)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Paid</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(statsData.stats.totalPaid)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Outstanding</p>
                <p className="text-2xl font-semibold text-gray-900">{formatCurrency(statsData.stats.outstandingAmount)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Outstanding Invoices Alert */}
      {outstandingData?.outstandingInvoices?.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">
                Outstanding Invoices ({outstandingData.outstandingInvoices.length})
              </h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Total outstanding amount: {formatCurrency(outstandingData.outstandingInvoices.reduce((sum, inv) => sum + parseFloat(inv.outstanding_amount), 0))}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <select
              value={filters.payment_status}
              onChange={(e) => setFilters({ ...filters, payment_status: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="partial">Partial</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
            <input
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search invoices..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                className="w-full pl-10 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Invoices</h3>
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
                    Invoice
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer & Vehicle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Payment Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoicesData?.invoices?.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.invoice_number}
                      </div>
                      <div className="text-sm text-gray-500">
                        Booking #{invoice.booking_id}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.first_name} {invoice.last_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {invoice.vehicle_number} • {invoice.brand} {invoice.model}
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatCurrency(invoice.total_amount)}
                      </div>
                      {invoice.payment_status === 'partial' && (
                        <div className="text-sm text-gray-500">
                          Paid: {formatCurrency(invoice.paid_amount || 0)}
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPaymentStatusColor(invoice.payment_status)}`}>
                        {invoice.payment_status}
                      </span>
                      {invoice.payment_method && (
                        <div className="mt-1 text-xs text-gray-500">
                          {getPaymentMethodIcon(invoice.payment_method)}
                          <span className="ml-1">{invoice.payment_method}</span>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div>{new Date(invoice.billing_date).toLocaleDateString()}</div>
                      <div>{invoice.billing_date && new Date(invoice.billing_date).toLocaleTimeString()}</div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {
                            setSelectedInvoice(invoice);
                            setShowDetails(true);
                          }}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {invoice.payment_status !== 'paid' && (
                          <button
                            onClick={() => {
                              setSelectedInvoice(invoice);
                              setShowPaymentModal(true);
                            }}
                            className="text-green-600 hover:text-green-900"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => {
                            // Handle download invoice
                            toast.success('Invoice download started');
                          }}
                          className="text-purple-600 hover:text-purple-900"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            // Handle print invoice
                            toast.success('Printing invoice...');
                          }}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <Printer className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination */}
        {invoicesData?.pagination && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((invoicesData.pagination.current - 1) * 10) + 1} to{' '}
                {Math.min(invoicesData.pagination.current * 10, invoicesData.pagination.total)} of{' '}
                {invoicesData.pagination.total} results
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
                  disabled={currentPage === invoicesData.pagination.pages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {showDetails && selectedInvoice && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                Invoice Details - {selectedInvoice.invoice_number}
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
                <h4 className="font-medium text-gray-900 mb-3">Invoice Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Invoice Number:</span> {selectedInvoice.invoice_number}</p>
                  <p><span className="font-medium">Booking ID:</span> {selectedInvoice.booking_id}</p>
                  <p><span className="font-medium">Date:</span> {new Date(selectedInvoice.billing_date).toLocaleDateString()}</p>
                  <p><span className="font-medium">Status:</span> 
                    <span className={`ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(selectedInvoice.payment_status)}`}>
                      {selectedInvoice.payment_status}
                    </span>
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Name:</span> {selectedInvoice.first_name} {selectedInvoice.last_name}</p>
                  <p><span className="font-medium">Phone:</span> {selectedInvoice.phone}</p>
                  <p><span className="font-medium">Vehicle:</span> {selectedInvoice.vehicle_number}</p>
                  <p><span className="font-medium">Model:</span> {selectedInvoice.brand} {selectedInvoice.model}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Payment Details</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Subtotal:</span> {formatCurrency(selectedInvoice.subtotal)}</p>
                  <p><span className="font-medium">Tax (GST):</span> {formatCurrency(selectedInvoice.tax_amount)}</p>
                  <p><span className="font-medium">Total Amount:</span> {formatCurrency(selectedInvoice.total_amount)}</p>
                  <p><span className="font-medium">Paid Amount:</span> {formatCurrency(selectedInvoice.paid_amount || 0)}</p>
                  {selectedInvoice.payment_method && (
                    <p><span className="font-medium">Payment Method:</span> {selectedInvoice.payment_method}</p>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium text-gray-900 mb-3">Booking Details</h4>
                <div className="space-y-2 text-sm">
                  <p><span className="font-medium">Booking Date:</span> {new Date(selectedInvoice.booking_date).toLocaleDateString()}</p>
                  <p><span className="font-medium">Booking Time:</span> {selectedInvoice.booking_time}</p>
                  <p><span className="font-medium">Notes:</span> {selectedInvoice.booking_notes || 'No notes'}</p>
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
              <button
                onClick={() => {
                  // Handle download
                  toast.success('Invoice download started');
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Download
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {selectedInvoice ? `Record Payment - ${selectedInvoice.invoice_number}` : 'Record Payment'}
              </h3>
              <button
                onClick={() => setShowPaymentModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <span className="sr-only">Close</span>
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const paymentData = {
                payment_method: formData.get('payment_method'),
                paid_amount: parseFloat(formData.get('paid_amount')),
                notes: formData.get('notes')
              };
              
              if (selectedInvoice) {
                handlePaymentUpdate(selectedInvoice.id, paymentData);
              }
            }}>
              <div className="space-y-4">
                {selectedInvoice && (
                  <div className="bg-gray-50 p-3 rounded-md">
                    <p className="text-sm text-gray-600">Invoice: {selectedInvoice.invoice_number}</p>
                    <p className="text-sm text-gray-600">Total: {formatCurrency(selectedInvoice.total_amount)}</p>
                    <p className="text-sm text-gray-600">Outstanding: {formatCurrency(selectedInvoice.total_amount - (selectedInvoice.paid_amount || 0))}</p>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
                  <select
                    name="payment_method"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Payment Method</option>
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Amount Paid</label>
                  <input
                    type="number"
                    name="paid_amount"
                    step="0.01"
                    min="0"
                    required
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
                  <textarea
                    name="notes"
                    rows="3"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Payment notes..."
                  ></textarea>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Billing;
