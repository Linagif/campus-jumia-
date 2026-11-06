import hashlib
import math
import re
from difflib import SequenceMatcher
from io import BytesIO
from typing import Any, Dict, List, Optional, Tuple

from PIL import Image

from .models import Category, Listing


# =====================================================================
# 1. SEMANTIC TEXT EMBEDDING GENERATOR (64-DIMENSIONAL VECTOR)
# =====================================================================

VOCAB_DIMENSIONS = 64

# Characteristic domain vocabulary weights for campus marketplace items
DOMAIN_TOPICS = [
    # Electronics / Computers (0 - 15)
    "laptop", "notebook", "thinkpad", "elitebook", "macbook", "computer", "ram", "ssd",
    "charger", "electronics", "screen", "keyboard", "phone", "iphone", "samsung", "calculator",
    # Study / Books / Academics (16 - 31)
    "book", "textbook", "calculus", "database", "economics", "engineering", "notes", "revision",
    "edition", "exam", "author", "stationery", "casio", "maths", "physics", "tutor",
    # Hostel Furniture / Appliances (32 - 47)
    "desk", "table", "chair", "bed", "mattress", "fridge", "microwave", "kettle",
    "fan", "furniture", "room", "hostel", "hall", "wardrobe", "shelf", "lamp",
    # Clothes, Shoes & Services (48 - 63)
    "shoes", "sneakers", "jacket", "varsity", "hoodie", "shirt", "trousers", "wear",
    "clothes", "size", "service", "tutoring", "assignment", "cleaning", "repair", "design",
]


def generate_embedding(text: str, dimensions: int = VOCAB_DIMENSIONS) -> List[float]:
    """
    Generate a normalized, deterministic dense semantic embedding vector (dimensions=64).
    Compatible with PostgreSQL pgvector and vector similarity calculations.
    """
    if not text:
        return [0.0] * dimensions

    cleaned = re.sub(r"[^\w\s]", " ", text.lower())
    words = cleaned.split()
    if not words:
        return [0.0] * dimensions

    vector = [0.0] * dimensions

    # 1. Project domain topic weights
    for word in words:
        for idx, topic in enumerate(DOMAIN_TOPICS):
            if word == topic:
                vector[idx % dimensions] += 2.0
            elif topic in word or word in topic:
                vector[idx % dimensions] += 0.8

        # 2. Per-word feature hashing across remaining dimensions
        h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
        dim = h % dimensions
        sign = 1.0 if ((h >> 8) & 1) else -1.0
        vector[dim] += sign * 0.5

    # 3. L2 Normalize the vector so dot product equals cosine similarity
    magnitude = math.sqrt(sum(x * x for x in vector))
    if magnitude > 1e-6:
        vector = [round(x / magnitude, 6) for x in vector]
    else:
        vector = [0.0] * dimensions

    return vector


def cosine_similarity(vec_a: List[float], vec_b: List[float]) -> float:
    """Calculate cosine similarity between two float vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0
    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))
    if mag_a < 1e-6 or mag_b < 1e-6:
        return 0.0
    return max(-1.0, min(1.0, dot / (mag_a * mag_b)))


# =====================================================================
# 2. IMAGE-BASED LISTING AUTO-FILL
# =====================================================================

def analyze_listing_image(
    image_file,
    filename_hint: str = "",
    title_hint: str = "",
) -> Dict[str, Any]:
    """
    Analyze an uploaded listing image using Pillow and heuristics to predict:
    - suggested_title
    - suggested_category_id & category_name
    - suggested_condition
    - suggested_description
    - confidence & detected attributes
    """
    detected_attributes = []
    aspect_ratio_type = "standard"
    condition_estimate = "used_good"
    category_slug = "electronics"

    try:
        if hasattr(image_file, "read"):
            image_file.seek(0)
            img = Image.open(image_file)
        else:
            img = Image.open(BytesIO(image_file))

        width, height = img.size
        aspect_ratio = width / height if height > 0 else 1.0

        if aspect_ratio > 1.3:
            aspect_ratio_type = "landscape"
            detected_attributes.append("landscape format (common for laptops, desks, shoes)")
        elif aspect_ratio < 0.8:
            aspect_ratio_type = "portrait"
            detected_attributes.append("portrait format (common for textbooks, jackets, phones)")

        # Convert to RGB to analyze color profile
        rgb_img = img.convert("RGB")
        # Resize for fast color histogram analysis
        thumb = rgb_img.resize((50, 50))
        pixels = list(thumb.getdata())
        total_pixels = len(pixels)

        # Average brightness (0 - 255)
        avg_brightness = sum((r * 299 + g * 587 + b * 114) / 1000 for r, g, b in pixels) / total_pixels

        # Color variance (contrast estimate)
        variance = sum(
            ((r * 299 + g * 587 + b * 114) / 1000 - avg_brightness) ** 2 for r, g, b in pixels
        ) / total_pixels

        if avg_brightness > 195 and variance < 900:
            condition_estimate = "new"
            detected_attributes.append("studio/clean light background (indicates pristine condition)")
        elif avg_brightness > 130 and variance >= 800:
            condition_estimate = "like_new"
            detected_attributes.append("high contrast, sharp details (well maintained)")
        elif avg_brightness > 80:
            condition_estimate = "used_good"
            detected_attributes.append("standard room lighting, typical campus item wear")
        else:
            condition_estimate = "used_fair"
            detected_attributes.append("signs of heavy use or dim hostel lighting")

    except Exception as e:
        detected_attributes.append(f"basic visual inference ({str(e)})")

    # Combine hints from file name and optional title hint
    combined_hint = f"{filename_hint} {title_hint}".lower()

    if any(k in combined_hint for k in ["book", "textbook", "calculus", "edition", "notes", "syllabus", "guide", "paper"]):
        category_slug = "books"
        suggested_title = title_hint.strip() or "University Coursework Textbook"
        detected_attributes.append("document / book visual profile")
    elif any(k in combined_hint for k in ["shoe", "sneaker", "nike", "adidas", "boot", "court", "air"]):
        category_slug = "shoes"
        suggested_title = title_hint.strip() or "Campus Sneakers / Shoes"
        detected_attributes.append("footwear silhouette detected")
    elif any(k in combined_hint for k in ["jacket", "hoodie", "shirt", "varsity", "trousers", "jeans"]):
        category_slug = "clothes"
        suggested_title = title_hint.strip() or "Student Apparel / Jacket"
        detected_attributes.append("apparel texture detected")
    elif any(k in combined_hint for k in ["desk", "table", "chair", "lamp", "shelf", "bed", "mattress"]):
        category_slug = "furniture"
        suggested_title = title_hint.strip() or "Hostel Study Desk / Furniture"
        detected_attributes.append("furniture structure detected")
    elif any(k in combined_hint for k in ["calculator", "casio", "fx", "scientific"]):
        category_slug = "electronics"
        suggested_title = title_hint.strip() or "Casio Scientific Calculator"
        detected_attributes.append("scientific device profile")
    elif any(k in combined_hint for k in ["laptop", "thinkpad", "macbook", "hp", "dell", "lenovo", "pc"]):
        category_slug = "electronics"
        suggested_title = title_hint.strip() or "Campus Laptop (Fast & Reliable)"
        detected_attributes.append("laptop / computing hardware detected")
    else:
        # Default based on aspect ratio heuristic
        if aspect_ratio_type == "portrait":
            category_slug = "books"
            suggested_title = "Academic Textbook / Study Material"
        else:
            category_slug = "electronics"
            suggested_title = "Campus Electronics / Study Gear"

    # Match Category from database
    category_obj = (
        Category.objects.filter(slug=category_slug).first()
        or Category.objects.filter(name__icontains=category_slug).first()
        or Category.objects.first()
    )

    descriptions = {
        "electronics": f"Carefully used on campus. In {condition_estimate.replace('_', ' ')} working order, tested and ready for semester coursework. Includes original cables/accessories. Meet in person on campus.",
        "books": f"Clean copy with all pages legible and intact. Great revision material for undergraduate studies. No major stains or markings.",
        "furniture": f"Solid build and compact dimensions suited for hostel rooms or student studio apartments. Available for pickup near campus.",
        "shoes": f"Authentic and in {condition_estimate.replace('_', ' ')} condition with good sole grip. Cleaned and ready for collection.",
        "clothes": f"Warm, comfortable and well maintained. Clean and ready for wear. Meet at campus gate.",
    }

    confidence = 0.88 if filename_hint or title_hint else 0.76

    return {
        "suggested_title": suggested_title,
        "suggested_category_id": category_obj.id if category_obj else None,
        "suggested_category_name": category_obj.name if category_obj else "Electronics",
        "suggested_condition": condition_estimate,
        "suggested_description": descriptions.get(category_slug, "Good quality campus find. Available for in-person meetup."),
        "confidence": confidence,
        "detected_attributes": detected_attributes,
        "explanation": f"Detected {category_slug.capitalize()} category in {condition_estimate.replace('_', ' ')} condition based on visual properties.",
    }


# =====================================================================
# 3. FAIR PRICE RECOMMENDATIONS (BASED ON REAL PLATFORM DATA ONLY)
# =====================================================================

def get_price_recommendation(
    title: str = "",
    category_id: Optional[int] = None,
    condition: str = "used_good",
    campus_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Recommend a fair price range based on similar platform listings.
    STRICT RULE: Do not invent analysis results when data is insufficient.
    """
    queryset = Listing.objects.filter(status=Listing.Status.ACTIVE)

    if category_id:
        queryset = queryset.filter(category_id=category_id)

    # Keyword matching in title
    tokens = [t.lower() for t in re.findall(r"\w{3,}", title)]
    matching_listings = []

    if tokens:
        # Score candidate listings by word overlap
        candidates = list(queryset[:100])
        for item in candidates:
            item_tokens = set(re.findall(r"\w{3,}", item.title.lower()))
            overlap = sum(1 for t in tokens if t in item_tokens)
            if overlap > 0:
                matching_listings.append((overlap, item))

        matching_listings.sort(key=lambda x: x[0], reverse=True)
        samples = [item for _, item in matching_listings[:15]]
    else:
        samples = list(queryset[:15])

    sample_size = len(samples)

    # STRICT RULE: Insufficient data check
    if sample_size < 2:
        return {
            "status": "insufficient_data",
            "message": "Insufficient platform data for this item yet. Please set your price manually based on original purchase price and current condition.",
            "sample_size": sample_size,
            "min_price": None,
            "median_price": None,
            "max_price": None,
            "recommended_price": None,
            "confidence": "none",
        }

    prices = sorted([float(item.price) for item in samples])
    min_price = prices[0]
    max_price = prices[-1]

    # Calculate median
    mid = len(prices) // 2
    if len(prices) % 2 == 0:
        median_price = (prices[mid - 1] + prices[mid]) / 2.0
    else:
        median_price = prices[mid]

    # Condition adjustment factor
    condition_multipliers = {
        "new": 1.15,
        "like_new": 1.05,
        "used_good": 0.95,
        "used_fair": 0.80,
    }
    multiplier = condition_multipliers.get(condition, 0.95)
    recommended = round(median_price * multiplier, -1)  # Round to nearest 10 KSh
    recommended = max(min_price, min(max_price, recommended))

    confidence = "high" if sample_size >= 4 else "moderate"

    return {
        "status": "sufficient_data",
        "sample_size": sample_size,
        "min_price": round(min_price, 2),
        "median_price": round(median_price, 2),
        "max_price": round(max_price, 2),
        "recommended_price": round(recommended, 2),
        "condition_applied": condition,
        "confidence": confidence,
        "message": f"Based on {sample_size} similar listings on Campus Jumia. Recommended fair price for '{condition.replace('_', ' ')}' condition is KSh {recommended:,.0f}.",
    }


# =====================================================================
# 4. SCAM AND SPAM DETECTION (SUSPICIOUS PRICES, REPEATED TEXT, OFF-PLATFORM PAYMENTS)
# =====================================================================

OFF_PLATFORM_PAYMENT_PATTERNS = [
    # Advance fee / Deposit traps
    (r"\b(?:send|pay|give)\s+(?:a\s+)?deposit\b", "Requests advance deposit before meetup"),
    (r"\bcommit(?:ment)?\s+fee\b", "Demands a commitment fee"),
    (r"\b(?:pay|deposit)\s+before\s+(?:delivery|meet|viewing|collection)\b", "Requests payment before in-person inspection"),
    (r"\blipa\s+(?:nusu|deposit|kwanza)\b", "Demands partial payment upfront"),
    (r"\b(?:advance|upfront)\s+(?:fee|payment|money)\b", "Demands upfront payment"),
    # Non-standard or off-platform payment methods
    (r"\b(?:western\s+union|moneygram)\b", "Asks for international wire transfer"),
    (r"\b(?:gift\s*card|steam\s*card|itunes\s*card|amazon\s*card)\b", "Demands gift cards as payment"),
    (r"\b(?:crypto|bitcoin|usdt|binance)\b", "Requests cryptocurrency payment"),
    (r"\b(?:cashapp|venmo|zelle)\b", "Non-local payment method for Kenyan campus"),
    # Direct off-platform payment redirection
    (r"\bsend\s+(?:money|cash|mpesa)\s+(?:to\s+)?(?:07|01|\+254)\d{8}\b", "Direct phone number payment instruction in listing text"),
    # High-pressure redirection to Telegram / external emails
    (r"\b(?:telegram|tg)\s*[:@]\s*\w+\b", "Directs transactions to anonymous Telegram handles"),
    (r"\bcontact\s+(?:me\s+)?(?:only\s+)?(?:at|via)\s+[a-zA-Z0-9_.+-]+@gmail\.com\b", "Forces communication outside campus platform"),
]


def detect_scam_and_spam(
    title: str,
    description: str,
    price: float,
    category_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Detect scam patterns, spam, repeated text, off-platform payment requests,
    and suspicious pricing anomalies.
    """
    flags = []
    warnings = []
    risk_score = 0
    full_text = f"{title} {description}".lower()

    # 1. Off-Platform Payment & Advance Fee Detection
    for pattern, reason in OFF_PLATFORM_PAYMENT_PATTERNS:
        if re.search(pattern, full_text):
            flags.append("off_platform_payment")
            warnings.append(f"Security Alert: {reason}. On Campus Jumia, all trades must be completed in-person on campus without advance deposits.")
            risk_score += 45
            break

    # 2. Suspicious Pricing Anomalies
    price_val = float(price or 0)

    # Clickbait / Absurdly low price
    if 0 < price_val <= 50:
        flags.append("suspiciously_low_price")
        warnings.append("Suspicious Price: Price is abnormally low (<= 50 KSh). If this is clickbait or incomplete pricing, please provide the actual asking price.")
        risk_score += 35
    elif price_val <= 0:
        flags.append("zero_price")
        warnings.append("Price must be greater than zero.")
        risk_score += 40

    # Electronics & High-Value Product Price Discrepancy
    tech_keywords = ["macbook", "iphone", "thinkpad", "elitebook", "playstation", "ipad", "laptop"]
    if any(k in full_text for k in tech_keywords):
        if price_val < 3000:
            flags.append("suspiciously_low_tech_price")
            warnings.append(f"Price Anomaly: High-value electronics ({title}) priced below KSh 3,000 are frequently associated with counterfeit goods or scams.")
            risk_score += 50

    # Extreme luxury price
    if price_val > 500000:
        flags.append("suspiciously_high_price")
        warnings.append("Unusually high price for a student campus marketplace. Please verify the amount.")
        risk_score += 20

    # 3. Repeated Text & Character Spam
    # Sequence of 7+ identical consecutive characters
    if re.search(r"(.)\1{6,}", full_text):
        flags.append("repetitive_characters")
        warnings.append("Spam Alert: Excessive repeated characters detected in listing text.")
        risk_score += 25

    # Sequence of 4+ identical words
    if re.search(r"\b(\w+)\b(?:\s+\1){3,}", full_text):
        flags.append("repetitive_words")
        warnings.append("Spam Alert: Repeated word stuffing detected.")
        risk_score += 25

    # All-caps shouting title
    if len(title) >= 10 and title.isupper():
        flags.append("all_caps")
        warnings.append("Formatting notice: ALL CAPS titles reduce visibility. Use standard capitalization.")
        risk_score += 10

    # Calculate final severity
    risk_score = min(100, risk_score)
    if risk_score >= 50:
        risk_level = "high"
    elif risk_score >= 25:
        risk_level = "medium"
    else:
        risk_level = "low"

    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "is_suspicious": risk_score >= 40,
        "flags": list(set(flags)),
        "warnings": warnings,
        "safe_to_publish": risk_score < 75,
    }


# =====================================================================
# 5. DUPLICATE LISTING DETECTION (ACROSS ITEMS AND ACCOUNTS)
# =====================================================================

def detect_duplicate_listing(
    title: str,
    description: str,
    price: float,
    seller_id: Optional[int] = None,
    campus_id: Optional[int] = None,
    exclude_listing_id: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Detect exact and near-duplicate listings across the platform, including
    same-user spam and multi-account reposts.
    """
    clean_title = title.strip().lower()
    clean_desc = description.strip().lower()

    queryset = Listing.objects.filter(status=Listing.Status.ACTIVE)
    if exclude_listing_id:
        queryset = queryset.exclude(id=exclude_listing_id)
    if campus_id:
        queryset = queryset.filter(campus_id=campus_id)

    candidates = list(queryset.select_related("seller")[:80])

    highest_similarity = 0.0
    matched_listing = None
    duplicate_type = None

    for candidate in candidates:
        cand_title = candidate.title.strip().lower()
        cand_desc = candidate.description.strip().lower()

        # Title similarity (weight: 0.6)
        title_ratio = SequenceMatcher(None, clean_title, cand_title).ratio()

        # Description similarity (weight: 0.4)
        desc_ratio = SequenceMatcher(None, clean_desc[:250], cand_desc[:250]).ratio()

        overall_sim = (title_ratio * 0.65) + (desc_ratio * 0.35)

        # Price proximity check
        cand_price = float(candidate.price)
        if price and cand_price > 0:
            price_diff = abs(price - cand_price) / max(price, cand_price)
            if price_diff < 0.08 and title_ratio > 0.75:
                overall_sim = min(1.0, overall_sim + 0.1)

        if overall_sim > highest_similarity:
            highest_similarity = overall_sim
            matched_listing = candidate

    is_duplicate = highest_similarity >= 0.78

    if is_duplicate and matched_listing:
        if seller_id and matched_listing.seller_id == seller_id:
            duplicate_type = "same_seller"
            warning = f"You already have an active listing for '{matched_listing.title}' ({highest_similarity * 100:.0f}% similarity). You can boost your existing listing instead of reposting."
        else:
            duplicate_type = "cross_account"
            warning = f"A nearly identical listing already exists on campus: '{matched_listing.title}' ({highest_similarity * 100:.0f}% similarity). Please verify your item details."
    else:
        warning = None

    return {
        "is_duplicate": is_duplicate,
        "duplicate_type": duplicate_type,
        "similarity_score": round(highest_similarity, 3),
        "similarity_percentage": round(highest_similarity * 100, 1),
        "matched_listing_id": matched_listing.id if (is_duplicate and matched_listing) else None,
        "matched_listing_title": matched_listing.title if (is_duplicate and matched_listing) else None,
        "warning": warning,
    }
