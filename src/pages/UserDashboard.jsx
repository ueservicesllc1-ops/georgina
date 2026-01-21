import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db, storage } from '../firebase';
import { collection, addDoc, getDocs, query, orderBy, where, doc, updateDoc, arrayRemove, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ShoppingBag, Package, Truck, CheckCircle, Plus, LogOut, ChevronDown, ChevronUp, Scale, Clock, X, Calendar, CreditCard, Upload, DollarSign, FileText } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { EMAILJS_CONFIG } from '../config/emailConfig';

export default function UserDashboard() {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ordenes'); // 'ordenes', 'citas', 'nueva'
    const [expandedOrder, setExpandedOrder] = useState(null);

    // Estados de Datos
    const [fechasDisponibles, setFechasDisponibles] = useState([]);
    const [citasUsuario, setCitasUsuario] = useState([]);
    const [compras, setCompras] = useState([]);

    const [loading, setLoading] = useState(true);
    const [fechaSeleccionada, setFechaSeleccionada] = useState(null);
    const [showHorariosModal, setShowHorariosModal] = useState(false);
    const [horariosSeleccionados, setHorariosSeleccionados] = useState([]);

    // Estado Pago
    const [pagoModal, setPagoModal] = useState({ open: false, cita: null, paso: 'seleccion' });
    const [comprobante, setComprobante] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        const cargarDatos = async () => {
            try {
                if (!currentUser) return;

                // 1. Cargar Fechas Disponibles
                const qFechas = query(collection(db, 'available_dates'), orderBy('fecha', 'asc'));
                const snapFechas = await getDocs(qFechas);
                const fechas = [];
                snapFechas.forEach(doc => fechas.push({ id: doc.id, ...doc.data() }));
                setFechasDisponibles(fechas);

                // 2. Cargar Citas
                const qCitas = query(collection(db, 'appointments'), where('userId', '==', currentUser.uid));
                const snapCitas = await getDocs(qCitas);
                const citas = [];
                snapCitas.forEach(doc => citas.push({ id: doc.id, ...doc.data() }));
                // Ordenar por fecha de creación descendente
                citas.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                    return dateB - dateA;
                });
                setCitasUsuario(citas);

                // 3. Cargar Órdenes (Purchases)
                const qCompras = query(collection(db, 'purchases'), where('userId', '==', currentUser.uid));
                const snapCompras = await getDocs(qCompras);
                const misCompras = [];
                snapCompras.forEach(doc => misCompras.push({ id: doc.id, ...doc.data() }));
                misCompras.sort((a, b) => {
                    const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                    const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                    return dateB - dateA;
                });
                setCompras(misCompras);

                // 4. Cargar Configuración (Resiliente: site_global o cualquier documento)
                const settingsRef = doc(db, 'site_settings', 'site_global');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {
                    setSettings(settingsSnap.data());
                } else {
                    // Si no existe site_global, buscamos el primer documento que haya
                    const snapFallback = await getDocs(collection(db, 'site_settings'));
                    if (!snapFallback.empty) {
                        setSettings(snapFallback.docs[0].data());
                    }
                }

            } catch (error) {
                console.error("Error cargando datos:", error);
            } finally {
                setLoading(false);
            }
        };

        cargarDatos();
    }, [currentUser]);

    const seleccionarFecha = (fecha) => {
        setFechaSeleccionada(fecha);
        setHorariosSeleccionados([]);
        setShowHorariosModal(true);
    };

    const toggleHorario = (horario) => {
        setHorariosSeleccionados(prev =>
            prev.includes(horario)
                ? prev.filter(h => h !== horario)
                : [...prev, horario]
        );
    };

    const agendarCita = async () => {
        if (horariosSeleccionados.length === 0) {
            alert('Por favor selecciona al menos una hora.');
            return;
        }

        try {
            const precioPorHora = 25;
            const total = horariosSeleccionados.length * precioPorHora;
            const horariosOrdenados = [...horariosSeleccionados].sort();
            const horariosString = horariosOrdenados.join(', ');

            const nuevaCitaData = {
                userId: currentUser.uid,
                userEmail: currentUser.email,
                userName: currentUser.displayName || currentUser.email,
                fecha: fechaSeleccionada.fecha,
                horario: horariosString,
                horarios: horariosOrdenados,
                tienda: fechaSeleccionada.tienda,
                estado: 'pendiente',
                totalEstimado: total,
                precioPorHora: precioPorHora,
                createdAt: new Date()
            };

            const docRef = await addDoc(collection(db, 'appointments'), nuevaCitaData);

            // Enviar correo de confirmación
            await sendEmailConfirmacion(nuevaCitaData);

            // ACTUALIZACIÓN CRÍTICA: Eliminar los horarios reservados de la disponibilidad
            // Esto "bloquea" las horas para que nadie más pueda elegirlas
            const fechaDocRef = doc(db, 'available_dates', fechaSeleccionada.id);
            await updateDoc(fechaDocRef, {
                horarios: arrayRemove(...horariosSeleccionados)
            });

            alert(`¡Cita agendada exitosamente!\n\nFecha: ${new Date(fechaSeleccionada.fecha).toLocaleDateString('es-ES')}\nHorarios: ${horariosString}\nTotal estimado: $${total}`);

            const nuevaCitaConId = { id: docRef.id, ...nuevaCitaData };
            setCitasUsuario([nuevaCitaConId, ...citasUsuario]);

            // Actualizar estado local de fechas disponibles (quitar las horas reservadas visualmente)
            setFechasDisponibles(prev => prev.map(f => {
                if (f.id === fechaSeleccionada.id) {
                    return {
                        ...f,
                        horarios: f.horarios.filter(h => !horariosSeleccionados.includes(h))
                    };
                }
                return f;
            }));

            setShowHorariosModal(false);
            setFechaSeleccionada(null);
            setHorariosSeleccionados([]);
            setActiveTab('citas');

        } catch (error) {
            console.error('Error agendando cita:', error);
            alert('Error al agendar la cita');
        }
    };

    const sendEmailConfirmacion = async (citaData) => {
        try {
            const templateParams = {
                asunto: 'Cita Agendada - Georgina Personal Shopper',
                titulo: 'GEORGINA PERSONAL SHOPPER',
                user_name: citaData.userName,
                user_email: citaData.userEmail,
                mensaje_principal: '¡Tu cita ha sido agendada exitosamente! A continuación encontrarás todos los detalles.',
                fecha: new Date(citaData.fecha).toLocaleDateString('es-ES', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                }),
                horarios: citaData.horario,
                tienda: citaData.tienda,
                total: `$${citaData.totalEstimado || '0.00'}`,
                estado: 'Pendiente de Pago',
                mostrar_pago: '',
                mostrar_confirmacion: 'display:none'
            };

            await emailjs.send(
                EMAILJS_CONFIG.SERVICE_ID,
                EMAILJS_CONFIG.TEMPLATE_ID,
                templateParams,
                EMAILJS_CONFIG.PUBLIC_KEY
            );

            console.log('Correo de confirmación enviado exitosamente');
        } catch (error) {
            console.error('Error enviando correo de confirmación:', error);
        }
    };


    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const abrirModalPago = (cita) => {
        setPagoModal({ open: true, cita, paso: 'seleccion' });
        setComprobante(null);
    };

    const handleSubirComprobante = async () => {
        if (!comprobante) {
            alert('Por favor selecciona un archivo');
            return;
        }

        try {
            setUploading(true);
            const storageRef = ref(storage, `comprobantes/${currentUser.uid}/${pagoModal.cita.id}_${Date.now()}`);
            await uploadBytes(storageRef, comprobante);
            const url = await getDownloadURL(storageRef);

            // Actualizar cita
            const citaRef = doc(db, 'appointments', pagoModal.cita.id);
            await updateDoc(citaRef, {
                estado: 'pago_en_revision',
                comprobanteUrl: url,
                metodoPago: 'deposito_pichincha',
                fechaPago: new Date()
            });

            // Actualizar UI local
            setCitasUsuario(prev => prev.map(c =>
                c.id === pagoModal.cita.id
                    ? { ...c, estado: 'pago_en_revision', comprobanteUrl: url }
                    : c
            ));

            // alert('Comprobante subido exitosamente. Tu cita será confirmada dentro de las próximas horas una vez se valide el depósito.');
            setPagoModal(prev => ({ ...prev, paso: 'exito' }));

        } catch (error) {
            console.error('Error subiendo comprobante:', error);
            alert('Error al subir el comprobante');
        } finally {
            setUploading(false);
        }
    };

    const getStatusBadge = (estado) => {
        const badges = {
            en_bodega: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/50', text: 'En Bodega USA', icon: <Package size={14} /> },
            enviado: { color: 'bg-amber-500/20 text-amber-400 border-amber-500/50', text: 'Enviado', icon: <Truck size={14} /> },
            recibido: { color: 'bg-green-500/20 text-green-400 border-green-500/50', text: 'Recibido', icon: <CheckCircle size={14} /> },
            pendiente: { color: 'bg-stone-500/20 text-stone-400 border-stone-500/50', text: 'Pendiente Pago', icon: <Clock size={14} /> },
            pago_en_revision: { color: 'bg-purple-500/20 text-purple-400 border-purple-500/50', text: 'Revisando Pago', icon: <FileText size={14} /> }
        };
        return badges[estado] || badges.pendiente;
    };

    return (
        <div className="min-h-screen bg-stone-950 notranslate" translate="no">
            {/* Header */}
            <nav className="bg-stone-900 border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-3">
                            <ShoppingBag className="text-amber-500" size={24} />
                            <div>
                                <div className="text-lg font-serif text-amber-100">GEORGINA</div>
                                <div className="text-[10px] text-stone-400 uppercase tracking-wider">Personal Shopper</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className="text-sm text-stone-400">
                                {currentUser?.email || currentUser?.displayName}
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
            <div className="max-w-7xl mx-auto px-3 md:px-6 py-4 md:py-12">
                <h1 className="text-4xl font-serif text-amber-100 mb-8">Mi Dashboard</h1>

                {/* Tabs */}
                {/* translate="no" previene crashes con traductor del navegador al modificar DOM */}
                <div className="flex gap-4 mb-8 border-b border-white/10 pb-4 overflow-x-auto" translate="no">
                    <button
                        onClick={() => setActiveTab('ordenes')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all whitespace-nowrap
                            ${activeTab === 'ordenes'
                                ? 'bg-amber-600 text-stone-950'
                                : 'bg-white/5 text-stone-400 hover:bg-white/10'}`}
                    >
                        <ShoppingBag size={18} />
                        Mis Órdenes ({compras.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('citas')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all whitespace-nowrap
                            ${activeTab === 'citas'
                                ? 'bg-amber-600 text-stone-950'
                                : 'bg-white/5 text-stone-400 hover:bg-white/10'}`}
                    >
                        <Calendar size={18} />
                        Mis Citas ({citasUsuario.length})
                    </button>
                    <button
                        onClick={() => setActiveTab('nueva')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-full text-sm font-semibold transition-all whitespace-nowrap
                            ${activeTab === 'nueva'
                                ? 'bg-amber-600 text-stone-950'
                                : 'bg-white/5 text-stone-400 hover:bg-white/10'}`}
                    >
                        <Plus size={18} />
                        Agendar Cita
                    </button>
                </div>

                {/* VISTA 1: Mis Órdenes */}
                {activeTab === 'ordenes' && (
                    <div className="space-y-4">
                        {compras.length === 0 ? (
                            <div className="text-center py-12 bg-white/5 rounded-lg border border-white/10">
                                <ShoppingBag className="mx-auto mb-4 text-stone-600" size={48} />
                                <h3 className="text-xl text-amber-100 font-serif mb-2">No tienes órdenes aún</h3>
                                <p className="text-stone-400 mb-6">Agenda una cita para comenzar tus compras con Georgina.</p>
                                <button
                                    onClick={() => setActiveTab('nueva')}
                                    className="px-6 py-2 bg-amber-600 text-stone-950 font-semibold rounded hover:bg-amber-500 transition-colors"
                                >
                                    Agendar Cita
                                </button>
                            </div>
                        ) : (
                            compras.map(order => {
                                const status = getStatusBadge(order.estado || 'pendiente');
                                const total = order.total || order.productos?.reduce((sum, p) => sum + (parseFloat(p.precio) || 0), 0) || 0;
                                const fecha = order.createdAt?.toDate ? new Date(order.createdAt.toDate()).toLocaleDateString() : 'Fecha pendiente';

                                return (
                                    <div key={order.id} className="bg-white/5 border border-white/10 rounded-lg overflow-hidden transition-all hover:bg-white/[0.07]">
                                        <div
                                            className="p-5 md:p-6 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                                            onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                                        >
                                            <div className="flex items-center gap-4 md:gap-6">
                                                <div className={`w-12 h-12 flex-shrink-0 rounded-full flex items-center justify-center ${status.color.split(' ')[0]}`}>
                                                    {status.icon}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-amber-100 text-base md:text-lg mb-0.5">
                                                        Orden {fecha}
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-2 md:gap-3 text-sm">
                                                        <span className="text-stone-400">{order.productos?.length || 0} artículos</span>
                                                        <span className="hidden sm:inline w-1 h-1 bg-stone-600 rounded-full"></span>
                                                        <span className={`px-2 py-0.5 rounded text-[10px] border ${status.color}`}>
                                                            {status.text}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between sm:justify-end gap-6 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                                                <div className="sm:text-right">
                                                    <div className="text-[10px] text-stone-500 uppercase tracking-widest leading-none mb-1">Total</div>
                                                    <div className="font-serif text-lg md:text-xl text-amber-100">${parseFloat(total).toFixed(2)}</div>
                                                </div>
                                                <div className="p-2 sm:p-0">
                                                    {expandedOrder === order.id ? <ChevronUp className="text-stone-500" /> : <ChevronDown className="text-stone-500" />}
                                                </div>
                                            </div>
                                        </div>

                                        {expandedOrder === order.id && (
                                            <div className="border-t border-white/10 bg-black/20 p-6 animate-in slide-in-from-top-2">
                                                <div className="space-y-4">
                                                    {order.productos?.map((prod, idx) => (
                                                        <div key={idx} className="flex gap-4 p-4 rounded bg-white/5 items-center">
                                                            {prod.imagen && (
                                                                <img src={prod.imagen} alt={prod.nombre} className="w-16 h-16 object-cover rounded" />
                                                            )}
                                                            <div className="flex-1">
                                                                <h4 className="text-amber-100 font-medium">{prod.nombre || 'Producto'}</h4>
                                                                <p className="text-sm text-stone-400">{prod.descripcion || 'Sin descripción'}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <div className="text-amber-100">${prod.precio}</div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

                {/* VISTA 2: Mis Citas */}
                {activeTab === 'citas' && (
                    <div className="grid gap-4 md:grid-cols-2">
                        {citasUsuario.length === 0 ? (
                            <div className="col-span-2 text-center py-12 bg-white/5 rounded-lg border border-white/10">
                                <Calendar className="mx-auto mb-4 text-stone-600" size={48} />
                                <h3 className="text-xl text-amber-100 font-serif mb-2">No tienes citas programadas</h3>
                                <p className="text-stone-400 mb-6">¿Quieres ir de compras? Agenda tu cita ahora.</p>
                                <button
                                    onClick={() => setActiveTab('nueva')}
                                    className="px-6 py-2 bg-amber-600 text-stone-950 font-semibold rounded hover:bg-amber-500 transition-colors"
                                >
                                    Agendar Cita
                                </button>
                            </div>
                        ) : (
                            citasUsuario.map((cita) => (
                                <div key={cita.id} className="bg-white/5 border border-white/10 rounded-lg p-6 hover:bg-white/[0.07] transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Fecha</p>
                                            <p className="text-xl font-serif text-amber-100">
                                                {new Date(cita.fecha).toLocaleDateString('es-ES', {
                                                    weekday: 'long',
                                                    year: 'numeric',
                                                    month: 'long',
                                                    day: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                        <div className={`px-3 py-1 rounded text-xs border ${getStatusBadge(cita.estado || 'pendiente').color}`}>
                                            {cita.estado || 'Pendiente'}
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-4 mb-4">
                                        <div className="flex-1 bg-stone-900/50 p-3 rounded">
                                            <p className="text-xs text-stone-500 mb-1">Hora</p>
                                            <div className="flex items-center gap-2 text-amber-100" translate="no">
                                                <Clock size={16} className="text-amber-500" />
                                                {cita.horario}
                                            </div>
                                        </div>
                                        <div className="flex-1 bg-stone-900/50 p-3 rounded">
                                            <p className="text-xs text-stone-500 mb-1">Tienda</p>
                                            <div className="flex items-center gap-2 text-amber-100">
                                                <ShoppingBag size={16} className="text-amber-500" />
                                                {cita.tienda}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mt-4 pt-4 border-t border-white/5">
                                        <div className="text-xs text-stone-500">
                                            Agendado el {cita.createdAt?.toDate ? new Date(cita.createdAt.toDate()).toLocaleDateString() : 'Fecha desconocida'}
                                        </div>
                                        {cita.estado === 'pendiente' && (
                                            <button
                                                onClick={() => abrirModalPago(cita)}
                                                className="px-4 py-2 bg-amber-600/20 text-amber-500 border border-amber-600/50 rounded hover:bg-amber-600 hover:text-stone-950 transition-all text-sm font-semibold flex items-center gap-2"
                                            >
                                                <DollarSign size={14} />
                                                Confirmar Pago
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* VISTA 3: Agendar Nueva Cita */}
                {activeTab === 'nueva' && (
                    <div>
                        <h2 className="text-2xl font-serif text-amber-100 mb-6">Agendar Nueva Cita de Compras</h2>

                        <div className="bg-white/5 border border-white/10 rounded-lg p-8">
                            <p className="text-stone-400 mb-6">
                                Selecciona una fecha disponible donde Georgina estará comprando en las tiendas
                            </p>

                            {loading ? (
                                <div className="text-center py-12 text-amber-500">Cargando fechas disponibles...</div>
                            ) : fechasDisponibles.length === 0 ? (
                                <div className="text-center py-12 text-stone-500">
                                    <p>No hay fechas disponibles en este momento.</p>
                                    <p className="text-sm mt-2">Por favor vuelve más tarde.</p>
                                </div>
                            ) : (
                                <div className="grid gap-4">
                                    {fechasDisponibles.map((fecha) => (
                                        <button
                                            key={fecha.id}
                                            onClick={() => seleccionarFecha(fecha)}
                                            className="flex items-center justify-between bg-amber-600/10 border-2 border-amber-600 rounded-lg p-4 hover:bg-amber-600/20 transition-all text-left"
                                        >
                                            <div className="flex-1">
                                                <p className="font-semibold text-amber-100 text-lg">
                                                    {new Date(fecha.fecha).toLocaleDateString('es-ES', {
                                                        weekday: 'long',
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric'
                                                    })}
                                                </p>
                                                <p className="text-sm text-stone-400 mt-1">
                                                    Tienda: {fecha.tienda}
                                                </p>
                                                <p className="text-xs text-amber-500 mt-2">
                                                    {fecha.horarios?.length || 0} horarios disponibles
                                                </p>
                                            </div>
                                            <div className="text-amber-500">
                                                <Plus size={24} />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}

                            <div className="mt-8 p-4 bg-amber-600/10 border border-amber-600/30 rounded-lg">
                                <div className="flex items-start gap-3">
                                    <div className="w-4 h-4 bg-amber-600/20 border-2 border-amber-600 rounded mt-0.5"></div>
                                    <div className="flex-1">
                                        <p className="text-sm font-semibold text-amber-100 mb-1">Fechas disponibles</p>
                                        <p className="text-xs text-stone-400">
                                            Estas son las fechas en que Georgina estará comprando en las tiendas.
                                            Haz clic en una fecha para agendar tu cita.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de Horarios */}
            {showHorariosModal && fechaSeleccionada && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-stone-900 border border-white/10 rounded-lg max-w-2xl w-full mx-4 p-8 relative">
                        <button
                            onClick={() => {
                                setShowHorariosModal(false);
                                setFechaSeleccionada(null);
                            }}
                            className="absolute top-4 right-4 text-stone-400 hover:text-amber-500 transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-serif text-amber-100 mb-2">Selecciona un Horario</h2>
                        <p className="text-stone-400 text-sm mb-1">
                            {new Date(fechaSeleccionada.fecha).toLocaleDateString('es-ES', {
                                weekday: 'long',
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            })}
                        </p>
                        <p className="text-amber-500 text-sm mb-6">
                            Tienda: {fechaSeleccionada.tienda}
                        </p>

                        {/* translate="no" previene crashes con traductor del navegador */}
                        <div>
                            {fechaSeleccionada.horarios && fechaSeleccionada.horarios.length > 0 ? (
                                <div className="grid grid-cols-3 gap-3 mb-6" translate="no">
                                    {fechaSeleccionada.horarios.map((horario) => {
                                        const isSelected = horariosSeleccionados.includes(horario);
                                        return (
                                            <button
                                                key={horario}
                                                onClick={() => toggleHorario(horario)}
                                                className={`p-4 border-2 rounded-lg transition-all text-center notranslate ${isSelected
                                                    ? 'bg-amber-600 border-amber-500 text-stone-950'
                                                    : 'bg-amber-600/10 border-amber-600 text-amber-100 hover:bg-amber-600/30'
                                                    }`}
                                                translate="no"
                                            >
                                                <Clock className={`mx-auto mb-2 ${isSelected ? 'text-stone-950' : 'text-amber-500'}`} size={20} />
                                                <p className="font-semibold">{horario}</p>
                                            </button>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-stone-500">
                                    <p>No hay horarios disponibles para esta fecha</p>
                                </div>
                            )}

                            {/* Resumen y Confirmación */}
                            {horariosSeleccionados.length > 0 && (
                                <div className="bg-stone-800/50 p-4 rounded-lg border border-white/10 animate-in slide-in-from-bottom-2">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="text-sm text-stone-400">
                                            <p>{horariosSeleccionados.length} horas seleccionadas</p>
                                            <p className="text-xs mt-1">Precio por hora: $25</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-amber-100 font-serif text-2xl">
                                                ${horariosSeleccionados.length * 25}
                                            </p>
                                            <p className="text-xs text-amber-500">Total Estimado</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={agendarCita}
                                        className="w-full bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-bold py-3 rounded hover:from-amber-500 hover:to-amber-600 transition-all"
                                    >
                                        Confirmar y Agendar Cita
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Pagos */}
            {pagoModal.open && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-stone-900 border border-white/10 rounded-lg max-w-md w-full p-6 relative">
                        <button
                            onClick={() => setPagoModal({ ...pagoModal, open: false })}
                            className="absolute top-4 right-4 text-stone-400 hover:text-amber-500"
                        >
                            <X size={24} />
                        </button>

                        <h2 className="text-2xl font-serif text-amber-100 mb-6">Confirmar Cita</h2>

                        {pagoModal.paso === 'seleccion' && (
                            <div className="space-y-4">
                                <p className="text-stone-400 mb-4">Selecciona tu método de pago para confirmar la reserva:</p>

                                <button
                                    onClick={() => setPagoModal({ ...pagoModal, paso: 'pichincha' })}
                                    className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-amber-600/10 hover:border-amber-600 transition-all text-left group"
                                >
                                    <div className="w-12 h-12 bg-yellow-400 rounded flex items-center justify-center text-stone-900 font-bold shrink-0">
                                        BP
                                    </div>
                                    <div>
                                        <p className="font-semibold text-amber-100 group-hover:text-amber-500">Transferencia Banco Pichincha</p>
                                        <p className="text-sm text-stone-500">Depósito o transferencia directa</p>
                                    </div>
                                </button>

                                <button
                                    onClick={() => alert('Integración PayPal próximamente')}
                                    className="w-full flex items-center gap-4 p-4 bg-white/5 border border-white/10 rounded-lg hover:bg-blue-600/10 hover:border-blue-500 transition-all text-left"
                                >
                                    <div className="w-12 h-12 bg-blue-600 rounded flex items-center justify-center text-white shrink-0">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-blue-100">Tarjeta / PayPal</p>
                                        <p className="text-sm text-stone-500">Pago seguro en línea</p>
                                    </div>
                                </button>
                            </div>
                        )}

                        {pagoModal.paso === 'pichincha' && (
                            <div className="animate-in slide-in-from-right">
                                <button
                                    onClick={() => setPagoModal({ ...pagoModal, paso: 'seleccion' })}
                                    className="text-stone-500 hover:text-amber-500 text-sm mb-4 flex items-center gap-1"
                                >
                                    ← Volver
                                </button>

                                <div className="bg-amber-600/10 border border-amber-600/30 p-4 rounded-lg mb-6">
                                    <h3 className="font-semibold text-amber-100 mb-2 flex items-center gap-2">
                                        <DollarSign size={16} /> Datos Bancarios
                                    </h3>
                                    <div className="space-y-1 text-sm text-stone-300">
                                        <p><span className="text-stone-500">Banco:</span> {settings?.bank?.bankName || 'Banco Pichincha'}</p>
                                        <p><span className="text-stone-500">Tipo:</span> {settings?.bank?.accountType || 'Cuenta de Ahorros'}</p>
                                        <p><span className="text-stone-500">Número:</span> {settings?.bank?.accountNumber || 'Cargando...'}</p>
                                        <p><span className="text-stone-500">Titular:</span> {settings?.bank?.name || 'Cargando...'}</p>
                                        <p><span className="text-stone-500 font-bold">Total a pagar:</span> <span className="text-amber-400 font-bold text-lg">${pagoModal.cita.totalEstimado || '0.00'}</span></p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    <label className="block">
                                        <span className="text-stone-400 text-sm mb-2 block">Subir Comprobante</span>
                                        <input
                                            type="file"
                                            accept="image/*,.pdf"
                                            onChange={(e) => setComprobante(e.target.files[0])}
                                            className="block w-full text-sm text-stone-400
                                                file:mr-4 file:py-2 file:px-4
                                                file:rounded-full file:border-0
                                                file:text-sm file:font-semibold
                                                file:bg-amber-600 file:text-stone-950
                                                file:cursor-pointer hover:file:bg-amber-500
                                            "
                                        />
                                    </label>

                                    <button
                                        onClick={handleSubirComprobante}
                                        disabled={uploading || !comprobante}
                                        className="w-full bg-amber-600 text-stone-950 font-bold py-3 rounded hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    >
                                        {uploading ? (
                                            'Subiendo...'
                                        ) : (
                                            <>
                                                <Upload size={18} />
                                                Enviar Comprobante
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}

                        {pagoModal.paso === 'exito' && (
                            <div className="text-center animate-in zoom-in-95 duration-300">
                                <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <CheckCircle size={40} className="text-green-500" />
                                </div>
                                <h3 className="text-2xl font-serif text-amber-100 mb-4">¡Comprobante Recibido!</h3>
                                <p className="text-stone-400 mb-8 leading-relaxed">
                                    Hemos recibido tu comprobante de pago correctamente.
                                    <br />
                                    Tu cita será confirmada dentro de las próximas horas una vez hayamos validado el depósito.
                                </p>
                                <button
                                    onClick={() => setPagoModal({ open: false, cita: null, paso: 'seleccion' })}
                                    className="w-full bg-amber-600 text-stone-950 font-bold py-3 rounded hover:bg-amber-500 transition-all shadow-lg shadow-amber-900/20"
                                >
                                    Entendido, gracias
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
