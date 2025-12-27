// src/api/userClient.ts
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE?.trim() || 'http://localhost:8000'

// окремий клієнт під ГЛЯДАЧА (viewer)
const userApi = axios.create({
  baseURL,
  // логін по коду у нас кладе токен у cookie -> треба відправляти cookie
  withCredentials: true,
})

export default userApi
