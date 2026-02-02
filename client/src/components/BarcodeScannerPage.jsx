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

    // --- 1. AUTO-START CAMERA ---
    useEffect(() => {
        if (!isScanning || scannedProduct) return;

        const startScanner = async () => {
            try {
                const html5QrCode = new Html5Qrcode("reader");
                scannerRef.current = html5QrCode;
                
                // Calculate dimensions for a horizontal box (Landscape)
                const width = window.innerWidth;
                const boxWidth = Math.min(width * 0.8, 350); // 80% of screen or max 350px
                const boxHeight = 150; // Fixed height for barcodes

                await html5QrCode.start(
                    { facingMode: "environment" }, 
                    { 
                        fps: 15, 
                        // IMPORTANT: Defines the active scanning strip (Horizontal)
                        qrbox: { width: boxWidth, height: boxHeight },
                        aspectRatio: window.innerHeight / window.innerWidth
                    },
                    (decodedText) => handleScanSuccess(decodedText, html5QrCode),
                    () => {} 
                );
            } catch (err) {
                setScanStatus("Camera permission denied");
            }
        };

        const timer = setTimeout(startScanner, 100);
        return () => {
            clearTimeout(timer);
            if (scannerRef.current?.isScanning) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, [isScanning, scannedProduct]);

    // --- 2. HANDLE SCAN ---
    const handleScanSuccess = async (barcode, scannerInstance) => {
        if (scannerInstance) {
            await scannerInstance.stop();
            scannerRef.current = null;
        }
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
        <div className="fixed inset-0 bg-black z-[12000] font-['Switzer'] flex flex-col">
            
            {/* Header Overlay */}
            <div className="absolute top-0 left-0 right-0 p-6 z-20 flex justify-between items-center pointer-events-none">
                <button onClick={() => navigate('/')} className="w-10 h-10 bg-black/40 backdrop-blur-md rounded-full flex items-center justify-center text-white pointer-events-auto">✕</button>
                <div className="w-10" /> 
            </div>

            {/* --- SCANNER VIEW --- */}
            {isScanning && (
                <div className="flex-1 relative bg-black overflow-hidden">
                    <div id="reader" className="w-full h-full object-cover scale-110" /> {/* Scaled to remove edges */}
                    
                   
                            {/* Text Hint */}
                            <div className="absolute -bottom-12 left-0 right-0 text-center">
                                <span className="text-white/80 text-sm font-bold tracking-widest uppercase bg-black/40 px-3 py-1 rounded-full">{scanStatus}</span>
                            </div>
                        </div>
                   
                
            )}

            {/* --- LOADING --- */}
            {isLoading && (
                <div className="flex-1 flex flex-col items-center justify-center bg-slate-900">
                    <div className="w-10 h-10 border-4 border-white/20 border-t-emerald-500 rounded-full animate-spin mb-4" />
                    <p className="text-white font-bold text-sm uppercase tracking-widest">Looking up product...</p>
                </div>
            )}

            {/* --- RESULT CARD --- */}
            {scannedProduct && !trackingSuccess && (
                <div className="flex-1 bg-black/80 backdrop-blur-sm flex flex-col justify-end">
                    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} className="bg-white rounded-t-[2.5rem] p-8 shadow-2xl h-auto max-h-[85vh] flex flex-col pb-12">
                        <div className="w-12 h-1.5 bg-slate-100 rounded-full mx-auto mb-8 shrink-0" />
                        
                        <div className="flex-1 overflow-y-auto no-scrollbar">
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
                        </div>

                        <button onClick={handleSave} className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-4">Add to Log</button>
                    </motion.div>
                </div>
            )}

            {/* --- ERROR --- */}
            {errorMsg && (
                <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white p-8 text-center">
                    <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mb-4 text-rose-500 text-2xl font-bold">!</div>
                    <h3 className="text-xl font-black text-slate-900 mb-2">Scan Failed</h3>
                    <p className="text-slate-500 mb-8 font-medium">{errorMsg}</p>
                    <button onClick={() => { setErrorMsg(null); setIsScanning(true); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold uppercase tracking-widest text-xs">Try Again</button>
                    <button onClick={() => navigate('/')} className="mt-4 text-xs font-bold text-slate-400 uppercase tracking-widest">Cancel</button>
                </div>
            )}
        </div>
    );
};

export default BarcodeScannerPage;