// ---------- 섹션 등장 애니메이션 (화면에 들어올 때마다 재생, 벗어나면 초기화) ----------
function revealOnScroll(el) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        el.classList.toggle('isVisible', entry.isIntersecting);
      });
    },
    { threshold: 0.4, rootMargin: '0px 0px -10% 0px' }
  );
  observer.observe(el);
}

revealOnScroll(document.querySelector('.intro_inner'));
revealOnScroll(document.querySelector('.tealife'));
revealOnScroll(document.querySelector('.visual'));
document.querySelectorAll('.story_group').forEach(revealOnScroll);

// ---------- 페이지 스케일 (1920px 고정 디자인을 화면 너비에 비례해서 축소/확대) ----------
const pageScaleOuter = document.querySelector('.pageScaleOuter');
const pageScale = document.getElementById('pageScale');
const heroSection = document.querySelector('.hero');
const headerEl = document.querySelector('.header');
let currentPageScale = 1; /* .pageScale 내부는 offsetTop/offsetHeight가 로컬(1920 기준) 좌표라, 실제 화면 좌표로 바꿀 때 이 값으로 곱/나눗셈 필요 */

const PAGE_SCALE_BREAKPOINT = 1440; /* 이 너비 이하에서는 style_1024.css의 실제 반응형 규칙이 적용되므로 비례 축소를 끔 */

function updatePageScale() {
  const viewportWidth = document.documentElement.clientWidth; /* 스크롤바 폭 제외한 실제 너비 */

  if (viewportWidth <= PAGE_SCALE_BREAKPOINT) {
    /* 반응형 브레이크포인트 구간: zoom을 끄고 style_1024.css가 정의한 실제 크기로 렌더링 */
    currentPageScale = 1;
    pageScale.style.zoom = 1;
    heroSection.style.height = '';
    return;
  }

  /* transform:scale은 position:sticky를 깨뜨리므로(.scroll_pinned 등) zoom을 사용
     zoom은 실제 레이아웃 크기 자체를 바꿔 sticky가 정상 동작함 (offsetTop/offsetHeight는 여전히 로컬 좌표) */
  currentPageScale = viewportWidth / 1920;
  pageScale.style.zoom = currentPageScale;

  /* .hero는 100vh 기준인데, zoom 안에서는 vh가 실제 뷰포트가 아니라 축소된 값으로 계산되므로
     실제 남은 화면 높이(뷰포트 - 헤더)를 scale로 나눈 값을 직접 px로 지정해 보정 */
  heroSection.style.height = `${(window.innerHeight - headerEl.offsetHeight) / currentPageScale}px`;
}

window.addEventListener('resize', updatePageScale);
updatePageScale();

// ---------- 드래그 슬라이드 캐러셀 (공통) ----------
function initDragSlider(dragZone, track, getStartInset, viewport = dragZone) {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartTranslate = 0;
  let startInset = getStartInset();
  let translateX = startInset;

  function getMinTranslate() {
    const trackWidth = track.scrollWidth;
    const viewportWidth = viewport.clientWidth;
    return Math.min(startInset, viewportWidth - trackWidth);
  }

  function setTranslate(x) {
    const min = getMinTranslate();
    const clamped = Math.min(startInset, Math.max(x, min));
    translateX = clamped;
    track.style.transform = `translateX(${clamped}px)`;
  }

  function getClientX(e) {
    return e.touches ? e.touches[0].clientX : e.clientX;
  }

  function onDragStart(e) {
    isDragging = true;
    dragZone.classList.add('isDragging');
    dragStartX = getClientX(e);
    dragStartTranslate = translateX;
  }

  function onDragMove(e) {
    if (!isDragging) return;
    /* 마우스 이동량은 실제 화면 px, translateX는 페이지 스케일(zoom) 내부 로컬 px이므로 scale로 보정 */
    const delta = (getClientX(e) - dragStartX) / currentPageScale;
    setTranslate(dragStartTranslate + delta);
  }

  function onDragEnd() {
    isDragging = false;
    dragZone.classList.remove('isDragging');
  }

  dragZone.addEventListener('mousedown', onDragStart);
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('mouseup', onDragEnd);

  dragZone.addEventListener('touchstart', onDragStart, { passive: true });
  dragZone.addEventListener('touchmove', onDragMove, { passive: true });
  dragZone.addEventListener('touchend', onDragEnd);

  setTranslate(startInset);

  /* 창 크기가 바뀌면(예: 1024px 반응형 구간 진입) 시작 위치(2컬럼 시작 지점)도 다시 계산 */
  window.addEventListener('resize', () => {
    startInset = getStartInset();
    if (!isDragging) setTranslate(startInset);
  });
}

/* --grid-margin/--column-width/--gutter는 breakpoint에 따라 px 또는 %로 정의되므로,
   %일 때는 실제 창 너비 기준으로 px로 환산 (커스텀 프로퍼티는 getComputedStyle이 자동으로 px 변환해주지 않음) */
function resolveGridLength(varName) {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (raw.endsWith('%')) {
    return (parseFloat(raw) / 100) * document.documentElement.clientWidth;
  }
  return parseFloat(raw);
}

function getAboutStartInset() {
  // 두 번째 컬럼 시작 지점 = 그리드 여백 + 1열 폭 + gutter — 첫 슬라이드의 기본 위치
  return resolveGridLength('--grid-margin') + resolveGridLength('--column-width') + resolveGridLength('--gutter');
}

initDragSlider(
  document.getElementById('aboutSection'),
  document.getElementById('aboutSlideTrack'),
  getAboutStartInset,
  document.getElementById('aboutSlideViewport')
);

// ---------- Jeju 사진 슬라이드 (인디케이터 + 좌우 버튼) ----------
const jejuSlides = document.querySelectorAll('#jejuPhotoWrap .jeju_slide');
const jejuIndicatorLine = document.getElementById('jejuIndicatorLine');
const jejuIndicatorItems = document.querySelectorAll('#jejuIndicator .jeju_indicatorItem');
let jejuIndex = 0;

function updateJejuIndicatorLine() {
  const gapIndex = Math.min(jejuIndex, jejuIndicatorItems.length - 2);

  /* getBoundingClientRect(실제 렌더링 좌표) 대신 offsetLeft/offsetWidth(레이아웃 좌표)를 사용해야
     페이지 스케일(zoom)이 걸려도 항상 .jeju_indicator 기준의 올바른 위치가 계산됨 */
  const leftItem = jejuIndicatorItems[gapIndex];
  const rightItem = jejuIndicatorItems[gapIndex + 1];
  const centerLocal = (leftItem.offsetLeft + leftItem.offsetWidth + rightItem.offsetLeft) / 2;
  jejuIndicatorLine.style.left = `${centerLocal}px`;
}

function setJejuSlide(index) {
  jejuIndex = (index + jejuSlides.length) % jejuSlides.length;

  jejuSlides.forEach((el, i) => el.classList.toggle('isActive', i === jejuIndex));
  jejuIndicatorItems.forEach((el, i) => el.classList.toggle('isActive', i === jejuIndex));

  const gapIndex = Math.min(jejuIndex, jejuIndicatorItems.length - 2);
  jejuIndicatorItems.forEach((el, i) => el.classList.toggle('expandGap', i === gapIndex));

  updateJejuIndicatorLine();
}

jejuIndicatorItems.forEach((item, i) => {
  item.addEventListener('click', () => setJejuSlide(i));
});

document.getElementById('jejuPhotoPrev').addEventListener('click', () => setJejuSlide(jejuIndex - 1));
document.getElementById('jejuPhotoNext').addEventListener('click', () => setJejuSlide(jejuIndex + 1));

setJejuSlide(0);
/* 창 크기가 바뀌어 인디케이터 항목 위치/간격이 달라지면(예: 1024px 반응형 구간 진입) 획선도 다시 계산 */
window.addEventListener('resize', updateJejuIndicatorLine);

// ---------- Tealife photoBg 위치 (1024px 반응형 구간에서만, photo 기준 오른쪽/아래로 78px씩 보이도록) ----------
function updateTealifePhotoBg() {
  const photo = document.querySelector('.tealife_photo');
  const photoBg = document.querySelector('.tealife_photoBg');
  if (!photo || !photoBg) return;

  if (document.documentElement.clientWidth > 1440) {
    /* 1920 구간에서는 style.css의 고정 left/top(982px/86px)이 그대로 적용되도록 인라인 값 제거 */
    photoBg.style.left = '';
    photoBg.style.top = '';
    return;
  }

  /* photo가 position:relative(정상 흐름)라서 텍스트 길이에 따라 세로 위치가 달라짐 →
     offsetLeft/offsetTop(레이아웃 좌표, photoBg와 동일한 offsetParent인 .tealife 기준)로 실측해서 계산 */
  const photoRight = photo.offsetLeft + photo.offsetWidth;
  const photoBottom = photo.offsetTop + photo.offsetHeight;
  photoBg.style.left = `${photoRight + 78 - 786}px`;
  photoBg.style.top = `${photoBottom + 78 - 570}px`;
}
window.addEventListener('resize', updateTealifePhotoBg);
updateTealifePhotoBg();

// ---------- Scroll 인디케이터 + 사진 3단 전환 (섹션 스크롤 진행률 기반) ----------
const scrollSection = document.getElementById('scrollSection');
const scrollThumb = document.getElementById('scrollThumb');
const scrollPhoto1 = document.getElementById('scrollPhoto1');
const scrollPhoto2 = document.getElementById('scrollPhoto2');
const scrollPhoto3 = document.getElementById('scrollPhoto3');
const scrollText1 = document.getElementById('scrollText1');
const scrollText2 = document.getElementById('scrollText2');
const scrollText3 = document.getElementById('scrollText3');
const scrollPhotoArea = document.querySelector('.scroll_photoArea');
const scrollIndicatorEl = document.querySelector('.scroll_indicator');
const SCROLL_THUMB_SIZE = 60;

/* 1920px 기준 photo1 시작 여백(1120px)과 텍스트 커버 기준(850px)의 비율을 유지하되,
   1440px 이하(zoom 꺼짐)에서는 photoArea의 실제 너비를 기준으로 다시 계산 — 하드코딩된 px는 좁은 화면에서 깨짐 */
function getScrollPhoto1StartLeft() {
  return currentPageScale === 1 ? scrollPhotoArea.clientWidth * (1120 / 1920) : 1120;
}

function getScrollText1CoverThreshold() {
  return currentPageScale === 1 ? scrollPhotoArea.clientWidth * (850 / 1920) : 850;
}

/* 인디케이터/트랙 높이도 1920 비율(vw 기반)로 뷰포트에 맞춰 늘어나므로,
   하드코딩된 상수 대신 실제 렌더링된 높이를 읽어서 썸네일 이동 거리를 맞춤 */
function getScrollTrackHeight() {
  return scrollIndicatorEl.clientHeight;
}

function getScrollProgress() {
  /* scrollSection.offsetTop/offsetHeight는 .pageScale 내부 로컬(1920 기준) 좌표이므로
     실제 화면(scrollY) 기준으로 비교하려면 헤더 높이(스케일 없음) + 로컬값*scale 로 환산해야 함 */
  const headerHeight = headerEl.offsetHeight;
  const realOffsetTop = headerHeight + (scrollSection.offsetTop - headerHeight) * currentPageScale;
  const realOffsetHeight = scrollSection.offsetHeight * currentPageScale;
  const scrollableRange = realOffsetHeight - window.innerHeight;
  return scrollableRange > 0
    ? Math.min(1, Math.max(0, (window.scrollY - realOffsetTop) / scrollableRange))
    : 0;
}

function updateScrollThumb(progress) {
  scrollThumb.style.setProperty('--thumb-progress', `${progress * (getScrollTrackHeight() - SCROLL_THUMB_SIZE)}px`);
}

function updateScrollPhotos(progress) {
  const seg = 1 / 3;
  const photo1StartLeft = getScrollPhoto1StartLeft();
  let left1;
  let opacity1;
  let opacity2;
  let opacity3;

  if (progress <= seg) {
    const local = progress / seg;
    left1 = photo1StartLeft * (1 - local);
    opacity1 = 1;
    opacity2 = 0;
    opacity3 = 0;
  } else if (progress <= seg * 2) {
    const local = (progress - seg) / seg;
    left1 = 0;
    opacity1 = 1 - local;
    opacity2 = local;
    opacity3 = 0;
  } else {
    const local = (progress - seg * 2) / seg;
    left1 = 0;
    opacity1 = 0;
    opacity2 = 1 - local;
    opacity3 = local;
  }

  scrollPhoto1.style.setProperty('--photo1-left', `${left1}px`);
  scrollPhoto1.style.opacity = opacity1;
  scrollPhoto2.style.opacity = opacity2;
  scrollPhoto3.style.opacity = opacity3;

  scrollText1.classList.toggle('isCovered', left1 <= getScrollText1CoverThreshold());
  scrollText1.style.opacity = opacity1;
  scrollText2.style.opacity = opacity2;
  scrollText3.style.opacity = opacity3;
}

function updateScrollSection() {
  const progress = getScrollProgress();
  updateScrollThumb(progress);
  updateScrollPhotos(progress);
}

window.addEventListener('scroll', updateScrollSection);
window.addEventListener('resize', updateScrollSection);

updateScrollSection();

// ---------- Bento box1 상품 사진 슬라이드 ----------
const bentoBox1Slides = document.querySelectorAll('#bentoBox1 .bento_box1Slide');
let bentoBox1Index = 0;

function setBentoBox1Slide(index) {
  bentoBox1Index = (index + bentoBox1Slides.length) % bentoBox1Slides.length;
  bentoBox1Slides.forEach((el, i) => el.classList.toggle('isActive', i === bentoBox1Index));
}

document.getElementById('bentoBox1Prev').addEventListener('click', () => setBentoBox1Slide(bentoBox1Index - 1));
document.getElementById('bentoBox1Next').addEventListener('click', () => setBentoBox1Slide(bentoBox1Index + 1));
