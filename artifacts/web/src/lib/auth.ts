import { setAuthTokenGetter } from "@workspace/api-client-react";

export const getToken = () => localStorage.getItem("ourroom_token");
export const setToken = (token: string) => localStorage.setItem("ourroom_token", token);
export const clearToken = () => localStorage.removeItem("ourroom_token");

// Attach to custom-fetch so all generated hooks use it automatically
setAuthTokenGetter(getToken);
