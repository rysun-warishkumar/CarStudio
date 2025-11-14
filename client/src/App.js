import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Toaster } from 'react-hot-toast';
import { Helmet } from 'react-helmet';

// Context
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';

// Components
import Layout from './components/Layout';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import Customers from './components/Customers';
import Bookings from './components/Bookings';
import Services from './components/Services';
import Inventory from './components/Inventory';
import Staff from './components/Staff';
import JobCards from './components/JobCards';
import Billing from './components/Billing';
import Reports from './components/Reports';
import Settings from './components/Settings';
import SMTPSettings from './components/SMTPSettings';
import Profile from './components/Profile';

// Customer Portal Components
import CustomerPortal from './components/CustomerPortal';
import ServicesPage from './pages/ServicesPage';
import PackagesPage from './pages/PackagesPage';
import AboutPage from './pages/AboutPage';
import ContactPage from './pages/ContactPage';
import HomePage from './pages/HomePage';
import StaffLoginPage from './pages/StaffLoginPage';
import StaffDashboard from './pages/StaffDashboard';
import SplashCursor from './components/SplashCursor';

// Styles
import './index.css';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Admin Routes Component
const AdminRoutes = () => (
  <Layout>
    <Routes>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/customers" element={<Customers />} />
      <Route path="/bookings" element={<Bookings />} />
      <Route path="/services" element={<Services />} />
      <Route path="/inventory" element={<Inventory />} />
      <Route path="/staff" element={<Staff />} />
      <Route path="/job-cards" element={<JobCards />} />
      <Route path="/billing" element={<Billing />} />
      <Route path="/reports" element={<Reports />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/smtp-settings" element={<SMTPSettings />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  </Layout>
);





// Portal Layout with header/footer and Outlet for nested routes
const PortalLayout = () => (
  <div className="flex flex-col min-h-screen bg-gray-900">
    <CustomerPortal />
    <div className="flex-1">
      <Outlet />
    </div>
    <footer className="bg-gray-950 text-white mt-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Car Studio</h3>
            <p className="text-gray-400">
              Professional car detailing services for all types of vehicles.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Quick Links</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="/portal/services" className="hover:text-blue-400 transition-colors">Services</a></li>
              <li><a href="/portal/about" className="hover:text-blue-400 transition-colors">About Us</a></li>
              <li><a href="/portal/contact" className="hover:text-blue-400 transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4 text-white">Contact Info</h3>
            <div className="space-y-2 text-gray-400">
              <p>+91 98765 43210</p>
              <p>info@carstudio.com</p>
              <p>123 Car Studio Lane, Auto City</p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p>&copy; 2024 Car Studio. All rights reserved.</p>
            <p className="mt-2 md:mt-0 text-sm">
              Developed by <span className="text-blue-400 font-semibold">W Technology</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
    {/* Splash Cursor Effect - Only for Customer Portal */}
    <SplashCursor />
  </div>
);

// Customer Portal Routes Component (Multi-page)
const CustomerPortalRoutes = () => (
  <Routes>
    <Route path="/" element={<PortalLayout />}>
      <Route index element={<HomePage />} />
      <Route path="services" element={<ServicesPage />} />
      <Route path="packages" element={<ServicesPage showPackages />} />
      <Route path="about" element={<AboutPage />} />
      <Route path="contact" element={<ContactPage />} />
      <Route path="*" element={<Navigate to="/portal" replace />} />
    </Route>
  </Routes>
);

function App() {
  // Global prevention of unwanted form submissions
  useEffect(() => {
    const handleFormSubmit = (e) => {
      // Check if the form contains only search inputs
      const form = e.target;
      const inputs = form.querySelectorAll('input[type="text"], input[type="search"]');
      const hasOnlySearchInputs = inputs.length > 0 && Array.from(inputs).every(input => 
        input.placeholder?.toLowerCase().includes('search') || 
        input.type === 'search'
      );
      
      if (hasOnlySearchInputs) {
        e.preventDefault();
        return false;
      }
    };

    const handleKeyDown = (e) => {
      // Prevent Enter key from submitting forms in search inputs
      if (e.key === 'Enter' && e.target.type === 'text' && e.target.placeholder?.toLowerCase().includes('search')) {
        e.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('submit', handleFormSubmit);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('submit', handleFormSubmit);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ThemeProvider>
          <Router>
            <Helmet>
              <title>Car Detailing Studio Management</title>
              <meta name="description" content="Professional car detailing studio management system" />
              <link rel="preconnect" href="https://fonts.googleapis.com" />
              <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin />
              <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
            </Helmet>

            <div className="App">
              <Routes>
                {/* Public Routes */}
                <Route path="/login" element={<Login />} />
                
                {/* Staff Portal Routes */}
                <Route path="/staff/login" element={<StaffLoginPage />} />
                <Route path="/staff/dashboard" element={<StaffDashboard />} />
                
                {/* Customer Portal Routes */}
                <Route path="/portal/*" element={<CustomerPortalRoutes />} />
                
                {/* Protected Admin Routes */}
                <Route 
                  path="/admin/*" 
                  element={
                    <ProtectedRoute allowedRoles={['admin', 'manager', 'technician', 'customer_service']}>
                      <AdminRoutes />
                    </ProtectedRoute>
                  } 
                />
                
                {/* Default redirect */}
                <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
                <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
              </Routes>

              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  style: {
                    background: '#363636',
                    color: '#fff',
                  },
                  success: {
                    duration: 3000,
                    iconTheme: {
                      primary: '#22c55e',
                      secondary: '#fff',
                    },
                  },
                  error: {
                    duration: 5000,
                    iconTheme: {
                      primary: '#ef4444',
                      secondary: '#fff',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </ThemeProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
