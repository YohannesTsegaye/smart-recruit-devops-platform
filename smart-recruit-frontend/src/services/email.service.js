import axios from "axios";
import { API_BASE_URL } from "./apiBase";

const API_URL = `${API_BASE_URL}/auth/login`;

export const EmailService = {
  sendStatusUpdateEmail: async (candidateData) => {
    try {
      const response = await axios.post(
        `${API_URL}/status-update`,
        candidateData
      );
      return response.data;
    } catch (error) {
      console.error("Failed to send status update email:", error);
      throw error;
    }
  },
};

export default EmailService;
