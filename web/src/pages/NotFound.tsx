// web/src/pages/NotFound.tsx
import React from 'react';
import { Link } from '@tanstack/react-router';

export default function NotFound() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-2">Page not found</h1>
      <p className="text-sm text-gray-600 mb-4">The page you’re looking for doesn’t exist.</p>
      <Link to="/" className="rounded border px-3 py-1.5 hover:bg-gray-50 dark:border-neutral-700">
        Go to Home
      </Link>
    </div>
  );
}