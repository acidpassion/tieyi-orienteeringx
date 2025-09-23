import { useState } from 'react';
import { Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordChangeDialog from '../components/PasswordChangeDialog';

const Login = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [isForcePasswordChange, setIsForcePasswordChange] = useState(false);
  const { user, login } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get redirect URL from query parameters
  const redirectUrl = searchParams.get('redirect');

  if (user) {
    // If user is already logged in, redirect to intended page or profile
    const targetUrl = redirectUrl ? decodeURIComponent(redirectUrl) : '/profile';
    return <Navigate to={targetUrl} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(name, password);
    
    if (result.success) {
      // Check if user is using default password
      const isDefaultPassword = password === '88888888';
      
      if (isDefaultPassword) {
        // Force password change
        setIsForcePasswordChange(true);
        setShowPasswordDialog(true);
      } else {
        // Redirect to intended page or profile after successful login
        const targetUrl = redirectUrl ? decodeURIComponent(redirectUrl) : '/profile';
        navigate(targetUrl, { replace: true });
      }
    } else {
      setError(result.message);
    }
    
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <img src="/logo.png" alt="铁一定向" className="h-20 w-20 rounded-full object-cover aspect-square" />
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            铁一定向
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            登 录
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm -space-y-px">
            <div>
              <label htmlFor="name" className="sr-only">
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Name (姓名)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <div className="text-red-600 text-sm text-center">{error}</div>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '登录中...' : '登录'}
            </button>
          </div>
        </form>
      </div>
      
      {/* Password Change Dialog */}
      <PasswordChangeDialog
        isOpen={showPasswordDialog}
        isForced={isForcePasswordChange}
        onClose={() => {
          setShowPasswordDialog(false);
          setIsForcePasswordChange(false);
          // After password change, redirect to profile
          const targetUrl = redirectUrl ? decodeURIComponent(redirectUrl) : '/profile';
          navigate(targetUrl, { replace: true });
        }}
      />
    </div>
  );
};

export default Login;