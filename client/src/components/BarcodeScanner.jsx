import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion } from 'framer-motion';

const BarcodeScanner = ({ onDetected, onClose }) => {
  const scannerId = "html5qr-code-full-region";
  const scannerRef = useRef(null);
  const [permissionError, setPermissionError] = useState(false);

  // Define the exact scan region dimensions. 
  // UPCs are wide and short, so we use a rectangular ratio.
  const scanRegion = { width: 300, height: 120 };

  useEffect(() => {
    const scanner = new Html5Qrcode(scannerId);
    scannerRef.current = scanner;

    const config = {
      fps: 15,
      qrbox: scanRegion, // Forces the scanner to ONLY read inside this box
      aspectRatio: 1.0,
      disableFlip: false,
    };

    // Start the camera
    scanner.start(
      { facingMode: "environment" }, 
      config,
      (decodedText) => {
        // Success callback
        // Optional: Add a vibration on success for tactile feedback
        if (navigator.vibrate) navigator.vibrate(200);
        
        onDetected(decodedText);
        
        // Stop scanning immediately after detection to prevent duplicates
        scanner.stop().catch(err => console.error("Failed to stop", err));
      },
      (errorMessage) => {
        // scan failure callback (fires frequently, usually ignored)
      }
    ).catch(err => {
      console.error("Camera start error:", err);
      setPermissionError(true);
    });

    // Cleanup
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch(console.error);
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, [onDetected]);

  return (
    <div className="fixed inset-0 z-[12000] bg-slate-900 flex flex-col font-['Switzer']">
      
      {/* 1. The Video Layer */}
      {/* We make this cover the screen. The scanner library injects the <video> here */}
      <div id={scannerId} className="absolute inset-0 w-full h-full object-cover" />

      {/* 2. The Visual Overlay (The "Darkening" + Clear Window) */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* This div creates the clear window. 
            The massive box-shadow creates the dark overlay around it.
            This guarantees the "hole" aligns perfectly with the center of the screen.
        */}
        <div 
          className="relative rounded-2xl border-2 border-emerald-500/50 shadow-[0_0_0_9999px_rgba(15,23,42,0.90)] z-10"
          style={{ width: scanRegion.width, height: scanRegion.height }}
        >
            {/* Animated Scanning Line */}
            <motion.div 
                animate={{ top: ['0%', '100%', '0%'] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
            />
            
            {/* Corner Indicators for aesthetics */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 -mt-0.5 -ml-0.5 rounded-tl-lg"/>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 -mt-0.5 -mr-0.5 rounded-tr-lg"/>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 -mb-0.5 -ml-0.5 rounded-bl-lg"/>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 -mb-0.5 -mr-0.5 rounded-br-lg"/>
        </div>
      </div>

      {/* 3. UI Controls Layer */}
      <div className="relative z-20 flex-1 flex flex-col justify-between p-6 pointer-events-none">
        
        {/* Header */}
        <div className="flex justify-between items-start pt-8 pointer-events-auto">
          <div>
            <h2 className="text-white text-xl font-black tracking-tight drop-shadow-md">Scan Product</h2>
            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest mt-1 drop-shadow-sm">
                Fit barcode inside the box
            </p>
          </div>
          <button 
            onClick={onClose}
            className="h-10 px-4 bg-black/40 hover:bg-black/60 backdrop-blur-md text-white text-xs font-bold rounded-xl border border-white/10 transition-colors"
          >
            Close
          </button>
        </div>

        {/* Error Message */}
        {permissionError && (
            <div className="self-center bg-rose-500/90 text-white px-6 py-4 rounded-2xl max-w-xs text-center">
                <p className="font-bold text-sm mb-1">Camera Access Denied</p>
                <p className="text-xs opacity-90">Please enable camera permissions in your browser settings to scan products.</p>
            </div>
        )}

        {/* Footer Instructions */}
        <div className="text-center pb-8 pointer-events-auto">
             <div className="inline-flex items-center gap-2 bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-white text-[10px] font-bold uppercase tracking-widest">
                    Searching...
                </p>
            </div>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;