import React, { useRef, useState, useCallback } from 'react';
import Webcam from "react-webcam"; // You might need to install this: npm install react-webcam
import { analyzePlate } from '../services/LogMealService';
import { motion } from 'framer-motion';

const videoConstraints = {
  facingMode: "environment" // Use back camera on mobile
};

export const PlateScanner = ({ onResult, onClose }) => {
  const webcamRef = useRef(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const capture = useCallback(async () => {
    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) return;

    setIsAnalyzing(true);

    try {
      // Convert base64 to blob
      const res = await fetch(imageSrc);
      const blob = await res.blob();

      // Send to LogMeal
      const analysis = await analyzePlate(blob);
      
      // Pass result back to Dashboard
      onResult(analysis); 
    } catch (err) {
      console.error(err);
      alert("Failed to analyze food. Please try again.");
      setIsAnalyzing(false);
    }
  }, [webcamRef, onResult]);

  return (
    <div className="fixed inset-0 z-[10000] bg-black flex flex-col items-center justify-center">
      {/* Camera View */}
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        className="w-full h-full object-cover"
      />

      {/* Overlay UI */}
      <div className="absolute bottom-0 left-0 right-0 p-10 flex flex-col items-center gap-6 pointer-events-auto bg-gradient-to-t from-black/80 to-transparent">
        {isAnalyzing ? (
          <div className="flex flex-col items-center gap-3">
             <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
             <p className="text-white font-bold text-sm tracking-widest uppercase">Analyzing Plate...</p>
          </div>
        ) : (
          <button 
            onClick={capture}
            className="w-20 h-20 bg-white rounded-full border-4 border-slate-200 shadow-xl active:scale-95 transition-transform flex items-center justify-center"
          >
            <div className="w-16 h-16 bg-emerald-500 rounded-full"></div>
          </button>
        )}

        <button onClick={onClose} className="text-white font-bold text-xs uppercase tracking-widest px-4 py-2 bg-white/10 rounded-full backdrop-blur-md mt-4">
          Cancel
        </button>
      </div>
    </div>
  );
};