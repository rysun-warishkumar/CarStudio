
import React, { useState } from 'react';

const ContactPage = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [status, setStatus] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setStatus('Thank you for contacting us! We will get back to you soon.');
    setForm({ name: '', email: '', phone: '', message: '' });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold mb-10 text-center text-white">Contact Us</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Address & Map Section */}
        <div className="bg-gray-800 rounded-lg shadow p-8 flex flex-col justify-between border border-gray-700">
          <div>
            <h2 className="text-2xl font-semibold mb-4 text-white">Car Studio Address</h2>
            <p className="mb-2 text-gray-300"><span className="font-medium text-white">Address:</span> 123 Car Studio Lane, Auto City, AC 12345</p>
            <p className="mb-2 text-gray-300"><span className="font-medium text-white">Phone:</span> +91 98765 43210</p>
            <p className="mb-2 text-gray-300"><span className="font-medium text-white">Email:</span> info@carstudio.com</p>
            <p className="mb-2 text-gray-300"><span className="font-medium text-white">Business Hours:</span> Mon-Sat: 8:00 AM - 8:00 PM</p>
          </div>
          <div className="mt-8">
            <iframe
              title="Car Studio Location"
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3768.123456789!2d72.877655!3d19.076090!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3be7b63b0e0e0e0e%3A0x123456789abcdef!2sAuto%20City!5e0!3m2!1sen!2sin!4v1620000000000!5m2!1sen!2sin"
              width="100%"
              height="220"
              style={{ border: 0, borderRadius: '0.5rem' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
        {/* Contact Form Section */}
        <div className="bg-gray-800 rounded-lg shadow p-8 border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4 text-white">Send Us a Message</h2>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Name</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className="w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Email</label>
              <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} className="w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Phone</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} className="w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-white mb-1">Message</label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} className="w-full border border-gray-600 bg-gray-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500" rows={4} required />
            </div>
            {status && <div className="text-green-400 text-sm">{status}</div>}
            <button type="submit" className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors hoverable">Send Message</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;
