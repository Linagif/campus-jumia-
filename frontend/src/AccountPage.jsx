import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Eye,
  Package,
  ShoppingBag,
  Trash2,
  User,
  Zap,
} from 'lucide-react'
import { apiRequest, deleteListingApi, getMyListings, mapApiListing, markListingSold } from './api'

const money = (value) => `KSh ${Number(value || 0).toLocaleString('en-KE')}`

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 86400 * 30) return `${Math.floor(diff / 86400)}d ago`
  return new Date(dateStr).toLocaleDateString()
}

function SellerListingCard({ listing, token, onDeleted, onMarkSold }) {
  const [confirming, setConfirming] = useState(false)
  const [working, setWorking] = useState(false)
  const [toast, setToast] = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const handleDelete = async () => {
    if (!confirming) { setConfirming(true); return }
    setWorking(true)
    try {
      await deleteListingApi(listing.id, token)
      onDeleted(listing.id)
    } catch (err) {
      showToast(err.message || 'Could not delete listing.')
    } finally {
      setWorking(false)
      setConfirming(false)
    }
  }

  const handleMarkSold = async () => {
    setWorking(true)
    try {
      await markListingSold(listing.id, token)
      onMarkSold(listing.id)
      showToast('Listing marked as sold!')
    } catch (err) {
      showToast(err.message || 'Could not update listing.')
    } finally {
      setWorking(false)
    }
  }

  const isSold = listing.status === 'sold'

  return (
    <article className={`seller-listing-card ${isSold ? 'is-sold-card' : ''}`}>
      {toast && <div className="card-toast">{toast}</div>}
      <Link to={`/listing/${listing.id}`} className="seller-card-image-link">
        <img
          src={listing.image}
          alt={listing.title}
          className="seller-card-img"
          loading="lazy"
        />
        {listing.is_boosted && !isSold && (
          <span className="boosted-badge">
            <Zap size={11} fill="currentColor" /> Boosted
          </span>
        )}
        {isSold && <span className="sold-overlay-badge">Sold</span>}
      </Link>
      <div className="seller-card-info">
        <div className="seller-card-meta">
          <span className="seller-card-cat">{listing.category}</span>
          <span className="dot" />
          <span className="seller-card-time">{timeAgo(listing.created_at)}</span>
        </div>
        <Link to={`/listing/${listing.id}`} className="seller-card-title">
          {listing.title}
        </Link>
        <strong className="seller-card-price">{money(listing.price)}</strong>
        <div className="seller-card-actions">
          <Link to={`/listing/${listing.id}`} className="seller-action-btn view-btn" title="View">
            <Eye size={14} /> View
          </Link>
          {!isSold && (
            <button
              type="button"
              className="seller-action-btn sold-btn"
              onClick={handleMarkSold}
              disabled={working}
              title="Mark as sold"
            >
              <Check size={14} /> Sold
            </button>
          )}
          <button
            type="button"
            className={`seller-action-btn delete-btn ${confirming ? 'confirm-delete' : ''}`}
            onClick={handleDelete}
            disabled={working}
            title={confirming ? 'Click again to confirm deletion' : 'Delete'}
          >
            <Trash2 size={14} /> {confirming ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </div>
    </article>
  )
}

export default function AccountPage({ user, token, onLogout }) {
  const [tab, setTab] = useState('listings')
  const [myListings, setMyListings] = useState([])
  const [loadingListings, setLoadingListings] = useState(true)
  const [profileMsg, setProfileMsg] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!token) { setLoadingListings(false); return }
    getMyListings(token)
      .then((data) => {
        const mapped = Array.isArray(data) ? data.map(mapApiListing) : []
        setMyListings(mapped)
      })
      .catch(() => {})
      .finally(() => setLoadingListings(false))
  }, [token])

  if (!user || !token) {
    return (
      <main className="page-shell">
        <div className="empty-state">
          <span className="empty-icon"><User size={24} /></span>
          <h3>Sign in to view your account</h3>
          <Link to="/account?mode=login" className="text-link">
            Sign in <ArrowRight size={15} />
          </Link>
        </div>
      </main>
    )
  }

  const handleProfileSave = async (event) => {
    event.preventDefault()
    setSaving(true)
    setProfileMsg('')
    const form = new FormData(event.currentTarget)
    try {
      await apiRequest('/auth/me/', {
        method: 'PATCH',
        token,
        body: { full_name: form.get('full_name') },
      })
      setProfileMsg('Profile updated!')
    } catch (err) {
      setProfileMsg(err.message || 'Could not update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleted = (id) =>
    setMyListings((current) => current.filter((item) => String(item.id) !== String(id)))

  const handleMarkSold = (id) =>
    setMyListings((current) =>
      current.map((item) => (String(item.id) === String(id) ? { ...item, status: 'sold' } : item))
    )

  const activeListings = myListings.filter((l) => l.status !== 'sold')
  const soldListings = myListings.filter((l) => l.status === 'sold')

  return (
    <main className="page-shell account-page">
      {/* Profile header */}
      <div className="account-header">
        <div className="account-avatar-lg">
          {(user.full_name || 'S').split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()}
        </div>
        <div className="account-header-info">
          <div className="eyebrow muted-eyebrow">YOUR CAMPUS ACCOUNT</div>
          <h1>{user.full_name || 'Campus Student'}</h1>
          <p className="account-email">{user.email}</p>
          {user.campus_name && (
            <span className="account-campus-tag">{user.campus_name}</span>
          )}
        </div>
        <div className="account-stats">
          <div className="account-stat">
            <strong>{activeListings.length}</strong>
            <span>Active listings</span>
          </div>
          <div className="account-stat">
            <strong>{soldListings.length}</strong>
            <span>Items sold</span>
          </div>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="account-tabs" role="tablist">
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'listings'}
          className={`account-tab ${tab === 'listings' ? 'active' : ''}`}
          onClick={() => setTab('listings')}
        >
          <Package size={16} /> My Listings
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === 'profile'}
          className={`account-tab ${tab === 'profile' ? 'active' : ''}`}
          onClick={() => setTab('profile')}
        >
          <User size={16} /> Profile
        </button>
      </div>

      {/* Listings tab */}
      {tab === 'listings' && (
        <section className="account-section">
          <div className="account-section-header">
            <h2>My Listings</h2>
            <Link to="/sell" className="cta-button account-sell-btn">
              <span>+</span> New Listing
            </Link>
          </div>

          {loadingListings && (
            <div className="listing-grid">
              {[1, 2, 3].map((n) => (
                <div key={n} className="listing-card skeleton-card" />
              ))}
            </div>
          )}

          {!loadingListings && myListings.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon"><ShoppingBag size={22} /></span>
              <h3>No listings yet</h3>
              <p>Start selling to your campus community — it only takes a minute.</p>
              <Link to="/sell" className="text-link">
                Create a listing <ArrowRight size={15} />
              </Link>
            </div>
          )}

          {!loadingListings && myListings.length > 0 && (
            <>
              {activeListings.length > 0 && (
                <>
                  <h3 className="listing-subheading">Active ({activeListings.length})</h3>
                  <div className="seller-listings-grid">
                    {activeListings.map((listing) => (
                      <SellerListingCard
                        key={listing.id}
                        listing={listing}
                        token={token}
                        onDeleted={handleDeleted}
                        onMarkSold={handleMarkSold}
                      />
                    ))}
                  </div>
                </>
              )}
              {soldListings.length > 0 && (
                <>
                  <h3 className="listing-subheading sold-subheading">Sold ({soldListings.length})</h3>
                  <div className="seller-listings-grid">
                    {soldListings.map((listing) => (
                      <SellerListingCard
                        key={listing.id}
                        listing={listing}
                        token={token}
                        onDeleted={handleDeleted}
                        onMarkSold={handleMarkSold}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </section>
      )}

      {/* Profile tab */}
      {tab === 'profile' && (
        <section className="account-section profile-section">
          <h2>Profile Settings</h2>
          <form className="profile-form" onSubmit={handleProfileSave}>
            <label className="field-label">
              Full name
              <input
                name="full_name"
                defaultValue={user.full_name || ''}
                required
                maxLength={160}
                placeholder="Your full name"
              />
            </label>
            <label className="field-label">
              Email address
              <input value={user.email || ''} readOnly disabled />
            </label>
            {user.university_name && (
              <label className="field-label">
                University
                <input value={user.university_name} readOnly disabled />
              </label>
            )}
            {user.campus_name && (
              <label className="field-label">
                Campus
                <input value={user.campus_name} readOnly disabled />
              </label>
            )}
            {profileMsg && (
              <p className={profileMsg.includes('updated') ? 'form-success' : 'form-error'}>
                {profileMsg}
              </p>
            )}
            <div className="profile-actions">
              <button type="submit" className="dark-button" disabled={saving}>
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button
                type="button"
                className="btn-secondary logout-btn"
                onClick={onLogout}
              >
                Sign out
              </button>
            </div>
          </form>
        </section>
      )}
    </main>
  )
}
