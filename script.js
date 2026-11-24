// ---------- 섹션 등장 애니메이션 ([data-reveal], 화면에 들어올 때마다 재생) ----------
/* 요소마다 따로 관찰해서, 아직 화면에 안 들어온 영역(예: tealife 위쪽 빈 패딩) 때문에 일찍 재생되지 않게 함.
   - 보이기: 요소가 화면 아래 30% 지점을 넘어 '충분히 들어왔을 때' isVisible 추가
   - 숨기기: 화면에서 완전히 벗어났을 때만 제거(다시 올라오면 재생)
   - [data-reveal-group] 안의 요소는 그룹 컨테이너가 보일 때 같이 재생(페이지 맨 아래 footer처럼 끝까지 스크롤해도
     화면 아래 30% 안에 있어 개별 요소가 트리거 지점에 못 닿는 경우 대비) */
function initReveal() {
  const targets = Array.from(document.querySelectorAll('[data-reveal-group], [data-reveal]')).filter(
    (el) =>
      !el.hasAttribute('data-reveal-follow') &&
      (el.hasAttribute('data-reveal-group') || !el.closest('[data-reveal-group]'))
  );

  /* data-reveal-follow="대상id": 자기 위치가 아니라 대상 요소가 보일 때 같이 재생
     (예: jeju 인디케이터는 사진 아래 멀리 있어서 자기 위치 기준이면 화면에 보이는데도 한참 뒤에야 올라옴) */
  const followers = new Map();
  document.querySelectorAll('[data-reveal-follow]').forEach((el) => {
    const id = el.getAttribute('data-reveal-follow');
    if (!followers.has(id)) followers.set(id, []);
    followers.get(id).push(el);
  });

  const setVisible = (target, visible) => {
    target.classList.toggle('isVisible', visible);
    (followers.get(target.id) || []).forEach((f) => f.classList.toggle('isVisible', visible));
  };

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => setVisible(el, true));
    document.querySelectorAll('[data-reveal-follow]').forEach((el) => el.classList.add('isVisible'));
    return;
  }

  const showObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) setVisible(entry.target, true);
      });
    },
    { threshold: 0, rootMargin: '0px 0px -30% 0px' }
  );

  const hideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) setVisible(entry.target, false);
      });
    },
    { threshold: 0, rootMargin: '0px' }
  );

  targets.forEach((el) => {
    showObserver.observe(el);
    hideObserver.observe(el);
  });
}

initReveal();

// ---------- Hero 슬로건: 영상이 3초 이후부터 서서히 나타나서 계속 유지 ----------
const heroVideo = document.getElementById('heroVideo');
const heroSlogan = document.getElementById('heroSlogan');
const HERO_SLOGAN_DELAY = 3;

if (heroVideo && heroSlogan) {
  const showHeroSlogan = () => {
    heroSlogan.classList.add('isShown');
    heroVideo.removeEventListener('timeupdate', onHeroTimeUpdate);
  };
  function onHeroTimeUpdate() {
    if (heroVideo.currentTime >= HERO_SLOGAN_DELAY) showHeroSlogan();
  }
  heroVideo.addEventListener('timeupdate', onHeroTimeUpdate);
  /* 자동재생이 막혀 영상이 멈춰 있으면 timeupdate가 안 오므로 3초 뒤에 그대로 보여줌 */
  setTimeout(() => {
    if (heroVideo.paused) showHeroSlogan();
  }, HERO_SLOGAN_DELAY * 1000);
}

// ---------- 페이지 스케일 (1920px 고정 디자인을 화면 너비에 비례해서 축소/확대) ----------
const pageScaleOuter = document.querySelector('.pageScaleOuter');
const pageScale = document.getElementById('pageScale');
const heroSection = document.querySelector('.hero');
const headerEl = document.querySelector('.header');
let currentPageScale = 1; /* .pageScale 내부는 offsetTop/offsetHeight가 로컬(1920 기준) 좌표라, 실제 화면 좌표로 바꿀 때 이 값으로 곱/나눗셈 필요 */

const PAGE_SCALE_BREAKPOINT = 1440; /* 이 너비 이하에서는 style_1024.css의 실제 반응형 규칙이 적용되므로 비례 축소를 끔 */

/* 화면 너비에 맞춰 페이지를 줄이는 zoom은 끔(PC에서 글자가 작게 나오는 문제) — 모든 너비에서 실제 크기로 렌더링.
   PC(1440 초과)는 컨텐츠 영역이 가운데 1440px(좌우 여백 24px)이므로 그리드 여백을 화면 폭에 맞춰 계산해서 지정.
   1440 이하는 style_1024.css의 %값이 적용되도록 인라인 값을 제거 */
const CONTENT_WIDTH = 1440;
const CONTENT_SIDE_GAP = 24;

function updatePageScale() {
  currentPageScale = 1;
  pageScale.style.zoom = 1;
  heroSection.style.height = '';

  const viewportWidth = document.documentElement.clientWidth;
  if (viewportWidth > PAGE_SCALE_BREAKPOINT) {
    document.documentElement.style.setProperty(
      '--grid-margin',
      `${(viewportWidth - CONTENT_WIDTH) / 2 + CONTENT_SIDE_GAP}px`
    );
  } else {
    document.documentElement.style.removeProperty('--grid-margin');
  }
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
    photoBg.style.width = '';
    return;
  }

  /* photo가 position:relative(정상 흐름)라서 텍스트 길이에 따라 세로 위치가 달라짐 →
     offsetLeft/offsetTop(레이아웃 좌표, photoBg와 동일한 offsetParent인 .tealife 기준)로 실측해서 계산 */
  const photoRight = photo.offsetLeft + photo.offsetWidth;
  const photoBottom = photo.offsetTop + photo.offsetHeight;
  /* 박스 폭은 1024 기준 사진 804px 대비 786px 비율로 사진을 따라 줄이되, 보이는 부분(오른쪽/아래로 삐져나오는 양)은
     오른쪽과 아래가 똑같이 78px가 되도록 고정 (사진 폭에 비례시키면 화면이 넓을 때 오른쪽만 더 넓어 보임) */
  const OVERHANG = 78;
  const bgWidth = (786 / 804) * photo.offsetWidth;
  photoBg.style.width = `${bgWidth}px`;
  photoBg.style.left = `${photoRight + OVERHANG - bgWidth}px`;
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
  /* PC: 컨텐츠 왼쪽 끝(그리드 여백) 기준 +856px (1920에서 1120px) */
  if (document.documentElement.clientWidth > PAGE_SCALE_BREAKPOINT) {
    return resolveGridLength('--grid-margin') + 856;
  }
  return scrollPhotoArea.clientWidth * (1120 / 1920);
}

function getScrollText1CoverThreshold() {
  /* PC: 그리드 여백 + 586px (1920에서 850px) */
  if (document.documentElement.clientWidth > PAGE_SCALE_BREAKPOINT) {
    return resolveGridLength('--grid-margin') + 586;
  }
  return scrollPhotoArea.clientWidth * (850 / 1920);
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

  /* 사진은 교차 페이드하지만 텍스트는 겹쳐 보이면 읽기 힘드므로, 앞 글이 먼저 완전히 사라진 뒤(앞 절반)
     다음 글이 나타나도록(뒤 절반) 나눔 — 두 글이 동시에 보이는 구간이 없음 */
  const fadeOutFirstHalf = (l) => Math.max(0, 1 - l * 2);
  const fadeInSecondHalf = (l) => Math.max(0, l * 2 - 1);
  let textOpacity1;
  let textOpacity2;
  let textOpacity3;

  if (progress <= seg) {
    const local = progress / seg;
    left1 = photo1StartLeft * (1 - local);
    opacity1 = 1;
    opacity2 = 0;
    opacity3 = 0;
    textOpacity1 = 1;
    textOpacity2 = 0;
    textOpacity3 = 0;
  } else if (progress <= seg * 2) {
    const local = (progress - seg) / seg;
    left1 = 0;
    opacity1 = 1 - local;
    opacity2 = local;
    opacity3 = 0;
    textOpacity1 = fadeOutFirstHalf(local);
    textOpacity2 = fadeInSecondHalf(local);
    textOpacity3 = 0;
  } else {
    const local = (progress - seg * 2) / seg;
    left1 = 0;
    opacity1 = 0;
    opacity2 = 1 - local;
    opacity3 = local;
    textOpacity1 = 0;
    textOpacity2 = fadeOutFirstHalf(local);
    textOpacity3 = fadeInSecondHalf(local);
  }

  scrollPhoto1.style.setProperty('--photo1-left', `${left1}px`);
  scrollPhoto1.style.opacity = opacity1;
  scrollPhoto2.style.opacity = opacity2;
  scrollPhoto3.style.opacity = opacity3;

  scrollText1.classList.toggle('isCovered', left1 <= getScrollText1CoverThreshold());
  scrollText1.style.opacity = textOpacity1;
  scrollText2.style.opacity = textOpacity2;
  scrollText3.style.opacity = textOpacity3;
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
