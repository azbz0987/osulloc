// ---------- 드래그 슬라이드 캐러셀 (공통) ----------
function initDragSlider(dragZone, track, startInset, viewport = dragZone) {
  let isDragging = false;
  let dragStartX = 0;
  let dragStartTranslate = 0;
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
    const delta = getClientX(e) - dragStartX;
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
}

// 두 번째 컬럼 시작 지점 = 264(여백) + 94(1열) + 24(gutter) — 첫 슬라이드의 기본 위치
initDragSlider(
  document.getElementById('aboutSection'),
  document.getElementById('aboutSlideTrack'),
  382,
  document.getElementById('aboutSlideViewport')
);

// ---------- Jeju 사진 슬라이드 (인디케이터 + 좌우 버튼) ----------
const jejuSlides = document.querySelectorAll('#jejuPhotoWrap .jeju_slide');
const jejuIndicator = document.getElementById('jejuIndicator');
const jejuIndicatorLine = document.getElementById('jejuIndicatorLine');
const jejuIndicatorItems = document.querySelectorAll('#jejuIndicator .jeju_indicatorItem');
let jejuIndex = 0;

function setJejuSlide(index) {
  jejuIndex = (index + jejuSlides.length) % jejuSlides.length;

  jejuSlides.forEach((el, i) => el.classList.toggle('isActive', i === jejuIndex));
  jejuIndicatorItems.forEach((el, i) => el.classList.toggle('isActive', i === jejuIndex));

  const gapIndex = Math.min(jejuIndex, jejuIndicatorItems.length - 2);
  jejuIndicatorItems.forEach((el, i) => el.classList.toggle('expandGap', i === gapIndex));

  const leftRect = jejuIndicatorItems[gapIndex].getBoundingClientRect();
  const rightRect = jejuIndicatorItems[gapIndex + 1].getBoundingClientRect();
  const indicatorRect = jejuIndicator.getBoundingClientRect();
  jejuIndicatorLine.style.left = `${(leftRect.right + rightRect.left) / 2 - indicatorRect.left}px`;
}

jejuIndicatorItems.forEach((item, i) => {
  item.addEventListener('click', () => setJejuSlide(i));
});

document.getElementById('jejuPhotoPrev').addEventListener('click', () => setJejuSlide(jejuIndex - 1));
document.getElementById('jejuPhotoNext').addEventListener('click', () => setJejuSlide(jejuIndex + 1));

setJejuSlide(0);

// ---------- Scroll 인디케이터 + 사진 3단 전환 (섹션 스크롤 진행률 기반) ----------
const scrollSection = document.getElementById('scrollSection');
const scrollThumb = document.getElementById('scrollThumb');
const scrollPhoto1 = document.getElementById('scrollPhoto1');
const scrollPhoto2 = document.getElementById('scrollPhoto2');
const scrollPhoto3 = document.getElementById('scrollPhoto3');
const scrollText1 = document.getElementById('scrollText1');
const scrollText2 = document.getElementById('scrollText2');
const scrollText3 = document.getElementById('scrollText3');
const SCROLL_TRACK_HEIGHT = 660;
const SCROLL_THUMB_SIZE = 60;
const SCROLL_PHOTO1_START_LEFT = 1120; // photo1이 오른쪽에 자리한 시작 위치(왼쪽 여백), 스크롤에 따라 0(화면 전체 너비)으로 줄어듦

function getScrollProgress() {
  const scrollableRange = scrollSection.offsetHeight - window.innerHeight;
  return scrollableRange > 0
    ? Math.min(1, Math.max(0, (window.scrollY - scrollSection.offsetTop) / scrollableRange))
    : 0;
}

function updateScrollThumb(progress) {
  scrollThumb.style.setProperty('--thumb-progress', `${progress * (SCROLL_TRACK_HEIGHT - SCROLL_THUMB_SIZE)}px`);
}

function updateScrollPhotos(progress) {
  const seg = 1 / 3;
  let left1;
  let opacity1;
  let opacity2;
  let opacity3;

  if (progress <= seg) {
    const local = progress / seg;
    left1 = SCROLL_PHOTO1_START_LEFT * (1 - local);
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
const bentoBox1Photo = document.getElementById('bentoBox1Photo');
const bentoBox1Text = document.getElementById('bentoBox1Text');
const bentoBox1TextLine1 = document.getElementById('bentoBox1TextLine1');
const bentoBox1TextLine2 = document.getElementById('bentoBox1TextLine2');
const bentoBox1Slides = [
  { image: 'img/bento1.jpg', line1: '데일리로 즐기는', line2: '오설록 블렌디드티 20입', color: '#3a797e' },
  { image: 'img/bento1-2.jpg' },
  { image: 'img/bento1-3.jpg', line1: '카페인 걱정 없이<br>순하고 맛있는', line2: '오설록 허브티', color: '#6d7bc7' },
  { image: 'img/bento1-4.jpg', line1: '간편하고 시원하게<br>마실 수 있는', line2: '콜드브루, 콤부차', color: '#4caf50' },
  { image: 'img/bento1-5.jpg', line1: '거래처, 임직원 선물<br>부담 없이 호불호 적은', line2: '프리미엄 티 컬렉션 10종', color: '#149696' },
];
let bentoBox1Index = 0;

function setBentoBox1Slide(index) {
  bentoBox1Index = (index + bentoBox1Slides.length) % bentoBox1Slides.length;
  const slide = bentoBox1Slides[bentoBox1Index];
  bentoBox1Photo.src = slide.image;

  if (slide.line1) {
    bentoBox1TextLine1.innerHTML = slide.line1;
    bentoBox1TextLine2.textContent = slide.line2;
    bentoBox1TextLine2.style.color = slide.color;
    bentoBox1Text.style.display = '';
  } else {
    bentoBox1Text.style.display = 'none';
  }
}

document.getElementById('bentoBox1Prev').addEventListener('click', () => setBentoBox1Slide(bentoBox1Index - 1));
document.getElementById('bentoBox1Next').addEventListener('click', () => setBentoBox1Slide(bentoBox1Index + 1));
