import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

const BarcodeScanner = ({ onDetected, onClose }) => {
  const scannerRef = useRef(null);
  const regionId = "html5qr-code-full-region";

  useEffect(() => {
    // 1. Initialize the scanner with optimized settings for food packaging
    const scanner = new Html5QrcodeScanner(regionId, {
      fps: 10,                 // Frames per second for smooth scanning
      qrbox: { width: 250, height: 150 }, // Rectangular box fits standard barcodes better
      aspectRatio: 1.0,        // Ensures the video feed doesn't stretch
      rememberLastUsedCamera: true,
      supportedScanTypes: [0]  // Focuses specifically on camera scanning
    });

    // 2. Define success and failure callbacks
    const onScanSuccess = (decodedText) => {
      // decodedText will be the UPC string (e.g., "012345678901")
      onDetected(decodedText);
      // Clean up the scanner once a code is found
      scanner.clear().catch(error => console.error("Failed to clear scanner", error));
    };

    const onScanFailure = (error) => {
      // This fires continuously while no barcode is in view; usually left empty
    };

    // 3. Render the scanner into the DOM
    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;

    // Cleanup: Stop the camera when the component unmounts
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => console.error("Cleanup failed", error));
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[12000] bg-slate-900/95 backdrop-blur-md flex flex-col font-['Switzer'] p-6">
      {/* Header UI */}
      <div className="flex justify-between items-center mb-8 pt-4">
        <div>
          <h2 className="text-white text-xl font-black tracking-tight">Scan Product</h2>
          <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-1">Point at a barcode</p>
        </div>
        <button 
          onClick={onClose}
          className="h-10 px-4 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors"
        >
          Close
        </button>
      </div>

      {/* The Scanner Viewfinder */}
      <div className="relative flex-1 flex items-center justify-center">
        <div 
          id={regionId} 
          className="w-full max-w-sm rounded-3xl overflow-hidden border-2 border-white/10 shadow-2xl"
        ></div>
        
        {/* Subtle Overlay Hint */}
        <div className="absolute inset-0 pointer-events-none border-[40px] border-slate-900/40 rounded-3xl"></div>
      </div>

      {/* Footer Instructions */}
      <div className="mt-8 text-center">
        <p className="text-slate-500 text-[11px] font-medium leading-relaxed max-w-[200px] mx-auto">
          For best results, ensure the barcode is well-lit and centered in the frame.
        </p>
      </div>
    </div>
  );
};

export default BarcodeScanner;