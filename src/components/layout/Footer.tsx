import React from 'react';

export default function Footer() {
  return (
    <footer className="bg-gray-50 border-t">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center text-gray-500 text-sm">
          <p>&copy; {new Date().getFullYear()} Excel Merger. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
} 