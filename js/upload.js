import { supabase, checkAdmin } from './common.js';

const form = document.querySelector('#upload-form');
const message = document.querySelector('#upload-message');
const fileInput = document.querySelector('#image');
const preview = document.querySelector('#preview');
const button = form.querySelector('[type="submit"]');
const adminStatus = document.querySelector('#admin-status');
const successLink = document.querySelector('#upload-success');

let previewURL = '';
let busy = false;

function notify(text, error = false) {
  message.textContent = text;
  message.classList.toggle('is-error', error);
}

function clearPreview() {
  if (previewURL) URL.revokeObjectURL(previewURL);
  previewURL = '';
  preview.removeAttribute('src');
  preview.hidden = true;
}

function validateFile(file) {
  if (!file) throw new Error('사진을 선택해 주세요.');
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    throw new Error('JPG, PNG, WEBP 파일만 가능합니다.');
  }
  if (file.size > 3 * 1024 * 1024) {
    throw new Error('3MB 이하 이미지를 선택해 주세요.');
  }
}

async function authorize() {
  try {
    const allowed = await checkAdmin();
    form.hidden = !allowed;
    adminStatus.textContent = allowed
      ? '운영자 인증 완료 · 새 위스키 등록'
      : '운영자 전용 페이지입니다. 운영자 계정으로 로그인해 주세요.';

    if (!allowed) {
      successLink.href = 'login.html';
      successLink.textContent = '로그인 화면으로 이동 →';
      successLink.hidden = false;
    }

    return allowed;
  } catch (error) {
    form.hidden = true;
    adminStatus.textContent = '운영자 확인 실패: ' + error.message;
    return false;
  }
}

fileInput.addEventListener('change', () => {
  clearPreview();
  notify('');
  successLink.hidden = true;

  const file = fileInput.files[0];
  if (!file) return;

  try {
    validateFile(file);
    previewURL = URL.createObjectURL(file);
    preview.src = previewURL;
    preview.hidden = false;
  } catch (error) {
    fileInput.value = '';
    notify(error.message, true);
  }
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (busy || !form.reportValidity()) return;

  busy = true;
  button.disabled = true;
  form.setAttribute('aria-busy', 'true');
  button.textContent = '등록 중…';
  successLink.hidden = true;

  let uploadedPath = '';
  let saved = false;

  try {
    if (!await authorize()) throw new Error('운영자 권한이 필요합니다.');

    const file = fileInput.files[0];
    validateFile(file);

    const fields = new FormData(form);
    const whisky = {
      title: fields.get('title').trim(),
      brand: fields.get('brand').trim(),
      category: fields.get('category'),
      origin: fields.get('origin').trim(),
      description: fields.get('description').trim(),
      price: Number(fields.get('price')),
      volume_ml: Number(fields.get('volume_ml'))
    };

    if (!whisky.title || !whisky.brand || !whisky.category || !whisky.origin || !whisky.description) {
      throw new Error('모든 항목을 입력해 주세요.');
    }
    if (!Number.isSafeInteger(whisky.price) || whisky.price < 0 || !Number.isSafeInteger(whisky.volume_ml) || whisky.volume_ml < 1) {
      throw new Error('가격은 0 이상, 용량은 1 이상의 정수로 입력해 주세요.');
    }

    const extension = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp'
    }[file.type];
    const path = 'whiskies/' + crypto.randomUUID() + '.' + extension;

    notify('사진을 업로드하고 있습니다.');

    const { error: uploadError } = await supabase.storage
      .from('GOLDEN DROP-images')
      .upload(path, file, { contentType: file.type, upsert: false });

    if (uploadError) throw new Error('이미지 업로드 실패: ' + uploadError.message);
    uploadedPath = path;

    const { data } = supabase.storage
      .from('GOLDEN DROP-images')
      .getPublicUrl(path);

    whisky.image_url = data.publicUrl;
    notify('위스키 정보를 저장하고 있습니다.');

    const { error: saveError } = await supabase
      .from('GOLDEN DROP')
      .insert(whisky);

    if (saveError) throw new Error('위스키 저장 실패: ' + saveError.message);
    saved = true;

    form.reset();
    clearPreview();
    notify('컬렉션 등록이 완료되었습니다.');
    successLink.href = 'whisky.html';
    successLink.textContent = '등록한 컬렉션 확인 →';
    successLink.hidden = false;
  } catch (error) {
    console.error(error);
    let cleanupFailed = false;

    if (uploadedPath && !saved) {
      try {
        const { error: cleanupError } = await supabase.storage
          .from('GOLDEN DROP-images')
          .remove([uploadedPath]);

        cleanupFailed = Boolean(cleanupError);
      } catch {
        cleanupFailed = true;
      }
    }

    notify(
      error.message + (cleanupFailed ? ' 업로드된 사진이 남아 있을 수 있으니 Storage를 확인해 주세요.' : ''),
      true
    );
  } finally {
    busy = false;
    button.disabled = false;
    form.setAttribute('aria-busy', 'false');
    button.innerHTML = '위스키 등록하기 <span aria-hidden="true">→</span>';
  }
});

supabase.auth.onAuthStateChange(() => {
  form.hidden = true;
  setTimeout(() => {
    if (!busy) authorize();
  }, 0);
});

window.addEventListener('pagehide', clearPreview);
authorize();