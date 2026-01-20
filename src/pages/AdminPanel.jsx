import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { inventoryDb } from '../firebaseInventory';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, deleteDoc, doc, updateDoc, getDocs, query, orderBy, setDoc, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Calendar, ShoppingBag, LogOut, Plus, Trash2, X, Clock, ExternalLink, FileText, CheckCircle, Upload, Image, Star, Database, ArrowRightLeft } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from '../config/emailConfig';

export default function AdminPanel() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [fechasDisponibles, setFechasDisponibles] = useState([]);
    const [citasAgendadas, setCitasAgendadas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [step, setStep] = useState(1); // 1: fecha, 2: horas
    const [nuevaFecha, setNuevaFecha] = useState({
        fecha: '',
        tienda: 'Burlington',
        horarios: []
    });
    const [subTab, setSubTab] = useState('fechas'); // 'fechas', 'citas', 'carrusel'
    const [emailTest, setEmailTest] = useState('');
    const [sendingTest, setSendingTest] = useState(false);

    // Estados para carrusel
    const [carouselImages, setCarouselImages] = useState([]);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [newCarouselImage, setNewCarouselImage] = useState({
        file: null,
        name: '',
        price: ''
    });

    // Estados para productos destacados
    const [featuredProducts, setFeaturedProducts] = useState([]);
    const [uploadingFeatured, setUploadingFeatured] = useState(false);
    const [newFeaturedProduct, setNewFeaturedProduct] = useState({
        file: null,
        name: '',
        price: '',
        category: '',
        weight: ''
    });

    // Estados para Tienda Online
    const [storeProducts, setStoreProducts] = useState([]);
    const [onlineOrders, setOnlineOrders] = useState([]); // Nuevos pedidos
    const [uploadingStore, setUploadingStore] = useState(false);
    const [newStoreProduct, setNewStoreProduct] = useState({
        file: null,
        name: '',
        price: '',
        category: 'Ropa',
        weight: ''
    });

    const categoriasTienda = ['Ropa', 'Zapatos', 'Perfumes', 'Electrónico', 'Vitaminas', 'Juguetes', 'Otros'];



    // Horarios disponibles para seleccionar
    const horariosDisponibles = [
        '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
        '05:00 PM', '06:00 PM'
    ];

    useEffect(() => {
        cargarDatos();
    }, []);

    // GESTIÓN DE ESTADOS DE PEDIDOS
    const handleOrderStatus = async (orderId, newStatus, currentOrder) => {
        if (!confirm(`¿Cambiar estado de la orden a "${newStatus}"?`)) return;

        try {
            // Si se CANCELA la orden, hay que DEVOLVER el stock
            if (newStatus === 'cancelled' && currentOrder.status !== 'cancelled') {
                // Importamos runTransaction dinámicamente o usamos el importado arriba si existe
                const { runTransaction } = await import('firebase/firestore');

                await runTransaction(inventoryDb, async (transaction) => {
                    // 1. Devolver stock de cada item
                    for (const item of currentOrder.items) {
                        const productRef = doc(inventoryDb, 'inventory', item.productId);
                        const productDoc = await transaction.get(productRef);

                        if (productDoc.exists()) {
                            const data = productDoc.data();
                            const productData = data.product || data;

                            // 1. DETECCIÓN INTELIGENTE DE STOCK ACTUAL (Igual que en CartContext)
                            let currentQty = 0;
                            if (data.quantity !== undefined && data.quantity !== null) currentQty = parseFloat(data.quantity);
                            else if (productData.quantity !== undefined && productData.quantity !== null) currentQty = parseFloat(productData.quantity);
                            else if (data.cantidad !== undefined) currentQty = parseFloat(data.cantidad);

                            const returnQty = parseFloat(item.quantity || 0);
                            const finalQty = currentQty + returnQty;
                            const updates = {};

                            // 2. ACTUALIZACIÓN INTELIGENTE (Donde estaba, ahí lo pongo)
                            if (data.quantity !== undefined && data.quantity !== null) {
                                updates['quantity'] = finalQty;
                                updates['status'] = 'stock';
                            } else if (data.product && data.product.quantity !== undefined) {
                                updates['product.quantity'] = finalQty;
                                updates['product.status'] = 'stock';
                            } else {
                                // Default a la raíz
                                updates['quantity'] = finalQty;
                                updates['status'] = 'stock';
                            }

                            transaction.update(productRef, updates);
                        }
                    }
                    // 2. Actualizar estado orden
                    const orderRef = doc(inventoryDb, 'onlineSales', orderId);
                    transaction.update(orderRef, { status: newStatus });
                });
                alert('Orden cancelada y stock devuelto al inventario.');
            } else {
                // Cambio de estado normal (ej: pending -> paid)
                await updateDoc(doc(inventoryDb, 'onlineSales', orderId), {
                    status: newStatus
                });
                alert('Estado actualizado');
            }

            cargarDatos();
        } catch (error) {
            console.error('Error actualizando orden:', error);
            alert('Error al actualizar orden: ' + error.message);
        }
    };

    const cargarDatos = async () => {
        try {
            setLoading(true);
            // Cargar Fechas disponibles
            const qFechas = query(collection(db, 'available_dates'), orderBy('fecha', 'asc'));
            const snapshotFechas = await getDocs(qFechas);
            const fechas = [];
            snapshotFechas.forEach((doc) => fechas.push({ id: doc.id, ...doc.data() }));
            setFechasDisponibles(fechas);

            // Cargar Citas Agendadas (Solo si es admin)
            if (currentUser.email === 'luisuf@gmail.com' || currentUser.email === 'ueservicesllc1@gmail.com') {
                const qCitas = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
                const snapshotCitas = await getDocs(qCitas);
                const citas = [];
                snapshotCitas.forEach((doc) => citas.push({ id: doc.id, ...doc.data() }));
                setCitasAgendadas(citas);

                // Cargar imágenes del carrusel
                const qCarousel = query(collection(db, 'carousel_images'), orderBy('order', 'asc'));
                const snapshotCarousel = await getDocs(qCarousel);
                const images = [];
                snapshotCarousel.forEach((doc) => images.push({ id: doc.id, ...doc.data() }));
                setCarouselImages(images);

                // Cargar productos destacados
                const qFeatured = query(collection(db, 'featured_products'), orderBy('createdAt', 'desc'));
                const snapshotFeatured = await getDocs(qFeatured);
                const featured = [];
                snapshotFeatured.forEach((doc) => featured.push({ id: doc.id, ...doc.data() }));
                setFeaturedProducts(featured);

                // Cargar productos de la tienda (Desde Inventario Externo)
                // Helper para procesar snapshots de diferentes colecciones en Admin
                const processSnapshot = (snapshot, sourceLabel) => {
                    const items = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        const product = data.product || data;

                        if (product && (product.name || product.nombre)) {
                            const weightRaw = parseFloat(product.weight || data.weight || 0);
                            const weightLbs = weightRaw > 20 ? (weightRaw * 0.00220462) : weightRaw;
                            const finalPrice = product.salePrice1 || product.unitPrice || product.price || 0;

                            const isFBorW = sourceLabel === 'fb' || sourceLabel === 'w';
                            const finalWeight = isFBorW ? 0.50 : parseFloat(weightLbs.toFixed(2));

                            items.push({
                                ...product,
                                id: doc.id,
                                source: sourceLabel,
                                name: product.name || product.nombre || 'Sin Nombre',
                                price: finalPrice,
                                weight: finalWeight,
                                imageUrl: product.imageUrl || product.image || '',
                                originalRef: doc.ref
                            });
                        }
                    });
                    return items;
                };

                // Cargar desde múltiples fuentes
                const [snapInv, snapFB, snapW] = await Promise.all([
                    getDocs(collection(inventoryDb, 'inventory')),
                    getDocs(query(collection(inventoryDb, 'products'), where('origin', 'in', ['fivebelow', 'fb']))).catch(() => ({ forEach: () => { } })),
                    getDocs(query(collection(inventoryDb, 'products'), where('origin', 'in', ['walgreens', 'w']))).catch(() => ({ forEach: () => { } }))
                ]);

                let allItems = [
                    ...processSnapshot(snapInv, 'inventory'),
                    ...processSnapshot(snapFB, 'fb'),
                    ...processSnapshot(snapW, 'w')
                ];

                // Ordenar en cliente ya que 'createdAt' puede no ser consistente en la DB externa
                allItems.sort((a, b) => {
                    const dateA = a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(0);
                    const dateB = b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(0);
                    return dateB - dateA;
                });

                setStoreProducts(allItems);

                // Cargar Pedidos Online (inventoryDb -> onlineSales)
                const qOrders = query(collection(inventoryDb, 'onlineSales'), orderBy('createdAt', 'desc'));
                const snapshotOrders = await getDocs(qOrders);
                const orders = [];
                snapshotOrders.forEach(doc => orders.push({ id: doc.id, ...doc.data() }));
                setOnlineOrders(orders);

            }
        } catch (error) {
            console.error('Error cargando datos:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleHorario = (horario) => {
        if (nuevaFecha.horarios.includes(horario)) {
            setNuevaFecha({
                ...nuevaFecha,
                horarios: nuevaFecha.horarios.filter(h => h !== horario)
            });
        } else {
            setNuevaFecha({
                ...nuevaFecha,
                horarios: [...nuevaFecha.horarios, horario]
            });
        }
    };

    const siguientePaso = () => {
        if (!nuevaFecha.fecha) {
            alert('Por favor selecciona una fecha');
            return;
        }
        setStep(2);
    };

    const agregarFecha = async (e) => {
        e.preventDefault();

        if (nuevaFecha.horarios.length === 0) {
            alert('Por favor selecciona al menos un horario');
            return;
        }

        try {
            await addDoc(collection(db, 'available_dates'), {
                fecha: nuevaFecha.fecha,
                tienda: nuevaFecha.tienda,
                horarios: nuevaFecha.horarios,
                createdAt: new Date(),
                createdBy: currentUser.email
            });

            alert('Fecha agregada exitosamente');
            cerrarModal();
            cargarDatos();
        } catch (error) {
            console.error('Error agregando fecha:', error);
            alert('Error al agregar la fecha');
        }
    };

    const cerrarModal = () => {
        setShowModal(false);
        setStep(1);
        setNuevaFecha({ fecha: '', tienda: 'Burlington', horarios: [] });
    };

    const eliminarFecha = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta fecha?')) return;

        try {
            await deleteDoc(doc(db, 'available_dates', id));
            alert('Fecha eliminada exitosamente');
            cargarDatos();
        } catch (error) {
            console.error('Error eliminando fecha:', error);
            alert('Error al eliminar la fecha');
        }
    };

    const sendEmailPagoAprobado = async (cita) => {
        try {
            const templateParams = {
                asunto: '✅ Pago Confirmado - Georgina Personal Shopper',
                titulo: 'PAGO APROBADO',
                user_name: cita.userName,
                user_email: cita.userEmail,
                mensaje_principal: '¡Excelentes noticias! Tu pago ha sido verificado y aprobado.',
                fecha: new Date(cita.fecha).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                horarios: cita.horario,
                total: `$${cita.totalEstimado || '0.00'}`,
                tienda: cita.tienda,
                estado: 'CONFIRMADA',
                mostrar_pago: 'display:none',
                mostrar_confirmacion: ''
            };

            await emailjs.send(
                EMAILJS_CONFIG.SERVICE_ID,
                EMAILJS_CONFIG.TEMPLATE_ID,
                templateParams,
                EMAILJS_CONFIG.PUBLIC_KEY
            );

            console.log('Correo de pago aprobado enviado exitosamente');
        } catch (error) {
            console.error('Error enviando correo de pago aprobado:', error);
        }
    };

    const enviarEmailPrueba = async () => {
        if (!emailTest || !emailTest.includes('@')) {
            alert('Por favor ingresa un email válido');
            return;
        }

        try {
            setSendingTest(true);
            const citaPrueba = {
                userName: 'Usuario de Prueba',
                userEmail: emailTest,
                fecha: new Date().toISOString().split('T')[0],
                horario: '10:00 AM, 11:00 AM',
                tienda: 'Burlington',
                totalEstimado: 50
            };

            await sendEmailPagoAprobado(citaPrueba);
            alert(`✅ Email de prueba enviado exitosamente a: ${emailTest}`);
            setEmailTest('');
        } catch (error) {
            console.error('Error enviando email de prueba:', error);
            alert('❌ Error: ' + error.message);
        } finally {
            setSendingTest(false);
        }
    };


    const aprobarCita = async (id, userEmail) => {
        console.log("Click en aprobar cita. ID:", id, "Email:", userEmail);

        // Eliminada la confirmación nativa que causaba problemas
        try {
            console.log("Iniciando actualización en Firestore...");
            const citaRef = doc(db, 'appointments', id);
            await updateDoc(citaRef, {
                estado: 'confirmada',
                fechaConfirmacion: new Date()
            });

            const citaCompleta = citasAgendadas.find(c => c.id === id);
            if (citaCompleta) {
                await sendEmailPagoAprobado(citaCompleta);
            }

            console.log("Actualización exitosa.");
            alert('Cita aprobada y confirmada exitosamente.');
            cargarDatos();
        } catch (error) {
            console.error('Error detallado aprobando cita:', error);
            if (error.code === 'permission-denied') {
                alert('Error de Permisos: No tienes autorización para editar esta cita. Verifica las reglas de Firestore en la consola de Firebase.');
            } else {
                alert(`Error al aprobar la cita: ${error.message}`);
            }
        }
    };

    // Función para manejar selección de imagen
    const handleImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewCarouselImage({ ...newCarouselImage, file });
        }
    };

    // Función para subir imagen del carrusel
    const uploadCarouselImage = async (e) => {
        e.preventDefault();
        if (!newCarouselImage.file || !newCarouselImage.name || !newCarouselImage.price) {
            alert('Por favor completa todos los campos');
            return;
        }

        try {
            setUploadingImage(true);

            // Subir imagen a Storage
            const imageRef = ref(storage, `carousel/${Date.now()}_${newCarouselImage.file.name}`);
            await uploadBytes(imageRef, newCarouselImage.file);
            const imageUrl = await getDownloadURL(imageRef);

            // Guardar en Firestore
            await addDoc(collection(db, 'carousel_images'), {
                imageUrl,
                name: newCarouselImage.name,
                price: newCarouselImage.price,
                order: carouselImages.length,

                createdAt: new Date()
            });

            alert('Imagen subida exitosamente');
            setNewCarouselImage({ file: null, name: '', price: '' });
            document.getElementById('carousel-file-input').value = '';
            cargarDatos();
        } catch (error) {
            console.error('Error subiendo imagen:', error);
            alert('Error al subir la imagen');
        } finally {
            setUploadingImage(false);
        }
    };

    // --- Lógica para Featured Products ---

    const handleFeaturedImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewFeaturedProduct({ ...newFeaturedProduct, file });
        }
    };

    const uploadFeaturedProduct = async (e) => {
        e.preventDefault();
        if (!newFeaturedProduct.file || !newFeaturedProduct.name || !newFeaturedProduct.price || !newFeaturedProduct.category) {
            alert('Por favor completa todos los campos');
            return;
        }

        try {
            setUploadingFeatured(true);

            // Subir imagen a Storage
            const imageRef = ref(storage, `featured/${Date.now()}_${newFeaturedProduct.file.name}`);
            await uploadBytes(imageRef, newFeaturedProduct.file);
            const imageUrl = await getDownloadURL(imageRef);

            // Guardar en Firestore
            await addDoc(collection(db, 'featured_products'), {
                imageUrl, // Nota: Home.jsx espera 'image' pero usaremos 'imageUrl' y adaptaremos Home.jsx o mapearemos
                name: newFeaturedProduct.name,
                price: newFeaturedProduct.price,
                category: newFeaturedProduct.category,
                weight: newFeaturedProduct.weight || '0', // Guardar peso
                createdAt: new Date()
            });

            alert('Producto destacado subido exitosamente');
            setNewFeaturedProduct({ file: null, name: '', price: '', category: '', weight: '' });
            document.getElementById('featured-file-input').value = '';
            cargarDatos();
        } catch (error) {
            console.error('Error subiendo producto destacado:', error);
            alert('Error al subir producto destacado');
        } finally {
            setUploadingFeatured(false);
        }
    };

    const deleteFeaturedProduct = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este producto destacado?')) return;

        try {
            await deleteDoc(doc(db, 'featured_products', id));
            alert('Producto eliminado exitosamente');
            cargarDatos();
        } catch (error) {
            console.error('Error eliminando producto:', error);
            alert('Error al eliminar el producto');
        }
    };

    // Función para eliminar imagen del carrusel
    const deleteCarouselImage = async (id) => {
        if (!confirm('¿Estás seguro de eliminar esta imagen?')) return;

        try {
            await deleteDoc(doc(db, 'carousel_images', id));
            alert('Imagen eliminada exitosamente');
            cargarDatos();
        } catch (error) {
            console.error('Error eliminando imagen:', error);
            alert('Error al eliminar la imagen');
        }
    };

    // --- Lógica para Tienda Online (Store Products) ---

    const handleStoreImageSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            setNewStoreProduct({ ...newStoreProduct, file });
        }
    };

    const uploadStoreProduct = async (e) => {
        e.preventDefault();
        if (!newStoreProduct.file || !newStoreProduct.name || !newStoreProduct.price || !newStoreProduct.category) {
            alert('Por favor completa todos los campos');
            return;
        }

        try {
            setUploadingStore(true);

            // Subir imagen a Storage
            const imageRef = ref(storage, `store/${Date.now()}_${newStoreProduct.file.name}`);
            await uploadBytes(imageRef, newStoreProduct.file);
            const imageUrl = await getDownloadURL(imageRef);

            // Guardar en Firestore Externo (Inventory)
            // Estructura anidada 'product' para mantener consistencia
            await addDoc(collection(inventoryDb, 'inventory'), {
                product: {
                    imageUrl,
                    name: newStoreProduct.name,
                    salePrice1: parseFloat(newStoreProduct.price), // Usamos salePrice1 como estándar
                    category: newStoreProduct.category,
                    weight: parseFloat(newStoreProduct.weight || '0'), // En libras (o gramos < 20)
                    createdAt: new Date()
                },
                createdAt: new Date() // Nivel raíz para ordenamiento
            });

            alert('Producto añadido a la tienda exitosamente');
            setNewStoreProduct({ ...newStoreProduct, file: null, name: '', price: '', weight: '' });
            document.getElementById('store-file-input').value = '';
            cargarDatos();
        } catch (error) {
            console.error('Error subiendo producto a tienda:', error);
            alert('Error al subir producto');
        } finally {
            setUploadingStore(false);
        }
    };


    const deleteStoreProduct = async (id) => {
        if (!confirm('¿Estás seguro de eliminar este producto de la tienda?')) return;

        try {
            await deleteDoc(doc(db, 'store_products', id));
            alert('Producto eliminado de la tienda');
            cargarDatos();
        } catch (error) {
            console.error('Error eliminando producto:', error);
            alert('Error al eliminar el producto');
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="text-amber-500">Cargando...</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 notranslate" translate="no">
            {/* Header Admin */}
            <nav className="bg-stone-900 border-b border-amber-600/30">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="text-amber-500" size={24} />
                            <div>
                                <div className="text-lg font-serif text-amber-100">GEORGINA - ADMIN</div>
                                <div className="text-[10px] text-amber-400 uppercase tracking-wider">Panel Administrativo</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-stone-400">
                                👑 {currentUser?.email}
                            </span>
                            <button
                                onClick={handleLogout}
                                className="flex items-center gap-2 text-sm text-stone-400 hover:text-amber-500 transition-colors"
                            >
                                <LogOut size={18} />
                                Salir
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-serif text-amber-100 mb-2">Panel de Administración</h1>
                        <p className="text-stone-400">Gestión de fechas y citas agendadas</p>
                    </div>

                    {/* Tabs Admin */}
                    <div className="flex bg-stone-900 p-1 rounded-lg border border-stone-800">
                        <button
                            onClick={() => setSubTab('fechas')}
                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${subTab === 'fechas' ? 'bg-amber-600 text-stone-950' : 'text-stone-400 hover:text-amber-100'}`}
                        >
                            Fechas Disponibles
                        </button>
                        <button
                            onClick={() => setSubTab('citas')}
                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${subTab === 'citas' ? 'bg-amber-600 text-stone-950' : 'text-stone-400 hover:text-amber-100'}`}
                        >
                            Citas Agendadas
                        </button>
                        <button
                            onClick={() => setSubTab('carrusel')}
                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${subTab === 'carrusel' ? 'bg-amber-600 text-stone-950' : 'text-stone-400 hover:text-amber-100'}`}
                        >
                            Carrusel
                        </button>
                        <button
                            onClick={() => setSubTab('featured')}
                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${subTab === 'featured' ? 'bg-amber-600 text-stone-950' : 'text-stone-400 hover:text-amber-100'}`}
                        >
                            Destacados
                        </button>
                        <button
                            onClick={() => setSubTab('tienda')}
                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${subTab === 'tienda' ? 'bg-amber-600 text-stone-950' : 'text-stone-400 hover:text-amber-100'}`}
                        >
                            Inventario
                        </button>
                        <button
                            onClick={() => setSubTab('pedidos')}
                            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${subTab === 'pedidos' ? 'bg-amber-600 text-stone-950' : 'text-stone-400 hover:text-amber-100'}`}
                        >
                            Pedidos Web ({onlineOrders.filter(o => o.status === 'pending').length})
                        </button>
                    </div>
                </div>

                {/* VISTA: Gestión de Fechas */}
                {subTab === 'fechas' && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-2xl font-serif text-amber-100">Fechas Configuradas</h2>
                            <button
                                onClick={() => setShowModal(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold rounded hover:from-amber-500 hover:to-amber-600 transition-all"
                            >
                                <Plus size={20} />
                                Nueva Fecha
                            </button>
                        </div>

                        <div className="space-y-3">
                            {fechasDisponibles.length === 0 ? (
                                <div className="text-center py-12 text-stone-500">
                                    <Calendar className="mx-auto mb-4" size={48} />
                                    <p>No hay fechas configuradas</p>
                                </div>
                            ) : (
                                fechasDisponibles.map((fecha) => (
                                    <div
                                        key={fecha.id}
                                        className="flex flex-col md:flex-row md:items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all gap-4"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <Calendar className="text-amber-500" size={24} />
                                            <div className="flex-1">
                                                <p className="font-semibold text-amber-100">
                                                    {new Date(fecha.fecha).toLocaleDateString('es-ES', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                                <p className="text-sm text-stone-400">Tienda: {fecha.tienda}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {fecha.horarios?.map((horario, idx) => (
                                                        // translate="no" previene crashes con traductor del navegador
                                                        <span
                                                            key={idx}
                                                            translate="no"
                                                            className="px-2 py-1 bg-amber-600/20 border border-amber-600/50 text-amber-400 text-xs rounded"
                                                        >
                                                            <Clock size={12} className="inline mr-1" />
                                                            {horario}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => eliminarFecha(fecha.id)}
                                            className="p-2 text-red-400 hover:bg-red-500/20 rounded transition-all"
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* VISTA: Citas Agendadas */}
                {subTab === 'citas' && (
                    <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                        <h2 className="text-2xl font-serif text-amber-100 mb-6">Citas de Clientes</h2>

                        <div className="space-y-3">
                            {citasAgendadas.length === 0 ? (
                                <div className="text-center py-12 text-stone-500">
                                    <ShoppingBag className="mx-auto mb-4" size={48} />
                                    <p>No hay citas agendadas aún</p>
                                </div>
                            ) : (
                                citasAgendadas.map((cita) => (
                                    <div
                                        key={cita.id}
                                        className="flex flex-col md:flex-row md:items-center justify-between bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/10 transition-all gap-6"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-10 h-10 rounded-full bg-amber-600/20 flex items-center justify-center text-amber-500 font-bold">
                                                {cita.userEmail?.[0].toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-amber-100">
                                                    {cita.userName || 'Usuario'}
                                                </p>
                                                <p className="text-xs text-stone-400">{cita.userEmail}</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-6 md:pr-8">
                                            <div>
                                                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Cita</p>
                                                <div className="flex items-center gap-2 text-amber-100">
                                                    <Calendar size={14} className="text-amber-500" />
                                                    {new Date(cita.fecha).toLocaleDateString('es-ES')}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Hora</p>
                                                <div className="flex items-center gap-2 text-amber-100" translate="no">
                                                    <Clock size={14} className="text-amber-500" />
                                                    {cita.horario}
                                                </div>
                                            </div>

                                            <div>
                                                <p className="text-xs text-stone-500 uppercase tracking-wider mb-1">Tienda</p>
                                                <span className="px-2 py-0.5 rounded bg-stone-800 border border-stone-700 text-stone-300 text-sm">
                                                    {cita.tienda}
                                                </span>
                                            </div>

                                            {/* Acciones de Aprobación */}
                                            <div className="flex flex-col md:items-end gap-2 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-white/10 pt-4 md:pt-0 w-full md:w-auto">
                                                {cita.comprobanteUrl && (
                                                    <a
                                                        href={cita.comprobanteUrl}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-2 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                                    >
                                                        <FileText size={14} /> Ver Comprobante
                                                    </a>
                                                )}

                                                {cita.estado === 'pago_en_revision' ? (
                                                    <button
                                                        onClick={() => aprobarCita(cita.id, cita.userEmail)}
                                                        className="flex items-center gap-1 px-3 py-1 bg-green-600/20 border border-green-600/50 text-green-400 rounded text-xs hover:bg-green-600 hover:text-stone-950 transition-all font-semibold"
                                                    >
                                                        <CheckCircle size={14} /> Aprobar Cita
                                                    </button>
                                                ) : cita.estado === 'confirmada' ? (
                                                    <span className="flex items-center gap-1 text-green-500 text-xs font-semibold bg-green-900/20 px-2 py-1 rounded border border-green-900/50">
                                                        <CheckCircle size={14} /> Confirmada
                                                    </span>
                                                ) : (
                                                    <span className="text-stone-500 text-xs italic">Pendiente Pago</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Estadísticas */}
                <div className="grid md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-blue-600/10 border border-blue-600/30 rounded-lg p-6">
                        <h3 className="text-sm text-blue-400 mb-2">Fechas Configuradas</h3>
                        <p className="text-3xl font-serif text-blue-300">{fechasDisponibles.length}</p>
                    </div>

                    <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-6">
                        <h3 className="text-sm text-amber-400 mb-2">Citas Totales</h3>
                        <p className="text-3xl font-serif text-amber-300">
                            {citasAgendadas.length}
                        </p>
                    </div>

                    <div className="bg-green-600/10 border border-green-600/30 rounded-lg p-6">
                        <h3 className="text-sm text-green-400 mb-2">Órdenes Activas</h3>
                        <p className="text-3xl font-serif text-green-300">0</p>
                    </div>
                </div>

                {/* Test de Emails */}
                <div className="mt-8 bg-purple-900/10 border border-purple-600/30 rounded-lg p-6">
                    <h3 className="text-lg font-serif text-purple-100 mb-4 flex items-center gap-2">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        Probar Envío de Emails
                    </h3>
                    <p className="text-sm text-stone-400 mb-4">
                        Envía un email de prueba de confirmación de pago aprobado a cualquier dirección.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3">
                        <input
                            type="email"
                            value={emailTest}
                            onChange={(e) => setEmailTest(e.target.value)}
                            placeholder="correo@ejemplo.com"
                            className="flex-1 bg-stone-900 border border-stone-700 px-4 py-3 text-amber-100 rounded focus:border-purple-600 outline-none placeholder:text-stone-600"
                            disabled={sendingTest}
                        />
                        <button
                            onClick={enviarEmailPrueba}
                            disabled={sendingTest || !emailTest}
                            className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white font-semibold rounded hover:from-purple-500 hover:to-purple-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
                        >
                            {sendingTest ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                    </svg>
                                    Enviar Test
                                </>
                            )}
                        </button>
                    </div>
                    <div className="mt-3 text-xs text-stone-500">
                        💡 Tip: El email de prueba simula una cita confirmada con datos de ejemplo.
                    </div>
                </div>
            </div>

            {/* Modal Agregar Fecha - Paso 1: Fecha */}
            {showModal && step === 1 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-stone-900 border border-white/10 rounded-lg max-w-md w-full mx-4 p-8 relative">
                        <button
                            onClick={cerrarModal}
                            className="absolute top-4 right-4 text-stone-400 hover:text-amber-500 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-serif text-amber-100 mb-2">Agregar Nueva Fecha</h2>
                        <p className="text-stone-400 text-sm mb-6">Paso 1 de 2: Selecciona la fecha</p>

                        <form onSubmit={(e) => { e.preventDefault(); siguientePaso(); }} className="space-y-6">
                            <div>
                                <label className="block text-sm text-amber-100 mb-2">Fecha</label>
                                <input
                                    type="date"
                                    value={nuevaFecha.fecha}
                                    onChange={(e) => setNuevaFecha({ ...nuevaFecha, fecha: e.target.value })}
                                    className="w-full bg-transparent border border-stone-700 px-4 py-3 text-amber-100 rounded focus:border-amber-600 outline-none"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-amber-100 mb-2">Tienda</label>
                                <select
                                    value={nuevaFecha.tienda}
                                    onChange={(e) => setNuevaFecha({ ...nuevaFecha, tienda: e.target.value })}
                                    className="w-full bg-stone-800 border border-stone-700 px-4 py-3 text-amber-100 rounded focus:border-amber-600 outline-none"
                                >
                                    <option value="Burlington">Burlington</option>
                                    <option value="Marshall's">Marshall's</option>
                                    <option value="Ross">Ross</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold py-3 rounded hover:from-amber-500 hover:to-amber-600 transition-all"
                            >
                                Siguiente: Seleccionar Horarios
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Agregar Fecha - Paso 2: Horarios */}
            {showModal && step === 2 && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-stone-900 border border-white/10 rounded-lg max-w-2xl w-full mx-4 p-8 relative">
                        <button
                            onClick={cerrarModal}
                            className="absolute top-4 right-4 text-stone-400 hover:text-amber-500 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-serif text-amber-100 mb-2">Seleccionar Horarios</h2>
                        <p className="text-stone-400 text-sm mb-6">
                            Paso 2 de 2: Activa los horarios disponibles para el {new Date(nuevaFecha.fecha).toLocaleDateString('es-ES')}
                        </p>

                        <form onSubmit={agregarFecha} className="space-y-6">
                            <div className="grid grid-cols-3 gap-3" translate="no">
                                {horariosDisponibles.map((horario) => {
                                    const isSelected = nuevaFecha.horarios.includes(horario);
                                    return (
                                        <button
                                            key={horario}
                                            type="button"
                                            onClick={() => toggleHorario(horario)}
                                            className={`
                        p-4 rounded-lg border-2 transition-all text-center font-semibold notranslate
                        ${isSelected
                                                    ? 'bg-amber-600/30 border-amber-600 text-amber-100'
                                                    : 'bg-stone-800 border-stone-700 text-stone-400 hover:border-stone-600'
                                                }
                      `}
                                            translate="no"
                                        >
                                            <Clock size={20} className="mx-auto mb-2" />
                                            {horario}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="bg-amber-600/10 border border-amber-600/30 rounded-lg p-4">
                                <p className="text-sm text-amber-100">
                                    <strong>{nuevaFecha.horarios.length}</strong> horario{nuevaFecha.horarios.length !== 1 ? 's' : ''} seleccionado{nuevaFecha.horarios.length !== 1 ? 's' : ''}
                                </p>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="flex-1 bg-stone-800 text-amber-100 font-semibold py-3 rounded hover:bg-stone-700 transition-all"
                                >
                                    Atrás
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold py-3 rounded hover:from-amber-500 hover:to-amber-600 transition-all"
                                >
                                    Guardar Fecha
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* VISTA: Gestión de Carrusel */}
            {subTab === 'carrusel' && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                    <h2 className="text-2xl font-serif text-amber-100 mb-6">Gestión de Carrusel</h2>

                    {/* Formulario para subir nueva imagen */}
                    <form onSubmit={uploadCarouselImage} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                        <h3 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                            <Upload size={20} />
                            Subir Nueva Imagen
                        </h3>

                        <div className="grid md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm text-stone-400 mb-2">Imagen del Producto</label>
                                <input
                                    id="carousel-file-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleImageSelect}
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-stone-400 mb-2">Nombre del Producto</label>
                                <input
                                    type="text"
                                    value={newCarouselImage.name}
                                    onChange={(e) => setNewCarouselImage({ ...newCarouselImage, name: e.target.value })}
                                    placeholder="Ej: Fashion Item"
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div>
                                <label className="block text-sm text-stone-400 mb-2">Precio</label>
                                <input
                                    type="text"
                                    value={newCarouselImage.price}
                                    onChange={(e) => setNewCarouselImage({ ...newCarouselImage, price: e.target.value })}
                                    placeholder="Ej: $45.00"
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={uploadingImage}
                            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold rounded hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            <Upload size={18} />
                            {uploadingImage ? 'Subiendo...' : 'Subir Imagen'}
                        </button>
                    </form>

                    {/* Galería de imágenes del carrusel */}
                    <div>
                        <h3 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                            <Image size={20} />
                            Imágenes Actuales ({carouselImages.length})
                        </h3>

                        {carouselImages.length === 0 ? (
                            <div className="text-center py-12 text-stone-400">
                                <Image size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No hay imágenes en el carrusel</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {carouselImages.map((image) => (
                                    <div key={image.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                                        <div className="aspect-[4/3] relative">
                                            <img
                                                src={image.imageUrl}
                                                alt={image.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={() => deleteCarouselImage(image.id)}
                                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-semibold text-amber-100 truncate">{image.name}</p>
                                            <p className="text-xs text-amber-400">{image.price}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* VISTA: Gestión de Destacados (Featured) */}
            {subTab === 'featured' && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                    <h2 className="text-2xl font-serif text-amber-100 mb-6">Gestión de Productos Destacados</h2>

                    {/* Formulario para subir nuevo producto destacado */}
                    <form onSubmit={uploadFeaturedProduct} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                        <h3 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                            <Upload size={20} />
                            Añadir Nuevo Destacado
                        </h3>

                        <div className="grid md:grid-cols-5 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Imagen del Producto</label>
                                <input
                                    id="featured-file-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleFeaturedImageSelect}
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Nombre</label>
                                <input
                                    type="text"
                                    value={newFeaturedProduct.name}
                                    onChange={(e) => setNewFeaturedProduct({ ...newFeaturedProduct, name: e.target.value })}
                                    placeholder="Ej: Bolso Hermès"
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Precio</label>
                                <input
                                    type="text"
                                    value={newFeaturedProduct.price}
                                    onChange={(e) => setNewFeaturedProduct({ ...newFeaturedProduct, price: e.target.value })}
                                    placeholder="Ej: $4,500"
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Peso (Lbs)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newFeaturedProduct.weight}
                                    onChange={(e) => setNewFeaturedProduct({ ...newFeaturedProduct, weight: e.target.value })}
                                    placeholder="Ej: 2.5"
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Categoría</label>
                                <input
                                    type="text"
                                    value={newFeaturedProduct.category}
                                    onChange={(e) => setNewFeaturedProduct({ ...newFeaturedProduct, category: e.target.value })}
                                    placeholder="Ej: Bolsos"
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={uploadingFeatured}
                            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold rounded hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            <Upload size={18} />
                            {uploadingFeatured ? 'Subiendo...' : 'Publicar Destacado'}
                        </button>
                    </form>

                    {/* Galería de destacados actuales */}
                    <div>
                        <h3 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                            <Star size={20} />
                            Destacados Actuales ({featuredProducts.length})
                        </h3>

                        {featuredProducts.length === 0 ? (
                            <div className="text-center py-12 text-stone-400">
                                <Star size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No hay productos destacados</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {featuredProducts.map((product) => (
                                    <div key={product.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                                        <div className="aspect-[3/4] relative">
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={() => deleteFeaturedProduct(product.id)}
                                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-semibold text-amber-100 truncate">{product.name}</p>
                                            <p className="text-xs text-amber-400 mb-1">{product.price}</p>
                                            <span className="text-[10px] uppercase tracking-wider bg-amber-600/20 text-amber-400 px-2 py-1 rounded-full">
                                                {product.category}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* VISTA: Gestión de Tienda Online (Nuestra Colección) */}
            {subTab === 'tienda' && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                    <h2 className="text-2xl font-serif text-amber-100 mb-6">Gestión de Tienda (Nuestra Colección)</h2>

                    {/* Formulario */}
                    <form onSubmit={uploadStoreProduct} className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8">
                        <h3 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                            <Upload size={20} />
                            Añadir Nuevo Producto
                        </h3>

                        <div className="grid md:grid-cols-5 gap-4">
                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Imagen</label>
                                <input
                                    id="store-file-input"
                                    type="file"
                                    accept="image/*"
                                    onChange={handleStoreImageSelect}
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Nombre</label>
                                <input
                                    type="text"
                                    value={newStoreProduct.name}
                                    onChange={(e) => setNewStoreProduct({ ...newStoreProduct, name: e.target.value })}
                                    placeholder="Ej: Zapatos Louboutin"
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Precio</label>
                                <input
                                    type="text"
                                    value={newStoreProduct.price}
                                    onChange={(e) => setNewStoreProduct({ ...newStoreProduct, price: e.target.value })}
                                    placeholder="Ej: $1,295"
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Peso (Lbs)</label>
                                <input
                                    type="number"
                                    step="0.01"
                                    value={newStoreProduct.weight}
                                    onChange={(e) => setNewStoreProduct({ ...newStoreProduct, weight: e.target.value })}
                                    placeholder="Ej: 1.2"
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                />
                            </div>

                            <div className="md:col-span-1">
                                <label className="block text-sm text-stone-400 mb-2">Categoría</label>
                                <select
                                    value={newStoreProduct.category}
                                    onChange={(e) => setNewStoreProduct({ ...newStoreProduct, category: e.target.value })}
                                    required
                                    className="w-full px-4 py-2 bg-stone-900 border border-stone-700 rounded text-stone-300 focus:outline-none focus:border-amber-600"
                                >
                                    {categoriasTienda.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={uploadingStore}
                            className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold rounded hover:from-amber-500 hover:to-amber-600 transition-all disabled:opacity-50 flex items-center gap-2"
                        >
                            <Upload size={18} />
                            {uploadingStore ? 'Subiendo...' : 'Publicar Producto'}
                        </button>
                    </form>

                    {/* Galería */}
                    <div>
                        <h3 className="text-lg font-semibold text-amber-100 mb-4 flex items-center gap-2">
                            <ShoppingBag size={20} />
                            Productos en Tienda ({storeProducts.length})
                        </h3>

                        {storeProducts.length === 0 ? (
                            <div className="text-center py-12 text-stone-400">
                                <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No hay productos en la tienda</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                {storeProducts.map((product) => (
                                    <div key={product.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden group">
                                        <div className="aspect-[3/4] relative">
                                            <img
                                                src={product.imageUrl}
                                                alt={product.name}
                                                className="w-full h-full object-cover"
                                            />
                                            {/* Badge de Fuente */}
                                            {product.source === 'fb' && (
                                                <div className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm z-10"> FB </div>
                                            )}
                                            {product.source === 'w' && (
                                                <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm z-10"> W </div>
                                            )}

                                            <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                <button
                                                    onClick={() => deleteStoreProduct(product.id)}
                                                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </div>
                                        <div className="p-3">
                                            <p className="text-sm font-semibold text-amber-100 truncate">{product.name}</p>
                                            <p className="text-sm text-amber-400 mb-1">{product.price}</p>
                                            <span className="text-[10px] uppercase tracking-wider bg-amber-600/20 text-amber-400 px-2 py-1 rounded-full">
                                                {product.category}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* VISTA: Importación Masiva */}

            {/* VISTA: Pedidos Online */}
            {subTab === 'pedidos' && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-serif text-amber-100">Pedidos de la Web</h2>
                        <button
                            onClick={cargarDatos}
                            className="flex items-center gap-2 px-4 py-2 bg-stone-800 hover:bg-stone-700 text-stone-300 rounded border border-stone-600 transition-colors text-sm"
                        >
                            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                            Actualizar
                        </button>
                    </div>

                    <div className="space-y-4">
                        {onlineOrders.length === 0 ? (
                            <p className="text-stone-400">No hay pedidos registrados.</p>
                        ) : (
                            onlineOrders.map(order => (
                                <div key={order.id} className="bg-stone-900 border border-stone-800 rounded-lg p-6 flex flex-col md:flex-row justify-between gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                            <span className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider rounded ${order.status === 'paid' ? 'bg-green-900 text-green-400' :
                                                order.status === 'cancelled' ? 'bg-red-900 text-red-400' :
                                                    'bg-amber-900 text-amber-400'
                                                }`}>
                                                {order.status === 'paid' ? 'PAGADO' :
                                                    order.status === 'cancelled' ? 'CANCELADO' : 'PENDIENTE'}
                                            </span>
                                            <span className="text-stone-500 text-xs">
                                                {order.createdAt?.seconds ? new Date(order.createdAt.seconds * 1000).toLocaleString() : 'Fecha desc.'}
                                            </span>
                                        </div>
                                        <h3 className="text-amber-100 font-bold text-lg mb-1">{order.nombre}</h3>
                                        <p className="text-stone-400 text-sm mb-2">{order.telefono}</p>

                                        <div className="mt-4 bg-black/20 p-3 rounded">
                                            {order.items?.map((item, idx) => (
                                                <div key={idx} className="flex justify-between text-sm text-stone-300 mb-1 border-b border-white/5 pb-1 last:border-0 last:pb-0">
                                                    <span>{item.quantity}x {item.name}</span>
                                                    <span>${item.price}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between text-amber-500 font-bold mt-2 pt-2 border-t border-white/10">
                                                <span>Total</span>
                                                <span>${order.total}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-2 justify-center border-l border-white/5 pl-6">
                                        {order.status !== 'cancelled' && (
                                            <>
                                                {order.status !== 'paid' && (
                                                    <button
                                                        onClick={() => handleOrderStatus(order.id, 'paid', order)}
                                                        className="px-4 py-2 bg-green-700/20 text-green-400 border border-green-700/50 rounded hover:bg-green-700/40 transition-colors text-sm font-bold"
                                                    >
                                                        CONFIRMAR PAGO
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleOrderStatus(order.id, 'cancelled', order)}
                                                    className="px-4 py-2 bg-red-700/20 text-red-400 border border-red-700/50 rounded hover:bg-red-700/40 transition-colors text-sm font-bold"
                                                >
                                                    CANCELAR Y DEVOLVER
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
