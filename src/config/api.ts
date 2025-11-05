// config/api.ts
import axios from "axios";

export const url = "http://5.182.26.107:4000"
export const socketUrl = "wss://equally-credible-terrier.ngrok-free.app"
export const LOCAL_BASE = "http://localhost:2005";
export const PUBLIC_BASE = "https://equally-credible-terrier.ngrok-free.app";
// http://5.182.26.107:4000

export const $api = axios.create({
  baseURL: url,
});

$api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response?.status === 401 &&
      error.config.url !== "/auth/login"
    ) {
      localStorage.clear();
    }
    return Promise.reject(error);
  }
  );

  $api.defaults.headers.common["Accept"] = "application/json";
  $api.defaults.headers.common["Content-Type"] = "application/json";
  $api.defaults.headers.common["x-device-id"] = 112233445566;
  $api.defaults.headers.common["lang"] = "ru";
  $api.defaults.headers.common["ngrok-skip-browser-warning"] = true;


  export const tokenName = "token";

  export const initApp = () => {
    const token = localStorage.getItem(tokenName);
    $api.defaults.headers.common.Authorization = token ? `Bearer ${token}` : "";
  };

  export const setToken = (token: string) => {
    localStorage.setItem(tokenName, token);
    $api.defaults.headers.common.Authorization = `Bearer ${token}`;
  };

  export const removeToken = () => {
    localStorage.removeItem(tokenName);
    $api.defaults.headers.common.Authorization = "";
  };
