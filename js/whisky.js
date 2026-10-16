//whisky.js
import { supabase, escapeHTML, won } from './common.js';
import { initWhiskyModal } from './whisky-modal.js';
const list = document.querySelector('#whisky-list');
const category = document.querySelector('#category');
const search = document.querySelector('#search');
const moreBtn = document.querySelector('#more-btn');
/* 검색된 위스키 개수를 출력 */
let resultCount = document.querySelector('#result-count');
if (!resultCount) {
  resultCount = document.createElement('p');
  resultCount.id = 'result-count';
  resultCount.className = 'muted';
  resultCount.setAttribute('aria-live', 'polite');
  list.before(resultCount);
}
const PAGE_SIZE = 10;
let visibleCount = PAGE_SIZE;
let whiskies = []; //조회한 위스키를 보관할 배열
let isReady = false;
//화면에 위스키 카드 출력
function showGallery() {
  if (!isReady) return;
  const keyword = search.value.trim().toLowerCase(); //검색어의 앞뒤 공백을 제거하고 소문자로 변환
  const selected = category.value; //선택한 카테고리
  let found = 0; //검색된 위스키 수
  let cards = '';
  whiskies.forEach((whisky) => {
    //전체가 아니면서 카테고리가 다르면 건너뜀
    const type = String(whisky.category || '').trim();
    if (selected && selected !== '전체' && type !== selected) return;
    //위스키명이나 브랜드명에 검색어가 없으면 건너뜀
    const title = String(whisky.title || '').toLowerCase();
    const brand = String(whisky.brand || '').toLowerCase();
    if (!title.includes(keyword) && !brand.includes(keyword)) return;
    found += 1;
    //현재 보여줄 개수를 넘으면 카드 출력을 건너뜀
    if (found > visibleCount) return;
    const name = String(whisky.title || '위스키');
    const imageUrl = String(whisky.image_url || '').trim();
    const price = whisky.price == null ? '가격 정보 없음' : won(whisky.price);
    let image = '<div class="no-image">NO IMAGE</div>';
    if (imageUrl) {
      image = `
        <img src="${escapeHTML(imageUrl)}"
          alt="${escapeHTML(name)}" loading="lazy" decoding="async">
      `;
    }
    cards += `
      <a class="art-card" href="#whisky-modal" role="button"
        data-whisky-id="${escapeHTML(String(whisky.id))}"
        aria-haspopup="dialog" aria-controls="whisky-modal">
        <div class="art-image">
          ${image}
        </div>
        <div class="art-info">
          <span class="muted">${escapeHTML(type || 'WHISKY')}</span>
          <h3>${escapeHTML(name)}</h3>
          <p>${escapeHTML(String(whisky.brand || ''))}</p>
          <strong>${escapeHTML(String(price))}</strong>
        </div>
      </a>`;
  });
  list.innerHTML = cards; //기존 카드를 새 목록으로 교체
  //검색 조건에 맞는 위스키 개수를 화면에 출력
  resultCount.textContent = `검색 결과: ${found}개`;
  if (found === 0) {
    list.textContent = whiskies.length === 0
      ? '등록된 위스키가 없습니다.'
      : '검색 결과가 없습니다.';
  }
  //남은 위스키가 있을 때 더보기 버튼 표시
  if (moreBtn) {
    moreBtn.hidden = found <= visibleCount;
    moreBtn.textContent = '위스키 더보기';
  }
  //이미지를 불러오지 못하면 대체 영역 표시
  list.querySelectorAll('img').forEach((img) => {
    img.addEventListener('error', () => {
      const placeholder = document.createElement('div');
      placeholder.className = 'no-image';
      placeholder.textContent = 'NO IMAGE';
      img.replaceWith(placeholder);
    }, { once: true });
  });
}
//supabase에서 위스키 목록 조회
async function loadGallery() {
  isReady = false;
  list.textContent = '위스키를 불러오는 중...';
  resultCount.textContent = '';
  if (moreBtn) moreBtn.hidden = true;
  try {
    const { data, error } = await supabase
      .from('GOLDEN DROP')
      .select('*')
      .order('id', { ascending: true });
    if (error) throw error;
    whiskies = data || []; //결과 배열 보관
    visibleCount = PAGE_SIZE;
    isReady = true;
    showGallery(); //첫 화면 출력
  } catch (error) {
    console.error('위스키 조회 오류:', error);
    list.textContent = '위스키를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
    resultCount.textContent = '';
    if (moreBtn) moreBtn.hidden = true;
  }
}
//입력이 바뀌면 처음 10개부터 목록 다시 출력
function resetGallery() {
  visibleCount = PAGE_SIZE;
  showGallery();
}
category.addEventListener('change', resetGallery);
search.addEventListener('input', resetGallery);
//더보기 버튼을 누르면 위스키 10개 추가 출력
if (moreBtn) {
  moreBtn.addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    showGallery();
  });
}
//카드 클릭 시 상세 모달, 장바구니, 찜하기 연결
initWhiskyModal(list, (id) => {
  return whiskies.find((whisky) => String(whisky.id) === String(id));
});
loadGallery(); //처음 한 번 조회
