import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import UserDashboard from './pages/UserDashboard';
import AdminPanel from './pages/AdminPanel';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

import { CartProvider } from './contexts/CartContext';
import CartPage from './pages/CartPage';

function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <Router>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/cart" element={<CartPage />} />
                        <Route path="/dashboard" element={<UserDashboard />} />
                        <Route path="/admin" element={<AdminPanel />} />
                    </Routes>
                </Router>
            </CartProvider>
        </AuthProvider>
    );
}

export default App;
