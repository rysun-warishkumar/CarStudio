import React from 'react';


const AboutPage = () => (
  <div className="max-w-5xl mx-auto px-4 pt-24 pb-12 bg-gray-900 min-h-screen">
    <h1 className="text-4xl font-bold mb-6 text-center text-white">About Car Studio</h1>
    <p className="text-lg text-gray-300 mb-8 text-center">
      Car Studio is your trusted partner for premium car detailing, paint protection, and automotive care. Founded with a passion for cars and a commitment to excellence, we have grown into a leading car studio known for our attention to detail, customer-first approach, and use of cutting-edge technology.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
      <div>
        <h2 className="text-2xl font-semibold mb-2 text-white">Our Mission</h2>
        <p className="text-gray-300 mb-4">To deliver the highest quality car care services that protect, enhance, and maintain the beauty and value of every vehicle we touch.</p>
        <h2 className="text-2xl font-semibold mb-2 text-white">Our Vision</h2>
        <p className="text-gray-300">To be the most trusted and innovative car studio, setting new standards in automotive detailing and customer satisfaction.</p>
      </div>
      <div>
        <img src="/about-car-studio.jpg" alt="Car Studio Team" className="rounded-lg shadow-lg w-full h-64 object-cover" />
      </div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
          <span role="img" aria-label="Expert">🧑‍🔧</span>
        </div>
        <h4 className="font-semibold text-white">Expert Service</h4>
        <p className="text-sm text-gray-300">Professional detailing by certified technicians</p>
      </div>
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
          <span role="img" aria-label="Time">⏰</span>
        </div>
        <h4 className="font-semibold text-white">Convenient Timing</h4>
        <p className="text-sm text-gray-300">Flexible scheduling to fit your busy lifestyle</p>
      </div>
      <div className="text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-3">
          <span role="img" aria-label="Price">💸</span>
        </div>
        <h4 className="font-semibold text-white">Competitive Pricing</h4>
        <p className="text-sm text-gray-300">Quality service at reasonable rates</p>
      </div>
    </div>
    <div className="mt-16">
      <h2 className="text-2xl font-semibold mb-4 text-center text-white">Meet Our Team</h2>
      <div className="flex flex-wrap justify-center gap-8">
        <div className="w-64 p-6 bg-gray-800 rounded-lg shadow text-center border border-gray-700">
          <img src="/team1.jpg" alt="Team Member" className="w-20 h-20 rounded-full mx-auto mb-3 object-cover" />
          <h4 className="font-semibold text-white mb-1">Rahul Sharma</h4>
          <p className="text-gray-300 text-sm mb-1">Founder & Lead Detailer</p>
          <p className="text-gray-400 text-xs">10+ years in automotive care</p>
        </div>
        <div className="w-64 p-6 bg-gray-800 rounded-lg shadow text-center border border-gray-700">
          <img src="/team2.jpg" alt="Team Member" className="w-20 h-20 rounded-full mx-auto mb-3 object-cover" />
          <h4 className="font-semibold text-white mb-1">Priya Verma</h4>
          <p className="text-gray-300 text-sm mb-1">Customer Experience Manager</p>
          <p className="text-gray-400 text-xs">Expert in client relations</p>
        </div>
        <div className="w-64 p-6 bg-gray-800 rounded-lg shadow text-center border border-gray-700">
          <img src="/team3.jpg" alt="Team Member" className="w-20 h-20 rounded-full mx-auto mb-3 object-cover" />
          <h4 className="font-semibold text-white mb-1">Amit Singh</h4>
          <p className="text-gray-300 text-sm mb-1">Paint Protection Specialist</p>
          <p className="text-gray-400 text-xs">Certified PPF & Coating Expert</p>
        </div>
      </div>
    </div>
  </div>
);

export default AboutPage;
