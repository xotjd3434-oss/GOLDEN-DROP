import { supabase, escapeHTML, won } from './common.js';
import { initWhiskyModal } from './whisky-modal.js';
const list = document.querySelector('#featured');
const moreBtn = document.querySelector('#more-btn');
const PAGE_SIZE = 10;
let nextStart = 0;
const loadedWhiskies = new Map();
async function loadFeatured() {
  moreBtn.hidden = false;
  moreBtn.disabled = true;
  moreBtn.textContent = '불러오는 중...';
  const { data, error, count } = await supabase
    .from('GOLDEN DROP')
    .select('*', { count: 'exact' })
    .order('id', { ascending: true })
    .range(nextStart, nextStart + PAGE_SIZE - 1).then(result => result).catch(error => ({ data: null, error, count: null }));
  /*
         range({시작위치},{마지막위치})
         .range(0, 0 + 9 - 1) 8 ) -> 인덱스 0~8번쨰까지 로드
   */
  console.log('가져온 데이터:', data);
  console.log('조회 오류:', error);
  console.log('전체 개수:', count);
  if (error) {
    console.error('위스키 조회 오류:', error);
    if (nextStart === 0) {
      list.textContent = '위스키를 불러오지 못했습니다.';
    } else {
      alert('추가 위스키 조회 실패: ' + error.message);
    }
    moreBtn.disabled = false;
    moreBtn.textContent = '다시 시도';
    return;
  }
  if (nextStart === 0) list.innerHTML = '';
  if (data.length === 0 && nextStart === 0) {
    list.textContent = '등록된 위스키가 없습니다.';
    moreBtn.hidden = true;
    return;
  }
  data.forEach((whisky) => {
    loadedWhiskies.set(String(whisky.id), whisky);
    list.insertAdjacentHTML('beforeend', `
    <a class="art-card" href="#whisky-modal" role="button" data-whisky-id="${escapeHTML(String(whisky.id))}" aria-haspopup="dialog" aria-controls="whisky-modal">
      <div class="art-image">
        ${whisky.image_url
        ? `<img src="${escapeHTML(whisky.image_url)}" alt="${escapeHTML(whisky.title)}" loading="lazy">`
        : '<div class="no-image">NO IMAGE</div>'}
      </div>
      <div class="art-info">
        <span class="art-label">PREMIUM WHISKY</span>
        <h3>${escapeHTML(whisky.title)}</h3>
        <p>${escapeHTML(whisky.brand)}</p>
        <strong>${won(whisky.price)}</strong>
      </div>
    </a>
  `);
  });
  list.querySelectorAll('img').forEach(img => { img.addEventListener('error', () => { const fallback = document.createElement('div'); fallback.className = 'no-image'; fallback.textContent = 'NO IMAGE'; img.replaceWith(fallback); }, { once: true }); });

  nextStart += data.length; //다음에는 이번에 가져온 개수만큼 뒤에서 시작
  moreBtn.hidden = nextStart >= (count ?? 0) || data.length === 0; // 모두 조회하면 숨김
  moreBtn.disabled = false;
  moreBtn.textContent = '더보기';
}
//버튼을 누르면 다음 10개 조회
moreBtn.addEventListener('click', loadFeatured);
initWhiskyModal(list, id => loadedWhiskies.get(id));
loadFeatured();
