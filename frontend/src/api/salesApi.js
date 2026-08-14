import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const salesApi = {
    list: async (params) => {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_URL}/sales`, {
            params,
            headers: { Authorization: `Bearer ${token}` }
        });
        return res;
    },

    checkout: async (data) => {
        const token = localStorage.getItem('token');
        const res = await axios.post(`${API_URL}/sales/checkout`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res;
    },

    updateSale: async (saleId, data) => {
        const token = localStorage.getItem('token');
        const res = await axios.put(`${API_URL}/sales/${saleId}`, data, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res;
    },

    voidSale: async (saleId) => {
        const token = localStorage.getItem('token');
        const res = await axios.delete(`${API_URL}/sales/${saleId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res;
    }
};