import React from 'react';

const Loader = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] animate-in fade-in duration-500">
      <div className="relative w-12 h-12">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 dark:border-gray-700 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-900 dark:border-gray-100 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <p className="mt-4 text-sm text-gray-500 font-medium animate-pulse">Loading...</p>
    </div>
  );
};

export default Loader;