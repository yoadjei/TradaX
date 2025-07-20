import axios from 'axios';
import Constants from 'expo-constants';

const HUGGINGFACE_API_KEY = Constants.expoConfig?.extra?.HUGGINGFACE_API_KEY;

if (!HUGGINGFACE_API_KEY) {
  console.warn('⚠️ Hugging Face API key is not defined. Add it to app.json under expo.extra or your .env file.');
}

const MODEL = 'gpt2'; // You can change this to another model like 'tiiuae/falcon-7b-instruct' if desired.

export const sendMessage = async (userMessage) => {
  try {
    const response = await axios.post(
      `https://api-inference.huggingface.co/models/${MODEL}`,
      { inputs: userMessage },
      {
        headers: {
          Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data && Array.isArray(response.data) && response.data.length > 0) {
      return response.data[0].generated_text.trim();
    } else {
      throw new Error('No response text generated.');
    }
  } catch (error) {
    console.error('Hugging Face API Error:', error);
    throw error;
  }
};
