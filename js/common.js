//모든 페이지에서 공통으로 사용하는 Supabase 연결과 로그인 상태 처리
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
// HTML 문자를 그대로 출력해 스크립트가 실행되지 않도록 처리합니다.
export function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}
// 숫자를 한국 원화 표시로 바꿉니다.
export function won(value) {
  return Number(value || 0).toLocaleString('ko-KR') + '원';
}
//로그인 사용자 정보 확인 - 로그인하지 않은 경우 null 반환
export async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) return null;
  return data.user;
}
//로그인 여부에 따라 상단 메뉴를 변경
export async function updateNav() {
  const nav = document.querySelector('#account-nav');
  if (!nav) return;
  //현재 로그인 사용자 확인
  const user = await getUser();
  if (!user) {
    //로그인 전
    nav.innerHTML = '<a href="login.html">로그인/회원가입</a>';
    return;
  }
  const { data: isAdmin, error: adminError } = await supabase.rpc('is_admin');
  //로그인 후
  nav.innerHTML = `
    ${!adminError && isAdmin === true ? '<a href="upload.html">운영자 관리</a>' : ''}
    <button type="button" id="logout-btn">로그아웃</button>
  `;
  //로그아웃 버튼을 만든 다음 클릭 이벤트 연결
  const logoutBtn = nav.querySelector('#logout-btn');
  logoutBtn.addEventListener('click', async () => {
    logoutBtn.disabled = true; //중복 클릭 방지
    logoutBtn.textContent = '로그아웃 중...';
    try {
      const { error } = await supabase.auth.signOut({
        scope: 'local'
      });
      if (error) throw error;
      //로그아웃 후 메인 페이지를 다시 열어 메뉴 갱신
      window.location.href = './index.html';
    } catch (error) {
      console.error('로그아웃 오류:', error);
      alert('로그아웃하지 못했습니다. 잠시 후 다시 시도해 주세요.');
      logoutBtn.disabled = false;
      logoutBtn.textContent = '로그아웃';
    }
  });
}
//페이지가 준비되면 로그인 메뉴 갱신
function initNav() {
  updateNav().catch((error) => {
    console.error('로그인 메뉴 갱신 오류:', error);
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initNav, { once: true });
} else {
  initNav();
}
export async function checkAdmin() { const user = await getUser(); if (!user) return false; const { data, error } = await supabase.rpc('is_admin'); if (error) throw error; return data === true; }
