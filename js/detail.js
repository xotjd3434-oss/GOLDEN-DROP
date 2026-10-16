import { supabase, won } from './common.js';

const status = document.querySelector('#detail-status');
const content = document.querySelector('#detail-content');
const imageContainer = document.querySelector('#detail-image');
const actionStatus = document.querySelector('#detail-action-status');
const quantityText = document.querySelector('#cart-quantity');
const minusButton = document.querySelector('#cart-minus');
const plusButton = document.querySelector('#cart-plus');
const wishlistButton = document.querySelector('#wishlist-btn');
const CART_KEY = 'goldenDropCart';
const WISHLIST_KEY = 'goldenDropWishlist';
let activeWhisky = null;

function readList(key) {
  const raw = localStorage.getItem(key);
  if (raw === null) return [];
  const items = JSON.parse(raw);
  if (!Array.isArray(items)) throw new Error('저장된 목록 형식 오류');
  return items.filter((item) => item && item.id != null);
}

function getQuantity(cart) {
  const item = cart.find((entry) => String(entry.id) === String(activeWhisky.id));
  if (!item) return 0;
  const quantity = Number(item.quantity);
  return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
}

function updateQuantity(quantity) {
  quantityText.textContent = `${quantity}개`;
  quantityText.setAttribute('aria-label', `장바구니 수량 ${quantity}개`);
  minusButton.disabled = quantity === 0;
  plusButton.disabled = quantity >= Number.MAX_SAFE_INTEGER;
}

function showActionMessage(message, isError = false) {
  actionStatus.textContent = message;
  actionStatus.classList.toggle('is-error', isError);
}

function updateCartControls() {
  try {
    updateQuantity(getQuantity(readList(CART_KEY)));
  } catch (error) {
    console.error('장바구니 조회 오류:', error);
    quantityText.textContent = '확인 불가';
    quantityText.setAttribute('aria-label', '장바구니 수량 확인 불가');
    minusButton.disabled = true;
    plusButton.disabled = true;
    showActionMessage('장바구니를 읽지 못했습니다. 브라우저 저장 설정을 확인해 주세요.', true);
  }
}

function updateWishlistButton() {
  try {
    const saved = readList(WISHLIST_KEY).some((item) => {
      return String(item.id) === String(activeWhisky.id);
    });
    wishlistButton.setAttribute('aria-pressed', String(saved));
    wishlistButton.querySelector('span').textContent = saved ? '♥' : '♡';
  } catch (error) {
    console.error('찜 목록 조회 오류:', error);
    showActionMessage('찜 목록을 읽지 못했습니다. 브라우저 저장 설정을 확인해 주세요.', true);
  }
}

function changeQuantity(change) {
  if (!activeWhisky) return;

  try {
    const cart = readList(CART_KEY);
    const quantity = Math.max(0, getQuantity(cart) + change);
    if (!Number.isSafeInteger(quantity)) {
      showActionMessage('더 이상 수량을 추가할 수 없습니다.', true);
      return;
    }
    const next = cart.filter((item) => String(item.id) !== String(activeWhisky.id));
    if (quantity > 0) {
      next.push({
        id: String(activeWhisky.id),
        title: String(activeWhisky.title || '위스키'),
        brand: String(activeWhisky.brand || ''),
        category: String(activeWhisky.category || ''),
        price: activeWhisky.price ?? null,
        image_url: String(activeWhisky.image_url || ''),
        volume_ml: activeWhisky.volume_ml ?? null,
        description: String(activeWhisky.description || ''),
        quantity
      });
    }
    localStorage.setItem(CART_KEY, JSON.stringify(next));
    updateQuantity(quantity);
    showActionMessage(quantity === 0
      ? '장바구니에서 삭제했습니다.'
      : `장바구니 수량을 ${quantity}개로 변경했습니다.`);
  } catch (error) {
    console.error('장바구니 저장 오류:', error);
    showActionMessage('수량을 저장하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.', true);
  }
}

function toggleWishlist() {
  if (!activeWhisky) return;

  try {
    const wishlist = readList(WISHLIST_KEY);
    const saved = wishlist.some((item) => String(item.id) === String(activeWhisky.id));
    const next = saved
      ? wishlist.filter((item) => String(item.id) !== String(activeWhisky.id))
      : [...wishlist, {
        id: String(activeWhisky.id),
        title: String(activeWhisky.title || '위스키'),
        brand: String(activeWhisky.brand || ''),
        category: String(activeWhisky.category || ''),
        price: activeWhisky.price ?? null,
        image_url: String(activeWhisky.image_url || ''),
        volume_ml: activeWhisky.volume_ml ?? null,
        description: String(activeWhisky.description || '')
      }];
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
    wishlistButton.setAttribute('aria-pressed', String(!saved));
    wishlistButton.querySelector('span').textContent = saved ? '♡' : '♥';
    showActionMessage(saved ? '찜 목록에서 삭제했습니다.' : '찜 목록에 저장했습니다.');
  } catch (error) {
    console.error('찜 목록 저장 오류:', error);
    showActionMessage('찜 목록을 저장하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.', true);
  }
}

function showStatus(message, state) {
  status.textContent = message;
  status.dataset.state = state;
  status.hidden = false;
  content.hidden = true;
}

function renderWhisky(whisky) {
  activeWhisky = whisky;
  const title = String(whisky.title || '위스키');
  const imageUrl = String(whisky.image_url || '').trim();

  if (imageUrl) {
    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = title;
    image.loading = 'eager';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'no-image';
      placeholder.textContent = 'NO IMAGE';
      imageContainer.replaceChildren(placeholder);
    }, { once: true });
    imageContainer.replaceChildren(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'no-image';
    placeholder.textContent = 'NO IMAGE';
    imageContainer.replaceChildren(placeholder);
  }

  document.querySelector('#detail-title').textContent = title;
  document.querySelector('#detail-category').textContent = String(whisky.category || 'WHISKY');
  document.querySelector('#detail-category-value').textContent = String(whisky.category || '정보 없음');
  document.querySelector('#detail-brand').textContent = String(whisky.brand || '브랜드 정보 없음');
  document.querySelector('#detail-price').textContent = whisky.price == null
    ? '가격 정보 없음'
    : won(whisky.price);
  document.querySelector('#detail-volume').textContent = whisky.volume_ml == null
    ? '정보 없음'
    : `${whisky.volume_ml} ml`;
  document.querySelector('#detail-origin').textContent = String(whisky.origin || '정보 없음');
  document.querySelector('#detail-description').textContent = String(whisky.description || '등록된 설명이 없습니다.');
  showActionMessage('');
  updateCartControls();
  updateWishlistButton();
  status.hidden = true;
  content.hidden = false;
}

async function loadWhisky() {
  const id = new URLSearchParams(window.location.search).get('id');
  const isValidId = id && (
    /^\d+$/.test(id)
    || /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(id)
  );

  if (!isValidId) {
    showStatus('잘못된 위스키 ID입니다. 위스키 목록에서 다시 선택해 주세요.', 'error');
    return;
  }

  try {
    const { data, error } = await supabase
      .from('GOLDEN DROP')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      showStatus('해당 위스키를 찾을 수 없습니다.', 'not-found');
      return;
    }

    renderWhisky(data);
  } catch (error) {
    console.error('위스키 상세 조회 오류:', error);
    showStatus('위스키 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
  }
}

minusButton.addEventListener('click', () => changeQuantity(-1));
plusButton.addEventListener('click', () => changeQuantity(1));
wishlistButton.addEventListener('click', toggleWishlist);
window.addEventListener('storage', (event) => {
  if (!activeWhisky) return;
  if (event.key === CART_KEY || event.key === null) updateCartControls();
  if (event.key === WISHLIST_KEY || event.key === null) updateWishlistButton();
});

loadWhisky();
