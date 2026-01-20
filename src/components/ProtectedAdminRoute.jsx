import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/LoginModal';

const ADMIN_EMAIL = 'luisuf@gmail.com';

export default function ProtectedAdminRoute({ children }) {
    const { currentUser } = useAuth();
    const [showLoginModal, setShowLoginModal] = React.useState(false);

    // Si no está logueado, mostrar modal de login
    if (!currentUser) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center">
                    <h2 className="text-2xl font-serif text-amber-100 mb-4">Acceso Administrativo</h2>
                    <p className="text-stone-400 mb-6">Debes iniciar sesión para acceder</p>
                    <button
                        onClick={() => setShowLoginModal(true)}
                        className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold rounded hover:from-amber-500 hover:to-amber-600 transition-all"
                    >
                        Iniciar Sesión
                    </button>
                    <LoginModal
                        isOpen={showLoginModal}
                        onClose={() => setShowLoginModal(false)}
                        onSuccess={() => window.location.reload()}
                    />
                </div>
            </div>
        );
    }

    // Si está logueado pero no es admin, denegar acceso
    if (currentUser.email !== ADMIN_EMAIL) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-center max-w-md">
                    <div className="text-6xl mb-4">🚫</div>
                    <h2 className="text-3xl font-serif text-amber-100 mb-4">Acceso Denegado</h2>
                    <p className="text-stone-400 mb-2">
                        No tienes permisos para acceder a esta área administrativa.
                    </p>
                    <p className="text-sm text-stone-500 mb-6">
                        Usuario actual: {currentUser.email}
                    </p>
                    <button
                        onClick={() => window.location.href = '/'}
                        className="px-8 py-3 bg-stone-800 text-amber-100 font-semibold rounded hover:bg-stone-700 transition-all"
                    >
                        Volver al Inicio
                    </button>
                </div>
            </div>
        );
    }

    // Si es admin, mostrar contenido
    return children;
}
