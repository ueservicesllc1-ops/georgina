import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { db } from '../firebase';
import { collection, addDoc, deleteDoc, doc, updateDoc, getDocs, query, orderBy } from 'firebase/firestore';
import { Calendar, ShoppingBag, LogOut, Plus, Trash2, X, Clock, ExternalLink, FileText, CheckCircle } from 'lucide-react';

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
    const [subTab, setSubTab] = useState('fechas'); // 'fechas' o 'citas'

    // Horarios disponibles para seleccionar
    const horariosDisponibles = [
        '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM',
        '05:00 PM', '06:00 PM'
    ];

    useEffect(() => {
        cargarDatos();
    }, []);

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
            if (currentUser.email === 'luisuf@gmail.com') {
                const qCitas = query(collection(db, 'appointments'), orderBy('createdAt', 'desc'));
                const snapshotCitas = await getDocs(qCitas);
                const citas = [];
                snapshotCitas.forEach((doc) => citas.push({ id: doc.id, ...doc.data() }));
                setCitasAgendadas(citas);
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
        </div>
    );
}
