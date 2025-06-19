'use client';

import React from 'react';

const Loading: React.FC = () => {
  return (
    <>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 mb-4"></div>
            <p>Loading...</p>
          </div>
        </div>
    </>
  );
};

export default Loading;