// src/services/LogMealService.js

const API_URL = 'https://api.logmeal.es/v2';
const API_TOKEN = import.meta.env.VITE_LOGMEAL_TOKEN;

export const analyzePlate = async (imageBlob) => {
  const formData = new FormData();
  formData.append('image', imageBlob);

  try {
    // 1. Send Image for Segmentation/Analysis
    const response = await fetch(`${API_URL}/image/segmentation/complete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`
      },
      body: formData
    });

    if (!response.ok) throw new Error('LogMeal Analysis Failed');
    
    const data = await response.json();
    
    // LogMeal returns a lot of data; we mainly want the detected food items
    // usually found in data.segmentation_results or data.recognition_results
    return data; 
  } catch (error) {
    console.error("LogMeal Service Error:", error);
    throw error;
  }
};

export const confirmDish = async (imageId, classId) => {
  // Optional: If you need to confirm a specific dish to get detailed nutrition
  try {
    const response = await fetch(`${API_URL}/nutrition/recipe/ingredients`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ imageId, class_id: classId })
    });
    return await response.json();
  } catch (error) {
    console.error("LogMeal Confirmation Error:", error);
    return null;
  }
};