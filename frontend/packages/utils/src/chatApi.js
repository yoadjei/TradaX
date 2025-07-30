import axios from 'axios';

const RAPIDAPI_KEY = '2637cfa6famshdf32eaafc990988p18cb96jsn78addc0c9c0c';
const RAPIDAPI_HOST = 'chatgpt-42.p.rapidapi.com';

export const chatApi = {
  async sendMessage(userMessage) {
    try {
      const response = await axios.post(
        'https://chatgpt-42.p.rapidapi.com/chat',
        {
          messages: [{ role: 'user', content: userMessage }],
          model: 'gpt-4o-mini',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-RapidAPI-Key': RAPIDAPI_KEY,
            'X-RapidAPI-Host': RAPIDAPI_HOST,
          },
        }
      );

      console.log('RapidAPI Response:', response.data);

      if (response.data?.choices?.[0]?.message?.content) {
        return response.data.choices[0].message.content.trim();
      } else {
        throw new Error('No AI response.');
      }
    } catch (error) {
      console.error('RapidAPI Chat Error:', error);
      throw error;
    }
  },
};
