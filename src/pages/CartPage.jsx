import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { Trash2, Plus, Minus, ArrowRight, ArrowLeft, ShoppingBag } from 'lucide-react';

export default function CartPage() {
    const {
        cartItems,
        updateQuantity,
        removeFromCart,
        getCartTotal,
        getCartWeight,
        getShippingCost,
        processCheckout,
        clearCart
    } = useCart();

    const navigate = useNavigate();
    const [customerName, setCustomerName] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [settings, setSettings] = useState(null);

    // Cargar Configuración
    React.useEffect(() => {
        const { collection, getDocs } = import('firebase/firestore');
        const { db } = import('../firebase');

        const loadSettings = async () => {
            try {
                const { db } = await import('../firebase');
                const { doc, getDoc } = await import('firebase/firestore');
                const settingsRef = doc(db, 'site_settings', 'site_global');
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    setSettings(settingsSnap.data());
                }
            } catch (e) {
                console.error("Error loading settings:", e);
            }
        };
        loadSettings();
    }, []);

    // Cálculos
    const subtotal = getCartTotal();
    const weight = getCartWeight();
    const shipping = getShippingCost();
    const total = subtotal + shipping;

    const handleCheckout = async () => {
        if (!customerName.trim()) {
            alert('Por favor, ingresa tu nombre completo para procesar la orden.');
            return;
        }

        setIsProcessing(true);

        // 1. Procesar en Base de Datos
        const result = await processCheckout({
            nombre: customerName,
            telefono: 'Pendiente (WhatsApp)',
            direccion: 'Pendiente (WhatsApp)'
        });

        if (!result.success) {
            alert('❌ Error al procesar: ' + result.error);
            setIsProcessing(false);
            return;
        }

        // 2. Preparar WhatsApp
        const itemsList = cartItems.map(item =>
            `▪️ *${item.name}*\n   Cant: ${item.quantity} | Peso: ${item.weight} lbs | Precio: $${item.price}`
        ).join('\n\n');

        const bankInfo = settings?.bank ? `\n\n🏦 *DATOS DE PAGO (${settings.bank.bankName})*\n🔹 *Titular:* ${settings.bank.name}\n🔹 *Tipo:* ${settings.bank.accountType}\n🔹 *Cuenta:* ${settings.bank.accountNumber}` : '';
        const message = `👋 *HOLA GEORGINA!* \nSoy *${customerName}* y deseo confirmar mi pedido web.\n\n🛍️ *DETALLE DEL PEDIDO:*\n----------------------------------\n${itemsList}\n----------------------------------\n\n💰 *Subtotal:* $${subtotal.toFixed(2)}\n📦 *Envío (${weight.toFixed(2)} lbs):* $${shipping.toFixed(2)}\n\n💎 *TOTAL A PAGAR: $${total.toFixed(2)}*${bankInfo}\n\n📍 Quedo a la espera de la confirmación.`;

        const whatsappUrl = `https://wa.me/${settings?.social?.whatsapp || '15513019412'}?text=${encodeURIComponent(message)}`;

        // 3. Redirigir
        window.open(whatsappUrl, '_blank');
        navigate('/'); // Volver al inicio
        setIsProcessing(false);
    };

    if (cartItems.length === 0) {
        return (
            <div className="min-h-screen bg-stone-950 flex flex-col items-center justify-center text-stone-300 p-4">
                <ShoppingBag size={80} className="text-stone-800 mb-6" />
                <h1 className="text-3xl font-serif text-amber-100 mb-2">Tu carrito está vacío</h1>
                <p className="text-stone-500 mb-8">Parece que aún no has añadido nada.</p>
                <button
                    onClick={() => navigate('/')}
                    className="px-8 py-3 bg-amber-600 text-stone-950 font-bold rounded-full hover:bg-amber-500 transition-all flex items-center gap-2"
                >
                    <ArrowLeft size={20} />
                    Volver a la Tienda
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-100 py-12 px-4 md:px-8">
            <div className="max-w-6xl mx-auto">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => navigate('/')} className="p-2 hover:bg-white/5 rounded-full text-stone-400">
                        <ArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif text-amber-50 inline-block mr-4">Tu Carrito de Compras</h1>
                        {cartItems.length > 0 && (
                            <button
                                onClick={() => {
                                    if (confirm('¿Estás seguro de vaciar todo el carrito?')) clearCart();
                                }}
                                className="text-red-400 text-xs hover:text-red-300 underline transition-colors"
                            >
                                vaciar todo
                            </button>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">

                    {/* COLUMNA IZQUIERDA: Lista de Productos */}
                    {/* COLUMNA IZQUIERDA: Lista de Productos Compacta */}
                    <div className="lg:col-span-2 space-y-3">
                        {cartItems.map((item, idx) => (
                            <div
                                key={item.id}
                                className="bg-white/5 border border-white/10 rounded-xl p-4 flex gap-4 items-center hover:bg-white/10 transition-all animate-in slide-in-from-left duration-500"
                                style={{ animationDelay: `${idx * 70}ms` }}
                            >
                                {/* Imagen reducida */}
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-stone-800 rounded overflow-hidden flex-shrink-0 border border-white/5">
                                    <img
                                        src={item.imageUrl || item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="text-sm md:text-base font-bold text-amber-50 truncate mb-1">{item.name}</h3>
                                    <p className="text-stone-400 text-xs mb-2">Peso: {item.weight} lbs</p>

                                    <div className="flex items-center gap-4">
                                        {/* Controles cantidad compactos */}
                                        <div className="flex items-center bg-stone-900 rounded border border-white/10 h-8">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="px-2 hover:text-amber-400 transition-colors h-full flex items-center"
                                            >
                                                <Minus size={12} />
                                            </button>
                                            <span className="w-8 text-center text-sm font-bold text-stone-200">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="px-2 hover:text-amber-400 transition-colors h-full flex items-center"
                                            >
                                                <Plus size={12} />
                                            </button>
                                        </div>

                                        <p className="text-amber-400 font-bold text-sm md:text-base">
                                            ${(parseFloat(item.price) * item.quantity).toFixed(2)}
                                        </p>
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="p-2 text-stone-500 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors self-center"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* COLUMNA DERECHA: Resumen y Checkout - Estilo Glassmorphism Premium */}
                    <div className="lg:col-span-1">
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 sticky top-8 shadow-2xl relative overflow-hidden group">
                            {/* Línea decorativa superior */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-600 to-amber-400"></div>

                            <h2 className="text-2xl font-serif text-amber-50 mb-6 flex items-center gap-2">
                                <ShoppingBag className="text-amber-500" size={24} />
                                Resumen de Orden
                            </h2>

                            <div className="space-y-3 mb-6 text-stone-300">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>${subtotal.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Peso Total Estimado</span>
                                    <span>{weight.toFixed(2)} lbs</span>
                                </div>
                                <div className="flex justify-between text-amber-500/80">
                                    <span>Envío ({weight.toFixed(2)} lbs * $4)</span>
                                    <span>${shipping.toFixed(2)}</span>
                                </div>
                                <div className="flex justify-between text-xl font-bold text-amber-400 pt-4 border-t border-white/10 mt-4">
                                    <span>Total Final</span>
                                    <span>${total.toFixed(2)}</span>
                                </div>
                            </div>

                            {/* Formulario de Cliente */}
                            <div className="bg-black/30 p-4 rounded-xl mb-6">
                                <label className="block text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Completar Datos</label>
                                <input
                                    type="text"
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Nombre Completo"
                                    className="w-full bg-stone-800 border-stone-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-amber-600 outline-none placeholder-stone-600 mb-2"
                                />
                                <p className="text-xs text-stone-500">
                                    * Al confirmar, verás los datos bancarios y nos enviaremos un WhatsApp.
                                </p>
                            </div>

                            {settings?.bank?.accountNumber && (
                                <div className="mb-6 p-4 bg-amber-600/10 border border-amber-600/30 rounded-xl">
                                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                                        <Database size={14} /> Datos para Transferencia
                                    </h4>
                                    <div className="text-sm space-y-1 text-stone-300">
                                        <p><span className="text-stone-500">Banco:</span> {settings.bank.bankName}</p>
                                        <p><span className="text-stone-500">Titular:</span> {settings.bank.name}</p>
                                        <p><span className="text-stone-500">Cuenta:</span> {settings.bank.accountNumber}</p>
                                        <p><span className="text-stone-500">Tipo:</span> {settings.bank.accountType}</p>
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={handleCheckout}
                                disabled={isProcessing}
                                className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-bold text-lg rounded-xl hover:from-amber-500 hover:to-amber-600 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {isProcessing ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-stone-950"></div>
                                        <span>Procesando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>Confirmar Pedido</span>
                                        <ArrowRight size={20} />
                                    </>
                                )}
                            </button>

                            <p className="text-center text-xs text-stone-500 mt-4">
                                Transacción segura. Inventario reservado al confirmar.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}
