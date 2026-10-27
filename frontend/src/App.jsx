import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { ArrowDownUp, ArrowRight, BookOpen, Check, ChevronDown, Heart, Laptop, MapPin, Menu, Search, ShieldCheck, Shirt, Sofa, Sparkles, Tag, X } from 'lucide-react'
import AuthPage from './AuthPage'
import { apiRequest, apiResults, mapApiListing } from './api'
import './App.css'

const starterListings = [
  { id: '1', title: 'HP EliteBook 840 G5', price: 28500, category: 'Electronics', condition: 'Used - Good', campus: 'Main Campus', seller: 'Brian M.', posted: '2 hours ago', image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=85', description: 'Reliable and fast, ready for campus life. 8GB RAM, 256GB SSD, charger included. Happy to meet around the library.' },
  { id: '2', title: 'Database Systems textbook', price: 1200, category: 'Books', condition: 'Like New', campus: 'Kikuyu Campus', seller: 'Wanjiku N.', posted: '5 hours ago', image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=85', description: 'Clean copy with no highlighting. Great for second-year computer science and IT students.' },
  { id: '3', title: 'Compact study desk', price: 2500, category: 'Furniture', condition: 'Used - Good', campus: 'Main Campus', seller: 'Amina K.', posted: 'Yesterday', image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=85', description: 'Solid desk with a drawer. Fits neatly in a hostel room. Collection near the student centre.' },
  { id: '4', title: 'Nike Court Vision sneakers', price: 3500, category: 'Shoes', condition: 'Like New', campus: 'Chiromo Campus', seller: 'Kevin O.', posted: 'Yesterday', image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85', description: 'Worn a handful of times, size 42. Selling because I got the wrong size.' },
  { id: '5', title: 'Python tutoring, one-on-one', price: 500, category: 'Services', condition: 'Available weekdays', campus: 'Main Campus', seller: 'Derrick W.', posted: '2 days ago', image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85', description: 'Patient Python tutor for beginners. We can work through assignments together at the campus library. Price per hour.' },
  { id: '6', title: 'Oversized varsity jacket', price: 1800, category: 'Clothes', condition: 'Used - Good', campus: 'Kikuyu Campus', seller: 'Njeri W.', posted: '2 days ago', image: 'https://images.unsplash.com/photo-1551025621-12c7e9b5b4d3?auto=format&fit=crop&w=900&q=85', description: 'Warm, comfortable and in great shape. Fits M to L. Meet-up at the main gate.' },
  { id: '7', title: 'Scientific calculator', price: 900, category: 'Electronics', condition: 'Used - Good', campus: 'Main Campus', seller: 'Sam K.', posted: '3 days ago', image: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=900&q=85', description: 'Casio fx-82MS, all buttons working. Useful for maths, engineering and business courses.' },
  { id: '8', title: 'Introduction to Economics', price: 750, category: 'Books', condition: 'Used - Fair', campus: 'Chiromo Campus', seller: 'Faith A.', posted: '3 days ago', image: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=85', description: 'Some notes in pencil, all pages intact. A handy intro text for first years.' },
]

const categories = [
  { name: 'All items', icon: Sparkles }, { name: 'Electronics', icon: Laptop }, { name: 'Books', icon: BookOpen },
  { name: 'Clothes', icon: Shirt }, { name: 'Furniture', icon: Sofa }, { name: 'Services', icon: Tag },
]
const money = (value) => `KSh ${Number(value).toLocaleString('en-KE')}`

function readSaved(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback } catch { return fallback }
}

function Header({ query, setQuery, favoritesCount, user, onLogout }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const search = (event) => {
    event.preventDefault()
    navigate(`/browse?q=${encodeURIComponent(query)}`)
    setMenuOpen(false)
  }
  return <header className="site-header"><div className="header-inner">
    <Link className="brand" to="/" aria-label="Campus Market home"><span className="brand-mark">cm<span>.</span></span><span className="brand-name">campus<span>market</span></span></Link>
    <form className="header-search" onSubmit={search} role="search"><Search size={17} /><input aria-label="Search listings" placeholder="Find something on campus..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>Ctrl K</kbd></form>
    <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
      <Link className={location.pathname === '/browse' ? 'nav-link active' : 'nav-link'} to="/browse" onClick={() => setMenuOpen(false)}>Browse</Link>
      <Link className="nav-link" to="/favorites" onClick={() => setMenuOpen(false)}>Saved <span className="nav-count">{favoritesCount}</span></Link>
      <Link className="sell-button" to="/sell" onClick={() => setMenuOpen(false)}><span>+</span> Sell an item</Link>
      {user ? <><span className="nav-link account-user">{user.full_name.split(' ')[0]}</span><button className="nav-link account-nav" onClick={() => { onLogout(); setMenuOpen(false) }}>Log out</button></> : <><Link className="nav-link account-nav" to="/account?mode=login" onClick={() => setMenuOpen(false)}>Sign in</Link><Link className="nav-link account-nav" to="/account?mode=register" onClick={() => setMenuOpen(false)}>Join</Link></>}
    </nav>
    <button className="menu-toggle icon-button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X size={21} /> : <Menu size={21} />}</button>
  </div></header>
}

function ListingCard({ listing, saved, onToggleFavorite }) {
  return <article className="listing-card">
    <Link className="listing-image-link" to={`/listing/${listing.id}`} aria-label={`View ${listing.title}`}><img className="listing-image" src={listing.image} alt={listing.title} loading="lazy" />{listing.category === 'Services' && <span className="service-badge">Service</span>}</Link>
    <button className={saved ? 'favorite-button is-saved' : 'favorite-button'} onClick={() => onToggleFavorite(listing.id)} aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`} aria-pressed={saved}><Heart size={18} fill={saved ? 'currentColor' : 'none'} /></button>
    <div className="listing-copy"><div className="listing-meta"><span>{listing.category}</span><span className="dot" />{listing.condition}</div><Link className="listing-title" to={`/listing/${listing.id}`}>{listing.title}</Link><strong className="listing-price">{listing.category === 'Services' ? `From ${money(listing.price)}/hr` : money(listing.price)}</strong><div className="listing-footer"><span><MapPin size={13} />{listing.campus}</span><span>{listing.posted}</span></div></div>
  </article>
}

function ListingGrid({ items, favorites, toggleFavorite }) {
  if (!items.length) return <div className="empty-state"><span className="empty-icon"><Search size={21} /></span><h3>No listings found</h3><p>Try a different search or adjust your filters.</p><Link to="/browse" className="text-link">Clear filters <ArrowRight size={15} /></Link></div>
  return <div className="listing-grid">{items.map((listing) => <ListingCard key={listing.id} listing={listing} saved={favorites.includes(listing.id)} onToggleFavorite={toggleFavorite} />)}</div>
}

function HomePage({ listings, favorites, toggleFavorite, query, setQuery }) {
  const navigate = useNavigate()
  return <main>
    <section className="hero-section"><div className="hero-content"><div className="eyebrow"><span className="live-dot" /> YOUR CAMPUS, YOUR MARKET</div><h1>Good finds.<br /><em>Good people.</em></h1><p>The easiest way to buy, sell and discover useful things from students around you.</p><form className="hero-search" onSubmit={(event) => { event.preventDefault(); navigate(`/browse?q=${encodeURIComponent(query)}`) }}><Search size={19} /><input aria-label="Search the marketplace" placeholder="Try textbooks or a study desk" value={query} onChange={(event) => setQuery(event.target.value)} /><button aria-label="Search"><ArrowRight size={19} /></button></form><div className="hero-proof"><ShieldCheck size={16} /><span>Student community</span><span className="proof-divider">/</span><span>Meet on campus</span></div></div>
      <div className="hero-art"><img src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=90" alt="Students studying together at a campus library" /><div className="hero-note"><Sparkles size={17} /><span>Little things,<br /><strong>big campus energy.</strong></span></div><div className="hero-caption"><span>01 / 06</span><span>University of Nairobi, Kenya</span></div></div>
    </section>
    <section className="category-strip" aria-label="Browse categories">{categories.map(({ name, icon: Icon }) => <Link key={name} to={name === 'All items' ? '/browse' : `/browse?category=${encodeURIComponent(name)}`} className="category-shortcut"><span className="category-icon"><Icon size={19} /></span><span>{name}</span><ArrowRight className="category-arrow" size={14} /></Link>)}</section>
    <section className="content-section featured-section"><div className="section-heading"><div><div className="eyebrow muted-eyebrow">THE GOOD STUFF</div><h2>Fresh on campus</h2><p>New finds from your student community.</p></div><Link to="/browse" className="text-link">See everything <ArrowRight size={16} /></Link></div><ListingGrid items={listings.slice(0, 4)} favorites={favorites} toggleFavorite={toggleFavorite} /></section>
    <section className="how-section"><div className="how-intro"><div className="eyebrow muted-eyebrow">SIMPLE AS THAT</div><h2>A better way<br />to pass it on.</h2><p>Good stuff deserves a second home. Find it nearby, meet in person, keep campus moving.</p></div><div className="how-steps"><div className="how-step"><span>01</span><h3>Find your thing</h3><p>Browse what students near you are listing.</p></div><div className="how-step"><span>02</span><h3>Say hello</h3><p>Message the seller and agree on a campus meet-up.</p></div><div className="how-step"><span>03</span><h3>Make it yours</h3><p>Pick it up, pay directly, and pass the good along.</p></div></div></section>
    <section className="sell-cta"><div><div className="eyebrow">YOUR TURN</div><h2>Got something good?</h2><p>List it for your campus community. It takes about a minute.</p></div><Link className="cta-button" to="/sell">List an item <ArrowRight size={18} /></Link><Sparkles className="cta-sparkle" size={54} /></section><Footer />
  </main>
}

function BrowsePage({ listings, favorites, toggleFavorite, query, setQuery }) {
  const location = useLocation()
  const navigate = useNavigate()
  const params = new URLSearchParams(location.search)
  const [category, setCategory] = useState(params.get('category') ?? 'All items')
  const [campus, setCampus] = useState('All campuses')
  const [condition, setCondition] = useState('All conditions')
  const [sort, setSort] = useState('Newest')
  const [minimum, setMinimum] = useState('')
  const [maximum, setMaximum] = useState('')
  const filtered = useMemo(() => {
    const term = (params.get('q') ?? query).trim().toLowerCase()
    return listings.filter((item) => (category === 'All items' || item.category === category) && (campus === 'All campuses' || item.campus === campus) && (condition === 'All conditions' || item.condition === condition) && (!minimum || item.price >= Number(minimum)) && (!maximum || item.price <= Number(maximum)) && (!term || `${item.title} ${item.description} ${item.category} ${item.campus}`.toLowerCase().includes(term))).sort((a, b) => sort === 'Price: Low to High' ? a.price - b.price : sort === 'Price: High to Low' ? b.price - a.price : sort === 'Oldest' ? Number(b.id) - Number(a.id) : Number(a.id) - Number(b.id))
  }, [listings, category, campus, condition, sort, minimum, maximum, query, location.search])
  return <main className="page-shell"><div className="page-title-row"><div><div className="eyebrow muted-eyebrow">THE CAMPUS MARKET</div><h1>Find your next <em>good thing.</em></h1><p>Student listings, right around the corner.</p></div><span className="results-count">{filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}</span></div>
    <form className="browse-search" role="search" onSubmit={(event) => { event.preventDefault(); navigate(`/browse?q=${encodeURIComponent(query)}`) }}><Search size={18} /><input aria-label="Search listings" placeholder="Search items, books, services..." value={query} onChange={(event) => setQuery(event.target.value)} /><button className="dark-button">Search</button></form>
    <div className="browse-layout"><aside className="filters"><div className="filter-heading"><span>Filters</span><button onClick={() => { setCategory('All items'); setCampus('All campuses'); setCondition('All conditions'); setMinimum(''); setMaximum(''); setQuery(''); navigate('/browse') }}>Reset</button></div><label className="filter-label" htmlFor="category-filter">Category</label><select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}>{['All items', ...categories.slice(1).map((item) => item.name), 'Shoes'].map((item) => <option key={item}>{item}</option>)}</select><label className="filter-label" htmlFor="campus-filter">Campus</label><select id="campus-filter" value={campus} onChange={(event) => setCampus(event.target.value)}>{['All campuses', 'Main Campus', 'Kikuyu Campus', 'Chiromo Campus'].map((item) => <option key={item}>{item}</option>)}</select><span className="filter-label">Price range <small>in KSh</small></span><div className="price-range"><input aria-label="Minimum price" type="number" min="0" placeholder="Min" value={minimum} onChange={(event) => setMinimum(event.target.value)} /><span>to</span><input aria-label="Maximum price" type="number" min="0" placeholder="Max" value={maximum} onChange={(event) => setMaximum(event.target.value)} /></div><label className="filter-label" htmlFor="condition-filter">Condition</label><select id="condition-filter" value={condition} onChange={(event) => setCondition(event.target.value)}>{['All conditions', 'New', 'Like New', 'Used - Good', 'Used - Fair'].map((item) => <option key={item}>{item}</option>)}</select><div className="filter-campus-note"><MapPin size={15} /><span>Meet in a public spot on campus.</span></div></aside>
      <div className="results-area"><div className="results-toolbar"><span>{category === 'All items' ? 'All listings' : category}{params.get('q') && <> matching <strong>"{params.get('q')}"</strong></>}</span><label><ArrowDownUp size={15} /><span>Sort</span><select aria-label="Sort listings" value={sort} onChange={(event) => setSort(event.target.value)}>{['Newest', 'Oldest', 'Price: Low to High', 'Price: High to Low'].map((item) => <option key={item}>{item}</option>)}</select><ChevronDown size={14} /></label></div><ListingGrid items={filtered} favorites={favorites} toggleFavorite={toggleFavorite} /></div></div><Footer /></main>
}

function DetailsPage({ listings, favorites, toggleFavorite }) {
  const { id } = useParams()
  const listing = listings.find((item) => item.id === id)
  const [dialog, setDialog] = useState('')
  const [sent, setSent] = useState(false)
  if (!listing) return <main className="page-shell"><div className="empty-state"><h3>We couldn't find that listing</h3><Link to="/browse" className="text-link">Back to browsing <ArrowRight size={15} /></Link></div></main>
  const saved = favorites.includes(listing.id)
  return <main className="page-shell detail-page"><Link to="/browse" className="back-link">Back to listings</Link><div className="detail-layout"><div className="detail-photo"><img src={listing.image} alt={listing.title} /></div><section className="detail-info"><div className="eyebrow muted-eyebrow">{listing.category} <span className="dot" />{listing.condition}</div><h1>{listing.title}</h1><div className="detail-price">{listing.category === 'Services' ? `From ${money(listing.price)}/hour` : money(listing.price)}</div><div className="detail-location"><MapPin size={17} /><span>{listing.campus}</span><span className="dot" />Posted {listing.posted}</div><div className="detail-rule" /><h2>About this listing</h2><p className="detail-description">{listing.description}</p><div className="seller-block"><div className="seller-avatar">{listing.seller.split(' ').map((part) => part[0]).join('')}</div><div><span className="seller-label">Listed by</span><strong>{listing.seller}</strong></div><span className="verified"><Check size={13} /> Student</span></div><button className="contact-button" onClick={() => { setDialog('contact'); setSent(false) }}>Message seller <ArrowRight size={17} /></button><button className="detail-save" onClick={() => toggleFavorite(listing.id)}><Heart size={17} fill={saved ? 'currentColor' : 'none'} />{saved ? 'Saved to your list' : 'Save listing'}</button><button className="report-link" onClick={() => setDialog('report')}>Report this listing</button></section></div><Footer />
    {dialog && <div className="modal-backdrop" role="presentation" onClick={() => setDialog('')}><section className="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onClick={(event) => event.stopPropagation()}><button className="dialog-close icon-button" aria-label="Close" onClick={() => setDialog('')}><X size={19} /></button>{dialog === 'contact' ? sent ? <div className="success-message"><span><Check size={24} /></span><h2 id="dialog-title">Message sent</h2><p>{listing.seller} can reply in your campus inbox.</p><button className="dark-button" onClick={() => setDialog('')}>Done</button></div> : <><div className="eyebrow muted-eyebrow">SAY HELLO</div><h2 id="dialog-title">Message {listing.seller}</h2><p className="dialog-context">About: {listing.title}</p><textarea aria-label="Your message" defaultValue={`Hi ${listing.seller.split(' ')[0]}, is this still available?`} rows="4" /><button className="dark-button full-button" onClick={() => setSent(true)}>Send message <ArrowRight size={16} /></button></> : <><div className="eyebrow muted-eyebrow">KEEP CAMPUS KIND</div><h2 id="dialog-title">Report this listing</h2>{sent ? <p>Thanks. Our team will review this listing.</p> : <><p className="dialog-context">Choose a reason so our team can take a look.</p><select aria-label="Report reason"><option>Scam</option><option>Fake product</option><option>Incorrect information</option><option>Inappropriate content</option><option>Duplicate listing</option><option>Other</option></select><button className="dark-button full-button" onClick={() => setSent(true)}>Submit report</button></>}</>}</section></div>}
  </main>
}

function FavoritesPage({ listings, favorites, toggleFavorite }) {
  const savedListings = listings.filter((item) => favorites.includes(item.id))
  return <main className="page-shell"><div className="page-title-row"><div><div className="eyebrow muted-eyebrow">YOUR SHORTLIST</div><h1>Saved <em>for later.</em></h1><p>All the good finds you want to come back to.</p></div></div><ListingGrid items={savedListings} favorites={favorites} toggleFavorite={toggleFavorite} /><Footer /></main>
}

function SellPage({ onCreate, token, user }) {
  const navigate = useNavigate()
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [categoriesList, setCategoriesList] = useState(categories.slice(1).map(({ name }) => ({ id: name, name })))
  const [campusList, setCampusList] = useState(['Main Campus', 'Kikuyu Campus', 'Chiromo Campus'].map((name) => ({ id: name, name })))
  const [categoryId, setCategoryId] = useState('Electronics')
  useEffect(() => {
    if (!token) return
    Promise.all([
      apiRequest('/categories/'),
      apiRequest(`/campuses/?university=${user?.university || ''}`),
    ]).then(([categoryResponse, campusResponse]) => {
      const availableCategories = apiResults(categoryResponse)
      const availableCampuses = apiResults(campusResponse)
      if (availableCategories.length) {
        setCategoriesList(availableCategories)
        setCategoryId(String(availableCategories[0].id))
      }
      if (availableCampuses.length) setCampusList(availableCampuses)
    }).catch((requestError) => setError(requestError.message))
  }, [token, user?.university])
  const selectedCategory = categoriesList.find((item) => String(item.id) === categoryId)
  const submit = async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const photos = data.getAll('images').filter((file) => file.size)
    if (photos.length > 5 || photos.some((file) => file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setError('Choose up to five JPG, PNG or WebP images, each under 5MB.')
      return
    }
    setError('')
    try {
      await onCreate({
        title: data.get('title'),
        price: Number(data.get('price')),
        category: token ? Number(data.get('category')) : data.get('category'),
        condition: data.get('condition'),
        campus: token ? Number(data.get('campus')) : data.get('campus'),
        listing_type: selectedCategory?.name === 'Services' ? 'service' : 'item',
        availability: data.get('availability') || '',
        location: data.get('location') || '',
        description: data.get('description'),
        category_name: selectedCategory?.name || 'Electronics',
        campus_name: campusList.find((item) => String(item.id) === data.get('campus'))?.name || 'Main Campus',
        images: photos,
      })
      navigate('/browse')
    } catch (requestError) {
      setError(requestError.message)
    }
  }
  return <main className="page-shell sell-page"><Link to="/browse" className="back-link">Back to marketplace</Link><div className="sell-heading"><div className="eyebrow muted-eyebrow">PASS IT ON</div><h1>List something <em>good.</em></h1><p>Reach students at your campus. No fees, no fuss.</p></div><form className="sell-form" onSubmit={submit}><div className="form-main"><label className="field-label">What are you listing?<input name="title" required placeholder="e.g. Lenovo ThinkPad X1 Carbon" maxLength="90" /></label><div className="form-row"><label className="field-label">Category<select name="category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{categoriesList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field-label">Condition<select name="condition"><option value="new">New</option><option value="like_new">Like New</option><option value="used_good">Used - Good</option><option value="used_fair">Used - Fair</option></select></label></div><label className="field-label">Description<textarea name="description" required rows="5" placeholder="Share the details a fellow student should know..." maxLength="1200" /></label>{selectedCategory?.name === 'Services' && <label className="field-label">Availability<input name="availability" required placeholder="e.g. Weekdays after 3pm" /></label>}<div className="form-row"><label className="field-label">Price <span className="field-hint">in Kenyan shillings</span><div className="price-input"><span>KSh</span><input name="price" type="number" required min="1" placeholder="0" /></div></label><label className="field-label">Campus<select name="campus">{campusList.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><label className="field-label">Meet-up spot <span className="field-hint">optional</span><input name="location" placeholder="e.g. Main library entrance" /></label></div><div className="form-aside"><label className="field-label">Photos <span className="field-hint">optional, up to 5</span><div className="upload-zone">{preview ? <img src={preview} alt="Listing preview" /> : <><span className="upload-icon">+</span><strong>Add photos</strong><span>JPG, PNG or WebP, up to 5MB each</span></>}<input aria-label="Upload listing photos" name="images" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={(event) => { const file = event.target.files?.[0]; if (file && file.size <= 5 * 1024 * 1024) setPreview(URL.createObjectURL(file)); else if (file) setError('Choose an image smaller than 5MB.') }} /></div></label><div className="safety-note"><ShieldCheck size={18} /><span><strong>Meet safely</strong>Choose a busy, public place on campus and bring a friend if you can.</span></div></div><div className="form-submit">{error && <p className="form-error" role="alert">{error}</p>}<button className="dark-button">Publish listing <ArrowRight size={17} /></button><span>Keep our campus community respectful.</span></div></form><Footer /></main>
}

function Footer() { return <footer className="site-footer"><Link className="brand footer-brand" to="/"><span className="brand-mark">cm<span>.</span></span><span className="brand-name">campus<span>market</span></span></Link><span>Made for the people you pass between lectures.</span><span>Kenya / KSh</span></footer> }

function AppShell() {
  const location = useLocation()
  const [query, setQuery] = useState(new URLSearchParams(window.location.search).get('q') ?? '')
  const [listings, setListings] = useState(() => readSaved('campus-market-listings', starterListings))
  const [favorites, setFavorites] = useState(() => readSaved('campus-market-favorites', []))
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('campus-market-access') || '')
  const [user, setUser] = useState(() => readSaved('campus-market-user', null))
  useEffect(() => {
    let active = true
    const searchTerm = new URLSearchParams(location.search).get('q')
    const path = searchTerm ? `/listings/?search=${encodeURIComponent(searchTerm)}` : '/listings/'
    apiRequest(path).then((payload) => {
      const remoteListings = apiResults(payload).map(mapApiListing)
      if (active && remoteListings.length) {
        setListings((current) => [...remoteListings, ...current.filter((item) => !item._api)])
      }
    }).catch(() => {})
    return () => { active = false }
  }, [location.pathname, location.search])
  useEffect(() => {
    if (!accessToken || user) return
    apiRequest('/auth/me/', { token: accessToken }).then((profile) => {
      setUser(profile)
      sessionStorage.setItem('campus-market-user', JSON.stringify(profile))
    }).catch(() => {
      sessionStorage.removeItem('campus-market-access')
      sessionStorage.removeItem('campus-market-refresh')
      setAccessToken('')
    })
  }, [accessToken, user])
  const authenticate = (session) => {
    setAccessToken(session.access)
    setUser(session.user)
    sessionStorage.setItem('campus-market-access', session.access)
    sessionStorage.setItem('campus-market-refresh', session.refresh)
    sessionStorage.setItem('campus-market-user', JSON.stringify(session.user))
  }
  const logout = async () => {
    const refresh = sessionStorage.getItem('campus-market-refresh')
    if (refresh) await apiRequest('/auth/logout/', { method: 'POST', token: accessToken, body: { refresh } }).catch(() => {})
    sessionStorage.removeItem('campus-market-access')
    sessionStorage.removeItem('campus-market-refresh')
    sessionStorage.removeItem('campus-market-user')
    setAccessToken('')
    setUser(null)
  }
  const toggleFavorite = (id) => setFavorites((current) => { const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]; localStorage.setItem('campus-market-favorites', JSON.stringify(next)); return next })
  const createListing = async (data) => {
    if (accessToken) {
      const body = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'images' && key !== 'category_name' && key !== 'campus_name' && value !== '') body.append(key, value)
      })
      data.images.forEach((image) => body.append('images', image))
      const created = await apiRequest('/listings/', { method: 'POST', token: accessToken, body })
      const listing = mapApiListing(created)
      setListings((current) => [listing, ...current])
      return
    }
    const localListing = { ...data, id: String(Date.now()), seller: 'You', posted: 'Just now', image: data.images[0] ? URL.createObjectURL(data.images[0]) : 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=85' }
    delete localListing.images
    setListings((current) => { const next = [localListing, ...current]; localStorage.setItem('campus-market-listings', JSON.stringify(next)); return next })
  }
  return <><Header query={query} setQuery={setQuery} favoritesCount={favorites.length} user={user} onLogout={logout} /><Routes><Route path="/" element={<HomePage listings={listings} favorites={favorites} toggleFavorite={toggleFavorite} query={query} setQuery={setQuery} />} /><Route path="/browse" element={<BrowsePage listings={listings} favorites={favorites} toggleFavorite={toggleFavorite} query={query} setQuery={setQuery} />} /><Route path="/listing/:id" element={<DetailsPage listings={listings} favorites={favorites} toggleFavorite={toggleFavorite} />} /><Route path="/favorites" element={<FavoritesPage listings={listings} favorites={favorites} toggleFavorite={toggleFavorite} />} /><Route path="/sell" element={<SellPage onCreate={createListing} token={accessToken} user={user} />} /><Route path="/account" element={<AuthPage onAuthenticated={authenticate} />} /><Route path="*" element={<main className="page-shell"><h1>Page not found</h1><Link to="/browse" className="text-link">Browse listings <ArrowRight size={15} /></Link></main>} /></Routes></>
}

export default function App() { return <BrowserRouter><AppShell /></BrowserRouter> }
