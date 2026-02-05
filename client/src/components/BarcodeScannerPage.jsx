import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { doc, updateDoc, arrayUnion } from "firebase/firestore";
import { db } from '../firebase';
import { motion } from 'framer-motion';

// --- CONFIG ---
const USDA_API_KEY = '47ccOoSTZvhVDw3YpNh4nGCwSbLs98XOJufWOcY7';

const BarcodeScannerPage = ({ userProfile }) => {
    const navigate = useNavigate();
    const scannerRef = useRef(null);
    
    // States
    const [scanStatus, setScanStatus] = useState('Align barcode in window');
    const [isScanning, setIsScanning] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [scannedProduct, setScannedProduct] = useState(null);
    const [portionSize, setPortionSize] = useState(1.0);
    const [trackingSuccess, setTrackingSuccess] = useState(false);
    const [errorMsg, setErrorMsg] = useState(null);

    // Define Scan Dimensions (Landscape rectangle for barcodes)
    const scanRegion = { width: 300, height: 150 };

    // --- 1. AUTO-START CAMERA ---
    useEffect(() => {
        if (!isScanning || scannedProduct) return;

        const startScanner = async () => {
            try {
                // Check if element exists before starting
                if (!document.getElementById("reader")) return;

                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;
                
                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    { 
                        fps: 15, 
                        // IMPORTANT: Forces scanner to only read inside our visual box
                        qrbox: scanRegion,
                        aspectRatio: window.innerHeight / window.innerWidth,
                        disableFlip: false
                    },
                    (decodedText) => handleScanSuccess(decodedText, html5QrCode),
                    () => {} 
                );
            } catch (err) {
                console.error("Scanner Error:", err);
                setScanStatus("Camera permission denied");
            }
        };

        // Small delay to ensure DOM is ready
        const timer = setTimeout(startScanner, 100);
        
        return () => {
            clearTimeout(timer);
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
                scannerRef.current.clear().catch(console.error);
            }
        };
    }, [isScanning, scannedProduct]);

    // --- 2. HANDLE SCAN ---
    const handleScanSuccess = async (barcode, scannerInstance) => {
        // Stop scanning immediately
        if (scannerInstance && scannerInstance.isScanning) {
            await scannerInstance.stop();
            scannerInstance.clear();
            scannerRef.current = null;
        }
        
        if (navigator.vibrate) navigator.vibrate(200);
        setIsScanning(false);
        setIsLoading(true);
        setScanStatus("Searching database...");

        try {
            const res = await fetch(`https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${USDA_API_KEY}&query=${barcode}&dataType=Branded`);
            const data = await res.json();

            if (data.foods && data.foods.length > 0) {
                const food = data.foods[0];
                const detailRes = await fetch(`https://api.nal.usda.gov/fdc/v1/food/${food.fdcId}?api_key=${USDA_API_KEY}`);
                const detailData = await detailRes.json();
                
                const rawSize = detailData.servingSize || 100;
                const multiplier = rawSize / 100;
                const getNut = (ids) => ({ amount: Math.round((detailData.foodNutrients?.find(nut => ids.includes(String(nut.nutrient.number)))?.amount || 0) * multiplier * 10) / 10 });

                setScannedProduct({
                    name: detailData.description,
                    brand: detailData.brandOwner || "Generic",
                    servingLabel: `${rawSize}${detailData.servingSizeUnit || 'g'}`,
                    coreMetrics: { 
                        calories: getNut(['208', '1008']), protein: getNut(['203']), fat: getNut(['204']), carbs: getNut(['205']) 
                    }
                });
            } else {
                setErrorMsg("Barcode not found in database.");
            }
        } catch (err) {
            setErrorMsg("Network error. Check connection.");
        } finally {
            setIsLoading(false);
        }
    };

    // --- 3. SAVE ---
    const handleSave = async () => {
        if (!userProfile?.uid || !scannedProduct) return;
        const base = scannedProduct.coreMetrics;
        const trackedMetrics = {}; 
        Object.keys(base).forEach(key => { trackedMetrics[key] = { amount: Math.round((base[key]?.amount || 0) * portionSize) }; });
        
        const newLogEntry = { 
            ...trackedMetrics, 
            name: scannedProduct.name, 
            brand: scannedProduct.brand, 
            portion: Number(portionSize), 
            meal: 'Snacks', 
            timestamp: new Date().toISOString() 
        };

        try {
            await updateDoc(doc(db, "users", userProfile.uid), { dailyIntake: arrayUnion(newLogEntry) });
            setTrackingSuccess(true);
            setTimeout(() => navigate('/'), 1500);
        } catch (e) { setErrorMsg("Save failed."); }
    };

    return (
        <div className="fixed inset-0 bg-slate-900 z-[12000] font-['Switzer'] flex flex-col">
            
            {/* Header Controls (Close Button) */}
            <div className="absolute top-0 left-0 right-0 p-6 z-30 flex justify-between items-center pointer-events-none">
                <button 
                    onClick={() => navigate('/')} 
                    className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white pointer-events-auto border border-white/10"
                >
                    ✕
                </button>
            </div>

            {/* --- SCANNER VIEW --- */}
            {isScanning && (
                <div className="absolute inset-0 w-full h-full bg-black">
                    {/* 1. Raw Video Feed */}
                    <div id="reader" className="w-full h-full object-cover" />
                    
                    {/* 2. Visual Overlay (The "Darkening" + Clear Window) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
                        {/* The clear window box with massive shadow */}
                        <div 
                            className="relative rounded-2xl border-2 border-emerald-500/50 shadow-[0_0_0_9999px_rgba(0,0,0,0.85)]"
                            style={{ width: scanRegion.width, height: scanRegion.height }}
                        >
                            {/* Animated Scanning Line */}
                            <motion.div 
                                animate={{ top: ['0%', '100%', '0%'] }}
                                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_rgba(52,211,153,0.8)]"
                            />
                            
                            {/* Corner Indicators */}
                            <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-emerald-500 -mt-0.5 -ml-0.5 rounded-tl-lg"/>
                            <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-emerald-500 -mt-0.5 -mr-0.5 rounded-tr-lg"/>
                            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-emerald-500 -mb-0.5 -ml-0.5 rounded-bl-lg"/>
                            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-emerald-500 -mb-0.5 -mr-0.5 rounded-br-lg"/>
                        </div>
                    </div>

                    {/* 3. Helper Text Overlay */}
                    <div className="absolute bottom-24 left-0 right-0 text-center z-20 pointer-events-none">
                        <div className="inline-block bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10">
                            <p className="text-white text-[10px] font-bold uppercase tracking-widest">{scanStatus}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* --- LOADING --- */}
            {isLoading && (
                <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-900">
                    <div className="w-12 h-12 border-4 border-white/10 border-t-emerald-500 rounded-full animate-spin mb-6" />
                    <p className="text-white font-bold text-sm uppercase tracking-widest animate-pulse">Processing Barcode...</p>
                </div>
            )}

            {/* --- RESULT CARD --- */}
            {scannedProduct && !trackingSuccess && (
                <div className="fixed inset-0 z-50 flex flex-col justify-end pointer-events-none">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
                    <motion.div 
                        initial={{ y: "100%" }} 
                        animate={{ y: 0 }} 
                        className="bg-white w-full rounded-t-[2rem] p-6 pb-8 shadow-2xl relative pointer-events-auto max-h-[90vh] overflow-y-auto no-scrollbar"
                    >
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8" />
                        
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight mb-2">{scannedProduct.name}</h2>
                            <span className="inline-block bg-slate-50 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full">{scannedProduct.brand}</span>
                        </div>

                        <div className="grid grid-cols-4 gap-3 mb-8">
                            {['calories', 'protein', 'carbs', 'fat'].map(m => (
                                <div key={m} className="bg-slate-50 rounded-2xl p-4 flex flex-col items-center justify-center aspect-square border border-slate-100">
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">{m.slice(0,3)}</span>
                                    <span className="text-xl font-black text-slate-900 leading-none">{Math.round((scannedProduct.coreMetrics[m]?.amount || 0) * portionSize)}</span>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between mb-8 bg-slate-50 p-3 rounded-2xl border border-slate-100">
                            <button onClick={() => setPortionSize(p => Math.max(0.5, p - 0.5))} className="w-12 h-12 bg-white rounded-xl text-xl font-bold text-slate-900 shadow-sm active:scale-90 transition-transform">-</button>
                            <div className="text-center">
                                <span className="block text-3xl font-bold text-slate-900 leading-none mb-1">{portionSize}<span className="text-xl text-slate-300 ml-1">x</span></span>
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">({scannedProduct.servingLabel})</span>
                            </div>
                            <button onClick={() => setPortionSize(p => p + 0.5)} className="w-12 h-12 bg-white rounded-xl text-xl font-bold text-slate-900 shadow-sm active:scale-90 transition-transform">+</button>
                        </div>

                        <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all">Add to Log</button>
                    </motion.div>
                </div>
            )}

            {/* --- ERROR --- */}
            {errorMsg && (
                <div className="absolute inset-0 z-[60] flex flex-col items-center justify-center bg-white p-8 text-center">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500 text-2xl font-bold">!</div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Scan Failed</h3>
                    <p className="text-slate-500 mb-8 font-medium max-w-[200px]">{errorMsg}</p>
                    <button onClick={() => { setErrorMsg(null); setIsScanning(true); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs mb-3">Try Again</button>
                    <button onClick={() => navigate('/')} className="text-xs font-bold text-slate-400 uppercase tracking-widest p-2">Cancel</button>
                </div>
            )}
        </div>
    );
};

export default BarcodeScannerPage;