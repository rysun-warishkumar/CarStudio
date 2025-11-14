import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Star, Shield, Clock, Award } from 'lucide-react';
import { useQuery } from 'react-query';
import axios from 'axios';

const HomePage = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isVisible, setIsVisible] = useState({});
  const heroRef = useRef(null);

  // Fetch services data
  const { data: servicesData, isLoading: servicesLoading, error: servicesError } = useQuery(
    'services',
    async () => {
      const response = await axios.get('/api/services');
      return response.data;
    },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );

  // Extract services from the response
  const services = servicesData?.data || servicesData || [];

  // Fallback services if API doesn't return data
  const fallbackServices = [
    {
      id: 1,
      name: "Basic Car Wash",
      description: "Exterior wash and interior cleaning",
      base_price: 500,
      image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 2,
      name: "Premium Wash",
      description: "Exterior wash, interior cleaning, and tire dressing",
      base_price: 800,
      image_url: "https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 3,
      name: "Interior Detailing",
      description: "Complete interior cleaning and sanitization",
      base_price: 1200,
      image_url: "https://images.unsplash.com/photo-1563720223185-11003d516935?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
    },
    {
      id: 4,
      name: "Exterior Detailing",
      description: "Complete exterior detailing with waxing",
      base_price: 1500,
      image_url: "https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80"
    }
  ];

  // Use fallback services if no data is available
  const displayServices = services.length > 0 ? services : fallbackServices;

  // Hero carousel images
  const heroImages = [
    {
      src: 'https://www.shutterstock.com/image-photo/adult-car-detailer-uniform-washing-600nw-2287564377.jpg',
      title: 'Premium Car Detailing',
      subtitle: 'Professional care for your vehicle'
    },
    {
      src: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
      title: 'Ceramic Coating',
      subtitle: 'Long-lasting protection for your car'
    },
    {
      src: 'https://images.unsplash.com/photo-1563720223185-11003d516935?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80',
      title: 'Interior Detailing',
      subtitle: 'Complete interior restoration'
    }
  ];

  // Auto-rotate carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({ ...prev, [entry.target.id]: true }));
          }
        });
      },
      { threshold: 0.1 }
    );

    const elements = document.querySelectorAll('[data-animate]');
    elements.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);


  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % heroImages.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + heroImages.length) % heroImages.length);
  };

  return (
    <div className="pt-20">
      {/* Hero Section with Carousel */}
      <section className="relative h-screen overflow-hidden">
        <div className="relative w-full h-full">
          {heroImages.map((image, index) => (
            <div
              key={index}
              className={`absolute inset-0 transition-opacity duration-1000 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div
                ref={heroRef}
                className="w-full h-full bg-cover bg-center bg-no-repeat"
                style={{ backgroundImage: `url(${image.src})` }}
              >
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="relative z-10 flex items-center justify-center h-full">
                  <div className="text-center text-white px-4 max-w-4xl">
                    <h1 
                      className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in-up"
                      data-animate
                      id="hero-title"
                    >
                      {image.title}
                    </h1>
                    <p 
                      className="text-xl md:text-2xl mb-8 animate-fade-in-up animation-delay-200"
                      data-animate
                      id="hero-subtitle"
                    >
                      {image.subtitle}
                    </p>
                    <Link 
                      to="/portal/services" 
                      className="inline-block bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl animate-fade-in-up animation-delay-400 hoverable"
                      data-animate
                      id="hero-cta"
                    >
                      Explore Services
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Carousel Controls */}
        <button
          onClick={prevSlide}
          className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm hoverable"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
        <button
          onClick={nextSlide}
          className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white/20 hover:bg-white/30 text-white p-3 rounded-full transition-all duration-300 backdrop-blur-sm hoverable"
        >
          <ChevronRight className="h-6 w-6" />
        </button>

        {/* Carousel Indicators */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex space-x-2">
          {heroImages.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white' : 'bg-white/50'
              }`}
            />
          ))}
      </div>
    </section>

      {/* Services Section */}
      <section className="py-20 bg-gray-800" data-animate id="services-section">
      <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-16 transition-all duration-1000 ${
            isVisible['services-section'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Premium Services</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Professional car care services designed to keep your vehicle looking and performing its best
            </p>
          </div>

          {/* Loading State */}
          {servicesLoading && (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
              <p className="text-gray-300 mt-4">Loading services...</p>
            </div>
          )}

          {/* Error State */}
          {servicesError && (
            <div className="text-center py-12">
              <p className="text-red-400 mb-4">Failed to load services</p>
              <p className="text-gray-400">Please try refreshing the page</p>
            </div>
          )}

          {/* Desktop Grid */}
          {!servicesLoading && !servicesError && (
            <div className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {displayServices.slice(0, 4).map((service, index) => (
              <div
                key={service.id}
                className={`bg-gray-700 rounded-xl shadow-lg p-6 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 ${
                  isVisible['services-section'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <div className="relative overflow-hidden rounded-lg mb-4">
                  <img
                    src={service.image_url || 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}
                    alt={service.name}
                    className="w-full h-48 object-cover transition-transform duration-300 hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">{service.name}</h3>
                <p className="text-gray-300 mb-4 line-clamp-2">{service.description}</p>
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold text-blue-400">₹{service.base_price}</span>
                  <Link
                    to="/portal/services"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 hoverable"
                  >
                    Book Now
                  </Link>
                </div>
              </div>
              ))}
            </div>
          )}

          {/* Mobile Carousel */}
          {!servicesLoading && !servicesError && (
            <div className="md:hidden">
            <div className="flex overflow-x-auto space-x-4 pb-4 scrollbar-hide">
              {displayServices.slice(0, 4).map((service, index) => (
                <div
                  key={service.id}
                  className="flex-shrink-0 w-80 bg-gray-700 rounded-xl shadow-lg p-6"
                >
                  <div className="relative overflow-hidden rounded-lg mb-4">
                    <img
                      src={service.image_url || 'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?ixlib=rb-4.0.3&auto=format&fit=crop&w=400&q=80'}
              alt={service.name} 
                      className="w-full h-48 object-cover"
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-3 text-white">{service.name}</h3>
                  <p className="text-gray-300 mb-4">{service.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold text-blue-400">₹{service.base_price}</span>
                    <Link
                      to="/portal/services"
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200 hoverable"
                    >
                      Book Now
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            </div>
          )}

          {/* No Services Message - Only show if no fallback services either */}
          {!servicesLoading && !servicesError && displayServices.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400 text-lg">No services available at the moment</p>
              <p className="text-gray-500 mt-2">Please check back later</p>
            </div>
          )}
      </div>
    </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-gray-900" data-animate id="why-choose-us">
        <div className="max-w-7xl mx-auto px-4">
          <div className={`text-center mb-16 transition-all duration-1000 ${
            isVisible['why-choose-us'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
          }`}>
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Why Choose Car Studio?</h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              We combine expertise, premium products, and cutting-edge technology to deliver exceptional results
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                icon: <Award className="h-12 w-12" />,
                title: "Expert Technicians",
                description: "Certified professionals with years of experience in automotive detailing and care."
              },
              {
                icon: <Shield className="h-12 w-12" />,
                title: "Premium Products",
                description: "We use only the finest, industry-leading products to ensure superior results."
              },
              {
                icon: <Clock className="h-12 w-12" />,
                title: "Quick Service",
                description: "Efficient service delivery without compromising on quality and attention to detail."
              },
              {
                icon: <Star className="h-12 w-12" />,
                title: "100% Satisfaction",
                description: "We guarantee your complete satisfaction with our comprehensive service warranty."
              }
            ].map((feature, index) => (
              <div
                key={index}
                className={`text-center p-8 rounded-xl bg-gradient-to-br from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 transition-all duration-500 transform hover:-translate-y-2 hover:shadow-xl ${
                  isVisible['why-choose-us'] ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 text-white rounded-full mb-6 transition-transform duration-300 hover:scale-110">
                  {feature.icon}
          </div>
                <h3 className="text-xl font-semibold text-white mb-4">{feature.title}</h3>
                <p className="text-gray-300 leading-relaxed">{feature.description}</p>
          </div>
            ))}
        </div>
      </div>
    </section>
  </div>
);
};

export default HomePage;
