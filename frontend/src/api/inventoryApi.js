import axios from 'axios';

const API_URL = 'http://localhost:5000/api/medicines';

const getAuthHeader = () => {
    const token = localStorage.getItem('token');
    return { headers: { Authorization: `Bearer ${token}` } };
};

export const inventoryApi = {
    getAll: async () => {
        return await axios.get(API_URL, getAuthHeader());
    },
    add: async (medicineData) => {
        return await axios.post(API_URL, medicineData, getAuthHeader());
    },
    update: async (id, medicineData) => {
        return await axios.put(`${API_URL}/${id}`, medicineData, getAuthHeader());
    },
    delete: async (id) => {
        return await axios.delete(`${API_URL}/${id}`, getAuthHeader());
    }
};