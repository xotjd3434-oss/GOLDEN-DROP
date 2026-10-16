import { supabase } from './common.js';
const form = document.querySelector('#login-form');
const emailInput = document.querySelector('#email');
const passwordInput = document.querySelector('#password');
const passwordConfirm = document.querySelector('#password-confirm');
const confirmField = document.querySelector('#confirm-field');
const passwordToggle = document.querySelector('#password-toggle');
const loginBtn = document.querySelector('#login-btn');
const loginStatus = document.querySelector('#login-status');
const formTitle = document.querySelector('#login-title');
const formDescription = document.querySelector('#form-description');
const switchDescription = document.querySelector('#switch-description');
const switchBtn = document.querySelector('#auth-switch-btn');
let isSignup = false;
let isSubmitting = false;
//안내 문구 표시
function showMessage(message, isError = false) {
  loginStatus.textContent = message;
  loginStatus.classList.toggle('is-error', isError);
}
//비밀번호 표시와 숨기기
passwordToggle.addEventListener('click', () => {
  const visible = passwordInput.type === 'password';
  passwordInput.type = visible ? 'text' : 'password';
  passwordConfirm.type = visible ? 'text' : 'password';
  passwordToggle.setAttribute('aria-pressed', String(visible));
  passwordToggle.setAttribute('aria-label', visible ? '비밀번호 숨기기' : '비밀번호 표시');
});
//로그인과 회원가입 화면 전환
function setMode(signup) {
  isSignup = signup;
  formTitle.textContent = signup ? 'SIGN UP' : 'LOGIN';
  formDescription.textContent = signup
    ? '골든 드롭과 함께 취향을 발견하세요.'
    : '골든 드롭에 오신 것을 환영합니다.';
  loginBtn.textContent = signup ? '회원가입' : '로그인';
  switchDescription.textContent = signup
    ? '이미 계정이 있으신가요?'
    : '아직 회원이 아니신가요?';
  switchBtn.textContent = signup ? '로그인' : '회원가입';
  switchBtn.setAttribute('aria-expanded', String(signup));
  confirmField.hidden = !signup;
  passwordConfirm.disabled = !signup;
  passwordConfirm.required = signup;
  passwordInput.minLength = signup ? 8 : 1;
  passwordInput.autocomplete = signup ? 'new-password' : 'current-password';
  passwordInput.placeholder = signup
    ? '8자 이상 비밀번호를 입력하세요'
    : '비밀번호를 입력하세요';
  passwordInput.value = '';
  passwordConfirm.value = '';
  passwordConfirm.setCustomValidity('');
  passwordInput.type = 'password';
  passwordConfirm.type = 'password';
  passwordToggle.setAttribute('aria-pressed', 'false');
  passwordToggle.setAttribute('aria-label', '비밀번호 표시');
  document.title = `${signup ? 'SIGN UP' : 'LOGIN'} | GOLDEN DROP`;
  showMessage('');
}
switchBtn.addEventListener('click', () => {
  if (isSubmitting) return;
  setMode(!isSignup);
  emailInput.focus();
});
//입력을 수정하면 이전 오류 문구 지우기
[emailInput, passwordInput, passwordConfirm].forEach((input) => {
  input.addEventListener('input', () => {
    passwordConfirm.setCustomValidity('');
    if (!isSubmitting) showMessage('');
  });
});
//처리 중 중복 제출과 화면 전환 방지
function setBusy(busy) {
  isSubmitting = busy;
  form.setAttribute('aria-busy', String(busy));
  loginBtn.disabled = busy;
  switchBtn.disabled = busy;
  loginBtn.textContent = busy
    ? (isSignup ? '가입 처리 중...' : '로그인 중...')
    : (isSignup ? '회원가입' : '로그인');
}
//오류 내용을 한국어로 안내
function getErrorMessage(error) {
  const messages = {
    invalid_credentials: '이메일 또는 비밀번호를 확인해 주세요.',
    email_not_confirmed: '이메일 인증을 완료한 후 로그인해 주세요.',
    user_already_exists: '이미 가입된 계정입니다. 로그인해 주세요.',
    email_exists: '이미 사용 중인 이메일입니다.',
    signup_disabled: '현재 회원가입이 비활성화되어 있습니다.',
    email_provider_disabled: '이메일 가입이 비활성화되어 있습니다.',
    weak_password: '비밀번호가 서버의 보안 조건에 맞지 않습니다. 더 긴 비밀번호와 영문, 숫자, 특수문자를 조합해 주세요.',
    email_address_invalid: '사용할 수 있는 이메일 주소를 입력해 주세요.',
    email_address_not_authorized: '현재 이메일 발송 설정으로는 이 주소에 인증 메일을 보낼 수 없습니다.',
    user_banned: '이용이 제한된 계정입니다.',
    over_request_rate_limit: '요청이 많습니다. 잠시 후 다시 시도해 주세요.',
    over_email_send_rate_limit: '인증 메일 발송 한도를 초과했습니다. 잠시 후 다시 시도해 주세요.'
  };
  return messages[error?.code] || '처리하지 못했습니다. 연결 상태와 입력 정보를 확인해 주세요.';
}
//로그인 또는 회원가입 처리
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSubmitting) return;
  emailInput.value = emailInput.value.trim();
  passwordConfirm.setCustomValidity('');
  if (isSignup && passwordInput.value !== passwordConfirm.value) {
    passwordConfirm.setCustomValidity('비밀번호가 일치하지 않습니다.');
  }
  if (!form.reportValidity()) return;
  const credentials = {
    email: emailInput.value,
    password: passwordInput.value
  };
  showMessage('');
  setBusy(true);
  try {
    if (isSignup) {
      const { data, error } = await supabase.auth.signUp(credentials);
      if (error) throw error;
      //자동 로그인된 경우 현재 세션 종료
      if (data.session) {
        const { error: signOutError } = await supabase.auth.signOut({
          scope: 'local'
        });
        if (signOutError) throw signOutError;
      }
      //회원가입 화면에서 로그인 화면으로 전환
      setMode(false);
      showMessage(data.session
        ? '회원가입이 완료되었습니다. 로그인해 주세요.'
        : '이메일 인증이 필요한 경우 메일함에서 인증을 완료한 후 로그인해 주세요.');
      passwordInput.focus();
    } else {
      const { data, error } = await supabase.auth.signInWithPassword(credentials);
      if (error) throw error;
      if (!data.session) throw new Error('로그인 세션이 없습니다.');
      showMessage('로그인되었습니다. 메인으로 이동합니다.');
      window.location.replace('./index.html');
    }
  } catch (error) {
    console.error('계정 처리 오류:', error);
    showMessage(getErrorMessage(error), true);
  } finally {
    setBusy(false);
  }
});
setMode(false);
