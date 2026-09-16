import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:5000/api',
});

const pendingRequests = new Map();

const generateRequestKey = (config) => `${config.method}:${config.url}`;

axiosInstance.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    if (config.method === 'get') {
        const requestKey = generateRequestKey(config);

        if (pendingRequests.has(requestKey)) {
            const abortController = pendingRequests.get(requestKey);
            abortController.abort();
        }

        const controller = new AbortController();
        config.signal = controller.signal;
        pendingRequests.set(requestKey, controller);
    }

    return config;
}, (error) => {
    return Promise.reject(error);
});

axiosInstance.interceptors.response.use(
    (response) => {
        if (response.config.method === 'get') {
            const requestKey = generateRequestKey(response.config);
            pendingRequests.delete(requestKey);
        }
        return response;
    },
    (error) => {
        if (axios.isCancel(error)) {
            console.log('✅ Background request cleanly cancelled by Global Interceptor:', error.message);
        } else if (error.config && error.config.method === 'get') {
            const requestKey = generateRequestKey(error.config);
            pendingRequests.delete(requestKey);
        }
        return Promise.reject(error);
    }
);

axiosInstance.isCancel = axios.isCancel;

export default axiosInstance;