import axios from 'axios';

const rawBaseURL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

const api = axios.create({
    // Consistently handle the /api suffix here so it's not needed in component calls
    baseURL: `${rawBaseURL.replace(/\/$/, '')}/api`,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor — attach JWT token from localStorage
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle 401 globally
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
        } else if (error.response?.status === 403) {
            const data = error.response.data;
            if (data?.code === 'SUBSCRIPTION_EXPIRED' || data?.message?.includes('expired') || data?.message?.includes('frozen')) {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = `/login?error=${encodeURIComponent(data.message)}`;
            }
        }
        return Promise.reject(error);
    }
);

export default api;



// new comment
// new comment
// new comment