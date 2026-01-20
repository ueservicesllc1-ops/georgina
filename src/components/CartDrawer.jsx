import React from 'react';
import { X, Minus, Plus, Trash2, ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../contexts/CartContext';

export default function CartDrawer() {
    const {
        cartItems,
        isCartOpen,
        toggleCart,
        updateQuantity,
        removeFromCart,
        getCartTotal,
        getCartWeight,
        getShippingCost,
        processCheckout
    } = useCart();

    if (!isCartOpen) return null;

    const [isProcessing, setIsProcessing] = React.useState(false);
    const [showNameModal, setShowNameModal] = React.useState(false);
    const [customerName, setCustomerName] = React.useState('');

    // Paso 1: Abrir Modal
    const handleInitialCheckout = () => {
        setShowNameModal(true);
    };

    // Paso 2: Procesar todo cuando el usuario confirma su nombre
    const confirmOrder = async () => {
        if (!customerName.trim()) {
            alert("Por favor ingresa tu nombre.");
            return;
        }

        setIsProcessing(true);

        // 1. Intentar procesar la orden en Base de Datos
        const result = await processCheckout({
            nombre: customerName,
            telefono: 'Pendiente (WhatsApp)',
            direccion: 'Pendiente (WhatsApp)'
        });

        if (!result.success) {
            alert('❌ No pudimos procesar tu orden:\n' + result.error);
            setIsProcessing(false);
            return;
        }

        // 2. Preparar WhatsApp
        const itemsList = cartItems.map(item =>
            `▪️ *${item.name}*\n   Cant: ${item.quantity} | Precio: ${item.price}`
        ).join('\n\n');

        const subtotal = getCartTotal().toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const weight = getCartWeight().toFixed(2);
        const shipping = getShippingCost().toLocaleString('en-US', { style: 'currency', currency: 'USD' });
        const finalTotal = (getCartTotal() + getShippingCost()).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

        const message = `👋 *HOLA GEORGINA!* \nSoy *${customerName}* y acabo de realizar un pedido en la web.\n\n🛍️ *RESUMEN DE COMPRA:*\n----------------------------------\n${itemsList}\n----------------------------------\n\n💰 *Subtotal:* ${subtotal}\n📦 *Envío (${weight} lbs):* ${shipping}\n\n💎 *TOTAL FINAL: ${finalTotal}*\n\n📍 Quedo a la espera de la confirmación y datos de pago.`;

        const whatsappUrl = `https://wa.me/15513019412?text=${encodeURIComponent(message)}`;

        // 3. Redirigir y cerrar
        window.open(whatsappUrl, '_blank');
        setShowNameModal(false);
        setCustomerName('');
        toggleCart();
        setIsProcessing(false);
    };

    return (
        <div className="fixed inset-0 z-[100] flex justify-end">
            {/* Overlay backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
                onClick={toggleCart}
            />

            {/* Drawer Panel */}
            <div className="relative w-full max-w-md bg-stone-50 h-full shadow-2xl flex flex-col transform transition-transform duration-300 ease-in-out">
                {/* Header */}
                <div className="p-6 bg-stone-900 text-white flex items-center justify-between shadow-md">
                    <div className="flex items-center gap-3">
                        <ShoppingBag className="text-amber-400" size={24} />
                        <h2 className="text-xl font-serif tracking-wide">Tu Bolsa de Compras</h2>
                    </div>
                    <button
                        onClick={toggleCart}
                        className="p-2 hover:bg-stone-800 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {cartItems.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-stone-400 space-y-4">
                            <ShoppingBag size={64} className="opacity-20" />
                            <p className="text-lg font-medium">Tu bolsa está vacía</p>
                            <button
                                onClick={toggleCart}
                                className="px-6 py-2 border border-stone-300 rounded-full text-sm hover:bg-stone-200 transition-colors"
                            >
                                Continuar Comprando
                            </button>
                        </div>
                    ) : (
                        cartItems.map((item) => (
                            <div key={item.id} className="flex gap-4 bg-white p-4 rounded-lg border border-stone-200 shadow-sm">
                                <div className="w-20 h-20 flex-shrink-0 bg-stone-100 rounded-md overflow-hidden">
                                    <img
                                        src={item.imageUrl || item.image}
                                        alt={item.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 flex flex-col justify-between">
                                    <div>
                                        <h3 className="font-serif text-stone-900 font-medium line-clamp-1">{item.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <p className="text-amber-600 text-sm font-semibold">{item.price}</p>
                                            <span className="text-stone-400 text-xs">| {item.weight} lbs</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between mt-2">
                                        <div className="flex items-center border border-stone-300 rounded-md">
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                                className="p-1 hover:bg-stone-100 transition-colors"
                                            >
                                                <Minus size={14} className="text-stone-600" />
                                            </button>
                                            <span className="w-8 text-center text-xs font-medium text-stone-900">{item.quantity}</span>
                                            <button
                                                onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                                className="p-1 hover:bg-stone-100 transition-colors"
                                            >
                                                <Plus size={14} className="text-stone-600" />
                                            </button>
                                        </div>

                                        <button
                                            onClick={() => removeFromCart(item.id)}
                                            className="text-stone-400 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Footer / Checkout */}
                {cartItems.length > 0 && (
                    <div className="p-6 bg-white border-t border-stone-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                        <div className="space-y-2 mb-4">
                            <div className="flex justify-between items-center text-sm text-stone-500">
                                <span>Subtotal</span>
                                <span>{getCartTotal().toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                            <div className="flex justify-between items-center text-sm text-stone-500">
                                <span>Envío Estimado ({getCartWeight().toFixed(1)} lbs)</span>
                                <span>{getShippingCost().toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</span>
                            </div>
                            <div className="flex justify-between items-center text-lg font-serif pt-2 border-t border-stone-100">
                                <span className="text-stone-800">Total Final</span>
                                <span className="text-stone-900 font-bold">
                                    {(getCartTotal() + getShippingCost()).toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleInitialCheckout}
                            className="w-full py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-bold tracking-widest rounded-lg shadow-lg hover:from-amber-500 hover:to-amber-600 transition-all flex items-center justify-center gap-3"
                        >
                            <span>FINALIZAR COMPRA</span>
                            <ArrowRight size={20} />
                        </button>
                        <button
                            onClick={toggleCart}
                            className="w-full mt-3 py-3 border border-stone-200 text-stone-600 font-semibold tracking-wide rounded-lg hover:bg-stone-50 transition-colors uppercase text-sm"
                        >
                            SEGUIR COMPRANDO
                        </button>
                        <p className="text-center text-xs text-stone-400 mt-3">
                            Los pedidos se procesan vía WhatsApp Personalizado
                        </p>
                    </div>
                )}
            </div>

            {/* MODAL SOLICITAR NOMBRE - Nuevo diseño elegante */}
            {showNameModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
                    <div className="bg-stone-900 border border-amber-900/30 w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        {/* Header decorativo */}
                        <div className="bg-gradient-to-r from-amber-700 to-amber-900 p-4 text-center">
                            <h3 className="text-amber-50 font-serif text-lg tracking-wide">Identificación</h3>
                        </div>

                        <div className="p-8">
                            <p className="text-stone-300 text-sm text-center mb-6">
                                Para procesar tu pedido y reservar el inventario, necesitamos saber a quién dirigir la orden.
                            </p>

                            <div className="mb-6">
                                <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Tu Nombre Completo</label>
                                <input
                                    type="text"
                                    autoFocus
                                    value={customerName}
                                    onChange={(e) => setCustomerName(e.target.value)}
                                    placeholder="Ej. María Pérez"
                                    className="w-full bg-stone-800 border border-stone-700 text-white p-3 rounded-lg focus:ring-2 focus:ring-amber-600 focus:border-transparent outline-none transition-all placeholder-stone-600"
                                    onKeyDown={(e) => e.key === 'Enter' && confirmOrder()}
                                />
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowNameModal(false)}
                                    className="flex-1 py-3 border border-stone-700 text-stone-400 rounded-lg hover:bg-stone-800 hover:text-white transition-colors font-medium text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={confirmOrder}
                                    disabled={isProcessing}
                                    className="flex-1 py-3 bg-amber-600 text-stone-950 font-bold rounded-lg hover:bg-amber-500 transition-colors flex justify-center items-center shadow-lg shadow-amber-900/20"
                                >
                                    {isProcessing ? (
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-stone-950"></div>
                                    ) : (
                                        'Confirmar Pedido'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
