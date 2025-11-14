import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import axios from 'axios';
import {
  Palette,
  Building,
  Mail,
  Phone,
  MapPin,
  Globe,
  Clock,
  CreditCard,
  Shield,
  Bell,
  Save,
  Upload,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useAuth();
  const { updateTheme } = useTheme();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('appearance');
  const [showPassword, setShowPassword] = useState(false);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [selectedTheme, setSelectedTheme] = useState('Blue');

  // Fetch settings data
  const { data: settingsData, isLoading, refetch } = useQuery(
    'system-settings',
    async () => {
      const response = await axios.get('/api/settings');
      return response.data;
    },
    {
      onSuccess: (data) => {
        if (data.settings?.theme_colors) {
          // Find the matching theme name
          const currentTheme = themeColors.find(t => 
            t.primary === data.settings.theme_colors.primary && 
            t.secondary === data.settings.theme_colors.secondary
          );
          if (currentTheme) {
            setSelectedTheme(currentTheme.name);
          }
        }
      }
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    async (data) => {
      const formData = new FormData();
      
      // Append logo file if selected
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      // Append other settings data
      Object.keys(data).forEach(key => {
        if (key !== 'logo') {
          if (key === 'theme_colors' || key === 'payment_methods') {
            formData.append(key, JSON.stringify(data[key]));
          } else {
            formData.append(key, data[key]);
          }
        }
      });
      
      const response = await axios.put('/api/settings', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    {
      onSuccess: (data) => {
        toast.success('Settings updated successfully!');
        
        // Update theme if theme colors changed
        if (data.settings?.theme_colors) {
          updateTheme({
            primary: data.settings.theme_colors.primary,
            secondary: data.settings.theme_colors.secondary,
            darkMode: data.settings.dark_mode || false
          });
        }
        
        // Invalidate and refetch settings
        queryClient.invalidateQueries('system-settings');
        refetch();
        setLogoFile(null);
        setLogoPreview(null);
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update settings');
      }
    }
  );

  // Theme colors for customization
  const themeColors = [
    { name: 'Blue', primary: '#3B82F6', secondary: '#1E40AF' },
    { name: 'Green', primary: '#10B981', secondary: '#059669' },
    { name: 'Purple', primary: '#8B5CF6', secondary: '#7C3AED' },
    { name: 'Orange', primary: '#F59E0B', secondary: '#D97706' },
    { name: 'Red', primary: '#EF4444', secondary: '#DC2626' },
    { name: 'Teal', primary: '#14B8A6', secondary: '#0D9488' },
  ];

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => setLogoPreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleThemeChange = (themeName) => {
    setSelectedTheme(themeName);
    const theme = themeColors.find(t => t.name === themeName);
    if (theme) {
      // Update theme immediately for preview
      updateTheme({
        primary: theme.primary,
        secondary: theme.secondary,
        darkMode: settingsData?.settings?.dark_mode || false
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {};
    
    // Handle theme colors
    const selectedThemeData = themeColors.find(t => t.name === selectedTheme);
    data.theme_colors = selectedThemeData || themeColors[0];
    
    // Handle other form fields
    for (let [key, value] of formData.entries()) {
      if (key === 'payment_methods') {
        // Handle multiple checkbox values
        if (!data[key]) data[key] = [];
        data[key].push(value);
      } else if (key !== 'theme_colors') {
        data[key] = value;
      }
    }
    
    updateSettingsMutation.mutate(data);
  };

  const handleCancel = () => {
    // Reset theme to current settings
    if (settingsData?.settings?.theme_colors) {
      updateTheme({
        primary: settingsData.settings.theme_colors.primary,
        secondary: settingsData.settings.theme_colors.secondary,
        darkMode: settingsData.settings.dark_mode || false
      });
    }
    setSelectedTheme('Blue');
    setLogoFile(null);
    setLogoPreview(null);
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
        <p className="text-gray-600">Configure your car detailing studio management system</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon size={16} className="mr-2" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {/* Appearance Tab */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Theme Customization</h3>
                  
                  {/* Color Theme Selection */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Primary Color Theme
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                      {themeColors.map((color) => (
                        <div
                          key={color.name}
                          className="relative cursor-pointer"
                        >
                          <input
                            type="radio"
                            name="theme_colors"
                            value={color.name}
                            id={color.name}
                            className="sr-only"
                            checked={selectedTheme === color.name}
                            onChange={() => handleThemeChange(color.name)}
                          />
                          <label
                            htmlFor={color.name}
                            className={`block p-3 border-2 rounded-lg hover:border-gray-300 cursor-pointer transition-colors ${
                              selectedTheme === color.name 
                                ? 'border-primary-500 bg-primary-50' 
                                : 'border-gray-200'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <div
                                className="w-6 h-6 rounded-full"
                                style={{ backgroundColor: color.primary }}
                              ></div>
                              <span className="text-sm font-medium text-gray-900">{color.name}</span>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Logo Upload */}
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-3">
                      Business Logo
                    </label>
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {logoPreview || settingsData?.settings?.logo_url ? (
                          <img
                            src={logoPreview || settingsData.settings.logo_url}
                            alt="Business Logo"
                            className="w-16 h-16 object-contain border border-gray-300 rounded-lg"
                          />
                        ) : (
                          <div className="w-16 h-16 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                            <Upload size={24} className="text-gray-400" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleLogoChange}
                          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
                        />
                        <p className="mt-1 text-xs text-gray-500">
                          PNG, JPG, GIF up to 2MB. Recommended size: 200x200px
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Dark Mode Toggle */}
                  <div className="mb-6">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        name="dark_mode"
                        defaultChecked={settingsData?.settings?.dark_mode}
                        className="rounded border-gray-300 text-primary-600 shadow-sm focus:border-primary-300 focus:ring focus:ring-primary-200 focus:ring-opacity-50"
                      />
                      <span className="ml-2 text-sm font-medium text-gray-700">
                        Enable Dark Mode
                      </span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Business Info Tab */}
            {activeTab === 'business' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Name
                      </label>
                      <input
                        type="text"
                        name="business_name"
                        defaultValue={settingsData?.settings?.business_name}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Car Studio"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Business Email
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="email"
                          name="business_email"
                          defaultValue={settingsData?.settings?.business_email}
                          className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="info@carstudio.com"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Phone Number
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="tel"
                          name="business_phone"
                          defaultValue={settingsData?.settings?.business_phone}
                          className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="+91 98765 43210"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Website
                      </label>
                      <div className="relative">
                        <Globe size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                          type="url"
                          name="website"
                          defaultValue={settingsData?.settings?.website}
                          className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          placeholder="https://carstudio.com"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Address
                    </label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-3 top-3 text-gray-400" />
                      <textarea
                        name="business_address"
                        defaultValue={settingsData?.settings?.business_address}
                        rows={3}
                        className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="123 Car Studio Lane, Auto City, State - 123456"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        GST Number
                      </label>
                      <input
                        type="text"
                        name="gst_number"
                        defaultValue={settingsData?.settings?.gst_number}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="22AAAAA0000A1Z5"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        PAN Number
                      </label>
                      <input
                        type="text"
                        name="pan_number"
                        defaultValue={settingsData?.settings?.pan_number}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="AAAAA0000A"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                        <p className="text-sm text-gray-500">Receive notifications via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="email_notifications"
                          defaultChecked={settingsData?.settings?.email_notifications}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">SMS Notifications</h4>
                        <p className="text-sm text-gray-500">Receive notifications via SMS</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="sms_notifications"
                          defaultChecked={settingsData?.settings?.sms_notifications}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">WhatsApp Notifications</h4>
                        <p className="text-sm text-gray-500">Receive notifications via WhatsApp</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="whatsapp_notifications"
                          defaultChecked={settingsData?.settings?.whatsapp_notifications}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === 'integrations' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Third-Party Integrations</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">SMS Gateway</h4>
                          <p className="text-sm text-gray-500">Configure SMS service provider</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Connected
                        </span>
                      </div>
                      <input
                        type="text"
                        name="sms_api_key"
                        defaultValue={settingsData?.settings?.sms_api_key}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="SMS API Key"
                      />
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">WhatsApp Business API</h4>
                          <p className="text-sm text-gray-500">Configure WhatsApp Business API</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                          Pending
                        </span>
                      </div>
                      <input
                        type="text"
                        name="whatsapp_api_key"
                        defaultValue={settingsData?.settings?.whatsapp_api_key}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="WhatsApp API Key"
                      />
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="text-sm font-medium text-gray-900">Payment Gateway</h4>
                          <p className="text-sm text-gray-500">Configure payment service provider</p>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Connected
                        </span>
                      </div>
                      <input
                        type="text"
                        name="payment_api_key"
                        defaultValue={settingsData?.settings?.payment_api_key}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="Payment Gateway API Key"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Security Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Two-Factor Authentication</h4>
                        <p className="text-sm text-gray-500">Enable 2FA for enhanced security</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="two_factor_auth"
                          defaultChecked={settingsData?.settings?.two_factor_auth}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Session Timeout</h4>
                        <p className="text-sm text-gray-500">Auto-logout after inactivity</p>
                      </div>
                      <select
                        name="session_timeout"
                        defaultValue={settingsData?.settings?.session_timeout || '30'}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="60">1 hour</option>
                        <option value="120">2 hours</option>
                      </select>
                    </div>

                    <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">Password Policy</h4>
                        <p className="text-sm text-gray-500">Enforce strong password requirements</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="strong_password_policy"
                          defaultChecked={settingsData?.settings?.strong_password_policy}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Billing Tab */}
            {activeTab === 'billing' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Billing & Payment Settings</h3>
                  
                  <div className="space-y-4">
                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Currency Settings</h4>
                      <select
                        name="currency"
                        defaultValue={settingsData?.settings?.currency || 'INR'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="INR">Indian Rupee (₹)</option>
                        <option value="USD">US Dollar ($)</option>
                        <option value="EUR">Euro (€)</option>
                        <option value="GBP">British Pound (£)</option>
                      </select>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Tax Settings</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            GST Rate (%)
                          </label>
                          <input
                            type="number"
                            name="gst_rate"
                            defaultValue={settingsData?.settings?.gst_rate || '18'}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Service Tax Rate (%)
                          </label>
                          <input
                            type="number"
                            name="service_tax_rate"
                            defaultValue={settingsData?.settings?.service_tax_rate || '5'}
                            min="0"
                            max="100"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 border border-gray-200 rounded-lg">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Methods</h4>
                      <div className="space-y-3">
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="payment_methods"
                            value="cash"
                            defaultChecked={settingsData?.settings?.payment_methods?.includes('cash')}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Cash</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="payment_methods"
                            value="card"
                            defaultChecked={settingsData?.settings?.payment_methods?.includes('card')}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Credit/Debit Card</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="payment_methods"
                            value="upi"
                            defaultChecked={settingsData?.settings?.payment_methods?.includes('upi')}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">UPI</span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            name="payment_methods"
                            value="bank_transfer"
                            defaultChecked={settingsData?.settings?.payment_methods?.includes('bank_transfer')}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">Bank Transfer</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Save Button */}
            <div className="flex justify-end pt-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateSettingsMutation.isLoading}
                  className="flex items-center px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
                >
                  <Save size={16} className="mr-2" />
                  {updateSettingsMutation.isLoading ? 'Saving...' : 'Save Settings'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

const tabs = [
  { id: 'appearance', name: 'Appearance', icon: Palette },
  { id: 'business', name: 'Business Info', icon: Building },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'integrations', name: 'Integrations', icon: Globe },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'billing', name: 'Billing & Payments', icon: CreditCard },
];

export default Settings;
