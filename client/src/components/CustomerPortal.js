import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Car, Phone, Mail, Menu, X } from 'lucide-react';

const CustomerPortal = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-gray-900/95 backdrop-blur-md shadow-lg py-2' 
        : 'bg-gray-900 shadow-sm py-4'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center">
          <Link to="/portal" className="flex items-center group">
            <div className={`rounded-lg flex items-center justify-center transition-all duration-300 ${
              isScrolled 
                ? 'w-8 h-8 bg-primary-600 group-hover:bg-primary-700' 
                : 'w-10 h-10 bg-primary-600 group-hover:bg-primary-700'
            }`}>
              <Car className={`text-white transition-all duration-300 ${
                isScrolled ? 'h-5 w-5' : 'h-6 w-6'
              }`} />
            </div>
            <h1 className={`font-bold text-white group-hover:text-blue-400 transition-all duration-300 ${
              isScrolled ? 'ml-2 text-xl' : 'ml-3 text-2xl'
            }`}>Car Studio</h1>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex space-x-8">
            <Link to="/portal" className="text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 relative group">
              Home
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link to="/portal/services" className="text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 relative group">
              Services
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link to="/portal/about" className="text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 relative group">
              About Us
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link to="/portal/contact" className="text-gray-300 hover:text-blue-400 font-medium transition-colors duration-200 relative group">
              Contact
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-blue-400 transition-all duration-200 group-hover:w-full"></span>
            </Link>
            <Link 
              to="/staff/login" 
              className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Staff Portal
            </Link>
          </nav>

          {/* Contact Info - Desktop */}
          <div className="hidden xl:flex items-center space-x-4">
            <div className="flex items-center text-sm text-gray-400">
              <Phone className="h-4 w-4 mr-1" />
              +91 98765 43210
            </div>
            <div className="flex items-center text-sm text-gray-400">
              <Mail className="h-4 w-4 mr-1" />
              info@carstudio.com
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-blue-400 hover:bg-gray-800 transition-colors"
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-gray-700">
            <nav className="flex flex-col space-y-2 pt-4">
              <Link 
                to="/portal" 
                className="text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Home
              </Link>
              <Link 
                to="/portal/services" 
                className="text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Services
              </Link>
              <Link 
                to="/portal/about" 
                className="text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                About Us
              </Link>
              <Link 
                to="/portal/contact" 
                className="text-gray-300 hover:text-blue-400 font-medium py-2 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </Link>
              <Link 
                to="/staff/login" 
                className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 mt-2 text-center"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Staff Portal
              </Link>
            </nav>
            <div className="flex flex-col space-y-2 pt-4 border-t border-gray-700 mt-4">
              <div className="flex items-center text-sm text-gray-400">
                <Phone className="h-4 w-4 mr-2" />
                +91 98765 43210
              </div>
              <div className="flex items-center text-sm text-gray-400">
                <Mail className="h-4 w-4 mr-2" />
                info@carstudio.com
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default CustomerPortal;
