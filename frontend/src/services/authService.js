import api from './api';

export const loginUser = async (email, password) => {
    try {
        const response = await api.post('/auth/login', { email, password });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || 'Login failed. Please try again.';
    }
};

export const verifyAdminOtp = async (email, otp) => {
    try {
        const response = await api.post('/auth/verify-otp', { email, otp });
        return response.data;
    } catch (error) {
        throw error.response?.data?.message || error.response?.data?.error || 'Invalid or expired OTP code.';
    }
};