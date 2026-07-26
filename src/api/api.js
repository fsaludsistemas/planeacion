import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_BASE ||
  import.meta.env.VITE_API_BASE_LOCAL ||
  "https://planeacion-server.vercel.app";

const api = axios.create({
  baseURL: API_URL,
});

export const getData = async () => {
  const response = await api.get("/getAllSheetsData");
  return response.data;
};

export const createSheetRow = async (sheetName, data) => {
  try {
    const response = await api.post(`/${sheetName}`, { data });
    console.log("Create sheet row response:", response);
    console.log("Response data:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error creating sheet row:", error);
    throw error;
  }
};

export const saveEvidenceRow = async (indicatorId, fieldName, urlValue) => {
  try {
    const response = await api.post(`/evidencias/${indicatorId}`, {
      data: {
        [fieldName]: urlValue,
      },
    });
    console.log("Save evidence row response:", response.data);
    return response.data;
  } catch (error) {
    console.error("Error saving evidence row:", error);
    throw error;
  }
};

export const updateSheetRow = async (sheetName, id, data) => {
  try {
    const response = await api.put(`/${sheetName}/${id}`, { data });
    return response.data;
  } catch (error) {
    console.error("Error updating sheet row:", error);
    throw error;
  }
};

export const deleteSheetRow = async (sheetName, id) => {
  try {
    const response = await api.delete(`/${sheetName}/${id}`);
    return response.data;
  } catch (error) {
    console.error("Error deleting sheet row:", error);
    throw error;
  }
};

export const sendEmail = async (payload) => {
  try {
    const response = await api.post("/send-email", payload);
    return response.data;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export default api;
