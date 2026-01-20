import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Home from './pages/Home';
import UserDashboard from './pages/UserDashboard';
import AdminPanel from './pages/AdminPanel';
import ProtectedAdminRoute from './components/ProtectedAdminRoute';

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/dashboard" element={<UserDashboard />} />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedAdminRoute>
                                <AdminPanel />
                            </ProtectedAdminRoute>
                        }
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
