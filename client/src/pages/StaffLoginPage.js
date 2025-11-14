import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from 'react-query';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { User, Lock, Car, Wrench } from 'lucide-react';

const StaffLoginPage = () => {
  const [formData, setFormData] = useState({
    username: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const loginMutation = useMutation(
    async (credentials) => {
      const response = await axios.post('/api/auth/staff-login', credentials);
      return response.data;
    },
    {
      onSuccess: (data) => {
        // Store staff token and user data
        localStorage.setItem('staffToken', data.token);
        localStorage.setItem('staffUser', JSON.stringify(data.user));
        
        toast.success(`Welcome back, ${data.user.firstName}!`);
        
        // Redirect to staff dashboard
        navigate('/staff/dashboard');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Login failed');
        setIsLoading(false);
      }
    }
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsLoading(true);
    loginMutation.mutate(formData);
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="mx-auto h-16 w-16 bg-blue-600 rounded-full flex items-center justify-center">
            <Wrench className="h-8 w-8 text-white" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Staff Portal Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Access your staff dashboard and manage job cards
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="username" className="sr-only">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="username"
                  name="username"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Username"
                  value={formData.username}
                  onChange={handleChange}
                />
              </div>
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 pl-10 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="Password"
                  value={formData.password}
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              ) : (
                'Sign in to Staff Portal'
              )}
            </button>
          </div>

          <div className="text-center">
            <a
              href="/"
              className="font-medium text-blue-600 hover:text-blue-500 text-sm"
            >
              ← Back to Customer Portal
            </a>
          </div>
        </form>

        <div className="mt-6 bg-white rounded-lg p-4 shadow-sm">
          <h3 className="text-sm font-medium text-gray-900 mb-2">Staff Portal Features:</h3>
          <ul className="text-xs text-gray-600 space-y-1">
            <li>• View and manage assigned job cards</li>
            <li>• Update job status and progress</li>
            <li>• Upload before/after photos</li>
            <li>• Track work completion</li>
            <li>• Access work history and performance</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default StaffLoginPage;
