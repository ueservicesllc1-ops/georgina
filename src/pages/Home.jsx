import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Menu, X, ShoppingBag, Star, Calendar, Heart, ChevronLeft, ChevronRight, Instagram, Facebook, Mail, Phone, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import LoginModal from '../components/LoginModal';

export default function Home() {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [loginModalOpen, setLoginModalOpen] = useState(false);
    const { currentUser } = useAuth();
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

    const featuredProducts = [
        {
            id: 1,
            name: 'Bolso Hermès Kelly',
            price: '$8,500',
            image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=800&auto=format&fit=crop',
            category: 'Bolsos'
        },
        {
            id: 2,
            name: 'Reloj Cartier Tank',
            price: '$6,200',
            image: 'https://images.unsplash.com/photo-1523170335258-f5ed11844a49?w=800&auto=format&fit=crop',
            category: 'Accesorios'
        },
        {
            id: 3,
            name: 'Zapatos Louboutin',
            price: '$1,295',
            image: 'https://images.unsplash.com/photo-1543163521-1bf539c55dd2?w=800&auto=format&fit=crop',
            category: 'Calzado'
        }
    ];

    const products = [
        { id: 1, name: 'Bolso Chanel Classic', price: '$5,800', image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600&auto=format&fit=crop' },
        { id: 2, name: 'Gafas Gucci', price: '$450', image: 'https://images.unsplash.com/photo-1511499767150-a48a237f0083?w=600&auto=format&fit=crop' },
        { id: 3, name: 'Pañuelo Hermès', price: '$420', image: 'https://images.unsplash.com/photo-1584917865442-de89df76afd3?w=600&auto=format&fit=crop' },
        { id: 4, name: 'Aretes Tiffany', price: '$890', image: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?w=600&auto=format&fit=crop' },
        { id: 5, name: 'Cinturón Gucci GG', price: '$520', image: 'https://images.unsplash.com/photo-1624222247344-e5f0f2d3c976?w=600&auto=format&fit=crop' },
        { id: 6, name: 'Botines Saint Laurent', price: '$1,150', image: 'https://images.unsplash.com/photo-1608256246200-53e635b5b65f?w=600&auto=format&fit=crop' },
        { id: 7, name: 'Cartera Louis Vuitton', price: '$1,650', image: 'https://images.unsplash.com/photo-1564422167509-4f7ff13be0f7?w=600&auto=format&fit=crop' },
        { id: 8, name: 'Perfume Chanel N°5', price: '$185', image: 'https://images.unsplash.com/photo-1541643600914-78b084683601?w=600&auto=format&fit=crop' },
    ];

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % featuredProducts.length);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + featuredProducts.length) % featuredProducts.length);
    };

    return (
        <div className="min-h-screen bg-stone-950 overflow-x-hidden">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-stone-950/80 backdrop-blur-xl border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex items-center justify-between h-20">
                        <div className="flex flex-col">
                            <div className="text-3xl font-serif font-light tracking-wider text-amber-100">
                                GEORGINA
                            </div>
                            <div className="text-xs tracking-widest text-amber-500 uppercase">
                                Personal Shopper
                            </div>
                        </div>

                        {/* Desktop Menu */}
                        <div className="hidden md:flex items-center gap-10">
                            <a href="#home" className="text-sm tracking-widest text-amber-100 hover:text-amber-500 transition-colors">INICIO</a>
                            <a href="#coleccion" className="text-sm tracking-widest text-amber-100 hover:text-amber-500 transition-colors">COLECCIÓN</a>
                            <a href="#servicios" className="text-sm tracking-widest text-amber-100 hover:text-amber-500 transition-colors">SERVICIOS</a>
                            <a href="#citas" className="text-sm tracking-widest text-amber-100 hover:text-amber-500 transition-colors">CITAS</a>
                            <button className="relative text-amber-100 hover:text-amber-500 transition-colors">
                                <ShoppingBag size={20} />
                                <span className="absolute -top-2 -right-2 bg-amber-600 text-stone-950 text-xs w-5 h-5 rounded-full flex items-center justify-center font-semibold">
                                    0
                                </span>
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button className="md:hidden text-amber-100" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
                            {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>

                {/* Mobile Menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden bg-stone-900 border-t border-white/10">
                        <div className="px-6 py-6 flex flex-col gap-4">
                            <a href="#home" className="text-lg text-amber-100 hover:text-amber-500">Inicio</a>
                            <a href="#coleccion" className="text-lg text-amber-100 hover:text-amber-500">Colección</a>
                            <a href="#servicios" className="text-lg text-amber-100 hover:text-amber-500">Servicios</a>
                            <a href="#citas" className="text-lg text-amber-100 hover:text-amber-500">Citas</a>
                        </div>
                    </div>
                )}
            </nav>

            {/* Hero Section */}
            <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
                {/* Gradient Background */}
                <div className="absolute inset-0 bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950"></div>
                <div className="absolute top-20 left-10 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-800/20 rounded-full blur-3xl"></div>

                <div className="max-w-7xl mx-auto px-6 relative z-10 text-center py-20">
                    <div className="mb-6">
                        <span className="inline-block px-6 py-2 border border-amber-700 text-xs tracking-[0.3em] text-amber-500">
                            PERSONAL SHOPPER
                        </span>
                    </div>

                    <h1 className="text-4xl md:text-7xl lg:text-8xl font-serif font-light mb-6 bg-gradient-to-r from-amber-200 via-amber-500 to-amber-700 bg-clip-text text-transparent">
                        Compras en USA
                    </h1>

                    <p className="text-lg md:text-xl text-stone-400 max-w-2xl mx-auto mb-10">
                        Compro por ti en Burlington, Marshall's y Ross. Envíos seguros a Ecuador por $4 la libra.
                    </p>

                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a href="#coleccion" className="px-10 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold tracking-widest text-sm hover:from-amber-500 hover:to-amber-600 transition-all text-center">
                            VER PRODUCTOS
                        </a>
                        <button onClick={handleAgendarClick} className="px-10 py-4 border-2 border-amber-700 text-amber-100 font-semibold tracking-widest text-sm hover:bg-amber-700 hover:text-stone-950 transition-all">
                            AGENDA TU CITA
                        </button>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto mt-20">
                        <div>
                            <div className="text-4xl font-serif bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2">500+</div>
                            <div className="text-sm text-stone-500 tracking-wider">Clientes Felices</div>
                        </div>
                        <div>
                            <div className="text-4xl font-serif bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2">50+</div>
                            <div className="text-sm text-stone-500 tracking-wider">Marcas de Lujo</div>
                        </div>
                        <div>
                            <div className="text-4xl font-serif bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-2">10+</div>
                            <div className="text-sm text-stone-500 tracking-wider">Años Experiencia</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Featured Carousel */}
            <section className="py-20 bg-stone-900">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs tracking-[0.3em] text-amber-500 mb-3 block">DESTACADOS</span>
                        <h2 className="text-4xl md:text-5xl font-serif bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                            Piezas Seleccionadas
                        </h2>
                    </div>

                    <div className="relative max-w-5xl mx-auto">
                        <div className="overflow-hidden rounded-lg">
                            <div className="flex transition-transform duration-700" style={{ transform: `translateX(-${currentSlide * 100}%)` }}>
                                {featuredProducts.map((product) => (
                                    <div key={product.id} className="w-full flex-shrink-0">
                                        <div className="grid md:grid-cols-2 gap-10 items-center p-6">
                                            <div className="relative aspect-[3/4] overflow-hidden rounded-lg group">
                                                <img
                                                    src={product.image}
                                                    alt={product.name}
                                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                                />
                                            </div>

                                            <div className="space-y-6">
                                                <span className="text-xs tracking-[0.3em] text-amber-500">{product.category}</span>
                                                <h3 className="text-4xl md:text-5xl font-serif text-amber-100">{product.name}</h3>
                                                <p className="text-3xl font-serif bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">{product.price}</p>
                                                <button className="px-10 py-4 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold tracking-widest text-sm hover:from-amber-500 hover:to-amber-600">
                                                    VER DETALLES
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <button
                            onClick={prevSlide}
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center rounded-full transition-all text-amber-100"
                        >
                            <ChevronLeft size={24} />
                        </button>
                        <button
                            onClick={nextSlide}
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 bg-white/10 backdrop-blur-sm hover:bg-white/20 flex items-center justify-center rounded-full transition-all text-amber-100"
                        >
                            <ChevronRight size={24} />
                        </button>

                        <div className="flex justify-center gap-2 mt-8">
                            {featuredProducts.map((_, index) => (
                                <button
                                    key={index}
                                    onClick={() => setCurrentSlide(index)}
                                    className={`h-2 rounded-full transition-all ${index === currentSlide ? 'w-8 bg-amber-600' : 'w-2 bg-stone-600'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* Products Grid */}
            <section id="coleccion" className="py-20 bg-stone-950">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs tracking-[0.3em] text-amber-500 mb-3 block">TIENDA</span>
                        <h2 className="text-4xl md:text-5xl font-serif bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-4">
                            Nuestra Colección
                        </h2>
                        <p className="text-stone-400 max-w-2xl mx-auto">
                            Cada pieza ha sido cuidadosamente seleccionada para ofrecerte lo mejor de la moda de lujo
                        </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {products.map((product) => (
                            <div key={product.id} className="group">
                                <div className="relative aspect-[3/4] overflow-hidden rounded-lg mb-4 bg-stone-900">
                                    <img
                                        src={product.image}
                                        alt={product.name}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                    />

                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                        <button className="w-10 h-10 bg-white/10 hover:bg-amber-600 hover:text-white backdrop-blur-sm rounded-full flex items-center justify-center transition-all">
                                            <Heart size={18} />
                                        </button>
                                        <button className="w-10 h-10 bg-white/10 hover:bg-amber-600 hover:text-white backdrop-blur-sm rounded-full flex items-center justify-center transition-all">
                                            <ShoppingBag size={18} />
                                        </button>
                                    </div>
                                </div>

                                <h3 className="text-sm font-medium mb-2 text-amber-100 group-hover:text-amber-500 transition-colors">{product.name}</h3>
                                <p className="text-lg font-serif bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">{product.price}</p>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-12">
                        <button className="px-10 py-4 border-2 border-amber-700 text-amber-100 font-semibold tracking-widest text-sm hover:bg-amber-700 hover:text-stone-950 transition-all">
                            VER TODA LA COLECCIÓN
                        </button>
                    </div>
                </div>
            </section>

            {/* Services */}
            <section id="servicios" className="py-20 bg-stone-900">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <span className="text-xs tracking-[0.3em] text-amber-500 mb-3 block">SERVICIOS</span>
                        <h2 className="text-4xl md:text-5xl font-serif bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
                            Experiencia Premium
                        </h2>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            { icon: <ShoppingBag size={32} />, title: 'Compras en USA', desc: 'Compro por ti en las mejores tiendas de Estados Unidos con acceso a ofertas exclusivas' },
                            { icon: <Star size={32} />, title: 'Envíos a Ecuador', desc: 'Envío seguro a Ecuador por solo $4 la libra con seguimiento completo' },
                            { icon: <Calendar size={32} />, title: 'Asesoría Personalizada', desc: 'Te ayudo a encontrar exactamente lo que buscas al mejor precio' }
                        ].map((service, index) => (
                            <div key={index} className="bg-white/5 backdrop-blur-lg border border-white/10 p-8 rounded-lg text-center hover:bg-white/10 transition-all">
                                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-amber-600 to-amber-700 text-stone-950 mb-6">
                                    {service.icon}
                                </div>
                                <h3 className="text-2xl font-serif text-amber-100 mb-4">{service.title}</h3>
                                <p className="text-stone-400">{service.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section id="citas" className="py-20 bg-stone-950">
                <div className="max-w-4xl mx-auto px-6">
                    <div className="bg-gradient-to-br from-amber-600/20 to-amber-800/20 border border-amber-600/30 rounded-lg p-12 text-center">
                        <span className="text-xs tracking-[0.3em] text-amber-500 mb-3 block">¿LISTO PARA COMENZAR?</span>
                        <h2 className="text-4xl md:text-5xl font-serif bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent mb-4">
                            Agenda Tu Cita de Compras
                        </h2>
                        <p className="text-stone-400 mb-8 max-w-2xl mx-auto">
                            Crea tu cuenta y accede a tu dashboard personal donde podrás solicitar compras y hacer seguimiento de tus pedidos.
                        </p>
                        <button
                            onClick={handleAgendarClick}
                            className="px-12 py-5 bg-gradient-to-r from-amber-600 to-amber-700 text-stone-950 font-semibold tracking-widest text-sm hover:from-amber-500 hover:to-amber-600 transition-all rounded"
                        >
                            {currentUser ? 'IR A MI DASHBOARD' : 'CREAR CUENTA GRATIS'}
                        </button>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-stone-900 pt-20 pb-10">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid md:grid-cols-4 gap-12 mb-12">
                        <div>
                            <h3 className="text-3xl font-serif text-amber-100 mb-4">GEORGINA</h3>
                            <p className="text-stone-400 text-sm mb-6">
                                Compro por ti en las mejores tiendas de USA (Burlington, Marshall's, Ross) y envío a Ecuador por solo $4 la libra.
                            </p>
                            <div className="flex gap-4">
                                <a href="#" className="w-10 h-10 bg-white/5 hover:bg-amber-600 hover:text-white backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center transition-all">
                                    <Instagram size={18} />
                                </a>
                                <a href="#" className="w-10 h-10 bg-white/5 hover:bg-amber-600 hover:text-white backdrop-blur-sm border border-white/10 rounded-full flex items-center justify-center transition-all">
                                    <Facebook size={18} />
                                </a>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-sm tracking-widest mb-4 text-amber-100">NAVEGACIÓN</h4>
                            <ul className="space-y-2 text-sm text-stone-400">
                                <li><a href="#home" className="hover:text-amber-500 transition-colors">Inicio</a></li>
                                <li><a href="#coleccion" className="hover:text-amber-500 transition-colors">Colección</a></li>
                                <li><a href="#servicios" className="hover:text-amber-500 transition-colors">Servicios</a></li>
                                <li><a href="#citas" className="hover:text-amber-500 transition-colors">Citas</a></li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm tracking-widest mb-4 text-amber-100">SERVICIOS</h4>
                            <ul className="space-y-2 text-sm text-stone-400">
                                <li>Compras en Burlington</li>
                                <li>Compras en Marshall's</li>
                                <li>Compras en Ross</li>
                                <li>Envíos a Ecuador $4/lb</li>
                            </ul>
                        </div>

                        <div>
                            <h4 className="text-sm tracking-widest mb-4 text-amber-100">CONTACTO</h4>
                            <ul className="space-y-3 text-sm text-stone-400">
                                <li className="flex items-start gap-2">
                                    <Mail size={16} className="mt-1" />
                                    <span>georginashopper79@gmail.com</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <Phone size={16} className="mt-1" />
                                    <span>+1 (551) 301-9412</span>
                                </li>
                                <li className="flex items-start gap-2">
                                    <MapPin size={16} className="mt-1" />
                                    <span>Ecuador</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    <div className="border-t border-stone-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-stone-500">
                        <p>© 2026 Georgina Personal Shopper. Todos los derechos reservados.</p>
                        <div className="flex gap-6">
                            <a href="#" className="hover:text-amber-500 transition-colors">Privacidad</a>
                            <a href="#" className="hover:text-amber-500 transition-colors">Términos</a>
                            <a href="#" className="hover:text-amber-500 transition-colors">Cookies</a>
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
