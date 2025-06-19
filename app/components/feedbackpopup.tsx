'use client';

import React, { useState, useEffect } from 'react';

const FeedbackPopup: React.FC = () => {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const isFirstVisit = localStorage.getItem('isFirstVisit');
    if (!isFirstVisit) {
      setShowPopup(true);
      localStorage.setItem('isFirstVisit', 'true');
    }
  }, []);

  const handleClosePopup = () => {
    setShowPopup(false);
  };

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 flex justify-center items-start bg-black bg-opacity-50 z-50">
      <div className="bg-border p-6 rounded-lg mt-10 text-center">
        <h2 className="text-xl font-bold mb-4">We value your feedback!</h2>
        <p className="mb-4">Please take a moment to fill out our feedback form.</p>
        <a 
          href="https://forms.gle/yHaXE4jEubsKsE6f6" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-500 underline mb-4 block"
        >
          Give Feedback
        </a>
        <button 
          onClick={handleClosePopup} 
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default FeedbackPopup;