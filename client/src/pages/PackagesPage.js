import React, { useState } from 'react';
import { useQuery } from 'react-query';
import axios from 'axios';

const PackagesPage = () => {
  const [showBooking, setShowBooking] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);
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

  const { data: packages, isLoading, error } = useQuery('packages', async () => {
    const res = await axios.get('/api/services/packages/all');
    return res.data;
  });

  if (isLoading) return <div className="text-center py-20">Loading packages...</div>;
  if (error) return <div className="text-center py-20 text-red-600">Failed to load packages.</div>;

  // Handle booking modal open
  const handleBookNow = (pkg) => {
    setSelectedPackage(pkg);
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

  // Handle booking form submit
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setBookingStatus(null);
    try {
      // For packages, we'll create a booking with the first service in the package
      // You might want to modify this based on your business logic
      const firstService = selectedPackage.services && selectedPackage.services.length > 0 ? selectedPackage.services[0] : null;
      
      if (!firstService || !firstService.id) {
        throw new Error('Package has no valid services');
      }

      await axios.post('/api/bookings/public', {
        name: bookingData.name,
        phone: bookingData.phone,
        date: bookingData.date,
        time: bookingData.time,
        service_id: firstService.id,
        // Vehicle information
        vehicle_number: bookingData.vehicle_number,
        vehicle_brand: bookingData.vehicle_brand,
        vehicle_model: bookingData.vehicle_model,
        vehicle_type: bookingData.vehicle_type,
        vehicle_color: bookingData.vehicle_color,
        vehicle_year: bookingData.vehicle_year,
        // Package information
        package_id: selectedPackage.id,
        package_name: selectedPackage.name
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
    <div className="max-w-7xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-8 text-center">Our Packages</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {packages && packages.length > 0 ? packages.map(pkg => (
          <div key={pkg.id} className="bg-white rounded-lg shadow-lg p-6 hover:scale-105 transition-transform duration-300">
            <img 
              src={pkg.image_url || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDxyZWN0IHg9IjUwIiB5PSIxMDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZTVlN2ViIiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2YjcyODAiPlBhY2thZ2UgSW1hZ2U8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIxODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzljYTNhZiI+Tm8gaW1hZ2UgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4='} 
              alt={pkg.name} 
              className="w-full h-40 object-cover rounded-md mb-4"
              onError={(e) => {
                e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgZmlsbD0iI2YzZjRmNiIvPgogIDxyZWN0IHg9IjUwIiB5PSIxMDAiIHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZTVlN2ViIiBzdHJva2U9IiNkMWQ1ZGIiIHN0cm9rZS13aWR0aD0iMiIvPgogIDx0ZXh0IHg9IjIwMCIgeT0iMTYwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTYiIGZpbGw9IiM2YjcyODAiPlBhY2thZ2UgSW1hZ2U8L3RleHQ+CiAgPHRleHQgeD0iMjAwIiB5PSIxODAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxMiIgZmlsbD0iIzljYTNhZiI+Tm8gaW1hZ2UgYXZhaWxhYmxlPC90ZXh0Pgo8L3N2Zz4=';
                e.target.onerror = null; // Prevent infinite loop
              }}
            />
            <h2 className="text-xl font-semibold mb-2">{pkg.name}</h2>
            <p className="text-gray-600 mb-2">{pkg.description}</p>
            <div className="mb-2">
              <span className="font-medium text-gray-700">Includes:</span>
              <ul className="list-disc list-inside text-gray-500 text-sm">
                {pkg.services && pkg.services.map((srv, idx) => (
                  <li key={idx}>{srv.service_name || srv.name || srv}</li>
                ))}
              </ul>
            </div>
            <div className="flex justify-between items-center mt-4">
              <span className="text-primary-600 font-bold text-lg">₹{pkg.price}</span>
              <button
                className="bg-primary-600 hover:bg-primary-700 text-white font-semibold py-2 px-4 rounded shadow"
                onClick={() => handleBookNow(pkg)}
              >
                Book Now
              </button>
            </div>
          </div>
        )) : <div className="col-span-3 text-center text-gray-500">No packages available.</div>}
      </div>

      {/* Booking Modal */}
      {showBooking && selectedPackage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto">
            <button className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl" onClick={() => setShowBooking(false)}>&times;</button>
            <h2 className="text-xl font-bold mb-4">Book Package: {selectedPackage.name}</h2>
            {bookingStatus === 'success' ? (
              <div className="text-green-600 font-semibold text-center py-8">Package booking request submitted!<br/>We will contact you soon.</div>
            ) : (
              <form onSubmit={handleBookingSubmit} className="space-y-4">
                {/* Customer Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Customer Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Your Name"
                      value={bookingData.name}
                      onChange={e => setBookingData({ ...bookingData, name: e.target.value })}
                      required
                    />
                    <input
                      type="tel"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Phone Number"
                      value={bookingData.phone}
                      onChange={e => setBookingData({ ...bookingData, phone: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Booking Details */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Booking Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="date"
                      className="w-full border rounded px-3 py-2"
                      value={bookingData.date}
                      onChange={e => setBookingData({ ...bookingData, date: e.target.value })}
                      required
                    />
                    <input
                      type="time"
                      className="w-full border rounded px-3 py-2"
                      value={bookingData.time}
                      onChange={e => setBookingData({ ...bookingData, time: e.target.value })}
                      required
                    />
                  </div>
                </div>

                {/* Vehicle Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-3">Vehicle Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Vehicle Number (e.g., GJ01AB1234)"
                      value={bookingData.vehicle_number}
                      onChange={e => setBookingData({ ...bookingData, vehicle_number: e.target.value })}
                      required
                    />
                    <select
                      className="w-full border rounded px-3 py-2"
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
                      className="w-full border rounded px-3 py-2"
                      placeholder="Brand (e.g., Honda, Toyota)"
                      value={bookingData.vehicle_brand}
                      onChange={e => setBookingData({ ...bookingData, vehicle_brand: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Model (e.g., City, Fortuner)"
                      value={bookingData.vehicle_model}
                      onChange={e => setBookingData({ ...bookingData, vehicle_model: e.target.value })}
                      required
                    />
                    <input
                      type="text"
                      className="w-full border rounded px-3 py-2"
                      placeholder="Color"
                      value={bookingData.vehicle_color}
                      onChange={e => setBookingData({ ...bookingData, vehicle_color: e.target.value })}
                    />
                    <input
                      type="number"
                      className="w-full border rounded px-3 py-2"
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
                  className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-4 rounded"
                  disabled={submitting}
                >
                  {submitting ? 'Booking...' : 'Submit Package Booking'}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PackagesPage;
