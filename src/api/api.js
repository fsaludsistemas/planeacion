import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_BASE_LOCAL ||
  "https://planeacion-server.vercel.app";

const api = axios.create({
  baseURL: API_URL,
});


export const getData = async () => {
  const response = await api.get("/getAllSheetsData");
  return response.data;
};

export default api;