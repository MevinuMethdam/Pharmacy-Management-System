import React, { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user } = useContext(AuthContext);

    if (!user) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            return (
                <div className="flex h-screen items-center justify-center bg-gray-50 text-lg font-medium text-gray-600">
                    Loading system...
                </div>
            );
        }
        return <Navigate to="/auth/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/auth/login" replace />;
    }

    return children;
};

export default ProtectedRoute;