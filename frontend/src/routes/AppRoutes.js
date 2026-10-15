import React, { useContext } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

import LandingPage from '../pages/LandingPage';

import Login from '../pages/auth/Login';
import ProtectedRoute from './ProtectedRoute';

import AdminDashboard from '../pages/admin/AdminDashboard';
import InventoryPage from '../pages/admin/InventoryPage';
import ReturnsDisposalsPage from '../pages/admin/ReturnsDisposalsPage';
import SuppliersPage from '../pages/admin/SuppliersPage';
import PurchasesPage from '../pages/admin/PurchasesPage';
import PrescriptionsPage from '../pages/prescriptions/PrescriptionsPage';
import NMRALogsPage from '../pages/prescriptions/NMRALogsPage';
import CRMPage from '../pages/crm/CRMPage';
import AIOutbreakRadar from '../pages/admin/AIOutbreakRadar';
import RackLocatorPage from '../pages/inventory/RackLocatorPage';
import CashierDashboard from '../pages/cashier/CashierDashboard';
import CashierCRMPage from '../pages/cashier/CashierCRMPage';
import CashierPrescriptionsPage from '../pages/cashier/CashierPrescriptionsPage';
import CashierReportsPage from '../pages/cashier/CashierReportsPage';
import PharmacistDashboard from '../pages/pharmacist/PharmacistDashboard';
import PharmacistPurchasesPage from '../pages/pharmacist/PharmacistPurchasesPage';
import PharmacistInventoryPage from '../pages/pharmacist/PharmacistInventoryPage';
import PharmacistReturnsDisposalsPage from '../pages/pharmacist/PharmacistReturnsDisposalsPage';
import PharmacistAIOutbreakRadar from '../pages/pharmacist/PharmacistAIOutbreakRadar';
import PharmacistRackLocatorPage from '../pages/pharmacist/PharmacistRackLocatorPage';
import POSPage from '../pages/pos/POSPage';

import CashierPOSPage from '../pages/CashierPOSPage';

import SupplierSetupPage from '../pages/supplier/SupplierSetupPage';
import SupplierDashboard from '../pages/supplier/SupplierDashboard';
import SupplierLogin from '../pages/supplier/SupplierLogin';

const POSWrapper = () => {
    const { user } = useContext(AuthContext);
    return user?.role === 'Admin' ? <POSPage /> : <CashierPOSPage />;
};

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/" element={<LandingPage />} />

            <Route path="/auth/login" element={<Login />} />
            <Route path="/admin/login" element={<Login />} />

            <Route path="/supplier/login" element={<SupplierLogin />} />
            <Route path="/supplier-setup" element={<SupplierSetupPage />} />

            <Route
                path="/supplier/dashboard"
                element={
                    <ProtectedRoute allowedRoles={['Supplier']}>
                        <SupplierDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/cashier-dashboard"
                element={
                    <ProtectedRoute allowedRoles={['Cashier', 'Admin']}>
                        <CashierDashboard />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/cashier-crm"
                element={
                    <ProtectedRoute allowedRoles={['Cashier', 'Admin']}>
                        <CashierCRMPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/cashier-prescriptions"
                element={
                    <ProtectedRoute allowedRoles={['Cashier', 'Admin']}>
                        <CashierPrescriptionsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/cashier-reports"
                element={
                    <ProtectedRoute allowedRoles={['Cashier', 'Admin']}>
                        <CashierReportsPage />
                    </ProtectedRoute>
                }
            />

            <Route path="/admin" element={<ProtectedRoute allowedRoles={['Admin']}><AdminDashboard /></ProtectedRoute>} />
            <Route path="/admin/inventory" element={<ProtectedRoute allowedRoles={['Admin']}><InventoryPage /></ProtectedRoute>} />
            <Route path="/admin/returns" element={<ProtectedRoute allowedRoles={['Admin']}><ReturnsDisposalsPage /></ProtectedRoute>} />
            <Route path="/admin/rack-locator" element={<ProtectedRoute allowedRoles={['Admin']}><RackLocatorPage /></ProtectedRoute>} />
            <Route path="/admin/suppliers" element={<ProtectedRoute allowedRoles={['Admin']}><SuppliersPage /></ProtectedRoute>} />
            <Route path="/admin/purchases" element={<ProtectedRoute allowedRoles={['Admin']}><PurchasesPage /></ProtectedRoute>} />
            <Route path="/admin/prescriptions" element={<ProtectedRoute allowedRoles={['Admin']}><PrescriptionsPage /></ProtectedRoute>} />
            <Route path="/admin/nmra-logs" element={<ProtectedRoute allowedRoles={['Admin']}><NMRALogsPage /></ProtectedRoute>} />
            <Route path="/admin/crm" element={<ProtectedRoute allowedRoles={['Admin', 'Pharmacist']}><CRMPage /></ProtectedRoute>} />
            <Route path="/admin/ai-outbreak" element={<ProtectedRoute allowedRoles={['Admin']}><AIOutbreakRadar /></ProtectedRoute>} />

            <Route
                path="/pharmacist/dashboard"
                element={
                    <ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}>
                        <PharmacistDashboard />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/pharmacist/purchases-grn"
                element={
                    <ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}>
                        <PharmacistPurchasesPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/pharmacist/inventory"
                element={
                    <ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}>
                        <PharmacistInventoryPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/pharmacist/return-disposal"
                element={
                    <ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}>
                        <PharmacistReturnsDisposalsPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/pharmacist/ai-outbreak-radar"
                element={
                    <ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}>
                        <PharmacistAIOutbreakRadar />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/pharmacist/rack-locator"
                element={
                    <ProtectedRoute allowedRoles={['Pharmacist', 'Admin']}>
                        <PharmacistRackLocatorPage />
                    </ProtectedRoute>
                }
            />

            <Route
                path="/pos/*"
                element={
                    <ProtectedRoute allowedRoles={['Cashier', 'Admin']}>
                        <POSWrapper />
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppRoutes;