import { useState, useEffect } from 'react';

export default function SecurityAlertBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Fetch current user to check passwordResetAt
    const fetchUser = async () => {
      try {
        const response = await fetch('http://localhost:4000/api/auth/me', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          setUser(data);

          // Check if password was reset in last 7 days
          if (data.passwordResetAt) {
            const resetDate = new Date(data.passwordResetAt);
            const now = new Date();
            const daysSinceReset = (now.getTime() - resetDate.getTime()) / (1000 * 60 * 60 * 24);
            
            if (daysSinceReset <= 7) {
              setShowBanner(true);
            }
          }
        }
      } catch (error) {
        console.error('Failed to fetch user:', error);
      }
    };

    fetchUser();
  }, []);

  if (!showBanner) {
    return null;
  }

  return (
    <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-300">
            Security Notice
          </h3>
          <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-400">
            Your password was recently reset by an administrator. If you did not request this change, please contact your administrator immediately and change your password.
          </p>
        </div>
        <div className="ml-auto pl-3">
          <button
            onClick={() => setShowBanner(false)}
            className="inline-flex text-yellow-400 hover:text-yellow-600 focus:outline-none"
          >
            <span className="sr-only">Dismiss</span>
            <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
