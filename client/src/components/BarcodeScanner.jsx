import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

const BarcodeScanner = ({ onDetected, onClose }) => {
  const scannerId = "html5qr-code-full-region";
  const scannerRef = useRef(null);
  const [permissionError, setPermissionError] = useState(false);

  // Define the exact scan region dimensions. 
  const scanRegion = { width: 300, height: 120 };

  useEffect(() => {
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    const config = {
      fps: 15,
      qrbox: scanRegion,
      aspectRatio: window.innerWidth / window.innerHeight, // Match screen ratio
      disableFlip: false,
    };

    scanner.start(
      { facingMode: "environment" }, 
      config,
      (decodedText) => {
        if (navigator.vibrate) navigator.vibrate(200);
        onDetected(decodedText);
        scanner.stop().catch(err => console.error("Failed to stop", err));
      },
      (errorMessage) => {
        // Scanning...
      }
    ).catch(err => {
      console.error("Camera start error:", err);
      setPermissionError(true);
    });

    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[12000] bg-black flex flex-col font-sans overflow-hidden">
      
      {/* 1. The Video Layer - Full Screen, No Filters */}
      <div id={scannerId} className="absolute inset-0 w-full h-full [&>video]:object-cover [&>video]:w-full [&>video]:h-full" />

      {/* 2. The Viewfinder Layer */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        
        {/* The Reticle / Frame */}
        <div 
          className="relative z-10 bg-transparent"
          style={{ width: scanRegion.width, height: scanRegion.height }}
        >
            {/* High Contrast Border: White Inner, Black Outer to work on ANY background */}
            <div className="absolute inset-0 border-[6px] border-white shadow-[0_0_0_4px_black]"></div>
            
            {/* Corner Accents for "Tech" feel */}
            <div className="absolute -top-3 -left-3 w-8 h-8 border-t-8 border-l-8 border-black"></div>
            <div className="absolute -top-3 -right-3 w-8 h-8 border-t-8 border-r-8 border-black"></div>
            <div className="absolute -bottom-3 -left-3 w-8 h-8 border-b-8 border-l-8 border-black"></div>
            <div className="absolute -bottom-3 -right-3 w-8 h-8 border-b-8 border-r-8 border-black"></div>
            
            {/* "SCAN" Label attached to the box */}
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-[#FFD700] border-4 border-black px-3 py-1">
                <p className="text-black font-black text-xs uppercase tracking-widest leading-none">Target Zone</p>
            </div>
        </div>
      </div>

      {/* 3. UI Controls Layer */}
      <div className="relative z-20 flex-1 flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Header */}
        <div className="flex justify-between items-start pt-safe-top pointer-events-auto">
          <div className="bg-white border-4 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-black text-2xl font-black uppercase leading-none">Scanner</h2>
          </div>
          
          <button 
            onClick={onClose}
            className="w-12 h-12 bg-[#FF5252] border-4 border-black flex items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all"
          >
            <span className="text-white font-black text-xl">✕</span>
          </button>
        </div>

        {/* Error Message */}
        {permissionError && (
            <div className="self-center pointer-events-auto bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_#FF5252] max-w-xs text-center">
                <p className="font-black text-xl uppercase mb-2">Camera Blocked</p>
                <p className="text-sm font-bold text-gray-500 uppercase">Allow camera access in your browser settings.</p>
            </div>
        )}

        {/* Footer Instructions */}
        <div className="pb-8 pointer-events-auto text-center">
             <div className="inline-block bg-white border-4 border-black px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                <p className="text-black text-sm font-black uppercase tracking-widest">
                    Align Barcode in Box
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;