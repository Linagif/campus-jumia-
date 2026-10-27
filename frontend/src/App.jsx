import { useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Link, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  ArrowDownUp,
  ArrowRight,
  BookOpen,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Flame,
  Heart,
  Laptop,
  MapPin,
  Menu,
  Rocket,
  Search,
  Share2,
  ShieldCheck,
  Shirt,
  Sofa,
  Sparkles,
  Tag,
  X,
  Zap,
} from 'lucide-react'
import AuthPage from './AuthPage'
import {
  apiRequest,
  apiResults,
  boostListing,
  createWantedPost,
  deleteWantedPost,
  fulfillWantedPost,
  getActiveSeasonalBanners,
  getWantedPosts,
  mapApiListing,
} from './api'
import './App.css'

const starterListings = [
  {
    id: '1',
    title: 'HP EliteBook 840 G5',
    price: 28500,
    category: 'Electronics',
    condition: 'Used - Good',
    campus: 'Main Campus',
    seller: 'Brian M.',
    posted: '2 hours ago',
    image: 'https://images.unsplash.com/photo-1588872657578-7efd1f1555ed?auto=format&fit=crop&w=900&q=85',
    description: 'Reliable and fast, ready for campus life. 8GB RAM, 256GB SSD, charger included. Happy to meet around the library.',
    is_boosted: true,
    boost_expires_at: new Date(Date.now() + 6 * 24 * 3600 * 1000).toISOString(),
  },
  {
    id: '2',
    title: 'Database Systems textbook',
    price: 1200,
    category: 'Books',
    condition: 'Like New',
    campus: 'Kikuyu Campus',
    seller: 'Wanjiku N.',
    posted: '5 hours ago',
    image: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&w=900&q=85',
    description: 'Clean copy with no highlighting. Great for second-year computer science and IT students.',
  },
  {
    id: '3',
    title: 'Compact study desk',
    price: 2500,
    category: 'Furniture',
    condition: 'Used - Good',
    campus: 'Main Campus',
    seller: 'Amina K.',
    posted: 'Yesterday',
    image: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?auto=format&fit=crop&w=900&q=85',
    description: 'Solid desk with a drawer. Fits neatly in a hostel room. Collection near the student centre.',
  },
  {
    id: '4',
    title: 'Nike Court Vision sneakers',
    price: 3500,
    category: 'Shoes',
    condition: 'Like New',
    campus: 'Chiromo Campus',
    seller: 'Kevin O.',
    posted: 'Yesterday',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=85',
    description: 'Worn a handful of times, size 42. Selling because I got the wrong size.',
  },
  {
    id: '5',
    title: 'Python tutoring, one-on-one',
    price: 500,
    category: 'Services',
    condition: 'Available weekdays',
    campus: 'Main Campus',
    seller: 'Derrick W.',
    posted: '2 days ago',
    image: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85',
    description: 'Patient Python tutor for beginners. We can work through assignments together at the campus library. Price per hour.',
  },
  {
    id: '6',
    title: 'Oversized varsity jacket',
    price: 1800,
    category: 'Clothes',
    condition: 'Used - Good',
    campus: 'Kikuyu Campus',
    seller: 'Njeri W.',
    posted: '2 days ago',
    image: 'https://images.unsplash.com/photo-1551025621-12c7e9b5b4d3?auto=format&fit=crop&w=900&q=85',
    description: 'Warm, comfortable and in great shape. Fits M to L. Meet-up at the main gate.',
  },
  {
    id: '7',
    title: 'Scientific calculator',
    price: 900,
    category: 'Electronics',
    condition: 'Used - Good',
    campus: 'Main Campus',
    seller: 'Sam K.',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1587145820266-a5951ee6f620?auto=format&fit=crop&w=900&q=85',
    description: 'Casio fx-82MS, all buttons working. Useful for maths, engineering and business courses.',
  },
  {
    id: '8',
    title: 'Introduction to Economics',
    price: 750,
    category: 'Books',
    condition: 'Used - Fair',
    campus: 'Chiromo Campus',
    seller: 'Faith A.',
    posted: '3 days ago',
    image: 'https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=85',
    description: 'Some notes in pencil, all pages intact. A handy intro text for first years.',
  },
]

const starterSeasonalBanners = [
  {
    id: '1',
    title: 'Semester 1 Kickoff: Campus & Hostel Essentials',
    subtitle: 'Furnish your hostel room, grab required textbooks, and upgrade your tech for the semester.',
    badge_text: 'Semester 1 Live',
    season_type: 'semester_start',
    call_to_action: 'Shop Semester Essentials',
    target_url: '/browse',
    accent_theme: 'emerald',
    banner_image: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85',
    featured_categories: [
      { id: '2', name: 'Electronics', slug: 'electronics' },
      { id: '3', name: 'Books', slug: 'books' },
      { id: '4', name: 'Furniture', slug: 'furniture' },
    ],
  },
  {
    id: '2',
    title: 'Exam Season Prep: Study Guides & Revision Tutoring',
    subtitle: 'Score your best grades with peer revision notes, calculators, and one-on-one study sessions.',
    badge_text: 'Exam Season Special',
    season_type: 'exam_season',
    call_to_action: 'Browse Study Guides',
    target_url: '/browse?category=Books',
    accent_theme: 'amber',
    banner_image: 'https://images.unsplash.com/photo-1434030216411-0b793f4b4173?auto=format&fit=crop&w=1200&q=85',
    featured_categories: [
      { id: '3', name: 'Books', slug: 'books' },
      { id: '6', name: 'Services', slug: 'services' },
      { id: '2', name: 'Electronics', slug: 'electronics' },
    ],
  },
]

const starterWantedPosts = [
  {
    id: '1',
    title: 'Wanted: Casio FX-991EX ClassWiz Calculator',
    description: 'Urgent! Need an original fx-991EX calculator for Engineering Maths exam next week. Willing to pick up immediately around Jomo Kenyatta Memorial Library.',
    category_name: 'Electronics',
    campus_name: 'Main Campus',
    budget: 2200,
    urgency: 'urgent',
    status: 'active',
    buyer: { full_name: 'Faith Makena' },
    contact_preference: 'Meet at JKML or chat on Campus Market',
    created_at: new Date(Date.now() - 3600 * 1000 * 3).toISOString(),
  },
  {
    id: '2',
    title: 'Looking for Database Systems 7th Edition (Elmasri & Navathe)',
    description: 'Clean textbook wanted for 2nd Year Computer Science. Photocopy or original is fine as long as pages are legible.',
    category_name: 'Books',
    campus_name: 'Chiromo Campus',
    budget: 1400,
    urgency: 'soon',
    status: 'active',
    buyer: { full_name: 'Kelvin Kiprop' },
    contact_preference: 'Chat on Campus Market',
    created_at: new Date(Date.now() - 3600 * 1000 * 12).toISOString(),
  },
  {
    id: '3',
    title: 'Need compact hostel study desk & chair',
    description: 'Moving into Hall 8. Need a sturdy study table that fits into a twin room. Can pay KSh 3,000 to 3,800 depending on condition.',
    category_name: 'Furniture',
    campus_name: 'Main Campus',
    budget: 3500,
    urgency: 'flexible',
    status: 'active',
    buyer: { full_name: 'Amina K.' },
    contact_preference: 'Pick up at hostel',
    created_at: new Date(Date.now() - 3600 * 1000 * 28).toISOString(),
  },
]

const categories = [
  { name: 'All items', icon: Sparkles },
  { name: 'Electronics', icon: Laptop },
  { name: 'Books', icon: BookOpen },
  { name: 'Clothes', icon: Shirt },
  { name: 'Furniture', icon: Sofa },
  { name: 'Services', icon: Tag },
]

const money = (value) => `KSh ${Number(value || 0).toLocaleString('en-KE')}`

function readSaved(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback
  } catch {
    return fallback
  }
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

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link className="brand" to="/" aria-label="Campus Market home">
          <span className="brand-mark">cm<span>.</span></span>
          <span className="brand-name">campus<span>market</span></span>
        </Link>
        <form className="header-search" onSubmit={search} role="search">
          <Search size={17} />
          <input
            aria-label="Search listings"
            placeholder="Find something on campus..."
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          <kbd>Ctrl K</kbd>
        </form>
        <nav className={menuOpen ? 'main-nav is-open' : 'main-nav'} aria-label="Main navigation">
          <Link
            className={location.pathname === '/browse' ? 'nav-link active' : 'nav-link'}
            to="/browse"
            onClick={() => setMenuOpen(false)}
          >
            Browse
          </Link>
          <Link
            className={location.pathname === '/wanted' ? 'nav-link active wanted-nav-link' : 'nav-link wanted-nav-link'}
            to="/wanted"
            onClick={() => setMenuOpen(false)}
          >
            Wanted <span className="wanted-pulse-badge">New</span>
          </Link>
          <Link className="nav-link" to="/favorites" onClick={() => setMenuOpen(false)}>
            Saved <span className="nav-count">{favoritesCount}</span>
          </Link>
          <Link className="sell-button" to="/sell" onClick={() => setMenuOpen(false)}>
            <span>+</span> Sell an item
          </Link>
          {user ? (
            <>
              <span className="nav-link account-user">{user.full_name?.split(' ')[0] || 'Student'}</span>
              <button
                className="nav-link account-nav"
                onClick={() => {
                  onLogout()
                  setMenuOpen(false)
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link className="nav-link account-nav" to="/account?mode=login" onClick={() => setMenuOpen(false)}>
                Sign in
              </Link>
              <Link className="nav-link account-nav" to="/account?mode=register" onClick={() => setMenuOpen(false)}>
                Join
              </Link>
            </>
          )}
        </nav>
        <button
          className="menu-toggle icon-button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>
    </header>
  )
}

function ShareModal({ listing, onClose }) {
  const [copied, setCopied] = useState(false)
  const shareUrl = listing.share_url || `${window.location.origin}/listing/${listing.id}`
  const priceDisplay = listing.category === 'Services' ? `From ${money(listing.price)}/hr` : money(listing.price)
  const shareText = `Check out "${listing.title}" for ${priceDisplay} on Campus Jumia (${listing.campus}): ${shareUrl}`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    } catch {
      setCopied(true)
      setTimeout(() => setCopied(false), 2400)
    }
  }

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${listing.title} | Campus Jumia`,
          text: shareText,
          url: shareUrl,
        })
      } catch {
        // User dismissed
      }
    } else {
      copyToClipboard()
    }
  }

  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="dialog share-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="share-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button className="dialog-close icon-button" aria-label="Close" onClick={onClose}>
          <X size={19} />
        </button>
        <div className="eyebrow muted-eyebrow">
          <Sparkles size={13} /> SPREAD THE WORD
        </div>
        <h2 id="share-title">Share this listing</h2>
        <p className="dialog-context">
          Generate a shareable link with rich Open Graph card preview for WhatsApp & social platforms.
        </p>

        <div className="share-buttons-row">
          <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="social-share-btn whatsapp-btn">
            <span className="social-icon">💬</span>
            <span>WhatsApp</span>
          </a>
          <a href={twitterUrl} target="_blank" rel="noopener noreferrer" className="social-share-btn twitter-btn">
            <span className="social-icon">🐦</span>
            <span>Twitter / X</span>
          </a>
          {navigator.share && (
            <button type="button" onClick={handleNativeShare} className="social-share-btn device-btn">
              <Share2 size={16} />
              <span>More...</span>
            </button>
          )}
        </div>

        <div className="copy-link-box">
          <input readOnly value={shareUrl} aria-label="Listing share link" />
          <button type="button" className="copy-btn" onClick={copyToClipboard}>
            {copied ? (
              <>
                <Check size={14} /> Copied!
              </>
            ) : (
              <>
                <Copy size={14} /> Copy link
              </>
            )}
          </button>
        </div>

        <div className="og-preview-section">
          <div className="og-preview-header">
            <span>Open Graph Social Card Preview</span>
            <span className="og-pill">WhatsApp / Social Media Preview</span>
          </div>
          <div className="og-card">
            <div className="og-image-wrapper">
              <img src={listing.image} alt={listing.title} />
              <span className="og-price-tag">{priceDisplay}</span>
            </div>
            <div className="og-content">
              <span className="og-domain">campus-jumia.ke • Campus Market</span>
              <h4 className="og-title">{listing.title}</h4>
              <p className="og-desc">
                {listing.campus} • {listing.category} • {listing.description?.slice(0, 110)}...
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function SeasonalBannerSection({ banners, selectedSeason, onSelectSeason }) {
  const activeBanner = banners.find((item) => item.season_type === selectedSeason) || banners[0]
  if (!activeBanner) return null

  return (
    <section className={`seasonal-banner-container theme-${activeBanner.accent_theme || 'emerald'}`}>
      <div className="seasonal-banner-inner">
        <div className="seasonal-badge-row">
          <span className="seasonal-pill">
            <Calendar size={13} /> {activeBanner.badge_text || 'Semester Highlight'}
          </span>
          <div className="season-switcher" role="tablist" aria-label="Semester periods">
            <button
              type="button"
              className={`season-chip ${activeBanner.season_type === 'semester_start' ? 'active' : ''}`}
              onClick={() => onSelectSeason('semester_start')}
            >
              Semester Kickoff
            </button>
            <button
              type="button"
              className={`season-chip ${activeBanner.season_type === 'exam_season' ? 'active' : ''}`}
              onClick={() => onSelectSeason('exam_season')}
            >
              Exam Season Prep
            </button>
          </div>
        </div>

        <div className="seasonal-grid">
          <div className="seasonal-text">
            <h2>{activeBanner.title}</h2>
            <p>{activeBanner.subtitle}</p>

            {activeBanner.featured_categories?.length > 0 && (
              <div className="featured-categories-wrap">
                <span className="featured-cat-label">Featured this period:</span>
                <div className="featured-cat-pills">
                  {activeBanner.featured_categories.map((cat) => (
                    <Link
                      key={cat.id || cat.name}
                      to={`/browse?category=${encodeURIComponent(cat.name)}`}
                      className="featured-cat-pill"
                    >
                      <Tag size={12} /> {cat.name}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            <div className="seasonal-actions">
              <Link to={activeBanner.target_url || '/browse'} className="seasonal-cta-btn">
                {activeBanner.call_to_action || 'Explore Essentials'} <ArrowRight size={16} />
              </Link>
            </div>
          </div>

          <div className="seasonal-media">
            <img
              src={
                activeBanner.banner_image ||
                'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=85'
              }
              alt={activeBanner.title}
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function ListingCard({ listing, saved, onToggleFavorite, onShare }) {
  return (
    <article className={`listing-card ${listing.is_boosted ? 'is-boosted-listing' : ''}`}>
      <Link className="listing-image-link" to={`/listing/${listing.id}`} aria-label={`View ${listing.title}`}>
        <img className="listing-image" src={listing.image} alt={listing.title} loading="lazy" />
        {listing.is_boosted && (
          <span className="boosted-badge">
            <Zap size={11} fill="currentColor" /> Boosted
          </span>
        )}
        {listing.category === 'Services' && <span className="service-badge">Service</span>}
      </Link>
      <div className="card-floating-actions">
        {onShare && (
          <button
            type="button"
            className="card-action-btn share-action-btn"
            onClick={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onShare(listing)
            }}
            aria-label={`Share ${listing.title}`}
          >
            <Share2 size={15} />
          </button>
        )}
        <button
          type="button"
          className={saved ? 'card-action-btn favorite-button is-saved' : 'card-action-btn favorite-button'}
          onClick={() => onToggleFavorite(listing.id)}
          aria-label={saved ? `Remove ${listing.title} from saved` : `Save ${listing.title}`}
          aria-pressed={saved}
        >
          <Heart size={16} fill={saved ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="listing-copy">
        <div className="listing-meta">
          <span>{listing.category}</span>
          <span className="dot" />
          {listing.condition}
        </div>
        <Link className="listing-title" to={`/listing/${listing.id}`}>
          {listing.title}
        </Link>
        <strong className="listing-price">
          {listing.category === 'Services' ? `From ${money(listing.price)}/hr` : money(listing.price)}
        </strong>
        <div className="listing-footer">
          <span>
            <MapPin size={13} />
            {listing.campus}
          </span>
          <span>{listing.posted}</span>
        </div>
      </div>
    </article>
  )
}

function ListingGrid({ items, favorites, toggleFavorite, onShare }) {
  if (!items.length) {
    return (
      <div className="empty-state">
        <span className="empty-icon">
          <Search size={21} />
        </span>
        <h3>No listings found</h3>
        <p>Try a different search or adjust your filters.</p>
        <Link to="/browse" className="text-link">
          Clear filters <ArrowRight size={15} />
        </Link>
      </div>
    )
  }
  return (
    <div className="listing-grid">
      {items.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          saved={favorites.includes(listing.id)}
          onToggleFavorite={toggleFavorite}
          onShare={onShare}
        />
      ))}
    </div>
  )
}

function WantedCard({ post, user, onFulfill, onDelete, onContact }) {
  const isOwner = user && (post.buyer?.id === user.id || post.buyer?.email === user.email)
  const isFulfilled = post.status === 'fulfilled'

  const urgencyConfig = {
    urgent: { label: 'Urgent • Needed today', icon: Flame, className: 'urgency-urgent' },
    soon: { label: 'Needed this week', icon: Clock, className: 'urgency-soon' },
    flexible: { label: 'Flexible timing', icon: Sparkles, className: 'urgency-flexible' },
  }
  const urgency = urgencyConfig[post.urgency] || urgencyConfig.flexible
  const UrgencyIcon = urgency.icon

  return (
    <article className={`wanted-card ${isFulfilled ? 'is-fulfilled' : ''}`}>
      <div className="wanted-header">
        <span className={`wanted-urgency-badge ${urgency.className}`}>
          <UrgencyIcon size={12} /> {urgency.label}
        </span>
        {isFulfilled && (
          <span className="wanted-fulfilled-pill">
            <CheckCircle2 size={13} /> Fulfilled
          </span>
        )}
      </div>

      <h3 className="wanted-title">{post.title}</h3>

      <div className="wanted-meta-row">
        {post.category_name && <span className="wanted-tag tag-category">{post.category_name}</span>}
        <span className="wanted-tag tag-campus">
          <MapPin size={12} /> {post.campus_name || post.campus}
        </span>
        {post.budget && (
          <span className="wanted-budget-tag">
            Budget: <strong>{money(post.budget)}</strong>
          </span>
        )}
      </div>

      <p className="wanted-description">{post.description}</p>

      {post.contact_preference && (
        <div className="wanted-meetup-note">
          <span>Preference: {post.contact_preference}</span>
        </div>
      )}

      <div className="wanted-footer">
        <div className="wanted-buyer-info">
          <div className="buyer-avatar">
            {(post.buyer?.full_name || 'Student')
              .split(' ')
              .map((p) => p[0])
              .join('')
              .slice(0, 2)}
          </div>
          <div>
            <span className="buyer-name">{post.buyer?.full_name || 'Campus Buyer'}</span>
            <span className="buyer-sub">Verified Student</span>
          </div>
        </div>

        <div className="wanted-actions">
          {isOwner ? (
            <>
              {!isFulfilled && (
                <button
                  type="button"
                  className="wanted-btn fulfill-btn"
                  onClick={() => onFulfill(post.id)}
                >
                  <Check size={14} /> Mark Fulfilled
                </button>
              )}
              <button
                type="button"
                className="wanted-btn delete-btn"
                onClick={() => onDelete(post.id)}
              >
                Delete
              </button>
            </>
          ) : (
            <button
              type="button"
              className="wanted-btn contact-buyer-btn"
              onClick={() => onContact(post)}
            >
              I Have This <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function PostWantedModal({ isOpen, onClose, onSubmit, categoriesList, campusList }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen) return null

  const handleFormSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const formData = new FormData(event.currentTarget)
    try {
      const budgetVal = formData.get('budget')
      await onSubmit({
        title: formData.get('title'),
        description: formData.get('description'),
        category: formData.get('category'),
        campus: formData.get('campus'),
        budget: budgetVal ? Number(budgetVal) : null,
        urgency: formData.get('urgency') || 'flexible',
        contact_preference: formData.get('contact_preference') || '',
      })
      onClose()
    } catch (err) {
      setError(err.message || 'Could not post request. Try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <section
        className="dialog post-wanted-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="post-wanted-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="dialog-close icon-button" aria-label="Close" onClick={onClose}>
          <X size={19} />
        </button>
        <div className="eyebrow muted-eyebrow">
          <Sparkles size={13} /> BUYER DEMAND BOARD
        </div>
        <h2 id="post-wanted-title">Post a "Wanted" Request</h2>
        <p className="dialog-context">
          Can't find what you need on campus? Describe what you're looking for so student sellers can reach out.
        </p>

        <form onSubmit={handleFormSubmit} className="post-wanted-form">
          <label className="field-label">
            What item or service do you need?
            <input
              name="title"
              required
              placeholder="e.g. Casio fx-991EX ClassWiz Calculator or Lab Coat Size M"
              maxLength={120}
            />
          </label>

          <div className="form-row">
            <label className="field-label">
              Category
              <select name="category" required>
                {categoriesList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="field-label">
              Campus
              <select name="campus" required>
                {campusList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="field-label">
              Target Budget <span className="field-hint">in KSh (optional)</span>
              <div className="price-input">
                <span>KSh</span>
                <input name="budget" type="number" min="1" placeholder="e.g. 1500" />
              </div>
            </label>

            <label className="field-label">
              Urgency
              <select name="urgency" defaultValue="flexible">
                <option value="urgent">🔥 Urgent • Needed today</option>
                <option value="soon">⏰ Needed this week</option>
                <option value="flexible">✨ Flexible timing</option>
              </select>
            </label>
          </div>

          <label className="field-label">
            Meet-up / Contact preference <span className="field-hint">optional</span>
            <input name="contact_preference" placeholder="e.g. Meet around library or chat on app" maxLength={60} />
          </label>

          <label className="field-label">
            Details & Description
            <textarea
              name="description"
              required
              rows={4}
              placeholder="Mention edition, condition accepted, size, or any specific requirements..."
              maxLength={1500}
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <div className="wanted-modal-submit-row">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="dark-button" disabled={submitting}>
              {submitting ? 'Posting...' : 'Publish Wanted Request'} <ArrowRight size={16} />
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

function WantedPage({ wantedPosts, setWantedPosts, user, token, campusList, categoriesList, onOpenMessage }) {
  const [campusFilter, setCampusFilter] = useState('All campuses')
  const [categoryFilter, setCategoryFilter] = useState('All categories')
  const [urgencyFilter, setUrgencyFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState('active')
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState('')

  const showToast = (msg) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(''), 3000)
  }

  const handleCreate = async (postData) => {
    if (token) {
      const created = await createWantedPost(postData, token)
      setWantedPosts((current) => [created, ...current])
      showToast('Wanted request posted successfully!')
      return
    }
    const catName = categoriesList.find((c) => String(c.id) === String(postData.category))?.name || 'Item'
    const campName = campusList.find((c) => String(c.id) === String(postData.campus))?.name || 'Main Campus'
    const localPost = {
      ...postData,
      id: String(Date.now()),
      category_name: catName,
      campus_name: campName,
      status: 'active',
      buyer: { full_name: user?.full_name || 'You' },
      created_at: new Date().toISOString(),
    }
    setWantedPosts((current) => [localPost, ...current])
    showToast('Wanted request saved!')
  }

  const handleFulfill = async (id) => {
    if (token) {
      await fulfillWantedPost(id, token)
    }
    setWantedPosts((current) =>
      current.map((item) => (String(item.id) === String(id) ? { ...item, status: 'fulfilled' } : item))
    )
    showToast('Marked as fulfilled!')
  }

  const handleDelete = async (id) => {
    if (token) {
      await deleteWantedPost(id, token)
    }
    setWantedPosts((current) => current.filter((item) => String(item.id) !== String(id)))
    showToast('Request deleted.')
  }

  const filteredPosts = useMemo(() => {
    return wantedPosts.filter((item) => {
      const matchesCampus =
        campusFilter === 'All campuses' || (item.campus_name || item.campus) === campusFilter
      const matchesCategory =
        categoryFilter === 'All categories' || item.category_name === categoryFilter
      const matchesUrgency = urgencyFilter === 'All' || item.urgency === urgencyFilter
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter
      const term = searchQuery.trim().toLowerCase()
      const matchesSearch =
        !term ||
        `${item.title} ${item.description} ${item.category_name || ''} ${item.campus_name || ''}`
          .toLowerCase()
          .includes(term)

      return matchesCampus && matchesCategory && matchesUrgency && matchesStatus && matchesSearch
    })
  }, [wantedPosts, campusFilter, categoryFilter, urgencyFilter, statusFilter, searchQuery])

  return (
    <main className="page-shell wanted-page-shell">
      {toastMessage && <div className="floating-toast">{toastMessage}</div>}

      <div className="page-title-row wanted-title-row">
        <div>
          <div className="eyebrow muted-eyebrow">STUDENT REQUEST BOARD</div>
          <h1>
            Items students <em>need right now.</em>
          </h1>
          <p>Have something lying around? Sell directly to a fellow student looking for it.</p>
        </div>
        <button type="button" className="cta-button post-request-btn" onClick={() => setModalOpen(true)}>
          <span>+</span> Post a Request
        </button>
      </div>

      <div className="wanted-filter-toolbar">
        <div className="wanted-search-input">
          <Search size={16} />
          <input
            placeholder="Search wanted requests (e.g. calculator, textbook, fridge)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="wanted-selects">
          <select value={campusFilter} onChange={(e) => setCampusFilter(e.target.value)}>
            <option>All campuses</option>
            {campusList.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
            <option>All categories</option>
            {categoriesList.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          <select value={urgencyFilter} onChange={(e) => setUrgencyFilter(e.target.value)}>
            <option value="All">All urgencies</option>
            <option value="urgent">🔥 Urgent only</option>
            <option value="soon">⏰ Needed this week</option>
            <option value="flexible">✨ Flexible</option>
          </select>

          <div className="wanted-status-toggle">
            <button
              type="button"
              className={statusFilter === 'active' ? 'active' : ''}
              onClick={() => setStatusFilter('active')}
            >
              Active
            </button>
            <button
              type="button"
              className={statusFilter === 'fulfilled' ? 'active' : ''}
              onClick={() => setStatusFilter('fulfilled')}
            >
              Fulfilled
            </button>
            <button
              type="button"
              className={statusFilter === 'all' ? 'active' : ''}
              onClick={() => setStatusFilter('all')}
            >
              All
            </button>
          </div>
        </div>
      </div>

      {filteredPosts.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">
            <Search size={22} />
          </span>
          <h3>No matching requests</h3>
          <p>No student requests match your criteria. Post what you need to get the community's attention!</p>
          <button type="button" className="text-link" onClick={() => setModalOpen(true)}>
            Post a Request <ArrowRight size={15} />
          </button>
        </div>
      ) : (
        <div className="wanted-grid">
          {filteredPosts.map((post) => (
            <WantedCard
              key={post.id}
              post={post}
              user={user}
              onFulfill={handleFulfill}
              onDelete={handleDelete}
              onContact={(p) => onOpenMessage(p)}
            />
          ))}
        </div>
      )}

      <PostWantedModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleCreate}
        categoriesList={categoriesList}
        campusList={campusList}
        token={token}
        user={user}
      />
      <Footer />
    </main>
  )
}

function HomePage({
  listings,
  favorites,
  toggleFavorite,
  query,
  setQuery,
  seasonalBanners,
  selectedSeason,
  setSelectedSeason,
  wantedPosts,
  onShare,
}) {
  const navigate = useNavigate()

  return (
    <main>
      <section className="hero-section">
        <div className="hero-content">
          <div className="eyebrow">
            <span className="live-dot" /> YOUR CAMPUS, YOUR MARKET
          </div>
          <h1>
            Good finds.
            <br />
            <em>Good people.</em>
          </h1>
          <p>The easiest way to buy, sell and discover useful things from students around you.</p>
          <form
            className="hero-search"
            onSubmit={(event) => {
              event.preventDefault()
              navigate(`/browse?q=${encodeURIComponent(query)}`)
            }}
          >
            <Search size={19} />
            <input
              aria-label="Search the marketplace"
              placeholder="Try textbooks or a study desk"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <button aria-label="Search">
              <ArrowRight size={19} />
            </button>
          </form>
          <div className="hero-proof">
            <ShieldCheck size={16} />
            <span>Student community</span>
            <span className="proof-divider">/</span>
            <span>Meet on campus</span>
          </div>
        </div>
        <div className="hero-art">
          <img
            src="https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=1200&q=90"
            alt="Students studying together at a campus library"
          />
          <div className="hero-note">
            <Sparkles size={17} />
            <span>
              Little things,
              <br />
              <strong>big campus energy.</strong>
            </span>
          </div>
          <div className="hero-caption">
            <span>01 / 06</span>
            <span>University of Nairobi, Kenya</span>
          </div>
        </div>
      </section>

      {/* Seasonal Campaign Banner Section */}
      <SeasonalBannerSection
        banners={seasonalBanners}
        selectedSeason={selectedSeason}
        onSelectSeason={setSelectedSeason}
      />

      <section className="category-strip" aria-label="Browse categories">
        {categories.map(({ name, icon: Icon }) => (
          <Link
            key={name}
            to={name === 'All items' ? '/browse' : `/browse?category=${encodeURIComponent(name)}`}
            className="category-shortcut"
          >
            <span className="category-icon">
              <Icon size={19} />
            </span>
            <span>{name}</span>
            <ArrowRight className="category-arrow" size={14} />
          </Link>
        ))}
      </section>

      {/* Featured Listings */}
      <section className="content-section featured-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow muted-eyebrow">THE GOOD STUFF</div>
            <h2>Fresh on campus</h2>
            <p>New finds and boosted highlights from your student community.</p>
          </div>
          <Link to="/browse" className="text-link">
            See everything <ArrowRight size={16} />
          </Link>
        </div>
        <ListingGrid
          items={listings.slice(0, 4)}
          favorites={favorites}
          toggleFavorite={toggleFavorite}
          onShare={onShare}
        />
      </section>

      {/* "Students Are Looking For" / Wanted Teaser Strip */}
      <section className="content-section wanted-teaser-section">
        <div className="section-heading">
          <div>
            <div className="eyebrow muted-eyebrow">BUYER REQUESTS</div>
            <h2>Students are looking for...</h2>
            <p>Do you have any of these? Sell them directly to waiting buyers.</p>
          </div>
          <Link to="/wanted" className="text-link">
            View all requests <ArrowRight size={16} />
          </Link>
        </div>
        <div className="wanted-teaser-grid">
          {wantedPosts.slice(0, 3).map((post) => (
            <div key={post.id} className="wanted-teaser-card">
              <div className="teaser-urgency">
                {post.urgency === 'urgent' && (
                  <span className="urgency-urgent">
                    <Flame size={12} /> Urgent
                  </span>
                )}
                {post.urgency === 'soon' && (
                  <span className="urgency-soon">
                    <Clock size={12} /> This week
                  </span>
                )}
                {(!post.urgency || post.urgency === 'flexible') && (
                  <span className="urgency-flexible">
                    <Sparkles size={12} /> Flexible
                  </span>
                )}
                <span className="teaser-campus">{post.campus_name || post.campus}</span>
              </div>
              <h4>{post.title}</h4>
              <p>{post.description?.slice(0, 95)}...</p>
              <div className="teaser-footer">
                <span className="teaser-budget">{post.budget ? `Budget: ${money(post.budget)}` : 'Negotiable'}</span>
                <Link to="/wanted" className="teaser-link">
                  View request <ArrowRight size={13} />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="how-section">
        <div className="how-intro">
          <div className="eyebrow muted-eyebrow">SIMPLE AS THAT</div>
          <h2>
            A better way
            <br />
            to pass it on.
          </h2>
          <p>Good stuff deserves a second home. Find it nearby, meet in person, keep campus moving.</p>
        </div>
        <div className="how-steps">
          <div className="how-step">
            <span>01</span>
            <h3>Find your thing</h3>
            <p>Browse what students near you are listing.</p>
          </div>
          <div className="how-step">
            <span>02</span>
            <h3>Say hello</h3>
            <p>Message the seller and agree on a campus meet-up.</p>
          </div>
          <div className="how-step">
            <span>03</span>
            <h3>Make it yours</h3>
            <p>Pick it up, pay directly, and pass the good along.</p>
          </div>
        </div>
      </section>

      <section className="sell-cta">
        <div>
          <div className="eyebrow">YOUR TURN</div>
          <h2>Got something good?</h2>
          <p>List it for your campus community. It takes about a minute.</p>
        </div>
        <Link className="cta-button" to="/sell">
          List an item <ArrowRight size={18} />
        </Link>
        <Sparkles className="cta-sparkle" size={54} />
      </section>
      <Footer />
    </main>
  )
}

function BrowsePage({ listings, favorites, toggleFavorite, query, setQuery, onShare }) {
  const location = useLocation()
  const navigate = useNavigate()
  const [category, setCategory] = useState('All items')
  const [campus, setCampus] = useState('All campuses')
  const [condition, setCondition] = useState('All conditions')
  const [boostedOnly, setBoostedOnly] = useState(false)
  const [sort, setSort] = useState('Featured')
  const [minimum, setMinimum] = useState('')
  const [maximum, setMaximum] = useState('')

  const currentSearchTerm = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('q') ?? query
  }, [location.search, query])

  const currentCategoryParam = useMemo(() => {
    return new URLSearchParams(location.search).get('category')
  }, [location.search])

  useEffect(() => {
    if (currentCategoryParam) {
      setCategory(currentCategoryParam)
    }
  }, [currentCategoryParam])

  const filtered = useMemo(() => {
    const term = currentSearchTerm.trim().toLowerCase()
    return listings
      .filter((item) => {
        const matchesCategory = category === 'All items' || item.category === category
        const matchesCampus = campus === 'All campuses' || item.campus === campus
        const matchesCondition = condition === 'All conditions' || item.condition === condition
        const matchesBoost = !boostedOnly || item.is_boosted
        const matchesMin = !minimum || item.price >= Number(minimum)
        const matchesMax = !maximum || item.price <= Number(maximum)
        const matchesTerm =
          !term ||
          `${item.title} ${item.description} ${item.category} ${item.campus}`.toLowerCase().includes(term)
        return (
          matchesCategory &&
          matchesCampus &&
          matchesCondition &&
          matchesBoost &&
          matchesMin &&
          matchesMax &&
          matchesTerm
        )
      })
      .sort((a, b) => {
        if (sort === 'Featured') {
          if (b.is_boosted !== a.is_boosted) return b.is_boosted ? 1 : -1
          return Number(b.id) - Number(a.id)
        }
        if (sort === 'Price: Low to High') return a.price - b.price
        if (sort === 'Price: High to Low') return b.price - a.price
        if (sort === 'Oldest') return Number(b.id) - Number(a.id)
        return Number(a.id) - Number(b.id)
      })
  }, [listings, category, campus, condition, boostedOnly, sort, minimum, maximum, currentSearchTerm])

  return (
    <main className="page-shell">
      <div className="page-title-row">
        <div>
          <div className="eyebrow muted-eyebrow">THE CAMPUS MARKET</div>
          <h1>
            Find your next <em>good thing.</em>
          </h1>
          <p>Student listings, right around the corner.</p>
        </div>
        <span className="results-count">
          {filtered.length} {filtered.length === 1 ? 'listing' : 'listings'}
        </span>
      </div>

      <form
        className="browse-search"
        role="search"
        onSubmit={(event) => {
          event.preventDefault()
          navigate(`/browse?q=${encodeURIComponent(query)}`)
        }}
      >
        <Search size={18} />
        <input
          aria-label="Search listings"
          placeholder="Search items, books, services..."
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button type="submit" className="dark-button">
          Search
        </button>
      </form>

      <div className="browse-layout">
        <aside className="filters">
          <div className="filter-heading">
            <span>Filters</span>
            <button
              type="button"
              onClick={() => {
                setCategory('All items')
                setCampus('All campuses')
                setCondition('All conditions')
                setBoostedOnly(false)
                setMinimum('')
                setMaximum('')
                setQuery('')
                navigate('/browse')
              }}
            >
              Reset
            </button>
          </div>

          <label className="filter-label" htmlFor="category-filter">
            Category
          </label>
          <select id="category-filter" value={category} onChange={(event) => setCategory(event.target.value)}>
            {['All items', ...categories.slice(1).map((item) => item.name), 'Shoes'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <label className="filter-label" htmlFor="campus-filter">
            Campus
          </label>
          <select id="campus-filter" value={campus} onChange={(event) => setCampus(event.target.value)}>
            {['All campuses', 'Main Campus', 'Kikuyu Campus', 'Chiromo Campus'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <span className="filter-label">
            Price range <small>in KSh</small>
          </span>
          <div className="price-range">
            <input
              aria-label="Minimum price"
              type="number"
              min="0"
              placeholder="Min"
              value={minimum}
              onChange={(event) => setMinimum(event.target.value)}
            />
            <span>to</span>
            <input
              aria-label="Maximum price"
              type="number"
              min="0"
              placeholder="Max"
              value={maximum}
              onChange={(event) => setMaximum(event.target.value)}
            />
          </div>

          <label className="filter-label" htmlFor="condition-filter">
            Condition
          </label>
          <select id="condition-filter" value={condition} onChange={(event) => setCondition(event.target.value)}>
            {['All conditions', 'New', 'Like New', 'Used - Good', 'Used - Fair'].map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>

          <div className="filter-boosted-box">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={boostedOnly}
                onChange={(e) => setBoostedOnly(e.target.checked)}
              />
              <span>
                <Zap size={13} /> Boosted highlights only
              </span>
            </label>
          </div>

          <div className="filter-campus-note">
            <MapPin size={15} />
            <span>Meet in a public spot on campus.</span>
          </div>
        </aside>

        <div className="results-area">
          <div className="results-toolbar">
            <span>
              {category === 'All items' ? 'All listings' : category}
              {params.get('q') && (
                <>
                  {' '}
                  matching <strong>"{params.get('q')}"</strong>
                </>
              )}
            </span>
            <label>
              <ArrowDownUp size={15} />
              <span>Sort</span>
              <select aria-label="Sort listings" value={sort} onChange={(event) => setSort(event.target.value)}>
                {['Featured', 'Newest', 'Oldest', 'Price: Low to High', 'Price: High to Low'].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
              <ChevronDown size={14} />
            </label>
          </div>
          <ListingGrid
            items={filtered}
            favorites={favorites}
            toggleFavorite={toggleFavorite}
            onShare={onShare}
          />
        </div>
      </div>
      <Footer />
    </main>
  )
}

function DetailsPage({ listings, favorites, toggleFavorite, onShare, onBoost, _token, user }) {
  const { id } = useParams()
  const listing = listings.find((item) => item.id === id)
  const [dialog, setDialog] = useState('')
  const [sent, setSent] = useState(false)
  const [boosting, setBoosting] = useState(false)
  const [boostSuccess, setBoostSuccess] = useState('')

  // Dynamically update document title and Open Graph meta tags for WhatsApp & social crawling
  useEffect(() => {
    if (!listing) return
    const priceFormatted =
      listing.category === 'Services' ? `From ${money(listing.price)}/hr` : money(listing.price)
    document.title = `${listing.title} • ${priceFormatted} | Campus Jumia`

    const setMetaTag = (property, content) => {
      let meta = document.querySelector(`meta[property="${property}"]`)
      if (!meta) {
        meta = document.createElement('meta')
        meta.setAttribute('property', property)
        document.head.appendChild(meta)
      }
      meta.setAttribute('content', content)
    }

    setMetaTag('og:title', `${listing.title} • ${priceFormatted} | Campus Jumia`)
    setMetaTag(
      'og:description',
      `${listing.campus} • ${listing.category} • ${listing.description?.slice(0, 160)}`
    )
    setMetaTag('og:image', listing.image)
    setMetaTag('og:url', listing.share_url || window.location.href)
    setMetaTag('og:type', 'product')
  }, [listing])

  if (!listing) {
    return (
      <main className="page-shell">
        <div className="empty-state">
          <h3>We couldn't find that listing</h3>
          <Link to="/browse" className="text-link">
            Back to browsing <ArrowRight size={15} />
          </Link>
        </div>
      </main>
    )
  }

  const saved = favorites.includes(listing.id)
  const isSeller =
    user && (listing.seller_id === user.id || listing.seller === user.full_name || listing.seller === 'You')

  const handleBoostClick = async () => {
    setBoosting(true)
    setBoostSuccess('')
    try {
      await onBoost(listing.id)
      setBoostSuccess('🎉 Listing boosted for 7 days! It will now appear on top of search results.')
    } catch (err) {
      setBoostSuccess(err.message || 'Could not boost listing. Try again.')
    } finally {
      setBoosting(false)
    }
  }

  return (
    <main className="page-shell detail-page">
      <Link to="/browse" className="back-link">
        Back to listings
      </Link>
      <div className="detail-layout">
        <div className="detail-photo">
          <img src={listing.image} alt={listing.title} />
          {listing.is_boosted && (
            <span className="boosted-badge-large">
              <Zap size={13} fill="currentColor" /> Boosted 7-Day Highlight
            </span>
          )}
        </div>
        <section className="detail-info">
          <div className="detail-header-row">
            <div className="eyebrow muted-eyebrow">
              {listing.category} <span className="dot" />
              {listing.condition}
            </div>
            <button
              type="button"
              className="detail-share-btn"
              onClick={() => onShare(listing)}
              aria-label="Share listing"
            >
              <Share2 size={16} /> Share
            </button>
          </div>

          <h1>{listing.title}</h1>
          <div className="detail-price">
            {listing.category === 'Services' ? `From ${money(listing.price)}/hour` : money(listing.price)}
          </div>
          <div className="detail-location">
            <MapPin size={17} />
            <span>{listing.campus}</span>
            <span className="dot" />
            Posted {listing.posted}
          </div>

          {/* Growth & Engagement: Boost Section for Seller or Demo */}
          <div className="detail-boost-card">
            {listing.is_boosted ? (
              <div className="boost-active-status">
                <div className="boost-status-title">
                  <Zap size={17} className="zap-icon" />
                  <strong>Active 7-Day Boost</strong>
                </div>
                <p>
                  This listing is prioritized at the top of campus searches and feed.
                  {listing.boost_expires_at && (
                    <>
                      {' '}
                      Expires: <strong>{new Date(listing.boost_expires_at).toLocaleDateString()}</strong>
                    </>
                  )}
                </p>
                {isSeller && (
                  <button
                    type="button"
                    className="boost-button"
                    onClick={handleBoostClick}
                    disabled={boosting}
                  >
                    <Rocket size={15} /> {boosting ? 'Extending...' : 'Extend Boost (+7 Days)'}
                  </button>
                )}
              </div>
            ) : (
              <div className="boost-prompt">
                <div className="boost-prompt-text">
                  <Rocket size={19} className="rocket-icon" />
                  <div>
                    <strong>Boost this listing for 7 days</strong>
                    <span>Get up to 5x more buyer views by appearing at the top of campus results.</span>
                  </div>
                </div>
                <button
                  type="button"
                  className="boost-button"
                  onClick={handleBoostClick}
                  disabled={boosting}
                >
                  <Zap size={14} fill="currentColor" /> {boosting ? 'Boosting...' : 'Boost Listing (7 Days)'}
                </button>
              </div>
            )}
            {boostSuccess && <p className="boost-feedback-msg">{boostSuccess}</p>}
          </div>

          <div className="detail-rule" />
          <h2>About this listing</h2>
          <p className="detail-description">{listing.description}</p>
          <div className="seller-block">
            <div className="seller-avatar">
              {listing.seller
                .split(' ')
                .map((part) => part[0])
                .join('')}
            </div>
            <div>
              <span className="seller-label">Listed by</span>
              <strong>{listing.seller}</strong>
            </div>
            <span className="verified">
              <Check size={13} /> Student
            </span>
          </div>

          <button
            type="button"
            className="contact-button"
            onClick={() => {
              setDialog('contact')
              setSent(false)
            }}
          >
            Message seller <ArrowRight size={17} />
          </button>
          <button type="button" className="detail-save" onClick={() => toggleFavorite(listing.id)}>
            <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
            {saved ? 'Saved to your list' : 'Save listing'}
          </button>
          <button type="button" className="report-link" onClick={() => setDialog('report')}>
            Report this listing
          </button>
        </section>
      </div>
      <Footer />

      {dialog && (
        <div className="modal-backdrop" role="presentation" onClick={() => setDialog('')}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="dialog-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="dialog-close icon-button"
              aria-label="Close"
              onClick={() => setDialog('')}
            >
              <X size={19} />
            </button>
            {dialog === 'contact' ? (
              sent ? (
                <div className="success-message">
                  <span>
                    <Check size={24} />
                  </span>
                  <h2 id="dialog-title">Message sent</h2>
                  <p>{listing.seller} can reply in your campus inbox.</p>
                  <button type="button" className="dark-button" onClick={() => setDialog('')}>
                    Done
                  </button>
                </div>
              ) : (
                <>
                  <div className="eyebrow muted-eyebrow">SAY HELLO</div>
                  <h2 id="dialog-title">Message {listing.seller}</h2>
                  <p className="dialog-context">About: {listing.title}</p>
                  <textarea
                    aria-label="Your message"
                    defaultValue={`Hi ${listing.seller.split(' ')[0]}, is this still available?`}
                    rows="4"
                  />
                  <button
                    type="button"
                    className="dark-button full-button"
                    onClick={() => setSent(true)}
                  >
                    Send message <ArrowRight size={16} />
                  </button>
                </>
              )
            ) : (
              <>
                <div className="eyebrow muted-eyebrow">KEEP CAMPUS KIND</div>
                <h2 id="dialog-title">Report this listing</h2>
                {sent ? (
                  <p>Thanks. Our team will review this listing.</p>
                ) : (
                  <>
                    <p className="dialog-context">Choose a reason so our team can take a look.</p>
                    <select aria-label="Report reason">
                      <option>Scam</option>
                      <option>Fake product</option>
                      <option>Incorrect information</option>
                      <option>Inappropriate content</option>
                      <option>Duplicate listing</option>
                      <option>Other</option>
                    </select>
                    <button
                      type="button"
                      className="dark-button full-button"
                      onClick={() => setSent(true)}
                    >
                      Submit report
                    </button>
                  </>
                )}
              </>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

function FavoritesPage({ listings, favorites, toggleFavorite, onShare }) {
  const savedListings = listings.filter((item) => favorites.includes(item.id))
  return (
    <main className="page-shell">
      <div className="page-title-row">
        <div>
          <div className="eyebrow muted-eyebrow">YOUR SHORTLIST</div>
          <h1>
            Saved <em>for later.</em>
          </h1>
          <p>All the good finds you want to come back to.</p>
        </div>
      </div>
      <ListingGrid
        items={savedListings}
        favorites={favorites}
        toggleFavorite={toggleFavorite}
        onShare={onShare}
      />
      <Footer />
    </main>
  )
}

function SellPage({ onCreate, token, user }) {
  const navigate = useNavigate()
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [categoriesList, setCategoriesList] = useState(
    categories.slice(1).map(({ name }) => ({ id: name, name }))
  )
  const [campusList, setCampusList] = useState(
    ['Main Campus', 'Kikuyu Campus', 'Chiromo Campus'].map((name) => ({ id: name, name }))
  )
  const [categoryId, setCategoryId] = useState('Electronics')

  useEffect(() => {
    if (!token) return
    Promise.all([apiRequest('/categories/'), apiRequest(`/campuses/?university=${user?.university || ''}`)])
      .then(([categoryResponse, campusResponse]) => {
        const availableCategories = apiResults(categoryResponse)
        const availableCampuses = apiResults(campusResponse)
        if (availableCategories.length) {
          setCategoriesList(availableCategories)
          setCategoryId(String(availableCategories[0].id))
        }
        if (availableCampuses.length) setCampusList(availableCampuses)
      })
      .catch((requestError) => setError(requestError.message))
  }, [token, user?.university])

  const selectedCategory = categoriesList.find((item) => String(item.id) === categoryId)

  const submit = async (event) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    const photos = data.getAll('images').filter((file) => file.size)
    if (
      photos.length > 5 ||
      photos.some((file) => file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    ) {
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

  return (
    <main className="page-shell sell-page">
      <Link to="/browse" className="back-link">
        Back to marketplace
      </Link>
      <div className="sell-heading">
        <div className="eyebrow muted-eyebrow">PASS IT ON</div>
        <h1>
          List something <em>good.</em>
        </h1>
        <p>Reach students at your campus. No fees, no fuss.</p>
      </div>
      <form className="sell-form" onSubmit={submit}>
        <div className="form-main">
          <label className="field-label">
            What are you listing?
            <input name="title" required placeholder="e.g. Lenovo ThinkPad X1 Carbon" maxLength="90" />
          </label>
          <div className="form-row">
            <label className="field-label">
              Category
              <select name="category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
                {categoriesList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Condition
              <select name="condition">
                <option value="new">New</option>
                <option value="like_new">Like New</option>
                <option value="used_good">Used - Good</option>
                <option value="used_fair">Used - Fair</option>
              </select>
            </label>
          </div>
          <label className="field-label">
            Description
            <textarea
              name="description"
              required
              rows="5"
              placeholder="Share the details a fellow student should know..."
              maxLength="1200"
            />
          </label>
          {selectedCategory?.name === 'Services' && (
            <label className="field-label">
              Availability
              <input name="availability" required placeholder="e.g. Weekdays after 3pm" />
            </label>
          )}
          <div className="form-row">
            <label className="field-label">
              Price <span className="field-hint">in Kenyan shillings</span>
              <div className="price-input">
                <span>KSh</span>
                <input name="price" type="number" required min="1" placeholder="0" />
              </div>
            </label>
            <label className="field-label">
              Campus
              <select name="campus">
                {campusList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="field-label">
            Meet-up spot <span className="field-hint">optional</span>
            <input name="location" placeholder="e.g. Main library entrance" />
          </label>
        </div>
        <div className="form-aside">
          <label className="field-label">
            Photos <span className="field-hint">optional, up to 5</span>
            <div className="upload-zone">
              {preview ? (
                <img src={preview} alt="Listing preview" />
              ) : (
                <>
                  <span className="upload-icon">+</span>
                  <strong>Add photos</strong>
                  <span>JPG, PNG or WebP, up to 5MB each</span>
                </>
              )}
              <input
                aria-label="Upload listing photos"
                name="images"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                multiple
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (file && file.size <= 5 * 1024 * 1024) setPreview(URL.createObjectURL(file))
                  else if (file) setError('Choose an image smaller than 5MB.')
                }}
              />
            </div>
          </label>
          <div className="safety-note">
            <ShieldCheck size={18} />
            <span>
              <strong>Meet safely</strong>
              Choose a busy, public place on campus and bring a friend if you can.
            </span>
          </div>
        </div>
        <div className="form-submit">
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <button type="submit" className="dark-button">
            Publish listing <ArrowRight size={17} />
          </button>
          <span>Keep our campus community respectful.</span>
        </div>
      </form>
      <Footer />
    </main>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <Link className="brand footer-brand" to="/">
        <span className="brand-mark">cm<span>.</span></span>
        <span className="brand-name">campus<span>market</span></span>
      </Link>
      <span>Made for the people you pass between lectures.</span>
      <span>Kenya / KSh</span>
    </footer>
  )
}

function AppShell() {
  const location = useLocation()
  const [query, setQuery] = useState(new URLSearchParams(window.location.search).get('q') ?? '')
  const [listings, setListings] = useState(() => readSaved('campus-market-listings', starterListings))
  const [favorites, setFavorites] = useState(() => readSaved('campus-market-favorites', []))
  const [accessToken, setAccessToken] = useState(() => sessionStorage.getItem('campus-market-access') || '')
  const [user, setUser] = useState(() => readSaved('campus-market-user', null))
  const [seasonalBanners, setSeasonalBanners] = useState(starterSeasonalBanners)
  const [selectedSeason, setSelectedSeason] = useState('semester_start')
  const [wantedPosts, setWantedPosts] = useState(() => readSaved('campus-market-wanted', starterWantedPosts))
  const [shareListing, setShareListing] = useState(null)
  const [campusList, setCampusList] = useState([
    { id: '1', name: 'Main Campus' },
    { id: '2', name: 'Chiromo Campus' },
    { id: '3', name: 'Kikuyu Campus' },
  ])
  const [categoriesList, setCategoriesList] = useState(
    categories.slice(1).map((c, i) => ({ id: String(i + 1), name: c.name }))
  )
  const [activeMessageTarget, setActiveMessageTarget] = useState(null)

  // Fetch remote listings
  useEffect(() => {
    let active = true
    const searchTerm = new URLSearchParams(location.search).get('q')
    const path = searchTerm ? `/listings/?search=${encodeURIComponent(searchTerm)}` : '/listings/'
    apiRequest(path)
      .then((payload) => {
        const remoteListings = apiResults(payload).map(mapApiListing)
        if (active && remoteListings.length) {
          setListings((current) => [...remoteListings, ...current.filter((item) => !item._api)])
        }
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [location.pathname, location.search])

  // Fetch seasonal banners
  useEffect(() => {
    getActiveSeasonalBanners()
      .then((banners) => {
        const results = apiResults(banners)
        if (results.length) {
          setSeasonalBanners(results)
          setSelectedSeason(results[0].season_type)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch wanted posts
  useEffect(() => {
    getWantedPosts()
      .then((payload) => {
        const remote = apiResults(payload)
        if (remote.length) {
          setWantedPosts(remote)
        }
      })
      .catch(() => {})
  }, [])

  // Fetch campuses and categories
  useEffect(() => {
    Promise.all([apiRequest('/categories/'), apiRequest('/campuses/')])
      .then(([catRes, campRes]) => {
        const cats = apiResults(catRes)
        const camps = apiResults(campRes)
        if (cats.length) setCategoriesList(cats)
        if (camps.length) setCampusList(camps)
      })
      .catch(() => {})
  }, [])

  // User auth profile
  useEffect(() => {
    if (!accessToken || user) return
    apiRequest('/auth/me/', { token: accessToken })
      .then((profile) => {
        setUser(profile)
        sessionStorage.setItem('campus-market-user', JSON.stringify(profile))
      })
      .catch(() => {
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
    if (refresh) {
      await apiRequest('/auth/logout/', {
        method: 'POST',
        token: accessToken,
        body: { refresh },
      }).catch(() => {})
    }
    sessionStorage.removeItem('campus-market-access')
    sessionStorage.removeItem('campus-market-refresh')
    sessionStorage.removeItem('campus-market-user')
    setAccessToken('')
    setUser(null)
  }

  const toggleFavorite = (id) =>
    setFavorites((current) => {
      const next = current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
      localStorage.setItem('campus-market-favorites', JSON.stringify(next))
      return next
    })

  const handleBoostListing = async (listingId) => {
    if (accessToken) {
      const res = await boostListing(listingId, accessToken)
      setListings((current) =>
        current.map((item) =>
          String(item.id) === String(listingId)
            ? {
                ...item,
                is_boosted: true,
                boost_expires_at: res.boost_expires_at,
                boosted_at: res.listing?.boosted_at,
              }
            : item
        )
      )
      return res
    }
    // Demo fallback for local state
    const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
    setListings((current) =>
      current.map((item) =>
        String(item.id) === String(listingId)
          ? { ...item, is_boosted: true, boost_expires_at: expiresAt }
          : item
      )
    )
    return { boost_expires_at: expiresAt }
  }

  const createListing = async (data) => {
    if (accessToken) {
      const body = new FormData()
      Object.entries(data).forEach(([key, value]) => {
        if (key !== 'images' && key !== 'category_name' && key !== 'campus_name' && value !== '') {
          body.append(key, value)
        }
      })
      data.images.forEach((image) => body.append('images', image))
      const created = await apiRequest('/listings/', { method: 'POST', token: accessToken, body })
      const listing = mapApiListing(created)
      setListings((current) => [listing, ...current])
      return
    }
    const localListing = {
      ...data,
      id: String(Date.now()),
      seller: 'You',
      posted: 'Just now',
      image: data.images[0]
        ? URL.createObjectURL(data.images[0])
        : 'https://images.unsplash.com/photo-1494438639946-1ebd1d20bf85?auto=format&fit=crop&w=900&q=85',
    }
    delete localListing.images
    setListings((current) => {
      const next = [localListing, ...current]
      localStorage.setItem('campus-market-listings', JSON.stringify(next))
      return next
    })
  }

  return (
    <>
      <Header
        query={query}
        setQuery={setQuery}
        favoritesCount={favorites.length}
        user={user}
        onLogout={logout}
      />
      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              listings={listings}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              query={query}
              setQuery={setQuery}
              seasonalBanners={seasonalBanners}
              selectedSeason={selectedSeason}
              setSelectedSeason={setSelectedSeason}
              wantedPosts={wantedPosts}
              onShare={(item) => setShareListing(item)}
            />
          }
        />
        <Route
          path="/browse"
          element={
            <BrowsePage
              listings={listings}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              query={query}
              setQuery={setQuery}
              onShare={(item) => setShareListing(item)}
            />
          }
        />
        <Route
          path="/listing/:id"
          element={
            <DetailsPage
              listings={listings}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onShare={(item) => setShareListing(item)}
              onBoost={handleBoostListing}
              token={accessToken}
              user={user}
            />
          }
        />
        <Route
          path="/wanted"
          element={
            <WantedPage
              wantedPosts={wantedPosts}
              setWantedPosts={setWantedPosts}
              user={user}
              token={accessToken}
              campusList={campusList}
              categoriesList={categoriesList}
              onOpenMessage={(post) => setActiveMessageTarget(post)}
            />
          }
        />
        <Route
          path="/favorites"
          element={
            <FavoritesPage
              listings={listings}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              onShare={(item) => setShareListing(item)}
            />
          }
        />
        <Route path="/sell" element={<SellPage onCreate={createListing} token={accessToken} user={user} />} />
        <Route path="/account" element={<AuthPage onAuthenticated={authenticate} />} />
        <Route
          path="*"
          element={
            <main className="page-shell">
              <h1>Page not found</h1>
              <Link to="/browse" className="text-link">
                Browse listings <ArrowRight size={15} />
              </Link>
            </main>
          }
        />
      </Routes>

      {/* Share Modal with Open Graph Previews */}
      {shareListing && (
        <ShareModal listing={shareListing} onClose={() => setShareListing(null)} />
      )}

      {/* Contact Buyer Modal */}
      {activeMessageTarget && (
        <div className="modal-backdrop" role="presentation" onClick={() => setActiveMessageTarget(null)}>
          <section
            className="dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="contact-buyer-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="dialog-close icon-button"
              aria-label="Close"
              onClick={() => setActiveMessageTarget(null)}
            >
              <X size={19} />
            </button>
            <div className="eyebrow muted-eyebrow">I HAVE THIS ITEM</div>
            <h2 id="contact-buyer-title">Message {activeMessageTarget.buyer?.full_name || 'Buyer'}</h2>
            <p className="dialog-context">
              Responding to request for: <strong>{activeMessageTarget.title}</strong>
            </p>
            <textarea
              aria-label="Your offer message"
              defaultValue={`Hi ${activeMessageTarget.buyer?.full_name?.split(' ')[0] || 'there'}, I saw your request for "${activeMessageTarget.title}". I have this available on ${activeMessageTarget.campus_name || activeMessageTarget.campus}.`}
              rows={4}
            />
            <button
              type="button"
              className="dark-button full-button"
              onClick={() => {
                alert('Offer sent! The buyer will receive your note.')
                setActiveMessageTarget(null)
              }}
            >
              Send Offer to Buyer <ArrowRight size={16} />
            </button>
          </section>
        </div>
      )}
    </>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
