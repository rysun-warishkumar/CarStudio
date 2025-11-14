import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';

const ServicesPage = () => {
  const [showBooking, setShowBooking] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [bookingData, setBookingData] = useState({ 
    name: '', 
    phone: '', 
    date: '', 
    time: '',
    // Vehicle information fields
    vehicle_number: '',
    vehicle_brand: '',
    vehicle_model: '',
    vehicle_type: 'sedan',
    vehicle_color: '',
    vehicle_year: ''
  });
  const [bookingStatus, setBookingStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Fetch services
  const { data: services, isLoading: loadingServices, error: errorServices } = useQuery('services', async () => {
    const res = await axios.get('/api/services');
    return res.data;
  });

  // Fetch packages
  const { data: packages, isLoading: loadingPackages, error: errorPackages } = useQuery('packages', async () => {
    const res = await axios.get('/api/services/packages/all');
    return res.data;
  });

  // Fetch categories
  const { data: categories, isLoading: loadingCategories, error: errorCategories } = useQuery('categories', async () => {
    const res = await axios.get('/api/services/categories');
    return res.data;
  });

  if (loadingServices || loadingPackages || loadingCategories) return <div className="text-center py-20">Loading...</div>;
  if (errorServices || errorPackages || errorCategories) return <div className="text-center py-20 text-red-600">Failed to load data.</div>;

  // Flatten data if API returns { data: [...] }
  const categoryList = categories?.data || categories || [];
  const serviceList = services?.data || services || [];
  const packageList = packages?.data || packages || [];

  // Handle booking modal open
  const handleBookNow = (service) => {
    setSelectedService(service);
    setShowBooking(true);
    setBookingStatus(null);
    setBookingData({ 
      name: '', 
      phone: '', 
      date: '', 
      time: '',
      vehicle_number: '',
      vehicle_brand: '',
      vehicle_model: '',
      vehicle_type: 'sedan',
      vehicle_color: '',
      vehicle_year: ''
    });
  };

  // Handle booking form submit (now connected to backend)
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setBookingStatus(null);
    try {
      await axios.post('/api/bookings/public', {
        name: bookingData.name,
        phone: bookingData.phone,
        date: bookingData.date,
        time: bookingData.time,
        service_id: selectedService?.id,
        // Vehicle information
        vehicle_number: bookingData.vehicle_number,
        vehicle_brand: bookingData.vehicle_brand,
        vehicle_model: bookingData.vehicle_model,
        vehicle_type: bookingData.vehicle_type,
        vehicle_color: bookingData.vehicle_color,
        vehicle_year: bookingData.vehicle_year
      });
      setBookingStatus('success');
      setShowBooking(false);
    } catch (err) {
      setBookingStatus('error');
      console.error('Booking error:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 text-center text-white">Our Services & Packages</h1>

      {/* Categories Section */}
      <div className="mb-12">
        <h2 className="text-2xl font-semibold mb-4 text-white">Categories</h2>
        <div className="flex flex-wrap gap-4">
          {categoryList.length > 0 ? categoryList.map(cat => (
            <span key={cat.id} className="bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium shadow hover:bg-blue-700 transition-colors">{cat.name}</span>
          )) : <span className="text-gray-400">No categories found.</span>}
        </div>
      </div>

      {/* Services Section */}
      <div className="mb-16">
        <h2 className="text-2xl font-semibold mb-4 text-white">Services</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceList.length > 0 ? serviceList.map(service => (
            <div key={service.id} className="bg-gray-800 rounded-lg shadow-lg p-6 hover:scale-105 transition-transform duration-300 flex flex-col border border-gray-700">
              <img 
              src={service.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDxyZWN0IHg9IjUwIiB5PSIxMDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZTVlN2ViIiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2YjcyODAiPlNlcnZpY2UgSW1hZ2U8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIxODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzljYTNhZiI+Tm8gaW1hZ2UgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4='} 
              alt={service.name} 
              className="w-full h-40 object-cover rounded-md mb-4"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDxyZWN0IHg9IjUwIiB5PSIxMDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZTVlN2ViIiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2YjcyODAiPlNlcnZpY2UgSW1hZ2U8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIxODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzljYTNhZiI+Tm8gaW1hZ2UgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4=';
                e.target.onerror = null;
              }}
            />
              <h3 className="text-xl font-semibold mb-2 text-white">{service.name}</h3>
              <p className="text-gray-300 mb-2">{service.description}</p>
              <div className="flex justify-between items-center mt-4">
                <span className="text-blue-400 font-bold text-lg">₹{service.price || service.base_price}</span>
                <span className="text-gray-400 text-sm">{service.duration || service.duration_minutes} min</span>
                <span className="text-gray-500 text-xs">{service.category_name}</span>
              </div>
              <button
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded shadow transition-colors hoverable"
                onClick={() => handleBookNow(service)}
              >
                Book Now
              </button>
            </div>
          )) : <div className="col-span-3 text-center text-gray-400">No services available.</div>}
        </div>
      </div>

      {/* Booking Modal */}
      {showBooking && selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60">
          <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto border border-gray-700">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-white text-2xl transition-colors" onClick={() => setShowBooking(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4 text-white">Book: {selectedService.name}</h2>
            {bookingStatus === 'success' ? (
              <div className="text-green-400 font-semibold text-center py-8">Booking request submitted!<br/>We will contact you soon.</div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {/* Customer Information */}
                <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-white mb-3">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Your Name"
                      value={bookingData.name}
                      onChange={e => setBookingData({ ...bookingData, name: e.target.value })}
                      required
                    />
                    <input
                      type="tel"
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Phone Number"
                      value={bookingData.phone}
                      onChange={e => setBookingData({ ...bookingData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Booking Details */}
                <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-white mb-3">Booking Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="date"
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bookingData.date}
                      onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                      required
                    />
                    <input
                      type="time"
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bookingData.time}
                      onChange={e => setBookingData({ ...bookingData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-gray-700 p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-white mb-3">Vehicle Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Vehicle Number (e.g., GJ01AB1234)"
                      value={bookingData.vehicle_number}
                      onChange={e => setBookingData({ ...bookingData, vehicle_number: e.target.value })}
                      required
                    />
                    <select
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bookingData.vehicle_type}
                      onChange={e => setBookingData({ ...bookingData, vehicle_type: e.target.value })}
                      required
                    >
                      <option value="hatchback">Hatchback</option>
                      <option value="sedan">Sedan</option>
                      <option value="suv">SUV</option>
                      <option value="luxury">Luxury</option>
                      <option value="commercial">Commercial</option>
                    </select>
                    <input
                      type="text"
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Brand (e.g., Honda, Toyota)"
                      value={bookingData.vehicle_brand}
                      onChange={e => setBookingData({ ...bookingData, vehicle_brand: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Model (e.g., City, Fortuner)"
                      value={bookingData.vehicle_model}
                      onChange={e => setBookingData({ ...bookingData, vehicle_model: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Color"
                      value={bookingData.vehicle_color}
                      onChange={e => setBookingData({ ...bookingData, vehicle_color: e.target.value })}
                    />
                    <input
                      type="number"
                      className="w-full border border-gray-600 bg-gray-800 text-white rounded px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Year (e.g., 2020)"
                      value={bookingData.vehicle_year}
                      onChange={e => setBookingData({ ...bookingData, vehicle_year: e.target.value })}
                      min="1900"
                      max={new Date().getFullYear() + 1}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded transition-colors hoverable"
                  disabled={submitting}
                >
                  {submitting ? 'Booking...' : 'Submit Booking'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Packages Section */}
      <div>
        <h2 className="text-2xl font-semibold mb-4 text-white">Packages</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {packageList.length > 0 ? packageList.map(pkg => (
            <div key={pkg.id} className="bg-gray-800 rounded-lg shadow-lg p-6 hover:scale-105 transition-transform duration-300 border border-gray-700">
              <img 
              src={pkg.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDxyZWN0IHg9IjUwIiB5PSIxMDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZTVlN2ViIiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2YjcyODAiPlBhY2thZ2UgSW1hZ2U8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIxODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzljYTNhZiI+Tm8gaW1hZ2UgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4='} 
              alt={pkg.name} 
              className="w-full h-40 object-cover rounded-md mb-4"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDxyZWN0IHg9IjUwIiB5PSIxMDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZTVlN2ViIiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2YjcyODAiPlBhY2thZ2UgSW1hZ2U8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIxODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzljYTNhZiI+Tm8gaW1hZ2UgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4=';
                e.target.onerror = null;
              }}
            />
              <h3 className="text-xl font-semibold mb-2 text-white">{pkg.name}</h3>
              <p className="text-gray-300 mb-2">{pkg.description}</p>
              <div className="mb-2">
                <span className="font-medium text-white">Includes:</span>
                <ul className="list-disc list-inside text-gray-400 text-sm">
                  {pkg.services && pkg.services.map((srv, idx) => (
                    <li key={idx}>{srv.service_name || srv.name}</li>
                  ))}
                </ul>
              </div>
              <div className="flex justify-between items-center mt-4">
                <span className="text-blue-400 font-bold text-lg">₹{pkg.price}</span>
              </div>
            </div>
          )) : <div className="col-span-3 text-center text-gray-400">No packages available.</div>}
        </div>
      </div>
    </div>
  );
};

export default ServicesPage;
