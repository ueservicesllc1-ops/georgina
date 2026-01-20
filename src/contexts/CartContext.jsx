import React, { createContext, useContext, useState, useEffect } from 'react';
import { inventoryDb } from '../firebaseInventory';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';

const CartContext = createContext();

export function useCart() {
    return useContext(CartContext);
}

export function CartProvider({ children }) {
    // Inicializar carrito desde localStorage para persistencia
    const [cartItems, setCartItems] = useState(() => {
        try {
            const savedCart = localStorage.getItem('georgina_cart');
            return savedCart ? JSON.parse(savedCart) : [];
        } catch (error) {
            console.error('Error parsing cart:', error);
            return [];
        }
    });

    const [isCartOpen, setIsCartOpen] = useState(false);

    // Guardar en localStorage cada vez que cambie el carrito
    useEffect(() => {
        localStorage.setItem('georgina_cart', JSON.stringify(cartItems));
    }, [cartItems]);

    // Función auxiliar para limpiar precio string ($1,200 -> 1200)
    const parsePrice = (priceStr) => {
        if (typeof priceStr === 'number') return priceStr;
        return parseFloat(priceStr.toString().replace(/[^0-9.]/g, '')) || 0;
    };

    const addToCart = (product) => {
        setCartItems(prevItems => {
            const existingItem = prevItems.find(item => item.id === product.id);
            if (existingItem) {
                return prevItems.map(item =>
                    item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
                );
            }
            return [...prevItems, { ...product, quantity: 1 }];
        });
        setIsCartOpen(true); // Abrir carrito al añadir
    };

    const removeFromCart = (id) => {
        setCartItems(prevItems => prevItems.filter(item => item.id !== id));
    };

    const updateQuantity = (id, newQuantity) => {
        if (newQuantity < 1) {
            removeFromCart(id);
            return;
        }
        setCartItems(prevItems =>
            prevItems.map(item =>
                item.id === id ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const clearCart = () => {
        setCartItems([]);
    };

    const getCartTotal = () => {
        return cartItems.reduce((total, item) => {
            const price = parsePrice(item.price);
            return total + (price * item.quantity);
        }, 0);
    };

    const getCartWeight = () => {
        return cartItems.reduce((total, item) => {
            // Asumimos que el peso viene en item.weight (libras)
            const weight = parseFloat(item.weight) || 0;
            return total + (weight * item.quantity);
        }, 0);
    };

    const getShippingCost = () => {
        const SHIPPING_RATE = 4.00; // $4.00 por libra
        const weight = getCartWeight();
        // Mínimo 1 libra para cualquier pedido que contenga algo
        const chargeWeight = weight > 0 ? Math.max(weight, 1.0) : 0;
        return chargeWeight * SHIPPING_RATE;
    };

    const getCartCount = () => {
        return cartItems.reduce((count, item) => count + item.quantity, 0);
    };

    const toggleCart = () => setIsCartOpen(!isCartOpen);

    // INTEGRACIÓN CON BASE DE DATOS EXTERNA (INVENTARIO)
    // INTEGRACIÓN CON BASE DE DATOS EXTERNA (INVENTARIO)
    const processCheckout = async (customerData) => {
        try {
            // 1. Crear el objeto de venta (Online Sale)
            const saleData = {
                ...customerData, // nombre, telefono, direccion
                items: cartItems.map(item => ({
                    productId: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: parseFloat(item.price),
                    weight: parseFloat(item.weight),
                    imageUrl: item.imageUrl
                })),
                total: getCartTotal(),
                shippingCost: getShippingCost(),
                totalWeight: getCartWeight(),
                status: 'pending', // Estado inicial
                createdAt: serverTimestamp(),
                origin: 'Georgina Web'
            };

            // 2. Ejecutar transacción: Guardar Venta + Actualizar Stock (Atómicamente)
            await runTransaction(inventoryDb, async (transaction) => {
                // a) Verificar stock de cada producto
                for (const item of cartItems) {
                    let collectionName = item.source || 'inventory';
                    // Mapeo: fb y w ahora viven en la colección 'products'
                    if (collectionName === 'fb' || collectionName === 'w') collectionName = 'products';

                    const productRef = doc(inventoryDb, collectionName, item.id);
                    const productDoc = await transaction.get(productRef);

                    if (!productDoc.exists()) {
                        throw new Error(`Datos desactualizados en "${item.name}". Por favor usa el botón "vaciar todo" arriba y vuelve a agregarlo.`);
                    }

                    // Si es OnDemand (fb o w), NO restamos stock ni verificamos cantidad
                    if (item.onDemand) {
                        continue;
                    }

                    // Adaptarse a estructura anidada o plana y buscar stock inteligentemente
                    const data = productDoc.data();
                    const productData = data.product || data;

                    // LÓGICA DE DETECCIÓN DE STOCK (Sincronizada con Home.jsx)
                    let currentQty = 0;
                    if (data.quantity !== undefined && data.quantity !== null) currentQty = parseFloat(data.quantity);
                    else if (productData.quantity !== undefined && productData.quantity !== null) currentQty = parseFloat(productData.quantity);
                    else if (data.cantidad !== undefined) currentQty = parseFloat(data.cantidad); // Fallback español

                    if (currentQty < item.quantity) {
                        throw new Error(`Stock insuficiente para "${item.name}". Disponible: ${currentQty}`);
                    }

                    // b) Restar stock
                    const newQty = currentQty - item.quantity;
                    const updates = {};

                    // Actualizamos donde encontramos el dato
                    if (data.quantity !== undefined && data.quantity !== null) {
                        updates['quantity'] = newQty;
                        updates['status'] = newQty <= 0 ? 'sold' : (data.status || 'stock');
                    } else if (data.product && data.product.quantity !== undefined) {
                        updates['product.quantity'] = newQty;
                        updates['product.status'] = newQty <= 0 ? 'sold' : (data.product.status || 'stock');
                    } else {
                        // Fallback: Si no estaba definido, lo creamos en la raíz por seguridad
                        updates['quantity'] = newQty;
                        updates['status'] = newQty <= 0 ? 'sold' : 'stock';
                    }

                    transaction.update(productRef, updates);
                }

                // c) Crear la orden de venta (en colección onlineSales)
                const salesRef = collection(inventoryDb, 'onlineSales');
                const newSaleRef = doc(salesRef);
                transaction.set(newSaleRef, saleData);
            });

            // 3. Limpiar carrito si todo salió bien
            clearCart();
            setIsCartOpen(false); // Cerrar carrito
            return { success: true };

        } catch (error) {
            console.error("Error procesando orden:", error);
            return { success: false, error: error.message };
        }
    };

    const value = {
        cartItems,
        isCartOpen,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getCartTotal,
        getCartWeight,
        getShippingCost,
        getCartCount,
        toggleCart,
        setIsCartOpen,
        processCheckout // Exportamos la nuaeva función
    };

    return (
        <CartContext.Provider value={value}>
            {children}
        </CartContext.Provider>
    );
}
