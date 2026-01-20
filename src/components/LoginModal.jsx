import React, { useState } from 'react';
import { X, Mail } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function LoginModal({ isOpen, onClose, onSuccess }) {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            setError('');
            await loginWithGoogle();
            onSuccess();
        } catch (err) {
            setError('Error al iniciar sesión con Google');
        } finally {
            setLoading(false);
        }
    };

    const handleEmailSubmit = async (e) => {
        e.preventDefault();
        try {
            setLoading(true);
            setError('');

            if (isLogin) {
                await loginWithEmail(email, password);
            } else {
                await signupWithEmail(email, password);
            }

            onSuccess();
        } catch (err) {
            setError(isLogin ? 'Email o contraseña incorrectos' : 'Error al crear cuenta');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
            <div className="bg-stone-900 border border-white/10 rounded-lg max-w-md w-full mx-4 p-8 relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-stone-400 hover:text-amber-500 transition-colors"
                >
                    <X size={24} />
                </button>

                <h2 className="text-3xl font-serif text-amber-100 mb-2">
                    {isLogin ? 'Bienvenido' : 'Crear Cuenta'}
                </h2>
                <p className="text-stone-400 mb-8">
                    {isLogin ? 'Inicia sesión para agendar tu cita' : 'Regístrate para comenzar'}
                </p>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/50 text-red-400 px-4 py-3 rounded mb-4">
                        {error}
                    </div>
                )}

                {/* Google Login */}
                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-3 bg-white text-stone-900 px-6 py-3 rounded font-semibold hover:bg-stone-100 transition-all mb-6 disabled:opacity-50"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                        <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    Continuar con Google
                </button>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-stone-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-stone-900 text-stone-400">O continúa con email</span>
                    </div>
                </div>

                {/* Email Login */}
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm text-amber-100 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-transparent border border-stone-700 px-4 py-3 text-amber-100 rounded focus:border-amber-600 outline-none"
                            placeholder="tu@email.com"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-amber-100 mb-2">Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-transparent border border-stone-700 px-4 py-3 text-amber-100 rounded focus:border-amber-600 outline-none"
                            placeholder="••••••••"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold py-3 rounded hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50"
                    >
                        {loading ? 'Cargando...' : (isLogin ? 'Iniciar Sesión' : 'Crear Cuenta')}
                    </button>
                </form>

                <p className="text-center text-stone-400 text-sm mt-6">
                    {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}{' '}
                    <button
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-amber-500 hover:text-amber-400 font-semibold"
                    >
                        {isLogin ? 'Regístrate' : 'Inicia sesión'}
                    </button>
                </p>
            </div>
        </div>
    );
}
