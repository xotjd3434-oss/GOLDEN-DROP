//whisky-modal.js
import { won } from './common.js';
export function initWhiskyModal(list, getWhisky) {
  const modal = document.querySelector('#whisky-modal');
  if (!list || !modal) return;
  //같은 모달에 이벤트가 중복 연결되는 것을 방지
  if (modal.dataset.initialized === 'true') return;
  const modalImage = modal.querySelector('#modal-image');
  const modalTitle = modal.querySelector('#modal-title');
  const modalBrand = modal.querySelector('#modal-brand');
  const modalPrice = modal.querySelector('#modal-price');
  const modalType = modal.querySelector('#modal-type');
  const modalVolume = modal.querySelector('#modal-volume');
  const modalDescription = modal.querySelector('#modal-description');
  const modalStatus = modal.querySelector('#modal-status');
  const closeBtn = modal.querySelector('#modal-close');
  const cartBtn = modal.querySelector('#cart-btn');
  const wishlistBtn = modal.querySelector('#wishlist-btn');
  if ([modalImage, modalTitle, modalBrand, modalPrice, modalType, modalVolume,
    modalDescription, modalStatus, closeBtn, cartBtn, wishlistBtn].some((element) => !element)) {
    console.error('모달 HTML에 필요한 요소가 없습니다. 모달 내부의 id를 확인해 주세요.');
    return;
  }
  modal.dataset.initialized = 'true';
  const CART_KEY = 'goldenDropCart';
  const WISHLIST_KEY = 'goldenDropWishlist';
  let activeWhisky = null;
  let lastFocusedCard = null;
  //기존 장바구니 버튼을 수량 조절 영역으로 변경
  const cartControls = document.createElement('div');
  const minusBtn = document.createElement('button');
  const quantityText = document.createElement('span');
  cartControls.setAttribute('role', 'group');
  cartControls.setAttribute('aria-label', '장바구니 수량 조절');
  cartControls.style.cssText = 'display:grid;grid-template-columns:44px minmax(0,1fr) 44px;align-items:center;min-width:0;border:1px solid var(--accent);border-radius:2px;';
  minusBtn.type = 'button';
  minusBtn.textContent = '−';
  minusBtn.setAttribute('aria-label', '장바구니 수량 1개 줄이기');
  quantityText.textContent = '0개';
  quantityText.setAttribute('aria-live', 'polite');
  quantityText.setAttribute('aria-atomic', 'true');
  quantityText.style.cssText = 'min-width:0;text-align:center;font-size:14px;font-variant-numeric:tabular-nums;color:var(--accent-light);';
  cartBtn.type = 'button';
  cartBtn.textContent = '+';
  cartBtn.setAttribute('aria-label', '장바구니에 1개 추가');
  [minusBtn, cartBtn].forEach((button) => {
    button.style.cssText = 'width:44px;min-width:44px;min-height:48px;padding:0;border:0;border-radius:0;font-size:22px;box-shadow:none;transform:none;';
  });
  cartBtn.replaceWith(cartControls);
  cartControls.append(minusBtn, quantityText, cartBtn);
  function priceText(value) {
    return value == null ? '가격 정보 없음' : won(value);
  }
  function showNoImage(container) {
    const placeholder = document.createElement('div');
    placeholder.className = 'no-image';
    placeholder.textContent = 'NO IMAGE';
    container.replaceChildren(placeholder);
  }
  function readList(key) {
    const raw = localStorage.getItem(key);
    if (raw === null) return [];
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error('저장된 목록 형식 오류');
    return items.filter((item) => item && item.id != null);
  }
  function snapshot(whisky) {
    return {
      id: String(whisky.id),
      title: String(whisky.title || '위스키'),
      brand: String(whisky.brand || ''),
      category: String(whisky.category || ''),
      price: whisky.price ?? null,
      image_url: String(whisky.image_url || ''),
      volume_ml: whisky.volume_ml ?? null,
      description: String(whisky.description || '')
    };
  }
  function showMessage(message, isError = false) {
    modalStatus.textContent = message;
    modalStatus.classList.toggle('is-error', isError);
  }
  //현재 위스키의 장바구니 수량 확인
  function getQuantity(cart) {
    if (!activeWhisky) return 0;
    const item = cart.find((item) => String(item.id) === String(activeWhisky.id));
    if (!item) return 0;
    const quantity = Number(item.quantity);
    return Number.isSafeInteger(quantity) && quantity > 0 ? quantity : 1;
  }
  function renderQuantity(quantity) {
    quantityText.textContent = `${quantity}개`;
    quantityText.setAttribute('aria-label', `장바구니 수량 ${quantity}개`);
    minusBtn.disabled = quantity === 0;
    cartBtn.disabled = quantity >= Number.MAX_SAFE_INTEGER;
  }
  //모달을 열 때 저장된 장바구니 수량 표시
  function updateCartControls() {
    if (!activeWhisky) return;
    try {
      renderQuantity(getQuantity(readList(CART_KEY)));
    } catch (error) {
      console.error('장바구니 조회 오류:', error);
      quantityText.textContent = '확인 불가';
      quantityText.setAttribute('aria-label', '장바구니 수량 확인 불가');
      minusBtn.disabled = true;
      cartBtn.disabled = true;
      showMessage('장바구니를 읽지 못했습니다. 브라우저 저장 설정을 확인해 주세요.', true);
    }
  }
  function updateWishlistButton() {
    if (!activeWhisky) return;
    try {
      const saved = readList(WISHLIST_KEY).some((item) => {
        return String(item.id) === String(activeWhisky.id);
      });
      wishlistBtn.setAttribute('aria-pressed', String(saved));
      const heart = wishlistBtn.querySelector('span');
      if (heart) {
        heart.textContent = wishlistBtn.getAttribute('aria-pressed') === 'true' ? '♥' : '♡';
      }
    } catch (error) {
      console.error('찜 목록 조회 오류:', error);
      showMessage('찜 목록을 읽지 못했습니다. 브라우저 저장 설정을 확인해 주세요.', true);
    }
  }
  //수량 변경 후 장바구니에 바로 저장
  function changeQuantity(change) {
    if (!activeWhisky) return;
    try {
      const cart = readList(CART_KEY);
      const previous = getQuantity(cart);
      const quantity = Math.max(0, previous + change);
      if (!Number.isSafeInteger(quantity)) {
        showMessage('더 이상 수량을 추가할 수 없습니다.', true);
        return;
      }
      const next = cart.filter((item) => {
        return String(item.id) !== String(activeWhisky.id);
      });
      if (quantity > 0) {
        next.push({ ...snapshot(activeWhisky), quantity });
      }
      localStorage.setItem(CART_KEY, JSON.stringify(next));
      renderQuantity(quantity);
      showMessage(quantity === 0
        ? '장바구니에서 삭제했습니다.'
        : `장바구니 수량을 ${quantity}개로 변경했습니다.`);
    } catch (error) {
      console.error('장바구니 저장 오류:', error);
      showMessage('수량을 저장하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.', true);
    }
  }
  function openModal(whisky, trigger) {
    activeWhisky = whisky;
    lastFocusedCard = trigger;
    modalTitle.textContent = String(whisky.title || '위스키');
    modalBrand.textContent = String(whisky.brand || '브랜드 정보 없음');
    modalPrice.textContent = priceText(whisky.price);
    const origin = modal.querySelector('#modal-origin'); if (origin) origin.textContent = whisky.origin || '정보 준비 중';
    modalType.textContent = String(whisky.category || '분류 정보 없음');
    modalDescription.textContent = String(whisky.description || '등록된 상세 설명이 없습니다.');
    const volume = Number(whisky.volume_ml);
    modalVolume.textContent = Number.isFinite(volume) && volume > 0
      ? `${volume.toLocaleString('ko-KR')} ml`
      : '용량 정보 없음';
    showMessage('');
    wishlistBtn.setAttribute('aria-pressed', 'false');
    updateCartControls();
    updateWishlistButton();
    modalImage.replaceChildren();
    const imageUrl = String(whisky.image_url || '').trim();
    if (imageUrl) {
      const image = document.createElement('img');
      image.alt = modalTitle.textContent;
      image.addEventListener('error', () => {
        if (modalImage.contains(image)) showNoImage(modalImage);
      }, { once: true });
      modalImage.append(image);
      image.src = imageUrl;
    } else {
      showNoImage(modalImage);
    }
    if (!modal.open) modal.showModal();
    document.documentElement.classList.add('whisky-modal-open');
  }
  function closeModal() {
    if (modal.open) modal.close();
  }
  //목록이 다시 출력되어도 카드 클릭 이벤트 유지
  list.addEventListener('click', (event) => {
    const card = event.target.closest('[data-whisky-id]');
    if (!card || !list.contains(card)) return;
    event.preventDefault();
    const whisky = getWhisky(card.dataset.whiskyId);
    if (!whisky) return;
    openModal(whisky, card);
  });
  list.addEventListener('keydown', (event) => {
    if (event.key !== ' ') return;
    const card = event.target.closest('[data-whisky-id]');
    if (!card || !list.contains(card)) return;
    event.preventDefault();
    card.click();
  });
  closeBtn.addEventListener('click', closeModal);
  //모달 바깥 영역 클릭 시 닫기
  modal.addEventListener('click', (event) => {
    if (event.target !== modal) return;
    const rect = modal.getBoundingClientRect();
    const outside = event.clientX < rect.left || event.clientX > rect.right
      || event.clientY < rect.top || event.clientY > rect.bottom;
    if (outside) closeModal();
  });
  modal.addEventListener('close', () => {
    document.documentElement.classList.remove('whisky-modal-open');
    activeWhisky = null;
    if (lastFocusedCard?.isConnected) lastFocusedCard.focus();
    lastFocusedCard = null;
  });
  minusBtn.addEventListener('click', () => changeQuantity(-1));
  cartBtn.addEventListener('click', () => changeQuantity(1));
  wishlistBtn.addEventListener('click', () => {
    if (!activeWhisky) return;
    try {
      const wishlist = readList(WISHLIST_KEY);
      const saved = wishlist.some((item) => {
        return String(item.id) === String(activeWhisky.id);
      });
      const next = saved
        ? wishlist.filter((item) => String(item.id) !== String(activeWhisky.id))
        : [...wishlist, snapshot(activeWhisky)];
      localStorage.setItem(WISHLIST_KEY, JSON.stringify(next));
      wishlistBtn.setAttribute('aria-pressed', String(!saved));
      const heart = wishlistBtn.querySelector('span');
      if (heart) {
        heart.textContent = wishlistBtn.getAttribute('aria-pressed') === 'true' ? '♥' : '♡';
      }
      showMessage(saved ? '찜 목록에서 삭제했습니다.' : '찜 목록에 저장했습니다.');
    } catch (error) {
      console.error('찜 목록 저장 오류:', error);
      showMessage('찜 목록을 저장하지 못했습니다. 브라우저 저장 설정을 확인해 주세요.', true);
    }
  });
  //다른 탭에서 변경한 장바구니와 찜 목록 반영
  window.addEventListener('storage', (event) => {
    if (!modal.open) return;
    if (event.key === CART_KEY || event.key === null) {
      updateCartControls();
    }
    if (event.key === WISHLIST_KEY || event.key === null) {
      updateWishlistButton();
    }
  });
}
