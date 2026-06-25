import axios from 'axios';

// Use the local server proxy to communicate with Evolution API
// This avoids CORS issues and keeps the API key secure on the server
const apiURL = '/api/whatsapp/';
const instanceName = import.meta.env.VITE_EVOLUTION_INSTANCE_NAME || 'default';

const api = axios.create({
  baseURL: apiURL,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const whatsappService = {
  checkStatus: async () => {
    try {
      const response = await api.get(`instance/connectionState/${encodeURIComponent(instanceName)}`);
      return response.data;
    } catch (error) {
      console.error('Error checking WhatsApp status:', error);
      throw error;
    }
  },

  getQRCode: async () => {
    try {
      const response = await api.get(`instance/connect/${encodeURIComponent(instanceName)}`);
      return response.data;
    } catch (error) {
      console.error('Error getting WhatsApp QR Code:', error);
      throw error;
    }
  },

  sendMessage: async (number: string, text: string) => {
    try {
      const formattedNumber = number.replace(/\D/g, '');
      const response = await api.post(`message/sendText/${encodeURIComponent(instanceName)}`, {
        number: formattedNumber,
        options: {
          delay: 1200,
          presence: 'composing',
          linkPreview: false
        },
        textMessage: {
          text: text
        }
      });
      return response.data;
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      throw error;
    }
  },

  logout: async () => {
    try {
      const response = await api.delete(`instance/logout/${encodeURIComponent(instanceName)}`);
      return response.data;
    } catch (error) {
      console.error('Error logging out WhatsApp:', error);
      throw error;
    }
  }
};
