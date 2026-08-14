import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from '../pages/auth/Login';
import ProtectedRoute from './ProtectedRoute';

import AdminDashboard from '../pages/admin/AdminDashboard';
import InventoryPage from '../pages/admin/InventoryPage';
import SuppliersPage from '../pages/admin/SuppliersPage';
import POSPage from '../pages/pos/POSPage';

import PrescriptionsPage from '../pages/prescriptions/PrescriptionsPage';
import NMRALogsPage from '../pages/prescriptions/NMRALogsPage';

import CRMPage from '../pages/crm/CRMPage';
import AIOutbreakRadar from '../pages/admin/AIOutbreakRadar';
const PharmacistDashboard = () => <div className="p-10 text-2xl font-bold text-center mt-10">Pharmacist Dashboard ⚕️</div>;

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/auth/login" element={<Login />} />

            <Route
                path="/admin"
                element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                        <AdminDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/inventory"
                element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                        <InventoryPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/suppliers"
                element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                        <SuppliersPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/prescriptions"
                element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                        <PrescriptionsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/nmra-logs"
                element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                        <NMRALogsPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/crm"
                element={
                    <ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}>
                        <CRMPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin/ai-outbreak"
                element={
                    <ProtectedRoute allowedRoles={['Admin']}>
                        <AIOutbreakRadar />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/pharmacist/*"
                element={
                    <ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}>
                        <PharmacistDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/pos/*"
                element={
                    <ProtectedRoute allowedRoles={['Cashier', 'Admin']}>
                        <POSPage />
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<Navigate to="/auth/login" replace />} />
        </Routes>
    );
};

export default AppRoutes;