import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import axios from 'axios';
import {
  Mail,
  Server,
  Key,
  User,
  TestTube,
  Save,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Send
} from 'lucide-react';
import toast from 'react-hot-toast';

const SMTPSettings = () => {
  const [formData, setFormData] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_pass: '',
    from_name: 'Car Detailing Studio',
    from_email: '',
    smtp_secure: false,
    is_active: true
  });
  const [testEmail, setTestEmail] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const queryClient = useQueryClient();

  // Fetch SMTP settings
  const { data: settings, isLoading, error } = useQuery(
    'smtp-settings',
    async () => {
      const response = await axios.get('/api/smtp-settings');
      return response.data;
    }
  );

  // Update settings mutation
  const updateSettingsMutation = useMutation(
    async (data) => {
      const response = await axios.put('/api/smtp-settings', data);
      return response.data;
    },
    {
      onSuccess: () => {
        toast.success('SMTP settings saved successfully');
        queryClient.invalidateQueries('smtp-settings');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to save SMTP settings');
      }
    }
  );

  // Test connection mutation
  const testConnectionMutation = useMutation(
    async (data) => {
      const response = await axios.post('/api/smtp-settings/test', data);
      return response.data;
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          toast.success('SMTP connection test successful!');
        } else {
          toast.error(`Connection test failed: ${result.message}`);
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Connection test failed');
      }
    }
  );

  // Send test email mutation
  const sendTestEmailMutation = useMutation(
    async (data) => {
      const response = await axios.post('/api/smtp-settings/test-email', data);
      return response.data;
    },
    {
      onSuccess: (result) => {
        if (result.success) {
          toast.success('Test email sent successfully!');
        } else {
          toast.error(`Test email failed: ${result.message}`);
        }
      },
      onError: (error) => {
        toast.error(error.response?.data?.message || 'Test email failed');
      }
    }
  );

  useEffect(() => {
    if (settings) {
      setFormData({
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || 587,
        smtp_user: settings.smtp_user || '',
        smtp_pass: '', // Don't populate password for security
        from_name: settings.from_name || 'Car Detailing Studio',
        from_email: settings.from_email || '',
        smtp_secure: settings.smtp_secure || false,
        is_active: settings.is_active !== false
      });
    }
  }, [settings]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      await updateSettingsMutation.mutateAsync(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestConnection = async () => {
    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_pass) {
      toast.error('Please fill in all required fields before testing');
      return;
    }

    setIsTesting(true);
    try {
      await testConnectionMutation.mutateAsync({
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_user: formData.smtp_user,
        smtp_pass: formData.smtp_pass
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    if (!formData.smtp_host || !formData.smtp_user || !formData.smtp_pass) {
      toast.error('Please fill in all required fields before sending test email');
      return;
    }

    try {
      await sendTestEmailMutation.mutateAsync({
        smtp_host: formData.smtp_host,
        smtp_port: formData.smtp_port,
        smtp_user: formData.smtp_user,
        smtp_pass: formData.smtp_pass,
        test_email: testEmail
      });
    } catch (error) {
      // Error handled by mutation
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <XCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">Error loading SMTP settings</h3>
        <p className="mt-1 text-sm text-gray-500">Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-3">
        <Settings className="h-8 w-8 text-primary-600" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SMTP Email Settings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Configure email server settings for booking confirmations
          </p>
        </div>
      </div>

      {/* Status Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
        <div className="flex">
          <AlertCircle className="h-5 w-5 text-blue-400" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-blue-800">
              Email Configuration Required
            </h3>
            <div className="mt-2 text-sm text-blue-700">
              <p>
                Configure your SMTP settings to enable automatic booking confirmation emails. 
                Test your connection before saving to ensure emails will be delivered.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* SMTP Settings Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">SMTP Server Configuration</h3>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* SMTP Host */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Server className="inline h-4 w-4 mr-1" />
                SMTP Host
              </label>
              <input
                type="text"
                name="smtp_host"
                value={formData.smtp_host}
                onChange={handleChange}
                placeholder="smtp.hostinger.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* SMTP Port */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Port
              </label>
              <select
                name="smtp_port"
                value={formData.smtp_port}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value={587}>587 (TLS)</option>
                <option value={465}>465 (SSL)</option>
                <option value={25}>25 (Standard)</option>
              </select>
            </div>

            {/* SMTP Username */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="inline h-4 w-4 mr-1" />
                SMTP Username
              </label>
              <input
                type="text"
                name="smtp_user"
                value={formData.smtp_user}
                onChange={handleChange}
                placeholder="your-email@domain.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* SMTP Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Key className="inline h-4 w-4 mr-1" />
                SMTP Password
              </label>
              <input
                type="password"
                name="smtp_pass"
                value={formData.smtp_pass}
                onChange={handleChange}
                placeholder="Enter your email password"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* From Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                From Name
              </label>
              <input
                type="text"
                name="from_name"
                value={formData.from_name}
                onChange={handleChange}
                placeholder="Car Detailing Studio"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>

            {/* From Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="inline h-4 w-4 mr-1" />
                From Email
              </label>
              <input
                type="email"
                name="from_email"
                value={formData.from_email}
                onChange={handleChange}
                placeholder="noreply@yourdomain.com"
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              />
            </div>
          </div>

          {/* Security Options */}
          <div className="flex items-center space-x-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="smtp_secure"
                checked={formData.smtp_secure}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Use SSL/TLS encryption</span>
            </label>
            
            <label className="flex items-center">
              <input
                type="checkbox"
                name="is_active"
                checked={formData.is_active}
                onChange={handleChange}
                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">Enable email sending</span>
            </label>
          </div>

          {/* Test Connection */}
          <div className="border-t border-gray-200 pt-6">
            <h4 className="text-md font-medium text-gray-900 mb-4">Test Configuration</h4>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="button"
                onClick={handleTestConnection}
                disabled={isTesting || !formData.smtp_host || !formData.smtp_user || !formData.smtp_pass}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? 'Testing...' : 'Test Connection'}
              </button>

              <div className="flex-1 flex gap-2">
                <input
                  type="email"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                  placeholder="Enter test email address"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
                <button
                  type="button"
                  onClick={handleSendTestEmail}
                  disabled={!testEmail || !formData.smtp_host || !formData.smtp_user || !formData.smtp_pass}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Send Test Email
                </button>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center px-6 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>

      {/* Help Section */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Common SMTP Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Hostinger</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Host: smtp.hostinger.com</li>
              <li>Port: 465 (SSL) or 587 (TLS)</li>
              <li>Username: your-email@yourdomain.com</li>
              <li>Password: your email password</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Gmail</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>Host: smtp.gmail.com</li>
              <li>Port: 587 (TLS)</li>
              <li>Username: your-email@gmail.com</li>
              <li>Password: App Password (not regular password)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SMTPSettings;
