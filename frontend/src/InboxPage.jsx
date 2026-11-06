import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  CheckCheck,
  Inbox,
  MessageCircle,
  Send,
} from 'lucide-react'
import { apiResults, getConversations, getMessages, sendMessage } from './api'

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000
  if (diff < 60) return 'Just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Avatar({ name, size = 36 }) {
  const initials = (name || 'Student')
    .split(' ')
    .map((p) => p[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
  return (
    <div
      className="msg-avatar"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}

function ConversationPanel({ conv, currentUser }) {
  const otherPerson =
    conv.buyer_info?.id === currentUser?.id ? conv.seller_info : conv.buyer_info
  const listingInfo = conv.listing_info
  const latestMsg = conv.latest_message

  return (
    <div className="conv-item-inner">
      <Avatar name={otherPerson?.full_name} />
      <div className="conv-body">
        <div className="conv-top-row">
          <span className="conv-name">{otherPerson?.full_name || 'Student'}</span>
          {conv.unread_count > 0 && (
            <span className="unread-badge">{conv.unread_count}</span>
          )}
          <span className="conv-time">{timeAgo(conv.updated_at)}</span>
        </div>
        {listingInfo && (
          <span className="conv-listing-title">
            re: {listingInfo.title}
          </span>
        )}
        {latestMsg && (
          <p className="conv-preview">
            {latestMsg.sender?.id === currentUser?.id ? (
              <span className="you-label">You: </span>
            ) : null}
            {latestMsg.body?.slice(0, 70)}
            {latestMsg.body?.length > 70 ? '…' : ''}
          </p>
        )}
      </div>
    </div>
  )
}

function ChatThread({ conversation, currentUser, token }) {
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)

  const otherPerson =
    conversation.buyer_info?.id === currentUser?.id
      ? conversation.seller_info
      : conversation.buyer_info

  useEffect(() => {
    if (!conversation?.id || !token) return
    getMessages(conversation.id, token)
      .then((data) => setMessages(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [conversation?.id, token])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (event) => {
    event.preventDefault()
    if (!draft.trim() || sending) return
    setSending(true)
    try {
      const sent = await sendMessage(conversation.id, draft.trim(), token)
      setMessages((current) => [...current, sent])
      setDraft('')
    } catch {
      // ignore
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chat-thread">
      {/* Header */}
      <div className="chat-header">
        <Avatar name={otherPerson?.full_name} size={38} />
        <div className="chat-header-info">
          <strong>{otherPerson?.full_name || 'Student'}</strong>
          {conversation.listing_info && (
            <Link
              to={`/listing/${conversation.listing_info.id}`}
              className="chat-listing-link"
            >
              {conversation.listing_info.title}
            </Link>
          )}
        </div>
      </div>

      {/* Message bubbles */}
      <div className="chat-messages" role="log" aria-live="polite">
        {messages.length === 0 && (
          <div className="chat-empty">
            <MessageCircle size={28} />
            <p>No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const isMine = msg.sender?.id === currentUser?.id
          return (
            <div key={msg.id} className={`bubble-row ${isMine ? 'mine' : 'theirs'}`}>
              {!isMine && <Avatar name={msg.sender?.full_name} size={28} />}
              <div className="bubble-wrap">
                <div className={`bubble ${isMine ? 'bubble-mine' : 'bubble-theirs'}`}>
                  {msg.body}
                </div>
                <div className="bubble-meta">
                  <span>{timeAgo(msg.created_at)}</span>
                  {isMine && (
                    msg.read_at
                      ? <CheckCheck size={13} className="read-tick" />
                      : <Check size={13} className="sent-tick" />
                  )}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Compose */}
      <form className="chat-compose" onSubmit={handleSend}>
        <input
          className="chat-input"
          placeholder="Write a message..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={2000}
          aria-label="Message"
        />
        <button
          type="submit"
          className="chat-send-btn"
          disabled={!draft.trim() || sending}
          aria-label="Send"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  )
}

export default function InboxPage({ user, token }) {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    if (!token) { setLoading(false); return }
    getConversations(token)
      .then((payload) => {
        const convs = apiResults(payload)
        setConversations(convs)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  if (!user || !token) {
    return (
      <main className="page-shell">
        <div className="empty-state">
          <span className="empty-icon"><Inbox size={24} /></span>
          <h3>Sign in to view your inbox</h3>
          <Link to="/account?mode=login" className="text-link">
            Sign in <ArrowRight size={15} />
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="page-shell inbox-page">
      <div className="page-title-row">
        <div>
          <div className="eyebrow muted-eyebrow">YOUR CAMPUS INBOX</div>
          <h1>
            Messages <em>&amp; conversations.</em>
          </h1>
          <p>Chat with buyers and sellers about listings on your campus.</p>
        </div>
      </div>

      <div className="inbox-layout">
        {/* Sidebar: conversation list */}
        <aside className="conv-list">
          {loading && (
            <div className="inbox-loading">
              {[1, 2, 3].map((n) => (
                <div key={n} className="conv-skeleton" />
              ))}
            </div>
          )}
          {!loading && conversations.length === 0 && (
            <div className="empty-state inbox-empty">
              <span className="empty-icon"><MessageCircle size={22} /></span>
              <h3>No conversations yet</h3>
              <p>Message a seller from any listing to get started.</p>
              <Link to="/browse" className="text-link">
                Browse listings <ArrowRight size={15} />
              </Link>
            </div>
          )}
          {conversations.map((conv) => (
            <button
              key={conv.id}
              type="button"
              className={`conv-item ${selected?.id === conv.id ? 'is-selected' : ''}`}
              onClick={() => setSelected(conv)}
            >
              <ConversationPanel conv={conv} currentUser={user} />
            </button>
          ))}
        </aside>

        {/* Main chat area */}
        <div className="chat-area">
          {selected ? (
            <ChatThread
              conversation={selected}
              currentUser={user}
              token={token}
            />
          ) : (
            <div className="chat-placeholder">
              <MessageCircle size={42} strokeWidth={1.4} />
              <h3>Select a conversation</h3>
              <p>Pick a conversation from the list to read and reply.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
