import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, Star, Calendar, Heart, ChevronLeft, ChevronRight, Instagram, Facebook, Mail, Phone, MapPin, Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import LoginModal from '../components/LoginModal';
import { db } from '../firebase';
import { inventoryDb } from '../firebaseInventory';
import { collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';

export default function Home() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const [carouselImages, setCarouselImages] = useState([]);
    const [settings, setSettings] = useState({
        social: {
            whatsapp: '15513019412',
            instagram: '#',
            tiktok: '#',
            facebook: '#'
        }
    });
    const { currentUser } = useAuth();
    const { addToCart, getCartCount, toggleCart } = useCart();
    const navigate = useNavigate();

    const handleAgendarClick = () => {
        if (currentUser) {
            navigate('/dashboard');
        } else {
            setLoginModalOpen(true);
        }
    };

    const handleLoginSuccess = () => {
        setLoginModalOpen(false);
        navigate('/dashboard');
    };

    // Estado para productos destacados
    const [featuredProducts, setFeaturedProducts] = useState([]);
    // Estado para tienda
    const [storeProducts, setStoreProducts] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('Todos');
    const categories = ['Todos', 'Ropa', 'Zapatos', 'Perfumes', 'Electrónico', 'Vitaminas', 'Juguetes', 'Otros'];

    // Estado para modal de producto y paginación
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [visibleCount, setVisibleCount] = useState(20);

    // Resetear contador al cambiar categoría
    useEffect(() => {
        setVisibleCount(20);
    }, [selectedCategory]);

    const openProductModal = (product) => {
        setSelectedProduct(product);
    };

    const closeProductModal = () => {
        setSelectedProduct(null);
    };

    // Cargar datos desde Firestore
    useEffect(() => {
        const loadData = async () => {
            try {
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

                // Cargar Configuración (Resiliente)
                const { doc, getDoc, getDocs, collection } = await import('firebase/firestore');
                const settingsRef = doc(db, 'site_settings', 'site_global');
                const settingsSnap = await getDoc(settingsRef);

                if (settingsSnap.exists()) {
                    setSettings(settingsSnap.data());
                } else {
                    const snapFallback = await getDocs(collection(db, 'site_settings'));
                    if (!snapFallback.empty) {
                        setSettings(snapFallback.docs[0].data());
                    }
                }

                // Helper para procesar snapshots de diferentes colecciones
                const processSnapshot = (snapshot, sourceLabel) => {
                    const items = [];
                    snapshot.forEach((doc) => {
                        const data = doc.data();
                        const product = data.product || data;

                        if (product && (product.name || product.nombre)) {
                            let rawPrice = product.salePrice1 || product.unitPrice || product.price || 0;
                            const cleanPrice = parseFloat(String(rawPrice).replace(/[^0-9.]/g, '')) || 0;
                            let rawWeight = product.weight || data.weight || data.peso || 0;
                            let weightVal = parseFloat(String(rawWeight).replace(/[^0-9.]/g, '')) || 0;
                            const finalWeightLbs = weightVal > 20 ? (weightVal * 0.00220462) : weightVal;
                            let finalQuantity = 0;
                            if (data.quantity !== undefined && data.quantity !== null) finalQuantity = data.quantity;
                            else if (product.quantity !== undefined && product.quantity !== null) finalQuantity = product.quantity;
                            else if (data.cantidad !== undefined) finalQuantity = data.cantidad;

                            const isOnDemand = sourceLabel === 'fb' || sourceLabel === 'w';
                            const finalWeight = isOnDemand ? 0.50 : parseFloat(finalWeightLbs.toFixed(2));

                            items.push({
                                ...product,
                                id: doc.id,
                                source: sourceLabel,
                                onDemand: isOnDemand, // Nueva bandera
                                name: product.name || product.nombre || 'Sin Nombre',
                                price: cleanPrice,
                                weight: finalWeight,
                                // Si es onDemand, permitimos compra ignorando el stock real
                                quantity: isOnDemand ? 999 : parseInt(finalQuantity),
                                imageUrl: product.imageUrl || product.image || '',
                                category: product.category || 'Otros',
                                originalRef: doc.ref
                            });
                        }
                    });
                    return items;
                };

                // Cargar desde múltiples fuentes
                // Five Below y Walgreens están en la colección 'products' con el campo 'origin'
                const [snapInv, snapFB, snapW] = await Promise.all([
                    getDocs(collection(inventoryDb, 'inventory')),
                    getDocs(query(collection(inventoryDb, 'products'), where('origin', 'in', ['fivebelow', 'fb']))).catch(() => ({ forEach: () => { } })),
                    getDocs(query(collection(inventoryDb, 'products'), where('origin', 'in', ['walgreens', 'w']))).catch(() => ({ forEach: () => { } }))
                ]);

                const itemsInv = processSnapshot(snapInv, 'inventory');
                const itemsFB = processSnapshot(snapFB, 'fb');
                const itemsW = processSnapshot(snapW, 'w');

                console.log('📦 Inventario:', itemsInv.length);
                console.log('📦 Five Below (fb):', itemsFB.length);
                console.log('📦 Walgreens (w):', itemsW.length);

                const allItems = [...itemsInv, ...itemsFB, ...itemsW];

                // Aleatorizar productos para que se mezclen todas las fuentes (Five Below, Walgreens, Inventario)
                const shuffledItems = allItems
                    .map(value => ({ value, sort: Math.random() }))
                    .sort((a, b) => a.sort - b.sort)
                    .map(({ value }) => value);

                setStoreProducts(shuffledItems);
            } catch (error) {
                console.error('Error cargando datos:', error);
            }
        };

        loadData();
    }, []);





    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
    };

    return (
        <div className="min-h-screen bg-stone-50 overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-900 border-b border-stone-800 shadow-xl">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex flex-col">
                            <div className="text-3xl font-serif font-light tracking-wider text-amber-400">
                                GEORGINA
                            </div>
                            <div className="text-xs tracking-widest text-amber-500 uppercase">
                                Personal Shopper
                            </div>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-10">
                            <a href="#home" className="text-sm tracking-widest text-stone-300 hover:text-amber-400 transition-colors font-medium">INICIO</a>
                            <a href="#coleccion" className="text-sm tracking-widest text-stone-300 hover:text-amber-400 transition-colors font-medium">COLECCIÓN</a>
                            <a href="#servicios" className="text-sm tracking-widest text-stone-300 hover:text-amber-400 transition-colors font-medium">SERVICIOS</a>
                            <a href="#citas" className="text-sm tracking-widest text-stone-300 hover:text-amber-400 transition-colors font-medium">CITAS</a>
                            <button
                                onClick={() => navigate('/cart')}
                                className="relative text-stone-300 hover:text-amber-400 transition-colors"
                            >
                                <ShoppingBag size={20} />
                                {getCartCount() > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold animate-bounce">
                                        {getCartCount()}
                                    </span>
                                )}
                            </button>
                        </div>

                        <div className="flex items-center gap-4 md:hidden">
                            <button
                                onClick={() => navigate('/cart')}
                                className="text-stone-300 relative"
                            >
                                <ShoppingBag size={24} />
                                {getCartCount() > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-amber-600 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center font-semibold">
                                        {getCartCount()}
                                    </span>
                                )}
                            </button>

                            {/* Mobile Menu Button */}
                            <button className="text-stone-300" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                                {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-stone-800 border-t border-stone-700">
                        <div className="px-6 py-6 flex flex-col gap-4">
                            <a href="#home" className="text-lg text-stone-300 hover:text-amber-400">Inicio</a>
                            <a href="#coleccion" className="text-lg text-stone-300 hover:text-amber-400">Colección</a>
                            <a href="#servicios" className="text-lg text-stone-300 hover:text-amber-400">Servicios</a>
                            <a href="#citas" className="text-lg text-stone-300 hover:text-amber-400">Citas</a>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section id="home" className="relative h-auto flex items-center justify-center overflow-hidden pt-20">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-stone-50 via-amber-50/30 to-stone-100"></div>
                <div className="absolute top-20 left-10 w-96 h-96 bg-amber-200/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-300/20 rounded-full blur-3xl"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center py-12 md:py-16">
                    <div className="mb-6">
                        <span className="inline-block px-6 py-2 border-2 border-amber-600 text-xs tracking-[0.3em] text-amber-700 font-semibold bg-white">
                            PERSONAL SHOPPER
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-serif font-light mb-6 bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 bg-clip-text text-transparent">
                        Compras en USA
                    </h1>

                    <p className="text-lg md:text-xl text-stone-600 max-w-2xl mx-auto mb-10">
                        Compro por ti en Burlington, Marshall's, Ross, TJ Maxx, Walmart y más. Envíos seguros a Ecuador por solo $4 la libra.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="#coleccion" className="px-10 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold tracking-widest text-sm hover:from-amber-500 hover:to-amber-600 transition-all text-center shadow-lg">
                            VER PRODUCTOS
                        </a>
                        <button onClick={handleAgendarClick} className="px-10 py-4 border-2 border-amber-600 text-amber-700 font-semibold tracking-widest text-sm hover:bg-amber-600 hover:text-white transition-all">
                            AGENDA TU CITA
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto mt-12">
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border border-stone-200 shadow-sm">
                            <div className="text-4xl font-serif bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent mb-2">500+</div>
                            <div className="text-sm text-stone-600 tracking-wider font-medium">Clientes Felices</div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border border-stone-200 shadow-sm">
                            <div className="text-4xl font-serif bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent mb-2">50+</div>
                            <div className="text-sm text-stone-600 tracking-wider font-medium">Marcas de Lujo</div>
                        </div>
                        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg border border-stone-200 shadow-sm">
                            <div className="text-4xl font-serif bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent mb-2">10+</div>
                            <div className="text-sm text-stone-600 tracking-wider font-medium">Años Experiencia</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Products Carousel */}
            <section className="py-12 bg-white border-y border-stone-200">
                <div className="max-w-7xl mx-auto px-6">
                    {carouselImages.length > 0 ? (
                        <div className="relative overflow-hidden">
                            <div className="flex gap-6 transition-transform duration-700 ease-in-out" style={{ transform: `translateX(-${(currentSlide % Math.ceil(carouselImages.length / 5)) * 100}%)` }}>
                                {/* Agrupar imágenes en sets de 5 */}
                                {Array.from({ length: Math.ceil(carouselImages.length / 5) }).map((_, setIndex) => (
                                    <div key={setIndex} className="min-w-full grid grid-cols-2 md:grid-cols-5 gap-6">
                                        {carouselImages.slice(setIndex * 5, (setIndex + 1) * 5).map((image) => (
                                            <div key={image.id} className="group relative aspect-[4/3] overflow-hidden rounded-lg bg-stone-100 border border-stone-200 shadow-sm hover:shadow-xl transition-all">
                                                <img
                                                    src={image.imageUrl}
                                                    alt={image.name}
                                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                                                    <div className="text-white">
                                                        <p className="font-semibold">{image.name}</p>
                                                        <p className="text-sm text-amber-300">{image.price}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ))}
                            </div>

                            {/* Indicadores (solo si hay más de 5 imágenes) */}
                            {carouselImages.length > 5 && (
                                <div className="flex justify-center gap-2 mt-6">
                                    {Array.from({ length: Math.ceil(carouselImages.length / 5) }).map((_, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setCurrentSlide(idx)}
                                            className={`h-2 rounded-full transition-all ${currentSlide === idx ? 'w-8 bg-amber-600' : 'w-2 bg-stone-300'}`}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-12 text-stone-400">
                            <p>Cargando productos...</p>
                        </div>
                    )}
                </div>
            </section>

            {/* Featured Carousel */}
            <section className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs tracking-[0.3em] text-amber-600 mb-3 block font-semibold">DESTACADOS</span>
                        <h2 className="text-4xl md:text-5xl font-serif bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
                            Piezas Seleccionadas
                        </h2>
                    </div>

                    <div className="relative max-w-5xl mx-auto">
                        <div className="overflow-hidden rounded-lg shadow-xl border border-stone-200 bg-white">
                            <div className="flex transition-transform duration-700" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                                {featuredProducts.map((product) => (
                                    <div key={product.id} className="w-full flex-shrink-0">
                                        <div className="grid md:grid-cols-2 gap-10 items-center p-6">
                                            <div className="relative aspect-[3/4] overflow-hidden rounded-lg group bg-stone-100">
                                                <img
                                                    src={product.imageUrl || product.image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            </div>

                                            <div className="space-y-6">
                                                <span className="text-xs tracking-[0.3em] text-amber-600 font-semibold">{product.category}</span>
                                                <h3 className="text-4xl md:text-5xl font-serif text-stone-900">{product.name}</h3>
                                                <p className="text-3xl font-serif bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">{product.price}</p>
                                                <button
                                                    onClick={() => addToCart(product)}
                                                    className="px-8 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-white font-semibold tracking-widest text-sm hover:from-amber-500 hover:to-amber-600 shadow-lg flex items-center gap-3 transition-all hover:gap-4"
                                                >
                                                    <ShoppingBag size={18} />
                                                    AGREGAR AL CARRITO
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={prevSlide}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white hover:bg-stone-50 flex items-center justify-center rounded-full transition-all text-stone-700 border border-stone-200 shadow-md"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white hover:bg-stone-50 flex items-center justify-center rounded-full transition-all text-stone-700 border border-stone-200 shadow-md"
                        >
                            <ChevronRight size={24} />
                        </button>

                        <div className="flex justify-center gap-2 mt-8">
                            {featuredProducts.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-amber-600' : 'w-2 bg-stone-300'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Products Grid */}
            <section id="coleccion" className="py-20 bg-white">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs tracking-[0.3em] text-amber-600 mb-3 block font-semibold">TIENDA</span>
                        <h2 className="text-4xl md:text-5xl font-serif bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent mb-4">
                            Nuestra Colección
                        </h2>
                        <p className="text-stone-600 max-w-2xl mx-auto">
                            Cada pieza ha sido cuidadosamente seleccionada para ofrecerte lo mejor de la moda de lujo
                        </p>
                    </div>

                    {/* Filtros de Categoría */}
                    <div className="flex flex-wrap justify-center gap-4 mb-12">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-6 py-2 rounded-full text-sm tracking-wider transition-all border ${selectedCategory === cat
                                    ? 'bg-amber-600 text-white border-amber-600'
                                    : 'bg-white text-stone-600 border-stone-200 hover:border-amber-600 hover:text-amber-600'
                                    }`}
                            >
                                {cat.toUpperCase()}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-x-4 gap-y-8">
                        {(() => {
                            const filtered = storeProducts.filter(product => {
                                if (selectedCategory === 'Todos') return true;

                                const pCat = (product.category || '').toLowerCase().trim();
                                const sCat = selectedCategory.toLowerCase().trim();

                                // Mapeos inteligentes
                                if (sCat === 'zapatos') {
                                    return pCat.includes('zapato') || pCat.includes('calzado') || pCat.includes('zapatilla');
                                }
                                if (sCat === 'vitaminas') {
                                    return pCat.includes('vitamina') || pCat.includes('vitamin') || pCat.includes('suplemento');
                                }
                                if (sCat === 'ropa') {
                                    return pCat.includes('ropa') || pCat.includes('prenda') || pCat.includes('vestir');
                                }

                                return pCat === sCat || pCat.includes(sCat);
                            });
                            const itemsToShow = filtered.slice(0, visibleCount);

                            return (
                                <>
                                    {itemsToShow.map((product, index) => (
                                        <div key={`${product.id}-${index}`} className="group cursor-pointer" onClick={() => openProductModal(product)}>
                                            <div className="relative aspect-square overflow-hidden rounded-lg mb-3 bg-stone-100 border border-stone-200">
                                                <img
                                                    src={product.imageUrl || product.image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />

                                                {/* Badge de Fuente */}
                                                {product.source === 'fb' && (
                                                    <div className="absolute top-2 left-2 bg-blue-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm z-10"> FB </div>
                                                )}
                                                {product.source === 'w' && (
                                                    <div className="absolute top-2 left-2 bg-red-600 text-white text-[9px] font-bold px-2 py-0.5 rounded shadow-sm z-10"> W </div>
                                                )}

                                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                                                    <span className="text-white font-bold tracking-widest text-xs border border-white px-3 py-1 bg-black/30 backdrop-blur-sm rounded-full">
                                                        VER DETALLES
                                                    </span>
                                                </div>
                                            </div>

                                            <h3 className="text-sm font-semibold mb-1 text-stone-900 group-hover:text-amber-600 transition-colors line-clamp-2 min-h-[2.5em] leading-tight" title={product.name}>
                                                {product.name}
                                            </h3>
                                            <p className="text-lg font-serif font-bold text-amber-700">
                                                {typeof product.price === 'number'
                                                    ? product.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                                                    : product.price}
                                            </p>
                                        </div>
                                    ))}

                                    {/* Botón Ver Más */}
                                    {filtered.length > visibleCount && (
                                        <div className="col-span-2 md:col-span-4 lg:col-span-5 flex justify-center mt-12 mb-8">
                                            <button
                                                onClick={() => setVisibleCount(prev => prev + 20)}
                                                className="group relative px-12 py-4 bg-stone-900 text-white font-bold tracking-[0.2em] rounded-full overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-xl hover:shadow-2xl"
                                            >
                                                <div className="absolute inset-0 bg-amber-600 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                                                <span className="relative z-10 flex items-center gap-3">
                                                    MOSTRAR MÁS PRODUCTOS
                                                    <Plus size={18} className="group-hover:rotate-180 transition-transform duration-500" />
                                                </span>
                                            </button>
                                        </div>
                                    )}
                                </>
                            );
                        })()}

                        {/* Mensajes de vacío/carga... */}
                        {storeProducts.length > 0 && storeProducts.filter(p => selectedCategory === 'Todos' || p.category === selectedCategory).length === 0 && (
                            <div className="col-span-full text-center py-12 text-stone-400">
                                <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                                <p>No hay productos en esta categoría por el momento.</p>
                            </div>
                        )}

                        {storeProducts.length === 0 && (
                            <div className="col-span-full text-center py-12 text-stone-400">
                                <p>Cargando colección...</p>
                            </div>
                        )}
                    </div>

                    <div className="text-center mt-12">
                        <button className="px-10 py-4 border-2 border-amber-600 text-amber-700 font-semibold tracking-widest text-sm hover:bg-amber-600 hover:text-white transition-all">
                            VER TODA LA COLECCIÓN
                        </button>
                    </div>
                </div>
            </section>

            {/* MODAL DE DETALLE DE PRODUCTO */}
            {selectedProduct && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" onClick={closeProductModal}>
                    <div
                        className="bg-white w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-200 relative"
                        onClick={e => e.stopPropagation()} // Evitar cierre al clickear dentro
                    >
                        <button
                            onClick={closeProductModal}
                            className="absolute top-4 right-4 z-10 p-2 bg-black/50 hover:bg-black/70 text-white rounded-full transition-colors"
                        >
                            <X size={20} />
                        </button>

                        {/* Imagen Grande */}
                        <div className="w-full md:w-1/2 bg-stone-100 h-64 md:h-auto flex items-center justify-center p-4">
                            <img
                                src={selectedProduct.imageUrl || selectedProduct.image}
                                alt={selectedProduct.name}
                                className="max-w-full max-h-full object-contain mix-blend-multiply"
                            />
                        </div>

                        {/* Detalles */}
                        <div className="w-full md:w-1/2 p-8 flex flex-col justify-center bg-white">
                            <span className="text-amber-600 font-bold tracking-widest text-xs mb-2 uppercase">
                                {selectedProduct.category || 'Producto Exclusivo'}
                            </span>
                            <h2 className="text-3xl font-serif text-stone-900 mb-4 leading-tight">
                                {selectedProduct.name}
                            </h2>

                            <div className="flex items-end gap-4 mb-6 border-b border-stone-100 pb-6">
                                <span className="text-3xl font-bold text-stone-900">
                                    {typeof selectedProduct.price === 'number'
                                        ? selectedProduct.price.toLocaleString('en-US', { style: 'currency', currency: 'USD' })
                                        : selectedProduct.price}
                                </span>
                                {selectedProduct.weight > 0 && (
                                    <span className="text-stone-400 text-sm mb-1">
                                        Peso aprox: {selectedProduct.weight} lbs
                                    </span>
                                )}
                            </div>

                            {/* Tallas y Variantes (Si existen) */}
                            <div className="space-y-4 mb-8">
                                {(selectedProduct.size || selectedProduct.talla) && (
                                    <div className="flex items-center gap-4">
                                        <span className="text-stone-500 text-sm font-semibold w-16">Talla:</span>
                                        <span className="px-3 py-1 bg-stone-100 text-stone-800 rounded font-medium border border-stone-200">
                                            {selectedProduct.size || selectedProduct.talla}
                                        </span>
                                    </div>
                                )}
                                {(selectedProduct.color) && (
                                    <div className="flex items-center gap-4">
                                        <span className="text-stone-500 text-sm font-semibold w-16">Color:</span>
                                        <span className="text-stone-800 font-medium">
                                            {selectedProduct.color}
                                        </span>
                                    </div>
                                )}
                                <div className="flex items-center gap-4">
                                    <span className="text-stone-500 text-sm font-semibold w-16">Dispo:</span>
                                    {selectedProduct.quantity > 0 ? (
                                        <span className="text-green-600 font-bold text-sm flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                            {selectedProduct.quantity} Unidades Disponibles
                                        </span>
                                    ) : (
                                        <span className="text-red-500 font-bold text-sm flex items-center gap-1">
                                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                            Agotado
                                        </span>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => {
                                    if (selectedProduct.quantity > 0) {
                                        addToCart(selectedProduct);
                                        closeProductModal();
                                    }
                                }}
                                disabled={!selectedProduct.quantity || selectedProduct.quantity <= 0}
                                className={`w-full py-4 font-bold tracking-widest transition-all rounded-lg shadow-xl flex items-center justify-center gap-3 ${selectedProduct.quantity > 0
                                    ? 'bg-stone-900 text-white hover:bg-amber-600 hover:shadow-2xl'
                                    : 'bg-stone-200 text-stone-400 cursor-not-allowed shadow-none'
                                    }`}
                            >
                                <ShoppingBag size={20} />
                                {selectedProduct.quantity > 0 ? 'AGREGAR AL CARRITO' : 'AGOTADO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Services */}
            <section id="servicios" className="py-20 bg-gradient-to-br from-amber-50 to-stone-50">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs tracking-[0.3em] text-amber-600 mb-3 block font-semibold">SERVICIOS</span>
                        <h2 className="text-4xl md:text-5xl font-serif bg-gradient-to-r from-amber-600 to-amber-700 bg-clip-text text-transparent">
                            Experiencia Premium
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: <ShoppingBag size={32} />, title: 'Compras en USA', desc: 'Compro por ti en las mejores tiendas de Estados Unidos con acceso a ofertas exclusivas' },
                            { icon: <Star size={32} />, title: 'Envíos a Ecuador', desc: 'Envío seguro a Ecuador por solo $4 la libra con seguimiento completo' },
                            { icon: <Calendar size={32} />, title: 'Asesoría Personalizada', desc: 'Te ayudo a encontrar exactamente lo que buscas al mejor precio' }
                        ].map((service, index) => (
                            <div key={index} className="bg-white border border-stone-200 p-8 rounded-lg text-center hover:shadow-xl hover:border-amber-200 transition-all">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-white mb-6 shadow-lg">
                                    {service.icon}
                                </div>
                                <h3 className="text-2xl font-serif text-stone-900 mb-4">{service.title}</h3>
                                <p className="text-stone-600">{service.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section id="citas" className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-2xl p-12 text-center shadow-2xl">
                        <span className="text-xs tracking-[0.3em] text-amber-100 mb-3 block font-semibold">¿LISTO PARA COMENZAR?</span>
                        <h2 className="text-4xl md:text-5xl font-serif text-white mb-4">
                            Agenda Tu Cita de Compras
                        </h2>
                        <p className="text-amber-50 mb-8 max-w-2xl mx-auto">
                            Crea tu cuenta y accede a tu dashboard personal donde podrás solicitar compras y hacer seguimiento de tus pedidos.
                        </p>
                        <button
                            onClick={handleAgendarClick}
                            className="px-12 py-5 bg-white text-amber-700 font-bold tracking-widest text-sm hover:bg-stone-50 transition-all rounded-lg shadow-lg"
                        >
                            {currentUser ? 'IR A MI DASHBOARD' : 'CREAR CUENTA GRATIS'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-stone-800 pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <h3 className="text-3xl font-serif text-amber-400 mb-4">GEORGINA</h3>
                            <p className="text-stone-300 text-sm mb-6">
                                Compro por ti en las mejores tiendas de USA (Burlington, Marshall's, Ross) y envío a Ecuador por solo $4 la libra.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="w-10 h-10 bg-stone-700 hover:bg-amber-600 hover:text-white border border-stone-600 rounded-full flex items-center justify-center transition-all">
                                    <Instagram size={18} />
                                </a>
                                <a href="#" className="w-10 h-10 bg-stone-700 hover:bg-amber-600 hover:text-white border border-stone-600 rounded-full flex items-center justify-center transition-all">
                                    <Facebook size={18} />
                                </a>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm tracking-widest mb-4 text-amber-400 font-semibold">NAVEGACIÓN</h4>
                            <ul className="space-y-2 text-sm text-stone-300">
                                <li><a href="#home" className="hover:text-amber-400 transition-colors">Inicio</a></li>
                                <li><a href="#coleccion" className="hover:text-amber-400 transition-colors">Colección</a></li>
                                <li><a href="#servicios" className="hover:text-amber-400 transition-colors">Servicios</a></li>
                                <li><a href="#citas" className="hover:text-amber-400 transition-colors">Citas</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm tracking-widest mb-4 text-amber-400 font-semibold">SERVICIOS</h4>
                            <ul className="space-y-2 text-sm text-stone-300">
                                <li>Compras en Burlington</li>
                                <li>Compras en Marshall's</li>
                                <li>Compras en Ross</li>
                                <li>Envíos a Ecuador $4/lb</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm tracking-widest mb-4 text-amber-400 font-semibold">CONTACTO</h4>
                            <ul className="space-y-3 text-sm text-stone-300">
                                <li className="flex items-start gap-2">
                                    <Mail size={16} className="mt-1 text-amber-400" />
                                    <span>georginashopper79@gmail.com</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Phone size={16} className="mt-1 text-amber-400" />
                                    <span>+1 (551) 301-9412</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <MapPin size={16} className="mt-1 text-amber-400" />
                                    <span>Ecuador</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-stone-700 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-stone-400">
                        <p>© 2026 Georgina Personal Shopper. Todos los derechos reservados.</p>
                        <div className="flex gap-4">
                            {settings.social.instagram && (
                                <a href={settings.social.instagram} target="_blank" rel="noreferrer" className="bg-white/5 p-2 rounded-full hover:bg-amber-600/20 hover:text-amber-400 transition-all border border-white/5">
                                    <Instagram size={18} />
                                </a>
                            )}
                            {settings.social.tiktok && (
                                <a href={settings.social.tiktok} target="_blank" rel="noreferrer" className="bg-white/5 p-2 rounded-full hover:bg-amber-600/20 hover:text-amber-400 transition-all border border-white/5">
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5"></path></svg>
                                </a>
                            )}
                            {settings.social.facebook && (
                                <a href={settings.social.facebook} target="_blank" rel="noreferrer" className="bg-white/5 p-2 rounded-full hover:bg-amber-600/20 hover:text-amber-400 transition-all border border-white/5">
                                    <Facebook size={18} />
                                </a>
                            )}
                        </div>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-amber-400 transition-colors">Privacidad</a>
                            <a href="#" className="hover:text-amber-400 transition-colors">Términos</a>
                        </div>
                    </div>
                </div>
            </footer>

            {/* Login Modal */}
            <LoginModal
                isOpen={loginModalOpen}
                onClose={() => setLoginModalOpen(false)}
                onSuccess={handleLoginSuccess}
            />
        </div>
    );
}
